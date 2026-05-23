import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AngkatanMember = {
  id: string;
  name: string;
  email: string;
  savings: number;
};

type AngkatanReport = {
  angkatan: string;
  totalMembers: number;
  totalSavings: number;
  totalPayments: number;
  totalWithdrawals: number;
  members: AngkatanMember[];
};

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailyReport(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get payments for the day
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            angkatan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get withdrawals for the day
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            angkatan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate totals
    const totalPayments = payments
      .filter((p) => p.status === 'APPROVED')
      .reduce((sum, p) => sum + Number(p.nominal), 0);

    const totalWithdrawals = withdrawals
      .filter((w) => w.status === 'APPROVED')
      .reduce((sum, w) => sum + Number(w.nominal), 0);

    return {
      date: targetDate,
      payments: {
        data: payments,
        count: payments.length,
        totalApproved: totalPayments,
      },
      withdrawals: {
        data: withdrawals,
        count: withdrawals.length,
        totalApproved: totalWithdrawals,
      },
      netTotal: totalPayments - totalWithdrawals,
    };
  }

  async getAngkatanReport(angkatan?: string) {
    const whereClause: any = { role: 'ANGGOTA' };
    if (angkatan) {
      whereClause.angkatan = angkatan;
    }

    // Get all users grouped by angkatan
    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        angkatan: true,
        savings: true,
        payments: {
          where: { status: 'APPROVED' },
          select: { nominal: true },
        },
        withdrawals: {
          where: { status: 'APPROVED' },
          select: { nominal: true },
        },
      },
    });

    // Group by angkatan
    const angkatanMap = new Map<string, AngkatanReport>();

    users.forEach((user) => {
      const ang = user.angkatan || 'Unknown';
      let angkatanData = angkatanMap.get(ang);

      if (!angkatanData) {
        angkatanData = {
          angkatan: ang,
          totalMembers: 0,
          totalSavings: 0,
          totalPayments: 0,
          totalWithdrawals: 0,
          members: [],
        };

        angkatanMap.set(ang, angkatanData);
      }

      angkatanData.totalMembers++;
      angkatanData.totalSavings += user.savings
        ? Number(user.savings.total)
        : 0;
      angkatanData.totalPayments += user.payments.reduce(
        (sum, p) => sum + Number(p.nominal),
        0,
      );
      angkatanData.totalWithdrawals += user.withdrawals.reduce(
        (sum, w) => sum + Number(w.nominal),
        0,
      );
      angkatanData.members.push({
        id: user.id,
        name: user.name,
        email: user.email,
        savings: user.savings ? Number(user.savings.total) : 0,
      });
    });

    const reports: AngkatanReport[] = Array.from(angkatanMap.values());

    return angkatan ? reports[0] || null : reports;
  }

  async getSummary() {
    const totalUsers = await this.prisma.user.count({
      where: { isActive: true },
    });

    const totalAnggota = await this.prisma.user.count({
      where: { role: 'ANGGOTA', isActive: true },
    });

    const pendingPayments = await this.prisma.payment.count({
      where: { status: 'PENDING' },
    });

    const pendingWithdrawals = await this.prisma.withdrawal.count({
      where: { status: 'PENDING' },
    });

    const totalSavings = await this.prisma.saving.aggregate({
      _sum: { total: true },
    });

    return {
      totalUsers,
      totalAnggota,
      pendingPayments,
      pendingWithdrawals,
      totalSavings: totalSavings._sum.total || 0,
    };
  }
}
