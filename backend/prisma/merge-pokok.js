/**
 * Merge DATA-ANGGOTA.csv (simpanan_pokok) into data_anggota.json
 * Output: data_anggota_fix.json
 *
 * Matching priority:
 *   1. NIM (exact match) ← utama
 *   2. Nama (normalized) ← fallback
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'DATA-ANGGOTA.csv');
const JSON_PATH = path.join(__dirname, 'data_anggota.json');
const OUTPUT_PATH = path.join(__dirname, 'data_anggota_fix.json');

function parseAmount(str) {
  if (!str) return 0;
  const numericStr = str.replace(/\D/g, '');
  return numericStr ? parseInt(numericStr, 10) : 0;
}

function normalizeName(str) {
  return (str || '').toUpperCase().trim().replace(/\s+/g, ' ');
}

// ─── 1. Parse CSV ───────────────────────────────────────────
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const csvRows = csvContent.split(/\r?\n/);

const csvByNim = new Map();   // nim → pokok
const csvByName = new Map();  // normalizedNama → pokok

for (let i = 1; i < csvRows.length; i++) {
  const row = csvRows[i];
  if (!row.trim() || row.startsWith('TOTAL') || row.startsWith('No,')) continue;

  const columns = row.split(',');
  if (columns.length < 10) continue;

  const nama = normalizeName(columns[1]);
  const nim = (columns[5] || '').trim();
  const pokok = parseAmount(columns[7]);

  if (nim) csvByNim.set(nim, pokok);
  if (nama) csvByName.set(nama, pokok);
}

console.log(`📋 CSV parsed: ${csvByNim.size} entries (by NIM: ${csvByNim.size}, by name: ${csvByName.size})`);

// ─── 2. Read JSON ───────────────────────────────────────────
const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
console.log(`📋 JSON loaded: ${jsonData.length} entries`);

// ─── 3. Merge ──────────────────────────────────────────────
let matchedByNim = 0;
let matchedByName = 0;
let notFound = [];

const merged = jsonData.map((entry) => {
  const nim = (entry.nim || '').trim();
  const namaKey = normalizeName(entry.nama);

  let pokok = 0;
  let matchType = null;

  // Priority 1: match by NIM
  if (nim && csvByNim.has(nim)) {
    pokok = csvByNim.get(nim);
    matchType = 'NIM';
    matchedByNim++;
  }
  // Priority 2: match by name
  else if (csvByName.has(namaKey)) {
    pokok = csvByName.get(namaKey);
    matchType = 'NAME';
    matchedByName++;
  } else {
    notFound.push({ nama: entry.nama, nim });
  }

  return {
    ...entry,
    simpanan_pokok: pokok,
  };
});

// ─── 4. Stats ────────────────────────────────────────────────
const totalPokokCsv = Array.from(csvByNim.values()).reduce((a, b) => a + b, 0);
const totalPokokMerged = merged.reduce((sum, e) => sum + (e.simpanan_pokok || 0), 0);

console.log(`\n📊 Stats:`);
console.log(`   Matched by NIM  : ${matchedByNim}`);
console.log(`   Matched by Name : ${matchedByName}`);
console.log(`   Not found       : ${notFound.length}`);
console.log(`   Total pokok CSV  : Rp ${totalPokokCsv.toLocaleString('id-ID')}`);
console.log(`   Total pokok merged: Rp ${totalPokokMerged.toLocaleString('id-ID')}`);

if (notFound.length > 0) {
  console.log(`\n⚠️  Not matched:`);
  notFound.forEach((n) => console.log(`   - ${n.nama} (NIM: ${n.nim || '-'})`));
}

// ─── 5. Write ───────────────────────────────────────────────
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2), 'utf8');
console.log(`\n✅ Written to: ${OUTPUT_PATH}`);