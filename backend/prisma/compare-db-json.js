/**
 * Compare JSON totals vs DB totals per user
 * Match by NIM first, then by name (like seed script)
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const data = require('./data_anggota_fix.json');

function calcJsonTotal(anggota) {
  const pokok = parseInt(anggota['simpanan_pokok']) || 0;
  let wajib = 0;
  if (anggota['simpanan_wajib']) {
    Object.keys(anggota['simpanan_wajib']).forEach(y =>
      Object.keys(anggota['simpanan_wajib'][y]).forEach(m => {
        const v = anggota['simpanan_wajib'][y][m];
        if (v && v.nominal) wajib += parseInt(v.nominal);
      })
    );
  }
  let sukarelaNet = 0, last = 0;
  const ss = anggota['simpanan_sukarela'] || [];
  ss.forEach(s => {
    const curr = parseInt(s.saldo) || 0;
    const diff = curr - last;
    if (diff > 0) sukarelaNet += diff;
    else if (diff < 0) sukarelaNet -= Math.abs(diff);
    last = curr;
  });
  return pokok + wajib + sukarelaNet;
}

function findJsonEntry(dbUser) {
  // Priority 1: NIM match
  const byNim = data.find(a => a.nim === dbUser.nim);
  if (byNim) return { entry: byNim, matchBy: 'NIM' };

  // Priority 2: name match (case-insensitive)
  const nameKey = (dbUser.name || '').toUpperCase().trim();
  if (nameKey) {
    const byName = data.find(a => {
      const jsonName = (a.nama || '').toUpperCase().trim();
      return jsonName === nameKey || jsonName.includes(nameKey) || nameKey.includes(jsonName);
    });
    if (byName) return { entry: byName, matchBy: 'NAME' };
  }

  return null;
}

async function main() {
  const dbUsers = await prisma.user.findMany({
    where: { role: 'ANGGOTA' },
    select: { name: true, nim: true, id: true },
    orderBy: { nim: 'asc' },
  });

  let notFound = [];
  let mismatch = [];
  let totalJson = 0;
  let totalDb = 0;

  for (const dbUser of dbUsers) {
    const found = findJsonEntry(dbUser);
    if (found === null) {
      notFound.push({ nama: dbUser.name, nim: dbUser.nim });
      continue;
    }

    const jsonTotal = calcJsonTotal(found.entry);
    totalJson += jsonTotal;

    const saving = await prisma.saving.findUnique({ where: { userId: dbUser.id } });
    const dbTotal = saving ? parseFloat(saving.total) : 0;
    totalDb += dbTotal;

    if (jsonTotal !== dbTotal) {
      mismatch.push({
        nama: dbUser.name,
        nim: dbUser.nim,
        matchBy: found.matchBy,
        jsonTotal,
        dbTotal,
        selisih: jsonTotal - dbTotal,
      });
    }
  }

  console.log('=== USER TIDAK ADA DI JSON ===');
  notFound.forEach(u => console.log(`  ${u.nama} (NIM: ${u.nim})`));
  console.log(`Total: ${notFound.length} user\n`);

  console.log('=== USER TIDAK COCOK (JSON vs DB) ===');
  mismatch.forEach(m => {
    console.log(`  [${m.matchBy}] ${m.nama} (${m.nim}) | JSON: ${m.jsonTotal} | DB: ${m.dbTotal} | Selisih: ${m.selisih}`);
  });
  console.log(`Total mismatch: ${mismatch.length} user`);
  console.log(`Total selisih: ${mismatch.reduce((s, m) => s + m.selisih, 0)}\n`);

  console.log('=== RINGKASAN ===');
  console.log(`Total JSON semua user : ${totalJson}`);
  console.log(`Total DB semua user   : ${totalDb}`);
  console.log(`Selisih total         : ${totalJson - totalDb}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
