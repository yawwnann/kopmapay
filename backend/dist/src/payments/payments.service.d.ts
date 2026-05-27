import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApprovePaymentDto } from './dto/approve-payment.dto';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
export declare class PaymentsService {
    private prisma;
    private emailService;
    private notificationsGateway;
    private notificationsService;
    constructor(prisma: PrismaService, emailService: EmailService, notificationsGateway: NotificationsGateway, notificationsService: NotificationsService);
    create(userId: string, createPaymentDto: CreatePaymentDto, proofImage: string): Promise<{
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
        status: import("@prisma/client").$Enums.PaymentStatus;
        updatedAt: Date;
        description: string | null;
        nominal: Prisma.Decimal;
        proofImage: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
    })[]>;
    approve(paymentId: string, approvePaymentDto: ApprovePaymentDto, adminId: string): Promise<{
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
        status: import("@prisma/client").$Enums.PaymentStatus;
        updatedAt: Date;
        description: string | null;
        nominal: Prisma.Decimal;
        proofImage: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
    }>;
}
