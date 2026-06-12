/**
 * Seed: Buat user baru + simpanan dari data_anggota_fix.json
 *
 * Step:
 *  1. Hapus semua ANGGOTA users dan relasi-nya (payments, withdrawals, savings, mandatory_savings, voluntary_savings)
 *  2. Buat user baru dari data_anggota_fix.json
 *  3. Insert Simpanan Pokok (Payment APPROVED)
 *  4. Insert Simpanan Wajib per bulan (Payment + MandatorySaving)
 *  5. Insert Simpanan Sukarela per perubahan saldo (Payment/Withdrawal + VoluntarySaving)
 *  6. Update Saving.total = pokok + wajib + sukarelaNet
 *
 * Penggunaan:
 *   cd backend && node prisma/seed-simpanan-fix.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const DATA_PATH = path.join(__dirname, 'data_anggota_fix.json');

const MONTH_MAP = {
  Januari: 1, Februari: 2, Maret: 3, April: 4, Mei: 5, Juni: 6,
  Juli: 7, Agustus: 8, September: 9, Oktober: 10, November: 11, Desember: 12,
};

function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return new Date();
}

async function main() {
  console.log('\n🌱 Seed: data_anggota_fix.json\n');
  console.log('═'.repeat(60));

  //1. Load JSON
  const anggotaList = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  console.log(`📋 Total anggota di JSON: ${anggotaList.length}\n`);

  // 2. Hapus semua ANGGOTA dan relasi-nya
  console.log('🗑️  Menghapus semua data ANGGOTA...');
  await prisma.voluntarySaving.deleteMany({});
  await prisma.mandatorySaving.deleteMany({});
  await prisma.withdrawal.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.saving.deleteMany({});
  await prisma.user.deleteMany({ where: { role: 'ANGGOTA' } });
  console.log('✅ Semua data ANGGOTA dihapus.\n');

  // 3. Statistik
  let created = 0;
  let skipped = 0;
  let totalPokok = 0;
  let totalWajib = 0;
  let totalSukarelaMasuk = 0;
  let totalSukarelaKeluar = 0;

  // 4. Proses setiap anggota
  for (let i = 0; i < anggotaList.length; i++) {
    const a = anggotaList[i];
    const nama = a.nama || 'Tanpa Nama';
    const nim = a.nim || '';

    console.log(`[${i + 1}/${anggotaList.length}] ${nama} (NIM: ${nim})`);

    // ── Buat user ──────────────────────────────────────────
    const password = await bcrypt.hash(nim || 'default123', 10);
    const user = await prisma.user.create({
      data: {
        name: nama.toUpperCase().trim(),
        email: nim ? `${nim}@webmail.uad.ac.id` : `user_${i}@webmail.uad.ac.id`,
        password,
        role: 'ANGGOTA',
        nim: nim || null,
        prodi: a.prodi || null,
        phone: a.no_hp || null,
        fakultas: a.fakultas || null,
        angkatan: a.angkatan ? String(a.angkatan) : null,
        isActive: true,
      },
    });
    created++;

    // ── Simpanan Pokok ──────────────────────────────────────
    const pokok = parseInt(a['simpanan_pokok']) || 0;
    if (pokok > 0) {
      await prisma.payment.create({
        data: {
          userId: user.id,
          nominal: pokok,
          proofImage: 'seeded_pokok',
          status: 'APPROVED',
          description: 'Simpanan Pokok',
          paymentMethod: 'Cash',
          createdAt: new Date(),
        },
      });
      totalPokok += pokok;
    }

    // ── Simpanan Wajib ───────────────────────────────────────
    const wajib = a['simpanan_wajib'] || {};
    let userWajibTotal = 0;

    for (const yearStr of Object.keys(wajib)) {
      const year = parseInt(yearStr, 10);
      const months = wajib[yearStr];

      for (const monthName of Object.keys(months)) {
        const month = MONTH_MAP[monthName];
        if (!month) continue;

        const entry = months[monthName];
        const nominal = parseInt(entry.nominal, 10);
        if (!nominal || nominal <= 0) continue;

        const paidAt = parseDate(entry.tanggal_bayar);
        userWajibTotal += nominal;

        const payment = await prisma.payment.create({
          data: {
            userId: user.id,
            nominal: nominal,
            proofImage: 'seeded_wajib',
            status: 'APPROVED',
            description: 'Simpanan Wajib',
            paymentMethod: 'Cash',
            createdAt: paidAt,
          },
        });

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
      }
    }
    totalWajib += userWajibTotal;

    // ── Simpanan Sukarela ───────────────────────────────────
    const sukarelaEntries = a['simpanan_sukarela'] || [];
    let userSukarelaNet = 0;
    let lastSaldo = 0;

    for (const entry of sukarelaEntries) {
      const entrySaldo = parseInt(entry.saldo, 10);
      if (isNaN(entrySaldo)) continue;

      const diff = entrySaldo - lastSaldo;
      if (diff === 0) continue;

      const createdAt = parseDate(entry.tanggal);
      const nominal = Math.abs(diff);

      if (diff > 0) {
        const payment = await prisma.payment.create({
          data: {
            userId: user.id,
            nominal: nominal,
            proofImage: 'seeded_sukarela',
            status: 'APPROVED',
            description: 'Simpanan Sukarela',
            paymentMethod: 'Cash',
            createdAt,
          },
        });

        await prisma.voluntarySaving.create({
          data: {
            userId: user.id,
            nominal: nominal,
            paymentId: payment.id,
            createdAt,
          },
        });

        totalSukarelaMasuk += nominal;
        userSukarelaNet += nominal;
      } else {
        await prisma.withdrawal.create({
          data: {
            userId: user.id,
            nominal: nominal,
            reason: 'Penarikan Sukarela (Migrasi)',
            savingType: 'Sukarela',
            paymentMethod: 'Cash',
            status: 'APPROVED',
            createdAt,
          },
        });

        totalSukarelaKeluar += nominal;
        userSukarelaNet -= nominal;
      }

      lastSaldo = entrySaldo;
    }

    // ── Saving.total ─────────────────────────────────────────
    const newTotal = pokok + userWajibTotal + userSukarelaNet;
    await prisma.saving.create({
      data: {
        userId: user.id,
        total: newTotal,
      },
    });

    console.log(
      `    Pokok: Rp${pokok.toLocaleString('id-ID')} | ` +
      `Wajib: Rp${userWajibTotal.toLocaleString('id-ID')} | ` +
      `Sukarela: Rp${userSukarelaNet.toLocaleString('id-ID')} | ` +
      `Total: Rp${newTotal.toLocaleString('id-ID')}`,
    );
  }

  // 5. Ringkasan
  const grandTotal = await prisma.saving.aggregate({ _sum: { total: true } });

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RINGKASAN');
  console.log('═'.repeat(60));
  console.log(`   User dibuat : ${created}`);
  console.log(`   Dilewati       : ${skipped}`);
  console.log('─'.repeat(60));
  console.log(`   Total Pokok             : Rp ${totalPokok.toLocaleString('id-ID')}`);
  console.log(`   Total Wajib             : Rp ${totalWajib.toLocaleString('id-ID')}`);
  console.log(`   Total Sukarela Masuk : Rp ${totalSukarelaMasuk.toLocaleString('id-ID')}`);
  console.log(`   Total Sukarela Keluar   : Rp ${totalSukarelaKeluar.toLocaleString('id-ID')}`);
  console.log(`   Total Sukarela Net      : Rp ${(totalSukarelaMasuk - totalSukarelaKeluar).toLocaleString('id-ID')}`);
  console.log(`   Grand Total Saving : Rp ${Number(grandTotal._sum.total || 0).toLocaleString('id-ID')}`);
  console.log('═'.repeat(60));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
