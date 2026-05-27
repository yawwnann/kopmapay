import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminCreateIncomeDto, AdminCreateWithdrawalDto } from './dto/admin-transaction.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
export declare class AdminTransactionsService {
    private prisma;
    private notificationsGateway;
    private notificationsService;
    private emailService;
    constructor(prisma: PrismaService, notificationsGateway: NotificationsGateway, notificationsService: NotificationsService, emailService: EmailService);
    addIncome(adminId: string, dto: AdminCreateIncomeDto): Promise<{
        success: boolean;
        message: string;
        payment: {
            user: {
                email: string;
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            updatedAt: Date;
            description: string | null;
            nominal: Prisma.Decimal;
            proofImage: string;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            verifiedBy: string | null;
            verifiedAt: Date | null;
        };
    }>;
    addWithdrawal(adminId: string, dto: AdminCreateWithdrawalDto): Promise<{
        success: boolean;
        message: string;
        withdrawal: {
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
        };
    }>;
}
