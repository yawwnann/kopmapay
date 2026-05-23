/**
 * Seeder: Simpanan Wajib & Sukarela dari data_anggota.json
 *
 * Logika:
 *  1. Baca data_anggota.json (array anggota dengan riwayat simpanan wajib & sukarela)
 *  2. Cari user di database dengan mencocokkan NAMA (case-insensitive) atau NIM
 *  3. Untuk setiap bulan di simpanan_wajib yang memiliki nominal > 0:
 *      - Buat Payment (APPROVED, description: "Simpanan Wajib")
 *      - Buat MandatorySaving (PAID)
 *  4. Untuk setiap entri simpanan_sukarela yang nominal > 0:
 *      - Buat Payment (APPROVED, description: "Simpanan Sukarela")
 *      - Buat VoluntarySaving
 *  5. Hitung total wajib + sukarela dan update Saving.total per user
 *
 * Penggunaan:
 *   cd backend && node prisma/seed-simpanan.js
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

require('dotenv').config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ─── Path ke data_anggota.json ───────────────────────────
const DATA_ANGGOTA_PATH = path.join(__dirname, 'data_anggota.json');

// ─── Mapping nama bulan Indonesia → nomor (1-12) ─────────
const MONTH_MAP = {
  Januari: 1, Februari: 2, Maret: 3, April: 4, Mei: 5, Juni: 6,
  Juli: 7, Agustus: 8, September: 9, Oktober: 10, November: 11, Desember: 12,
};

// ─── Parse tanggal DD/MM/YYYY → Date ─────────────────────
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return new Date();
}

// ─── Cari user di database berdasarkan nama ATAU NIM ──────
async function findUser(anggota) {
  // Coba cari berdasarkan NIM dulu (paling akurat)
  if (anggota.nim) {
    const byNim = await prisma.user.findFirst({
      where: { nim: anggota.nim },
    });
    if (byNim) {
      return { user: byNim, matchBy: 'NIM' };
    }
  }

  // Fallback: cari berdasarkan nama (case-insensitive, partial match)
  const namaUpper = (anggota.nama || '').toUpperCase().trim();
  if (namaUpper) {
    const allUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { equals: namaUpper, mode: 'insensitive' } },
          { name: { contains: namaUpper, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    if (allUsers.length > 0) {
      return { user: allUsers[0], matchBy: 'NAMA' };
    }
  }

  return null;
}

// ─── Fungsi utama ─────────────────────────────────────────
async function main() {
  console.log('\n🌱 Seeder: Simpanan Wajib & Sukarela dari data_anggota.json\n');
  console.log('═'.repeat(60));

  // 1. Baca data_anggota.json
  let rawData;
  try {
    rawData = fs.readFileSync(DATA_ANGGOTA_PATH, 'utf8');
  } catch (err) {
    console.error('❌ Tidak dapat membaca data_anggota.json:', err.message);
    process.exit(1);
  }

  const anggotaList = JSON.parse(rawData);
  console.log(`📋 Total anggota di data_anggota.json: ${anggotaList.length}\n`);

  // 2. Statistik
  let matched = 0;
  let skipped = 0;
  let errors = 0;

  let totalWajibPayments = 0;
  let totalWajibMandatory = 0;
  let totalSukarelaPayments = 0;
  let totalSukarelaVoluntary = 0;

  // 3. Proses setiap anggota
  for (let i = 0; i < anggotaList.length; i++) {
    const anggota = anggotaList[i];
    const nama = anggota.nama || 'Tanpa Nama';
    const nim = anggota.nim || '-';

    // ── Cari user di database ──────────────────────────────
    const found = await findUser(anggota);

    if (!found) {
      console.log(`⚠️  [${i + 1}/${anggotaList.length}] TIDAK DITEMUKAN: ${nama} (NIM: ${nim})`);
      skipped++;
      continue;
    }

    const { user, matchBy } = found;
    console.log(
      `✅ [${i + 1}/${anggotaList.length}] ${nama} → user ${user.id} (match via ${matchBy})`,
    );
    matched++;

    // ── 3a. Proses Simpanan Wajib ──────────────────────────
    const wajib = anggota.simpanan_wajib || {};
    let userWajibTotal = 0;

    for (const yearStr of Object.keys(wajib)) {
      const year = parseInt(yearStr, 10);
      const months = wajib[yearStr];

      for (const monthName of Object.keys(months)) {
        const month = MONTH_MAP[monthName];
        if (!month) {
          console.log(`    ⚠️  Bulan tidak dikenal: ${monthName}, dilewati.`);
          continue;
        }

        const entry = months[monthName];
        const nominal = parseInt(entry.nominal, 10);

        // Skip jika nominal 0 atau kosong
        if (!nominal || nominal <= 0) continue;

        const paidAt = parseDate(entry.tanggal_bayar);
        userWajibTotal += nominal;

        // Cek apakah sudah ada (idempotent: cek unik userId + month + year)
        const existingMs = await prisma.mandatorySaving.findUnique({
          where: { userId_month_year: { userId: user.id, month, year } },
        });

        if (existingMs) {
          // Sudah ada, update paymentId dan status jika perlu
          await prisma.mandatorySaving.update({
            where: { userId_month_year: { userId: user.id, month, year } },
            data: {
              nominal,
              status: 'PAID',
              paidAt,
            },
          });
          continue;
        }

        // Buat Payment untuk simpanan wajib
        const payment = await prisma.payment.create({
          data: {
            userId: user.id,
            nominal: nominal.toFixed(2),
            proofImage: 'seeded_from_data_anggota',
            status: 'APPROVED',
            description: 'Simpanan Wajib',
            paymentMethod: 'Cash',
            createdAt: paidAt,
          },
        });
        totalWajibPayments++;

        // Buat MandatorySaving
        await prisma.mandatorySaving.create({
          data: {
            userId: user.id,
            month,
            year,
            nominal,
            status: 'PAID',
            paidAt,
            paymentId: payment.id,
          },
        });
        totalWajibMandatory++;
      }
    }

    // ── 3b. Proses Simpanan Sukarela ───────────────────────
    const sukarela = anggota.simpanan_sukarela || [];
    
    // Hapus data simpanan sukarela lama agar tidak ada duplikasi jika dijalankan ulang
    await prisma.voluntarySaving.deleteMany({ where: { userId: user.id } });
    await prisma.withdrawal.deleteMany({ where: { userId: user.id, savingType: 'Sukarela' } });
    await prisma.payment.deleteMany({ where: { userId: user.id, description: 'Simpanan Sukarela' } });

    let userSukarelaTotal = 0;
    let lastSaldo = 0;

    for (const entry of sukarela) {
      const entrySaldo = parseInt(entry.saldo, 10);

      // Skip jika saldo tidak valid
      if (isNaN(entrySaldo)) continue;

      const diff = entrySaldo - lastSaldo;
      if (diff === 0) continue;

      const createdAt = parseDate(entry.tanggal);
      const actualNominal = Math.abs(diff);

      if (diff > 0) {
        // Buat Payment untuk simpanan sukarela
        const payment = await prisma.payment.create({
          data: {
            userId: user.id,
            nominal: actualNominal.toFixed(2),
            proofImage: 'seeded_from_data_anggota',
            status: 'APPROVED',
            description: 'Simpanan Sukarela',
            paymentMethod: 'Cash',
            createdAt,
          },
        });
        totalSukarelaPayments++;

        // Buat VoluntarySaving
        await prisma.voluntarySaving.create({
          data: {
            userId: user.id,
            nominal: actualNominal,
            paymentId: payment.id,
            createdAt,
          },
        });
        totalSukarelaVoluntary++;
      } else {
        // Nominal negatif berarti penarikan (Withdrawal)
        await prisma.withdrawal.create({
          data: {
            userId: user.id,
            nominal: actualNominal.toFixed(2),
            reason: 'Penarikan Sukarela (Migrasi)',
            savingType: 'Sukarela',
            paymentMethod: 'Cash',
            status: 'APPROVED',
            createdAt,
          },
        });
      }
      
      lastSaldo = entrySaldo;
      userSukarelaTotal = entrySaldo;
    }

    // ── 3c. Update Saving.total ────────────────────────────
    const newTotal = userWajibTotal + userSukarelaTotal;
    await prisma.saving.upsert({
      where: { userId: user.id },
      update: { total: newTotal.toFixed(2) },
      create: { userId: user.id, total: newTotal.toFixed(2) },
    });

    console.log(
      `    💰 Wajib bulan: ${totalWajibMandatory} total Rp${userWajibTotal.toLocaleString('id-ID')} | ` +
      `Sukarela: ${sukarela.filter(s => s.nominal > 0).length} entry Rp${userSukarelaTotal.toLocaleString('id-ID')}`,
    );
  }

  // 4. Ringkasan
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RINGKASAN');
  console.log('═'.repeat(60));
  console.log(`   Total anggota di JSON :      ${anggotaList.length}`);
  console.log(`   ✅ Cocok & diproses    :      ${matched}`);
  console.log(`   ⚠️  Tidak ditemukan     :      ${skipped}`);
  console.log(`   ❌ Error               :      ${errors}`);
  console.log('─'.repeat(60));
  console.log(`   Payment Simpanan Wajib   :     ${totalWajibPayments}`);
  console.log(`   MandatorySaving dibuat   :     ${totalWajibMandatory}`);
  console.log(`   Payment Simpanan Sukarela :   ${totalSukarelaPayments}`);
  console.log(`   VoluntarySaving dibuat   :     ${totalSukarelaVoluntary}`);
  console.log('═'.repeat(60));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
