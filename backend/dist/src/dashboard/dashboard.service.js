"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserDashboard(userId) {
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
        const totalBalance = saving ? Number(saving.total) : 0;
        const pendingPayments = payments.filter((p) => p.status === 'PENDING').length;
        const approvedPayments = payments.filter((p) => p.status === 'APPROVED').length;
        const rejectedPayments = payments.filter((p) => p.status === 'REJECTED').length;
        const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING').length;
        const approvedWithdrawals = withdrawals.filter((w) => w.status === 'APPROVED').length;
        const recentActivities = [...payments, ...withdrawals]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map((item) => ({
            id: item.id,
            type: item.proofImage ? 'payment' : 'withdrawal',
            amount: Number(item.nominal),
            status: item.status,
            createdAt: item.createdAt,
            description: item.description || item.reason,
        }));
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
            }
            else if (desc.includes('wajib')) {
                savingsBreakdown.wajib += amount;
            }
            else {
                savingsBreakdown.sukarela += amount;
            }
        });
        const months = [];
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
                if (paymentDate.getMonth() === targetDate.getMonth() &&
                    paymentDate.getFullYear() === targetDate.getFullYear()) {
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
                if (withdrawalDate.getMonth() === targetDate.getMonth() &&
                    withdrawalDate.getFullYear() === targetDate.getFullYear()) {
                    withdrawalsByMonth[i] += Number(withdrawal.nominal);
                    break;
                }
            }
        });
        let pemutihanAlert = { status: false, monthsUnpaid: 0 };
        const wajibPayments = approvedPaymentsAll.filter((p) => (p.description || '').toLowerCase().includes('wajib'));
        const latestWajib = wajibPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const referenceDate = latestWajib
            ? new Date(latestWajib.createdAt)
            : user?.createdAt
                ? new Date(user.createdAt)
                : new Date();
        const diffTime = Math.abs(new Date().getTime() - referenceDate.getTime());
        const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30);
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
    async getAdminDashboard(userId) {
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
        const totalMembers = users.length;
        const totalSavings = savings.reduce((sum, s) => sum + Number(s.total), 0);
        const pendingPayments = payments.filter((p) => p.status === 'PENDING').length;
        const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING').length;
        const approvedPayments = payments.filter((p) => p.status === 'APPROVED').length;
        const rejectedPayments = payments.filter((p) => p.status === 'REJECTED').length;
        const totalPayments = payments.length;
        const totalWithdrawals = withdrawals.length;
        const recentActivities = [...payments, ...withdrawals]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map((item) => ({
            id: item.id,
            type: item.proofImage ? 'payment' : 'withdrawal',
            userName: item.user?.name || 'Unknown',
            amount: Number(item.nominal),
            status: item.status,
            createdAt: item.createdAt,
        }));
        const recentApprovals = [
            ...payments.filter((p) => p.status === 'APPROVED' || p.status === 'REJECTED'),
            ...withdrawals.filter((w) => w.status === 'APPROVED' || w.status === 'REJECTED'),
        ]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5)
            .map((item) => ({
            id: item.id,
            type: item.proofImage ? 'payment' : 'withdrawal',
            userName: item.user?.name || 'Unknown',
            amount: Number(item.nominal),
            status: item.status,
            approvedAt: item.updatedAt,
        }));
        const recentAlerts = [];
        let alertId = 1;
        if (pendingWithdrawals > 0) {
            recentAlerts.push({
                id: alertId++,
                type: 'penarikan',
                message: 'Penarikan Tertunda',
                detail: `Terdapat ${pendingWithdrawals} penarikan menunggu verifikasi`,
                time: 'Sekarang',
                status: 'pending',
            });
        }
        if (pendingPayments > 0) {
            recentAlerts.push({
                id: alertId++,
                type: 'pembayaran',
                message: 'Pembayaran Tertunda',
                detail: `Terdapat ${pendingPayments} pembayaran menunggu verifikasi`,
                time: 'Sekarang',
                status: 'pending',
            });
        }
        const newestUser = [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (newestUser) {
            const hoursAgo = Math.floor((new Date().getTime() - new Date(newestUser.createdAt).getTime()) /
                (1000 * 60 * 60));
            const timeStr = hoursAgo < 1
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
                status: 'success',
            });
        }
        if (recentAlerts.length === 0) {
            recentAlerts.push({
                id: alertId++,
                type: 'info',
                message: 'Semua Terkendali',
                detail: 'Tidak ada tugas yang menunggu saat ini',
                time: 'Sekarang',
                status: 'info',
            });
        }
        const months = [];
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
                if (paymentDate.getMonth() === targetDate.getMonth() &&
                    paymentDate.getFullYear() === targetDate.getFullYear()) {
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
                if (withdrawalDate.getMonth() === targetDate.getMonth() &&
                    withdrawalDate.getFullYear() === targetDate.getFullYear()) {
                    withdrawalsByMonth[i] += Number(withdrawal.nominal);
                    break;
                }
            }
        });
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
            }
            else if (desc.includes('wajib')) {
                savingsBreakdown.wajib += amount;
            }
            else {
                savingsBreakdown.sukarela += amount;
            }
        });
        const angkatanMap = new Map();
        users.forEach((user) => {
            const angkatan = user.angkatan || 'Lainnya';
            if (!angkatanMap.has(angkatan)) {
                angkatanMap.set(angkatan, { members: 0, savings: 0 });
            }
            const current = angkatanMap.get(angkatan);
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
        const angkatanData = Array.from(angkatanMap.entries()).map(([angkatan, data]) => ({
            angkatan,
            ...data,
        }));
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
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map