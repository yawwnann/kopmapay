import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getUserDashboard(userId: string) {
    // Fetch user-specific data in parallel
    const [user, payments, withdrawals, saving] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          angkatan: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.payment.findMany({
        where: { userId },
        include: {
          verifier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.withdrawal.findMany({
        where: { userId },
        include: {
          verifier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.saving.findUnique({
        where: { userId },
      }),
    ]);

    // Calculate totals
    const totalBalance = saving ? Number(saving.total) : 0;
    const pendingPayments = payments.filter(
      (p) => p.status === 'PENDING',
    ).length;
    const approvedPayments = payments.filter(
      (p) => p.status === 'APPROVED',
    ).length;
    const rejectedPayments = payments.filter(
      (p) => p.status === 'REJECTED',
    ).length;
    const pendingWithdrawals = withdrawals.filter(
      (w) => w.status === 'PENDING',
    ).length;
    const approvedWithdrawals = withdrawals.filter(
      (w) => w.status === 'APPROVED',
    ).length;

    // Recent activities (last 5 combined)
    const recentActivities = [...payments, ...withdrawals]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5)
      .map((item: any) => ({
        id: item.id,
        type: item.proofImage ? 'payment' : 'withdrawal',
        amount: Number(item.nominal),
        status: item.status,
        createdAt: item.createdAt,
        description: item.description || item.reason,
      }));

    // Savings breakdown by type
    const savingsBreakdown = {
      pokok: 0,
      wajib: 0,
      sukarela: 0,
    };

    const approvedPaymentsAll = await this.prisma.payment.findMany({
      where: { userId, status: 'APPROVED' },
      select: { nominal: true, description: true, createdAt: true },
    });

    approvedPaymentsAll.forEach((payment) => {
      const desc = (payment.description || '').toLowerCase();
      const amount = Number(payment.nominal);

      if (desc.includes('pokok')) {
        savingsBreakdown.pokok += amount;
      } else if (desc.includes('wajib')) {
        savingsBreakdown.wajib += amount;
      } else {
        savingsBreakdown.sukarela += amount;
      }
    });

    // Payment trend (last 6 months) - user specific
    const months: string[] = [];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
    }

    const paymentsByMonth = new Array(6).fill(0);
    const withdrawalsByMonth = new Array(6).fill(0);

    const allPayments = await this.prisma.payment.findMany({
      where: { userId },
      select: { nominal: true, createdAt: true },
    });

    const allWithdrawals = await this.prisma.withdrawal.findMany({
      where: { userId },
      select: { nominal: true, createdAt: true },
    });

    allPayments.forEach((payment) => {
      const paymentDate = new Date(payment.createdAt);
      for (let i = 0; i < 6; i++) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - (5 - i));
        if (
          paymentDate.getMonth() === targetDate.getMonth() &&
          paymentDate.getFullYear() === targetDate.getFullYear()
        ) {
          paymentsByMonth[i] += Number(payment.nominal);
          break;
        }
      }
    });

    allWithdrawals.forEach((withdrawal) => {
      const withdrawalDate = new Date(withdrawal.createdAt);
      for (let i = 0; i < 6; i++) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - (5 - i));
        if (
          withdrawalDate.getMonth() === targetDate.getMonth() &&
          withdrawalDate.getFullYear() === targetDate.getFullYear()
        ) {
          withdrawalsByMonth[i] += Number(withdrawal.nominal);
          break;
        }
      }
    });

    // Calculate Pemutihan Alert (5 months unpaid wajib)
    let pemutihanAlert = { status: false, monthsUnpaid: 0 };
    const wajibPayments = approvedPaymentsAll.filter((p) =>
      (p.description || '').toLowerCase().includes('wajib'),
    );
    const latestWajib = wajibPayments.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

    const referenceDate = latestWajib
      ? new Date(latestWajib.createdAt)
      : user?.createdAt
        ? new Date(user.createdAt)
        : new Date();

    const diffTime = Math.abs(new Date().getTime() - referenceDate.getTime());
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30); // Approximate months

    if (diffMonths >= 5) {
      pemutihanAlert = {
        status: true,
        monthsUnpaid: Math.floor(diffMonths),
      };
    }

    return {
      user: {
        name: user?.name,
        email: user?.email,
        angkatan: user?.angkatan,
        memberSince: user?.createdAt,
      },
      totalBalance,
      pendingPayments,
      approvedPayments,
      rejectedPayments,
      pendingWithdrawals,
      approvedWithdrawals,
      recentActivities,
      savingsBreakdown,
      paymentTrend: {
        labels: months,
        payments: paymentsByMonth,
        withdrawals: withdrawalsByMonth,
      },
      pemutihanAlert,
    };
  }

  async getAdminDashboard(userId: string) {
    // Fetch all data in parallel
    const [users, payments, withdrawals, savings] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'ANGGOTA' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          angkatan: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.payment.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.withdrawal.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.saving.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              angkatan: true,
            },
          },
        },
      }),
    ]);

    // Calculate totals
    const totalMembers = users.length;
    const totalSavings = savings.reduce((sum, s) => sum + Number(s.total), 0);
    const pendingPayments = payments.filter(
      (p) => p.status === 'PENDING',
    ).length;
    const pendingWithdrawals = withdrawals.filter(
      (w) => w.status === 'PENDING',
    ).length;
    const approvedPayments = payments.filter(
      (p) => p.status === 'APPROVED',
    ).length;
    const rejectedPayments = payments.filter(
      (p) => p.status === 'REJECTED',
    ).length;
    const totalPayments = payments.length;
    const totalWithdrawals = withdrawals.length;

    // Recent activities (last 5 payments + withdrawals combined)
    // Use proofImage field as discriminator: payments have it, withdrawals don't
    const recentActivities = [...payments, ...withdrawals]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5)
      .map((item: any) => ({
        id: item.id,
        type: item.proofImage ? 'payment' : 'withdrawal',
        userName: item.user?.name || 'Unknown',
        amount: Number(item.nominal),
        status: item.status,
        createdAt: item.createdAt,
      }));

    // Recent approvals (last 5 approved or rejected transactions)
    const recentApprovals = [
      ...payments.filter(
        (p) => p.status === 'APPROVED' || p.status === 'REJECTED',
      ),
      ...withdrawals.filter(
        (w) => w.status === 'APPROVED' || w.status === 'REJECTED',
      ),
    ]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 5)
      .map((item: any) => ({
        id: item.id,
        type: item.proofImage ? 'payment' : 'withdrawal',
        userName: item.user?.name || 'Unknown',
        amount: Number(item.nominal),
        status: item.status,
        approvedAt: item.updatedAt,
      }));

    // Recent alerts (dynamic data)
    const recentAlerts: any[] = [];
    let alertId = 1;

    if (pendingWithdrawals > 0) {
      recentAlerts.push({
        id: alertId++,
        type: 'penarikan',
        message: 'Penarikan Tertunda',
        detail: `Terdapat ${pendingWithdrawals} penarikan menunggu verifikasi`,
        time: 'Sekarang',
        status: 'pending' as const,
      });
    }

    if (pendingPayments > 0) {
      recentAlerts.push({
        id: alertId++,
        type: 'pembayaran',
        message: 'Pembayaran Tertunda',
        detail: `Terdapat ${pendingPayments} pembayaran menunggu verifikasi`,
        time: 'Sekarang',
        status: 'pending' as const,
      });
    }

    const newestUser = [...users].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    if (newestUser) {
      const hoursAgo = Math.floor(
        (new Date().getTime() - new Date(newestUser.createdAt).getTime()) /
          (1000 * 60 * 60),
      );
      const timeStr =
        hoursAgo < 1
          ? 'Baru saja'
          : hoursAgo < 24
            ? `${hoursAgo} jam yang lalu`
            : `${Math.floor(hoursAgo / 24)} hari yang lalu`;
      recentAlerts.push({
        id: alertId++,
        type: 'member',
        message: 'Pendaftaran Anggota Baru',
        detail: `${newestUser.name || 'Anggota'} telah bergabung ke KOPMA`,
        time: timeStr,
        status: 'success' as const,
      });
    }

    if (recentAlerts.length === 0) {
      recentAlerts.push({
        id: alertId++,
        type: 'info',
        message: 'Semua Terkendali',
        detail: 'Tidak ada tugas yang menunggu saat ini',
        time: 'Sekarang',
        status: 'info' as const,
      });
    }

    // Payment trend (last 6 months)
    const months: string[] = [];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
    }

    const paymentsByMonth = new Array(6).fill(0);
    const withdrawalsByMonth = new Array(6).fill(0);

    payments.forEach((payment) => {
      const paymentDate = new Date(payment.createdAt);
      for (let i = 0; i < 6; i++) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - (5 - i));
        if (
          paymentDate.getMonth() === targetDate.getMonth() &&
          paymentDate.getFullYear() === targetDate.getFullYear()
        ) {
          paymentsByMonth[i] += Number(payment.nominal);
          break;
        }
      }
    });

    withdrawals.forEach((withdrawal) => {
      const withdrawalDate = new Date(withdrawal.createdAt);
      for (let i = 0; i < 6; i++) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - (5 - i));
        if (
          withdrawalDate.getMonth() === targetDate.getMonth() &&
          withdrawalDate.getFullYear() === targetDate.getFullYear()
        ) {
          withdrawalsByMonth[i] += Number(withdrawal.nominal);
          break;
        }
      }
    });

    // Savings breakdown
    // Calculate from approved payments by description type
    const savingsBreakdown = {
      pokok: 0,
      wajib: 0,
      sukarela: 0,
    };

    payments
      .filter((p) => p.status === 'APPROVED')
      .forEach((payment) => {
        const desc = (payment.description || '').toLowerCase();
        const amount = Number(payment.nominal);

        if (desc.includes('pokok')) {
          savingsBreakdown.pokok += amount;
        } else if (desc.includes('wajib')) {
          savingsBreakdown.wajib += amount;
        } else {
          // Default to sukarela for other types
          savingsBreakdown.sukarela += amount;
        }
      });

    // Member activity by angkatan
    const angkatanMap = new Map<string, { members: number; savings: number }>();
    users.forEach((user) => {
      const angkatan = user.angkatan || 'Lainnya';
      if (!angkatanMap.has(angkatan)) {
        angkatanMap.set(angkatan, { members: 0, savings: 0 });
      }
      const current = angkatanMap.get(angkatan)!;
      current.members += 1;
    });

    savings.forEach((saving) => {
      const user = users.find((u) => u.id === saving.userId);
      if (user) {
        const angkatan = user.angkatan || 'Lainnya';
        const current = angkatanMap.get(angkatan);
        if (current) {
          current.savings += Number(saving.total);
        }
      }
    });

    const angkatanData = Array.from(angkatanMap.entries()).map(
      ([angkatan, data]) => ({
        angkatan,
        ...data,
      }),
    );

    return {
      totalMembers,
      totalSavings,
      pendingPayments,
      pendingWithdrawals,
      approvedPayments,
      rejectedPayments,
      totalPayments,
      totalWithdrawals,
      recentActivities,
      recentApprovals,
      recentAlerts,
      paymentTrend: {
        labels: months,
        payments: paymentsByMonth,
        withdrawals: withdrawalsByMonth,
      },
      paymentStatus: {
        approved: approvedPayments,
        pending: pendingPayments,
        rejected: rejectedPayments,
      },
      savingsBreakdown,
      memberActivity: {
        angkatan: angkatanData.map((a) => a.angkatan),
        members: angkatanData.map((a) => a.members),
        savings: angkatanData.map((a) => a.savings),
      },
    };
  }
}
