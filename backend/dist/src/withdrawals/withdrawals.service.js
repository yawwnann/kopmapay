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
exports.WithdrawalsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const notifications_service_1 = require("../notifications/notifications.service");
let WithdrawalsService = class WithdrawalsService {
    prisma;
    emailService;
    notificationsGateway;
    notificationsService;
    constructor(prisma, emailService, notificationsGateway, notificationsService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.notificationsGateway = notificationsGateway;
        this.notificationsService = notificationsService;
    }
    async create(userId, createWithdrawalDto) {
        const saving = await this.prisma.saving.findUnique({
            where: { userId },
        });
        if (!saving) {
            throw new common_1.BadRequestException('Savings account not found');
        }
        if (saving.total.lessThan(new client_1.Prisma.Decimal(createWithdrawalDto.nominal))) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        const existingPendingWithdrawal = await this.prisma.withdrawal.findFirst({
            where: { userId, status: 'PENDING' },
        });
        if (existingPendingWithdrawal) {
            throw new common_1.BadRequestException('Anda masih memiliki penarikan yang menunggu verifikasi. Silakan tunggu admin memproses penarikan Anda sebelum mengajukan penarikan baru.');
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
        const requestedAmount = createWithdrawalDto.nominal;
        const availableBalance = breakdown[createWithdrawalDto.savingType];
        if (availableBalance < requestedAmount) {
            throw new common_1.BadRequestException(`Insufficient balance for ${createWithdrawalDto.savingType}. Available: Rp${availableBalance.toLocaleString('id-ID')}`);
        }
        const withdrawal = await this.prisma.withdrawal.create({
            data: {
                userId,
                nominal: new client_1.Prisma.Decimal(createWithdrawalDto.nominal),
                reason: createWithdrawalDto.reason,
                savingType: createWithdrawalDto.savingType,
                paymentMethod: (createWithdrawalDto.paymentMethod || 'Cash'),
                status: 'PENDING',
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
        this.notificationsGateway.broadcastNewWithdrawal({
            id: withdrawal.id,
            userId: withdrawal.userId,
            userName: withdrawal.user.name,
            amount: Number(withdrawal.nominal),
            status: withdrawal.status,
        });
        await this.notificationsService.create({
            type: 'withdrawal',
            title: 'Penarikan Baru',
            message: `${withdrawal.user.name} mengajukan penarikan sebesar Rp${Number(withdrawal.nominal).toLocaleString('id-ID')}`,
            actionUrl: `/admin/verifikasi-penarikan`,
            isAdminNotification: true,
        });
        const admins = await this.prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { email: true },
        });
        for (const admin of admins) {
            await this.emailService.sendAdminWithdrawalNotification(admin.email, withdrawal.user.name, Number(withdrawal.nominal));
        }
        return withdrawal;
    }
    async findAll(role, userId, filterUserId, startDate, endDate, status) {
        const where = {};
        if (filterUserId) {
            where.userId = filterUserId;
        }
        else if (role !== 'ADMIN') {
            where.userId = userId;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        if (status) {
            where.status = status;
        }
        if (role === 'ADMIN') {
            return this.prisma.withdrawal.findMany({
                where,
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
                    createdAt: 'desc',
                },
            });
        }
        return this.prisma.withdrawal.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async approve(withdrawalId, approveWithdrawalDto, adminId) {
        console.log('[WithdrawalsService] Approve called with ID:', withdrawalId);
        const withdrawal = await this.prisma.withdrawal.findUnique({
            where: { id: withdrawalId },
            include: { user: true },
        });
        console.log('[WithdrawalsService] Withdrawal found:', withdrawal ? withdrawal.id : 'NOT FOUND');
        if (!withdrawal) {
            throw new common_1.NotFoundException('Withdrawal not found');
        }
        if (withdrawal.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Withdrawal has already been processed (current status: ${withdrawal.status})`);
        }
        const updatedWithdrawal = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.withdrawal.update({
                where: { id: withdrawalId },
                data: {
                    status: approveWithdrawalDto.status,
                    ...(approveWithdrawalDto.rejectionReason !== undefined && {
                        rejectionReason: approveWithdrawalDto.rejectionReason,
                    }),
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
            if (approveWithdrawalDto.status === 'APPROVED') {
                await tx.saving.update({
                    where: { userId: withdrawal.userId },
                    data: {
                        total: {
                            decrement: withdrawal.nominal,
                        },
                    },
                });
            }
            return updated;
        });
        this.notificationsGateway.broadcastWithdrawalUpdate(updatedWithdrawal.userId, {
            id: updatedWithdrawal.id,
            userName: withdrawal.user.name,
            amount: Number(updatedWithdrawal.nominal),
            status: updatedWithdrawal.status,
        });
        await this.notificationsService.create({
            type: 'withdrawal',
            title: `Penarikan ${updatedWithdrawal.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`,
            message: `Penarikan Anda sebesar Rp${Number(updatedWithdrawal.nominal).toLocaleString('id-ID')} telah ${updatedWithdrawal.status === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
            actionUrl: `/penarikan/riwayat`,
            userId: updatedWithdrawal.userId,
        });
        this.emailService.sendWithdrawalNotification(withdrawal.user.email, withdrawal.user.name, Number(updatedWithdrawal.nominal), updatedWithdrawal.status);
        return updatedWithdrawal;
    }
    async findOne(id, userId, role) {
        const withdrawal = await this.prisma.withdrawal.findUnique({
            where: { id },
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
        });
        if (!withdrawal) {
            throw new common_1.NotFoundException('Withdrawal not found');
        }
        if (role !== 'ADMIN' && withdrawal.userId !== userId) {
            throw new common_1.NotFoundException('Withdrawal not found');
        }
        return withdrawal;
    }
    async withdrawAll(userId, reason, paymentMethod) {
        const saving = await this.prisma.saving.findUnique({
            where: { userId },
        });
        if (!saving || saving.total.equals(0)) {
            throw new common_1.BadRequestException('No balance available to withdraw');
        }
        const existingPendingWithdrawal = await this.prisma.withdrawal.findFirst({
            where: { userId, status: 'PENDING' },
        });
        if (existingPendingWithdrawal) {
            throw new common_1.BadRequestException('Anda masih memiliki penarikan yang menunggu verifikasi. Silakan tunggu admin memproses penarikan Anda sebelum mengajukan penarikan baru.');
        }
        const approvedPayments = await this.prisma.payment.findMany({
            where: { userId, status: 'APPROVED' },
            select: { nominal: true, description: true },
        });
        const approvedWithdrawals = await this.prisma.withdrawal.findMany({
            where: { userId, status: 'APPROVED' },
            select: { nominal: true, savingType: true },
        });
        const breakdown = { Pokok: 0, Wajib: 0, Sukarela: 0 };
        approvedPayments.forEach((payment) => {
            const desc = (payment.description || '').toLowerCase();
            const amount = Number(payment.nominal);
            if (desc.includes('pokok'))
                breakdown.Pokok += amount;
            else if (desc.includes('wajib'))
                breakdown.Wajib += amount;
            else
                breakdown.Sukarela += amount;
        });
        approvedWithdrawals.forEach((w) => {
            const amount = Number(w.nominal);
            const type = w.savingType;
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
        const totalAmount = Number(saving.total);
        if (totalAmount <= 0) {
            throw new common_1.BadRequestException('No sufficient balance available to withdraw.');
        }
        const breakdownParts = [];
        if (breakdown.Pokok > 0)
            breakdownParts.push(`Pokok: Rp${breakdown.Pokok.toLocaleString('id-ID')}`);
        if (breakdown.Wajib > 0)
            breakdownParts.push(`Wajib: Rp${breakdown.Wajib.toLocaleString('id-ID')}`);
        if (breakdown.Sukarela > 0)
            breakdownParts.push(`Sukarela: Rp${breakdown.Sukarela.toLocaleString('id-ID')}`);
        const fullReason = breakdownParts.length > 0
            ? `${reason || 'Lulus / Penarikan Semua'} (${breakdownParts.join(', ')})`
            : reason || 'Lulus / Penarikan Semua';
        const withdrawal = await this.prisma.withdrawal.create({
            data: {
                userId,
                nominal: new client_1.Prisma.Decimal(totalAmount),
                reason: fullReason,
                savingType: 'Semua',
                paymentMethod: (paymentMethod || 'Cash'),
                status: 'PENDING',
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        this.notificationsGateway.broadcastNewWithdrawal({
            id: withdrawal.id,
            userId: withdrawal.userId,
            userName: withdrawal.user.name,
            amount: totalAmount,
            status: 'PENDING',
        });
        await this.notificationsService.create({
            type: 'withdrawal',
            title: 'Penarikan Semua (Lulus)',
            message: `${withdrawal.user.name} mengajukan penarikan semua saldo sebesar Rp${totalAmount.toLocaleString('id-ID')}`,
            actionUrl: `/admin/verifikasi-penarikan`,
            isAdminNotification: true,
        });
        const admins = await this.prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { email: true },
        });
        for (const admin of admins) {
            this.emailService.sendAdminWithdrawalNotification(admin.email, withdrawal.user.name, totalAmount);
        }
        return { success: true, withdrawals: [withdrawal] };
    }
};
exports.WithdrawalsService = WithdrawalsService;
exports.WithdrawalsService = WithdrawalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        notifications_gateway_1.NotificationsGateway,
        notifications_service_1.NotificationsService])
], WithdrawalsService);
//# sourceMappingURL=withdrawals.service.js.map