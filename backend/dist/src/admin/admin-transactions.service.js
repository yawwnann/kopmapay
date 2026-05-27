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
exports.AdminTransactionsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const notifications_service_1 = require("../notifications/notifications.service");
const email_service_1 = require("../email/email.service");
let AdminTransactionsService = class AdminTransactionsService {
    prisma;
    notificationsGateway;
    notificationsService;
    emailService;
    constructor(prisma, notificationsGateway, notificationsService, emailService) {
        this.prisma = prisma;
        this.notificationsGateway = notificationsGateway;
        this.notificationsService = notificationsService;
        this.emailService = emailService;
    }
    async addIncome(adminId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.isActive) {
            throw new common_1.BadRequestException('User account is not active');
        }
        const payment = await this.prisma.$transaction(async (tx) => {
            const newPayment = await tx.payment.create({
                data: {
                    userId: dto.userId,
                    nominal: new client_1.Prisma.Decimal(dto.nominal),
                    proofImage: '/uploads/proofs/admin-direct-deposit.png',
                    description: dto.description || 'Admin deposit',
                    paymentMethod: dto.paymentMethod,
                    status: 'APPROVED',
                    verifiedBy: adminId,
                    verifiedAt: new Date(),
                },
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
            await tx.saving.upsert({
                where: { userId: dto.userId },
                update: {
                    total: {
                        increment: dto.nominal,
                    },
                },
                create: {
                    userId: dto.userId,
                    total: new client_1.Prisma.Decimal(dto.nominal),
                },
            });
            const desc = (dto.description || '').toLowerCase();
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            if (desc.includes('wajib')) {
                await tx.mandatorySaving.upsert({
                    where: {
                        userId_month_year: {
                            userId: dto.userId,
                            month,
                            year,
                        },
                    },
                    update: {
                        nominal: new client_1.Prisma.Decimal(dto.nominal),
                        status: 'PAID',
                        paidAt: new Date(),
                        paymentId: newPayment.id,
                    },
                    create: {
                        userId: dto.userId,
                        month,
                        year,
                        nominal: new client_1.Prisma.Decimal(dto.nominal),
                        status: 'PAID',
                        paidAt: new Date(),
                        paymentId: newPayment.id,
                    },
                });
            }
            else if (!desc.includes('pokok')) {
                await tx.voluntarySaving.create({
                    data: {
                        userId: dto.userId,
                        nominal: new client_1.Prisma.Decimal(dto.nominal),
                        paymentId: newPayment.id,
                    },
                });
            }
            return newPayment;
        });
        this.notificationsGateway.broadcastPaymentUpdate(payment.userId, {
            id: payment.id,
            userName: payment.user.name,
            amount: Number(payment.nominal),
            status: payment.status,
        });
        await this.notificationsService.create({
            type: 'payment',
            title: 'Saldo Ditambahkan',
            message: `Admin telah menambahkan saldo sebesar Rp${Number(payment.nominal).toLocaleString('id-ID')} ke akun Anda${dto.description ? ` (${dto.description})` : ''}`,
            actionUrl: '/pembayaran/riwayat',
            userId: payment.userId,
        });
        await this.emailService.sendPaymentNotification(payment.user.email, payment.user.name, Number(payment.nominal), 'APPROVED');
        return {
            success: true,
            message: 'Income added successfully',
            payment,
        };
    }
    async addWithdrawal(adminId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.isActive) {
            throw new common_1.BadRequestException('User account is not active');
        }
        const saving = await this.prisma.saving.findUnique({
            where: { userId: dto.userId },
        });
        if (!saving || saving.total.lessThan(new client_1.Prisma.Decimal(dto.nominal))) {
            throw new common_1.BadRequestException(`Insufficient balance. Available: Rp${saving ? Number(saving.total).toLocaleString('id-ID') : '0'}`);
        }
        const approvedPayments = await this.prisma.payment.findMany({
            where: { userId: dto.userId, status: 'APPROVED' },
            select: { nominal: true, description: true },
        });
        const approvedWithdrawals = await this.prisma.withdrawal.findMany({
            where: { userId: dto.userId, status: 'APPROVED' },
            select: { nominal: true, savingType: true },
        });
        const breakdown = {
            Pokok: 0,
            Wajib: 0,
            Sukarela: 0,
        };
        approvedPayments.forEach((payment) => {
            const desc = (payment.description || '').toLowerCase();
            const amount = Number(payment.nominal);
            if (desc.includes('pokok')) {
                breakdown.Pokok += amount;
            }
            else if (desc.includes('wajib')) {
                breakdown.Wajib += amount;
            }
            else {
                breakdown.Sukarela += amount;
            }
        });
        approvedWithdrawals.forEach((withdrawal) => {
            const amount = Number(withdrawal.nominal);
            const type = withdrawal.savingType;
            if (type === 'Semua') {
                const currentTotal = breakdown.Pokok + breakdown.Wajib + breakdown.Sukarela;
                if (currentTotal > 0) {
                    breakdown.Pokok -= Math.round((amount * breakdown.Pokok) / currentTotal);
                    breakdown.Wajib -= Math.round((amount * breakdown.Wajib) / currentTotal);
                    breakdown.Sukarela -= Math.round((amount * breakdown.Sukarela) / currentTotal);
                }
            }
            else if (breakdown[type] !== undefined) {
                breakdown[type] -= amount;
            }
        });
        const availableBalance = breakdown[dto.savingType];
        if (availableBalance < dto.nominal) {
            throw new common_1.BadRequestException(`Insufficient balance for ${dto.savingType}. Available: Rp${availableBalance.toLocaleString('id-ID')}`);
        }
        const withdrawal = await this.prisma.$transaction(async (tx) => {
            const newWithdrawal = await tx.withdrawal.create({
                data: {
                    userId: dto.userId,
                    nominal: new client_1.Prisma.Decimal(dto.nominal),
                    reason: `[Admin] ${dto.reason}`,
                    savingType: dto.savingType,
                    paymentMethod: (dto.paymentMethod || 'Cash'),
                    status: 'APPROVED',
                    verifiedBy: adminId,
                    verifiedAt: new Date(),
                },
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
            await tx.saving.update({
                where: { userId: dto.userId },
                data: {
                    total: {
                        decrement: dto.nominal,
                    },
                },
            });
            return newWithdrawal;
        });
        this.notificationsGateway.broadcastWithdrawalUpdate(withdrawal.userId, {
            id: withdrawal.id,
            userName: withdrawal.user.name,
            amount: Number(withdrawal.nominal),
            status: withdrawal.status,
        });
        await this.notificationsService.create({
            type: 'withdrawal',
            title: 'Saldo Ditarik',
            message: `Admin telah menarik saldo sebesar Rp${Number(withdrawal.nominal).toLocaleString('id-ID')} dari akun Anda (${dto.reason})`,
            actionUrl: '/penarikan/riwayat',
            userId: withdrawal.userId,
        });
        await this.emailService.sendWithdrawalNotification(withdrawal.user.email, withdrawal.user.name, Number(withdrawal.nominal), 'APPROVED');
        return {
            success: true,
            message: 'Withdrawal added successfully',
            withdrawal,
        };
    }
};
exports.AdminTransactionsService = AdminTransactionsService;
exports.AdminTransactionsService = AdminTransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_gateway_1.NotificationsGateway,
        notifications_service_1.NotificationsService,
        email_service_1.EmailService])
], AdminTransactionsService);
//# sourceMappingURL=admin-transactions.service.js.map