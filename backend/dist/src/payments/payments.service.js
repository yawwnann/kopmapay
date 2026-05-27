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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const notifications_service_1 = require("../notifications/notifications.service");
let PaymentsService = class PaymentsService {
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
    async create(userId, createPaymentDto, proofImage) {
        const payment = await this.prisma.payment.create({
            data: {
                userId,
                nominal: new client_1.Prisma.Decimal(createPaymentDto.nominal),
                proofImage,
                description: createPaymentDto.description,
                paymentMethod: createPaymentDto.paymentMethod,
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
        this.notificationsGateway.broadcastNewPayment({
            id: payment.id,
            userId: payment.userId,
            userName: payment.user.name,
            amount: Number(payment.nominal),
            status: payment.status,
        });
        await this.notificationsService.create({
            type: 'payment',
            title: 'Pembayaran Baru',
            message: `${payment.user.name} mengajukan pembayaran sebesar Rp${Number(payment.nominal).toLocaleString('id-ID')}`,
            actionUrl: `/admin/verifikasi-pembayaran`,
            isAdminNotification: true,
        });
        const admins = await this.prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { email: true },
        });
        for (const admin of admins) {
            await this.emailService.sendAdminPaymentNotification(admin.email, payment.user.name, Number(payment.nominal));
        }
        return payment;
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
            return this.prisma.payment.findMany({
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
        return this.prisma.payment.findMany({
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
    async approve(paymentId, approvePaymentDto, adminId) {
        console.log('[PaymentsService] Approve called with ID:', paymentId);
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: { user: true },
        });
        console.log('[PaymentsService] Payment found:', payment ? payment.id : 'NOT FOUND');
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Payment has already been processed (current status: ${payment.status})`);
        }
        const updatedPayment = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: approvePaymentDto.status,
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
            if (approvePaymentDto.status === 'APPROVED') {
                await tx.saving.upsert({
                    where: { userId: payment.userId },
                    update: {
                        total: {
                            increment: payment.nominal,
                        },
                    },
                    create: {
                        userId: payment.userId,
                        total: payment.nominal,
                    },
                });
                const desc = (payment.description || '').toLowerCase();
                const paymentDate = new Date(payment.createdAt);
                const month = paymentDate.getMonth() + 1;
                const year = paymentDate.getFullYear();
                if (desc.includes('wajib')) {
                    await tx.mandatorySaving.upsert({
                        where: {
                            userId_month_year: {
                                userId: payment.userId,
                                month,
                                year,
                            },
                        },
                        update: {
                            nominal: payment.nominal,
                            status: 'PAID',
                            paidAt: new Date(),
                            paymentId: payment.id,
                        },
                        create: {
                            userId: payment.userId,
                            month,
                            year,
                            nominal: payment.nominal,
                            status: 'PAID',
                            paidAt: new Date(),
                            paymentId: payment.id,
                        },
                    });
                }
                else if (!desc.includes('pokok')) {
                    await tx.voluntarySaving.create({
                        data: {
                            userId: payment.userId,
                            nominal: payment.nominal,
                            paymentId: payment.id,
                        },
                    });
                }
            }
            return updated;
        }, { timeout: 10000 });
        this.notificationsGateway.broadcastPaymentUpdate(updatedPayment.userId, {
            id: updatedPayment.id,
            userName: updatedPayment.user.name,
            amount: Number(updatedPayment.nominal),
            status: updatedPayment.status,
        });
        await this.notificationsService.create({
            type: 'payment',
            title: `Pembayaran ${updatedPayment.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`,
            message: `Pembayaran Anda sebesar Rp${Number(updatedPayment.nominal).toLocaleString('id-ID')} telah ${updatedPayment.status === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
            actionUrl: `/pembayaran/riwayat`,
            userId: updatedPayment.userId,
        });
        await this.emailService.sendPaymentNotification(updatedPayment.user.email, updatedPayment.user.name, Number(updatedPayment.nominal), updatedPayment.status);
        return updatedPayment;
    }
    async findOne(id, userId, role) {
        const payment = await this.prisma.payment.findUnique({
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
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (role !== 'ADMIN' && payment.userId !== userId) {
            throw new common_1.NotFoundException('Payment not found');
        }
        return payment;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        notifications_gateway_1.NotificationsGateway,
        notifications_service_1.NotificationsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map