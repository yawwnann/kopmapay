import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminCreateIncomeDto,
  AdminCreateWithdrawalDto,
} from './dto/admin-transaction.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AdminTransactionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  /**
   * Admin adds income directly to member's savings
   * Creates an APPROVED payment directly (no verification needed)
   */
  async addIncome(adminId: string, dto: AdminCreateIncomeDto) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User account is not active');
    }

    // Create payment with APPROVED status directly
    const payment = await this.prisma.$transaction(async (tx) => {
      // Create payment record as APPROVED
      const newPayment = await tx.payment.create({
        data: {
          userId: dto.userId,
          nominal: new Prisma.Decimal(dto.nominal),
          proofImage: '/uploads/proofs/admin-direct-deposit.png',
          description: dto.description || 'Admin deposit',
          paymentMethod: dto.paymentMethod as any,
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

      // Update user's savings
      await tx.saving.upsert({
        where: { userId: dto.userId },
        update: {
          total: {
            increment: dto.nominal,
          },
        },
        create: {
          userId: dto.userId,
          total: new Prisma.Decimal(dto.nominal),
        },
      });

      // Track in MandatorySaving or VoluntarySaving based on description
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
            nominal: new Prisma.Decimal(dto.nominal),
            status: 'PAID',
            paidAt: new Date(),
            paymentId: newPayment.id,
          },
          create: {
            userId: dto.userId,
            month,
            year,
            nominal: new Prisma.Decimal(dto.nominal),
            status: 'PAID',
            paidAt: new Date(),
            paymentId: newPayment.id,
          },
        });
      } else if (!desc.includes('pokok')) {
        // Voluntary saving (not pokok and not wajib)
        await tx.voluntarySaving.create({
          data: {
            userId: dto.userId,
            nominal: new Prisma.Decimal(dto.nominal),
            paymentId: newPayment.id,
          },
        });
      }

      return newPayment;
    });

    // Notify user via WebSocket
    this.notificationsGateway.broadcastPaymentUpdate(payment.userId, {
      id: payment.id,
      userName: payment.user.name,
      amount: Number(payment.nominal),
      status: payment.status,
    });

    // Create notification for user
    await this.notificationsService.create({
      type: 'payment',
      title: 'Saldo Ditambahkan',
      message: `Admin telah menambahkan saldo sebesar Rp${Number(payment.nominal).toLocaleString('id-ID')} ke akun Anda${dto.description ? ` (${dto.description})` : ''}`,
      actionUrl: '/pembayaran/riwayat',
      userId: payment.userId,
    });

    // Send email notification
    await this.emailService.sendPaymentNotification(
      payment.user.email,
      payment.user.name,
      Number(payment.nominal),
      'APPROVED',
    );

    return {
      success: true,
      message: 'Income added successfully',
      payment,
    };
  }

  /**
   * Admin adds withdrawal directly for member
   * Creates an APPROVED withdrawal directly (no verification needed)
   */
  async addWithdrawal(adminId: string, dto: AdminCreateWithdrawalDto) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User account is not active');
    }

    // Check savings balance
    const saving = await this.prisma.saving.findUnique({
      where: { userId: dto.userId },
    });

    if (!saving || saving.total.lessThan(new Prisma.Decimal(dto.nominal))) {
      throw new BadRequestException(
        `Insufficient balance. Available: Rp${saving ? Number(saving.total).toLocaleString('id-ID') : '0'}`,
      );
    }

    // Get savings breakdown to validate specific saving type balance
    const approvedPayments = await this.prisma.payment.findMany({
      where: { userId: dto.userId, status: 'APPROVED' },
      select: { nominal: true, description: true },
    });

    const approvedWithdrawals = await this.prisma.withdrawal.findMany({
      where: { userId: dto.userId, status: 'APPROVED' },
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
        const currentTotal =
          breakdown.Pokok + breakdown.Wajib + breakdown.Sukarela;
        if (currentTotal > 0) {
          breakdown.Pokok -= Math.round(
            (amount * breakdown.Pokok) / currentTotal,
          );
          breakdown.Wajib -= Math.round(
            (amount * breakdown.Wajib) / currentTotal,
          );
          breakdown.Sukarela -= Math.round(
            (amount * breakdown.Sukarela) / currentTotal,
          );
        }
      } else if (breakdown[type] !== undefined) {
        breakdown[type] -= amount;
      }
    });

    // Validate if user has enough balance for the specific saving type
    const availableBalance = breakdown[dto.savingType];

    if (availableBalance < dto.nominal) {
      throw new BadRequestException(
        `Insufficient balance for ${dto.savingType}. Available: Rp${availableBalance.toLocaleString('id-ID')}`,
      );
    }

    // Create withdrawal with APPROVED status directly
    const withdrawal = await this.prisma.$transaction(async (tx) => {
      // Create withdrawal record as APPROVED
      const newWithdrawal = await tx.withdrawal.create({
        data: {
          userId: dto.userId,
          nominal: new Prisma.Decimal(dto.nominal),
          reason: `[Admin] ${dto.reason}`,
          savingType: dto.savingType as any,
          paymentMethod: (dto.paymentMethod || 'Cash') as any,
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

      // Decrease user's savings
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

    // Notify user via WebSocket
    this.notificationsGateway.broadcastWithdrawalUpdate(withdrawal.userId, {
      id: withdrawal.id,
      userName: withdrawal.user.name,
      amount: Number(withdrawal.nominal),
      status: withdrawal.status,
    });

    // Create notification for user
    await this.notificationsService.create({
      type: 'withdrawal',
      title: 'Saldo Ditarik',
      message: `Admin telah menarik saldo sebesar Rp${Number(withdrawal.nominal).toLocaleString('id-ID')} dari akun Anda (${dto.reason})`,
      actionUrl: '/penarikan/riwayat',
      userId: withdrawal.userId,
    });

    // Send email notification
    await this.emailService.sendWithdrawalNotification(
      withdrawal.user.email,
      withdrawal.user.name,
      Number(withdrawal.nominal),
      'APPROVED',
    );

    return {
      success: true,
      message: 'Withdrawal added successfully',
      withdrawal,
    };
  }
}
