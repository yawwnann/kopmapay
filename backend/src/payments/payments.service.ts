import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApprovePaymentDto } from './dto/approve-payment.dto';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePaymentMethod } from '../common/utils/payment-method.util';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsGateway: NotificationsGateway,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    createPaymentDto: CreatePaymentDto,
    proofImage: string,
  ) {
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        nominal: new Prisma.Decimal(createPaymentDto.nominal),
        proofImage,
        description: createPaymentDto.description,
        paymentMethod: normalizePaymentMethod(
          createPaymentDto.paymentMethod,
        ) as any,
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
    }) as any;

    // Send notification to admins via WebSocket
    this.notificationsGateway.broadcastNewPayment({
      id: payment.id,
      userId: payment.userId,
      userName: payment.user.name,
      amount: Number(payment.nominal),
      status: payment.status,
    });

    // Create notification for REST API
    await this.notificationsService.create({
      type: 'payment',
      title: 'Pembayaran Baru',
      message: `${payment.user.name} mengajukan pembayaran sebesar Rp${Number(payment.nominal).toLocaleString('id-ID')}`,
      actionUrl: `/admin/verifikasi-pembayaran`,
      isAdminNotification: true,
    });

    // Send email notification to admins (fetch admin emails from users table)
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
    });

    for (const admin of admins) {
      await this.emailService.sendAdminPaymentNotification(
        admin.email,
        payment.user.name,
        Number(payment.nominal),
      );
    }

    return payment;
  }

  async findAll(
    role: string,
    userId: string,
    filterUserId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ) {
    // Build where clause
    const where: Prisma.PaymentWhereInput = {};

    // Add user filter
    // If filterUserId is provided (admin explicitly querying a specific user), use it
    // Otherwise, if not admin, filter by own userId
    if (filterUserId) {
      where.userId = filterUserId;
    } else if (role !== 'ADMIN') {
      where.userId = userId;
    }

    // Add date filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Add status filter
    if (status) {
      where.status = status as 'PENDING' | 'APPROVED' | 'REJECTED';
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

  async approve(
    paymentId: string,
    approvePaymentDto: ApprovePaymentDto,
    adminId: string,
  ) {
    console.log('[PaymentsService] Approve called with ID:', paymentId);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    console.log(
      '[PaymentsService] Payment found:',
      payment ? payment.id : 'NOT FOUND',
    );

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException(
        `Payment has already been processed (current status: ${payment.status})`,
      );
    }

    // Update payment status and, if approved, update savings — all in a single transaction
    const updatedPayment = await this.prisma.$transaction(
      async (tx) => {
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

        // If approved, update user's savings and track in dedicated tables
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

          // Track in MandatorySaving or VoluntarySaving based on description
          const desc = (payment.description || '').toLowerCase();
          const paymentDate = new Date(payment.createdAt);
          const month = paymentDate.getMonth() + 1; // 1-12
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
          } else if (!desc.includes('pokok')) {
            // Voluntary saving (not pokok and not wajib)
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
      },
      { timeout: 10000 },
    );

    // Send notification to the user via WebSocket
    this.notificationsGateway.broadcastPaymentUpdate(updatedPayment.userId, {
      id: updatedPayment.id,
      userName: updatedPayment.user.name,
      amount: Number(updatedPayment.nominal),
      status: updatedPayment.status,
    });

    // Create notification for user via REST API
    await this.notificationsService.create({
      type: 'payment',
      title: `Pembayaran ${updatedPayment.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`,
      message: `Pembayaran Anda sebesar Rp${Number(updatedPayment.nominal).toLocaleString('id-ID')} telah ${updatedPayment.status === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
      actionUrl: `/pembayaran/riwayat`,
      userId: updatedPayment.userId,
    });

    // Send email notification to the user
    await this.emailService.sendPaymentNotification(
      updatedPayment.user.email,
      updatedPayment.user.name,
      Number(updatedPayment.nominal),
      updatedPayment.status as 'PENDING' | 'APPROVED' | 'REJECTED',
    );

    return updatedPayment;
  }

  async findOne(id: string, userId?: string, role?: string) {
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
      throw new NotFoundException('Payment not found');
    }

    // Authorization: ADMIN can view any payment, ANGGOTA only their own
    if (role !== 'ADMIN' && payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
