import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';
interface JwtRequest extends Request {
    user: {
        sub: string;
        role: string;
        email: string;
        name: string;
    };
}
export declare class WithdrawalsController {
    private withdrawalsService;
    constructor(withdrawalsService: WithdrawalsService);
    create(req: JwtRequest, createWithdrawalDto: CreateWithdrawalDto): Promise<{
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
        nominal: import("@prisma/client-runtime-utils").Decimal;
        paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        reason: string;
        savingType: import("@prisma/client").$Enums.SavingType;
        rejectionReason: string | null;
    }>;
    withdrawAll(req: JwtRequest, body: {
        reason: string;
        paymentMethod?: string;
    }): Promise<{
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
            nominal: import("@prisma/client-runtime-utils").Decimal;
            paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
            verifiedBy: string | null;
            verifiedAt: Date | null;
            reason: string;
            savingType: import("@prisma/client").$Enums.SavingType;
            rejectionReason: string | null;
        })[];
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
        status: import("@prisma/client").$Enums.WithdrawalStatus;
        updatedAt: Date;
        nominal: import("@prisma/client-runtime-utils").Decimal;
        paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        reason: string;
        savingType: import("@prisma/client").$Enums.SavingType;
        rejectionReason: string | null;
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
        status: import("@prisma/client").$Enums.WithdrawalStatus;
        updatedAt: Date;
        nominal: import("@prisma/client-runtime-utils").Decimal;
        paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        reason: string;
        savingType: import("@prisma/client").$Enums.SavingType;
        rejectionReason: string | null;
    }>;
    approve(id: string, approveWithdrawalDto: ApproveWithdrawalDto, req: JwtRequest): Promise<{
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
        nominal: import("@prisma/client-runtime-utils").Decimal;
        paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        reason: string;
        savingType: import("@prisma/client").$Enums.SavingType;
        rejectionReason: string | null;
    }>;
}
export {};
