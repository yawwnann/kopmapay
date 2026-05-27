import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
export declare class WithdrawalsService {
    private prisma;
    private emailService;
    private notificationsGateway;
    private notificationsService;
    constructor(prisma: PrismaService, emailService: EmailService, notificationsGateway: NotificationsGateway, notificationsService: NotificationsService);
    create(userId: string, createWithdrawalDto: CreateWithdrawalDto): Promise<{
        user: {
            email: string;
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.WithdrawalStatus;
        updatedAt: Date;
        nominal: Prisma.Decimal;
        paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        reason: string;
        savingType: import("@prisma/client").$Enums.SavingType;
        rejectionReason: string | null;
    }>;
    findAll(role: string, userId: string, filterUserId?: string, startDate?: string, endDate?: string, status?: string): Promise<({
        user: {
            email: string;
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.WithdrawalStatus;
        updatedAt: Date;
        nominal: Prisma.Decimal;
        paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        reason: string;
        savingType: import("@prisma/client").$Enums.SavingType;
        rejectionReason: string | null;
    })[]>;
    approve(withdrawalId: string, approveWithdrawalDto: ApproveWithdrawalDto, adminId: string): Promise<{
        user: {
            email: string;
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.WithdrawalStatus;
        updatedAt: Date;
        nominal: Prisma.Decimal;
        paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        reason: string;
        savingType: import("@prisma/client").$Enums.SavingType;
        rejectionReason: string | null;
    }>;
    findOne(id: string, userId?: string, role?: string): Promise<{
        user: {
            email: string;
            id: string;
            name: string;
            angkatan: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.WithdrawalStatus;
        updatedAt: Date;
        nominal: Prisma.Decimal;
        paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        reason: string;
        savingType: import("@prisma/client").$Enums.SavingType;
        rejectionReason: string | null;
    }>;
    withdrawAll(userId: string, reason: string, paymentMethod?: string): Promise<{
        success: boolean;
        withdrawals: ({
            user: {
                email: string;
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            status: import("@prisma/client").$Enums.WithdrawalStatus;
            updatedAt: Date;
            nominal: Prisma.Decimal;
            paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
            verifiedBy: string | null;
            verifiedAt: Date | null;
            reason: string;
            savingType: import("@prisma/client").$Enums.SavingType;
            rejectionReason: string | null;
        })[];
    }>;
}
