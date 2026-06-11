/**
 * Seeder: Simpanan Pokok, Wajib & Sukarela dari data_anggota_fix.json
 *
 * Logika:
 *  1. Baca data_anggota_fix.json (array anggota dengan riwayat simpanan pokok, wajib & sukarela)
 *  2. Cari user di database dengan mencocokkan NIM atau nama
 *  3. Hapus semua data simpanan lama user (pokok, wajib, sukarela, withdrawals)
 *  4. Insert Simpanan Pokok (sekali, saat join)
 *  5. Insert Simpanan Wajib per bulan (Payment + MandatorySaving)
 *  6. Insert Simpanan Sukarela per perubahan saldo (Payment/Withdrawal + VoluntarySaving)
 *  7. Update Saving.total = pokok + wajib + sukarela_net
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

// ─── Path ke data_anggota_fix.json ────────────────────────
const DATA_ANGGOTA_PATH = path.join(__dirname, 'data_anggota_fix.json');

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

// ─── Cari user di database berdasarkan NIM atau nama ──────
async function findUser(anggota) {
  // Priority 1: NIM (paling akurat)
  if (anggota.nim) {
    const byNim = await prisma.user.findFirst({
      where: { nim: anggota.nim },
    });
    if (byNim) {
      return { user: byNim, matchBy: 'NIM' };
    }
  }

  // Priority 2: nama (case-insensitive)
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
  console.log('\n🌱 Seeder: Simpanan Pokok, Wajib & Sukarela\n');
  console.log('═'.repeat(60));

  // 1. Baca data_anggota_fix.json
  let rawData;
  try {
    rawData = fs.readFileSync(DATA_ANGGOTA_PATH, 'utf8');
  } catch (err) {
    console.error('❌ Tidak dapat membaca data_anggota_fix.json:', err.message);
    process.exit(1);
  }

  const anggotaList = JSON.parse(rawData);
  console.log(`📋 Total anggota: ${anggotaList.length}\n`);

  // 2. Statistik
  let matched = 0;
  let skipped = 0;
  let errors = 0;

  let totalPokokPayments = 0;
  let totalWajibPayments = 0;
  let totalWajibMandatory = 0;
  let totalSukarelaPayments = 0;
  let totalSukarelaVoluntary = 0;
  let totalWithdrawal = 0;

  //3. Proses setiap anggota
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
    console.log(`✅ [${i + 1}/${anggotaList.length}] ${nama} → ${user.id} (${matchBy})`);
    matched++;

    // ── Hapus semua data simpanan lama user ───────────────
    await prisma.payment.deleteMany({ where: { userId: user.id, description: 'Simpanan Pokok' } });
    await prisma.payment.deleteMany({ where: { userId: user.id, description: 'Simpanan Wajib' } });
    await prisma.payment.deleteMany({ where: { userId: user.id, description: 'Simpanan Sukarela' } });
    await prisma.mandatorySaving.deleteMany({ where: { userId: user.id } });
    await prisma.voluntarySaving.deleteMany({ where: { userId: user.id } });
    await prisma.withdrawal.deleteMany({ where: { userId: user.id } });

    // ── 3a. Proses Simpanan Pokok ─────────────────────────
    const pokok = parseInt(anggota['simpanan_pokok'], 10) || 0;
    let userPokokTotal = 0;

    if (pokok > 0) {
      await prisma.payment.create({
        data: {
          userId: user.id,
          nominal: pokok,
          proofImage: 'seeded_from_data_anggota',
          status: 'APPROVED',
          description: 'Simpanan Pokok',
          paymentMethod: 'Cash',
          createdAt: new Date(),
        },
      });
      userPokokTotal = pokok;
      totalPokokPayments++;
    }

    // ── 3b. Proses Simpanan Wajib ─────────────────────────
    const wajib = anggota['simpanan_wajib'] || {};
    let userWajibTotal = 0;

    for (const yearStr of Object.keys(wajib)) {
      const year = parseInt(yearStr, 10);
      const months = wajib[yearStr];

      for (const monthName of Object.keys(months)) {
        const month = MONTH_MAP[monthName];
        if (!month) {
          console.log(`    ⚠️  Bulan tidak dikenal: ${monthName}`);
          continue;
        }

        const entry = months[monthName];
        const nominal = parseInt(entry.nominal, 10);

        if (!nominal || nominal <= 0) continue;

        const paidAt = parseDate(entry.tanggal_bayar);
        userWajibTotal += nominal;

        const payment = await prisma.payment.create({
          data: {
            userId: user.id,
            nominal: nominal,
            proofImage: 'seeded_from_data_anggota',
            status: 'APPROVED',
            description: 'Simpanan Wajib',
            paymentMethod: 'Cash',
            createdAt: paidAt,
          },
        });
        totalWajibPayments++;

        await prisma.mandatorySaving.create({
          data: {
            userId: user.id,
            month,
            year,
            nominal: nominal,
            status: 'PAID',
            paidAt,
            paymentId: payment.id,
          },
        });
        totalWajibMandatory++;
      }
    }

    // ── 3c. Proses Simpanan Sukarela ──────────────────────
    const sukarelaEntries = anggota['simpanan_sukarela'] || [];
    let userSukarelaNet = 0;
    let lastSaldo = 0;

    for (const entry of sukarelaEntries) {
      const entrySaldo = parseInt(entry.saldo, 10);
      if (isNaN(entrySaldo)) continue;

      const diff = entrySaldo - lastSaldo;
      if (diff === 0) continue;

      const createdAt = parseDate(entry.tanggal);
      const actualNominal = Math.abs(diff);

      if (diff > 0) {
        // Deposit
        const payment = await prisma.payment.create({
          data: {
            userId: user.id,
            nominal: actualNominal,
            proofImage: 'seeded_from_data_anggota',
            status: 'APPROVED',
            description: 'Simpanan Sukarela',
            paymentMethod: 'Cash',
            createdAt,
          },
        });
        totalSukarelaPayments++;

        await prisma.voluntarySaving.create({
          data: {
            userId: user.id,
            nominal: actualNominal,
            paymentId: payment.id,
            createdAt,
          },
        });
        totalSukarelaVoluntary++;
        userSukarelaNet += actualNominal;
      } else {
        // Withdrawal
        await prisma.withdrawal.create({
          data: {
            userId: user.id,
            nominal: actualNominal,
            reason: 'Penarikan Sukarela (Migrasi)',
            savingType: 'Sukarela',
            paymentMethod: 'Cash',
            status: 'APPROVED',
            createdAt,
          },
        });
        totalWithdrawal++;
        userSukarelaNet -= actualNominal;
      }

      lastSaldo = entrySaldo;
    }

    // ── 3d. Update Saving.total ────────────────────────────
    const newTotal = userPokokTotal + userWajibTotal + userSukarelaNet;
    await prisma.saving.upsert({
      where: { userId: user.id },
      update: { total: newTotal },
      create: { userId: user.id, total: newTotal },
    });

    console.log(
      `    💰 Pokok: Rp${userPokokTotal.toLocaleString('id-ID')} | ` +
      `Wajib: Rp${userWajibTotal.toLocaleString('id-ID')} | ` +
      `Sukarela: Rp${userSukarelaNet.toLocaleString('id-ID')} | ` +
      `Total: Rp${newTotal.toLocaleString('id-ID')}`,
    );
  }

  // 4. Ringkasan
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RINGKASAN');
  console.log('═'.repeat(60));
  console.log(`   Total anggota di JSON : ${anggotaList.length}`);
  console.log(`   ✅ Cocok & diproses      : ${matched}`);
  console.log(`   ⚠️  Tidak ditemukan       : ${skipped}`);
  console.log(` ❌ Error                : ${errors}`);
  console.log('─'.repeat(60));
  console.log(`   Payment Simpanan Pokok   : ${totalPokokPayments}`);
  console.log(`   Payment Simpanan Wajib   : ${totalWajibPayments}`);
  console.log(`   MandatorySaving dibuat   : ${totalWajibMandatory}`);
  console.log(`   Payment Simpanan Sukarela : ${totalSukarelaPayments}`);
  console.log(`   VoluntarySaving dibuat   : ${totalSukarelaVoluntary}`);
  console.log(`   Withdrawal Sukarela      : ${totalWithdrawal}`);
  console.log('═'.repeat(60));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
