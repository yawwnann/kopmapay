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
exports.SavingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SavingsService = class SavingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMySavings(userId) {
        const saving = await this.prisma.saving.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!saving) {
            throw new common_1.NotFoundException('Savings account not found');
        }
        return saving;
    }
    async getSavingsBreakdown(userId) {
        const saving = await this.prisma.saving.findUnique({
            where: { userId },
        });
        if (!saving) {
            throw new common_1.NotFoundException('Savings account not found');
        }
        const approvedPayments = await this.prisma.payment.findMany({
            where: { userId, status: 'APPROVED' },
            select: { nominal: true, description: true },
        });
        const approvedWithdrawals = await this.prisma.withdrawal.findMany({
            where: { userId, status: 'APPROVED' },
            select: { nominal: true, savingType: true },
        });
        const breakdown = {
            pokok: 0,
            wajib: 0,
            sukarela: 0,
        };
        approvedPayments.forEach((payment) => {
            const desc = (payment.description || '').toLowerCase();
            const amount = Number(payment.nominal);
            if (desc.includes('pokok')) {
                breakdown.pokok += amount;
            }
            else if (desc.includes('wajib')) {
                breakdown.wajib += amount;
            }
            else {
                breakdown.sukarela += amount;
            }
        });
        approvedWithdrawals.forEach((withdrawal) => {
            const amount = Number(withdrawal.nominal);
            const type = withdrawal.savingType.toLowerCase();
            if (type === 'semua') {
                const currentTotal = breakdown.pokok + breakdown.wajib + breakdown.sukarela;
                if (currentTotal > 0) {
                    breakdown.pokok -= Math.round((amount * breakdown.pokok) / currentTotal);
                    breakdown.wajib -= Math.round((amount * breakdown.wajib) / currentTotal);
                    breakdown.sukarela -= Math.round((amount * breakdown.sukarela) / currentTotal);
                }
            }
            else if (type === 'pokok') {
                breakdown.pokok -= amount;
            }
            else if (type === 'wajib') {
                breakdown.wajib -= amount;
            }
            else {
                breakdown.sukarela -= amount;
            }
        });
        return {
            total: Number(saving.total),
            breakdown,
            details: [
                { type: 'Simpanan Pokok', amount: breakdown.pokok },
                { type: 'Simpanan Wajib', amount: breakdown.wajib },
                { type: 'Simpanan Sukarela', amount: breakdown.sukarela },
            ],
        };
    }
    async getSavingsChart(userId) {
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
        const approvedPayments = await this.prisma.payment.findMany({
            where: { userId, status: 'APPROVED' },
            select: { nominal: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        const withdrawals = await this.prisma.withdrawal.findMany({
            where: { userId, status: 'APPROVED' },
            select: { nominal: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        const chartData = months.map((label, index) => {
            const targetDate = new Date();
            targetDate.setMonth(targetDate.getMonth() - (5 - index));
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();
            let cumulativeSavings = 0;
            approvedPayments.forEach((payment) => {
                const paymentDate = new Date(payment.createdAt);
                if (paymentDate.getFullYear() < targetYear ||
                    (paymentDate.getFullYear() === targetYear &&
                        paymentDate.getMonth() <= targetMonth)) {
                    cumulativeSavings += Number(payment.nominal);
                }
            });
            withdrawals.forEach((withdrawal) => {
                const withdrawalDate = new Date(withdrawal.createdAt);
                if (withdrawalDate.getFullYear() < targetYear ||
                    (withdrawalDate.getFullYear() === targetYear &&
                        withdrawalDate.getMonth() <= targetMonth)) {
                    cumulativeSavings -= Number(withdrawal.nominal);
                }
            });
            return {
                label,
                balance: Math.max(0, cumulativeSavings),
            };
        });
        return {
            labels: months,
            data: chartData,
        };
    }
    async getAllSavings() {
        return this.prisma.saving.findMany({
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
            orderBy: {
                total: 'desc',
            },
        });
    }
    async getSavingsHistory(userId) {
        const mandatorySavings = await this.prisma.mandatorySaving.findMany({
            where: { userId },
            include: {
                payment: {
                    select: {
                        id: true,
                        createdAt: true,
                        status: true,
                        paymentMethod: true,
                    },
                },
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });
        const voluntarySavings = await this.prisma.voluntarySaving.findMany({
            where: { userId },
            include: {
                payment: {
                    select: {
                        id: true,
                        createdAt: true,
                        status: true,
                        paymentMethod: true,
                    },
                },
            },
        });
        const voluntaryWithdrawals = await this.prisma.withdrawal.findMany({
            where: { userId, status: 'APPROVED', savingType: 'Sukarela' },
            select: {
                id: true,
                nominal: true,
                createdAt: true,
                paymentMethod: true,
            },
        });
        const combinedVoluntary = [
            ...voluntarySavings.map((vs) => ({
                id: vs.id,
                nominal: Number(vs.nominal),
                createdAt: vs.createdAt,
                payment: vs.payment,
            })),
            ...voluntaryWithdrawals.map((vw) => ({
                id: vw.id,
                nominal: -Number(vw.nominal),
                createdAt: vw.createdAt,
                payment: {
                    id: vw.id,
                    createdAt: vw.createdAt,
                    status: 'APPROVED',
                    paymentMethod: vw.paymentMethod,
                },
            })),
        ].sort((a, b) => new Date(b.payment?.createdAt || b.createdAt).getTime() - new Date(a.payment?.createdAt || a.createdAt).getTime());
        return {
            userId,
            mandatorySavings: mandatorySavings.map((ms) => ({
                id: ms.id,
                month: ms.month,
                year: ms.year,
                nominal: Number(ms.nominal),
                status: ms.status,
                paidAt: ms.paidAt,
                payment: ms.payment,
            })),
            voluntarySavings: combinedVoluntary,
        };
    }
};
exports.SavingsService = SavingsService;
exports.SavingsService = SavingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SavingsService);
//# sourceMappingURL=savings.service.js.map