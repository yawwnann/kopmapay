import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePaymentMethod } from '../common/utils/payment-method.util';

@Injectable()
export class WithdrawalsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsGateway: NotificationsGateway,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createWithdrawalDto: CreateWithdrawalDto) {
    // Check user's savings balance
    const saving = await this.prisma.saving.findUnique({
      where: { userId },
    });

    if (!saving) {
      throw new BadRequestException('Savings account not found');
    }

    if (
      saving.total.lessThan(new Prisma.Decimal(createWithdrawalDto.nominal))
    ) {
      throw new BadRequestException('Insufficient balance');
    }

    // Check for existing pending withdrawal to prevent duplicate submissions
    const existingPendingWithdrawal = await this.prisma.withdrawal.findFirst({
      where: { userId, status: 'PENDING' },
    });

    if (existingPendingWithdrawal) {
      throw new BadRequestException(
        'Anda masih memiliki penarikan yang menunggu verifikasi. Silakan tunggu admin memproses penarikan Anda sebelum mengajukan penarikan baru.',
      );
    }

    // Get savings breakdown to validate specific saving type balance
    const approvedPayments = await this.prisma.payment.findMany({
      where: { userId, status: 'APPROVED' },
      select: { nominal: true, description: true },
    });

    const approvedWithdrawals = await this.prisma.withdrawal.findMany({
      where: { userId, status: 'APPROVED' },
      select: { nominal: true, savingType: true },
    });

    // Calculate breakdown by type
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
      } else if (desc.includes('wajib')) {
        breakdown.Wajib += amount;
      } else {
        breakdown.Sukarela += amount;
      }
    });

    // Subtract approved withdrawals by type
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
      } else if (breakdown[type] !== undefined) {
        breakdown[type] -= amount;
      }
    });

    // Validate if user has enough balance for the specific saving type
    const requestedAmount = createWithdrawalDto.nominal;
    const availableBalance = breakdown[createWithdrawalDto.savingType];

    if (availableBalance < requestedAmount) {
      throw new BadRequestException(
        `Insufficient balance for ${createWithdrawalDto.savingType}. Available: Rp${availableBalance.toLocaleString('id-ID')}`,
      );
    }

    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        userId,
        nominal: new Prisma.Decimal(createWithdrawalDto.nominal),
        reason: createWithdrawalDto.reason,
        savingType: createWithdrawalDto.savingType,
        paymentMethod: normalizePaymentMethod(createWithdrawalDto.paymentMethod),
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

    // Notify Admins via WebSocket
    this.notificationsGateway.broadcastNewWithdrawal({
      id: withdrawal.id,
      userId: withdrawal.userId,
      userName: withdrawal.user.name,
      amount: Number(withdrawal.nominal),
      status: withdrawal.status,
    });

    // Create notification for admins via REST API
    await this.notificationsService.create({
      type: 'withdrawal',
      title: 'Penarikan Baru',
      message: `${withdrawal.user.name} mengajukan penarikan sebesar Rp${Number(withdrawal.nominal).toLocaleString('id-ID')}`,
      actionUrl: `/admin/verifikasi-penarikan`,
      isAdminNotification: true,
    });

    // Notify Admins via Email
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
    });

    for (const admin of admins) {
      await this.emailService.sendAdminWithdrawalNotification(
        admin.email,
        withdrawal.user.name,
        Number(withdrawal.nominal),
      );
    }

    return withdrawal;
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
    const where: Prisma.WithdrawalWhereInput = {};

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
      where.status = status as any;
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

  async approve(
    withdrawalId: string,
    approveWithdrawalDto: ApproveWithdrawalDto,
    adminId: string,
  ) {
    console.log('[WithdrawalsService] Approve called with ID:', withdrawalId);

    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    console.log(
      '[WithdrawalsService] Withdrawal found:',
      withdrawal ? withdrawal.id : 'NOT FOUND',
    );

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(
        `Withdrawal has already been processed (current status: ${withdrawal.status})`,
      );
    }

    // Update withdrawal status and decrement savings in a transaction
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
        } as any,
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

      // If approved, decrease user's savings
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

    // Notify User via WebSocket
    this.notificationsGateway.broadcastWithdrawalUpdate(
      updatedWithdrawal.userId,
      {
        id: updatedWithdrawal.id,
        userName: withdrawal.user.name,
        amount: Number(updatedWithdrawal.nominal),
        status: updatedWithdrawal.status,
      },
    );

    // Create notification for user via REST API
    await this.notificationsService.create({
      type: 'withdrawal',
      title: `Penarikan ${updatedWithdrawal.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`,
      message: `Penarikan Anda sebesar Rp${Number(updatedWithdrawal.nominal).toLocaleString('id-ID')} telah ${updatedWithdrawal.status === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
      actionUrl: `/penarikan/riwayat`,
      userId: updatedWithdrawal.userId,
    });

    // Notify User via Email
    this.emailService.sendWithdrawalNotification(
      withdrawal.user.email,
      withdrawal.user.name,
      Number(updatedWithdrawal.nominal),
      updatedWithdrawal.status as 'PENDING' | 'APPROVED' | 'REJECTED',
    );

    return updatedWithdrawal;
  }

  async findOne(id: string, userId?: string, role?: string) {
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
      throw new NotFoundException('Withdrawal not found');
    }

    // Authorization: ADMIN can view any withdrawal, ANGGOTA only their own
    if (role !== 'ADMIN' && withdrawal.userId !== userId) {
      throw new NotFoundException('Withdrawal not found');
    }

    return withdrawal;
  }

   async withdrawAll(userId: string, reason: string, paymentMethod?: string) {
     // Check user's savings balance
     const saving = await this.prisma.saving.findUnique({
       where: { userId },
     });

     if (!saving || saving.total.equals(0)) {
       throw new BadRequestException('No balance available to withdraw');
     }

     // Check for existing pending withdrawal to prevent duplicate submissions
     const existingPendingWithdrawal = await this.prisma.withdrawal.findFirst({
       where: { userId, status: 'PENDING' },
     });

     if (existingPendingWithdrawal) {
       throw new BadRequestException(
         'Anda masih memiliki penarikan yang menunggu verifikasi. Silakan tunggu admin memproses penarikan Anda sebelum mengajukan penarikan baru.',
       );
     }

     // Get savings breakdown
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
      if (desc.includes('pokok')) breakdown.Pokok += amount;
      else if (desc.includes('wajib')) breakdown.Wajib += amount;
      else breakdown.Sukarela += amount;
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
      } else if (breakdown[type] !== undefined) {
        breakdown[type] -= amount;
      }
    });

    const totalAmount = Number(saving.total);
    if (totalAmount <= 0) {
      throw new BadRequestException(
        'No sufficient balance available to withdraw.',
      );
    }

    // Build breakdown summary
    const breakdownParts: string[] = [];
    if (breakdown.Pokok > 0)
      breakdownParts.push(
        `Pokok: Rp${breakdown.Pokok.toLocaleString('id-ID')}`,
      );
    if (breakdown.Wajib > 0)
      breakdownParts.push(
        `Wajib: Rp${breakdown.Wajib.toLocaleString('id-ID')}`,
      );
    if (breakdown.Sukarela > 0)
      breakdownParts.push(
        `Sukarela: Rp${breakdown.Sukarela.toLocaleString('id-ID')}`,
      );

    const fullReason =
      breakdownParts.length > 0
        ? `${reason || 'Lulus / Penarikan Semua'} (${breakdownParts.join(', ')})`
        : reason || 'Lulus / Penarikan Semua';

    // Create single withdrawal covering all saving types
    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        userId,
        nominal: new Prisma.Decimal(totalAmount),
        reason: fullReason,
        savingType: 'Semua' as any,
        paymentMethod: normalizePaymentMethod(paymentMethod),
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify Admins
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
      this.emailService.sendAdminWithdrawalNotification(
        admin.email,
        withdrawal.user.name,
        totalAmount,
      );
    }

    return { success: true, withdrawals: [withdrawal] };
  }
}
