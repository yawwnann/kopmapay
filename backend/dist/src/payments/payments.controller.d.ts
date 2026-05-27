import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApprovePaymentDto } from './dto/approve-payment.dto';
import { StorageService } from '../storage/storage.service';
interface JwtRequest extends Request {
    user: {
        sub: string;
        role: string;
        email: string;
        name: string;
    };
}
export declare class PaymentsController {
    private paymentsService;
    private storageService;
    constructor(paymentsService: PaymentsService, storageService: StorageService);
    create(req: JwtRequest, createPaymentDto: CreatePaymentDto, file: any): Promise<{
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
            nominal: import("@prisma/client-runtime-utils").Decimal;
            proofImage: string;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            verifiedBy: string | null;
            verifiedAt: Date | null;
        };
    }>;
    findAll(req: JwtRequest, userId?: string, startDate?: string, endDate?: string, status?: string): Promise<({
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
        nominal: import("@prisma/client-runtime-utils").Decimal;
        proofImage: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
    })[]>;
    findOne(id: string, req: JwtRequest): Promise<{
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
        nominal: import("@prisma/client-runtime-utils").Decimal;
        proofImage: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
    }>;
    approve(id: string, approvePaymentDto: ApprovePaymentDto, req: JwtRequest): Promise<{
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
        nominal: import("@prisma/client-runtime-utils").Decimal;
        proofImage: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
    }>;
}
export {};
