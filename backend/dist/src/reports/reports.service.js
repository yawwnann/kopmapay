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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDailyReport(date) {
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
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
    async getAngkatanReport(angkatan) {
        const whereClause = { role: 'ANGGOTA' };
        if (angkatan) {
            whereClause.angkatan = angkatan;
        }
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
        const angkatanMap = new Map();
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
            angkatanData.totalPayments += user.payments.reduce((sum, p) => sum + Number(p.nominal), 0);
            angkatanData.totalWithdrawals += user.withdrawals.reduce((sum, w) => sum + Number(w.nominal), 0);
            angkatanData.members.push({
                id: user.id,
                name: user.name,
                email: user.email,
                savings: user.savings ? Number(user.savings.total) : 0,
            });
        });
        const reports = Array.from(angkatanMap.values());
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map