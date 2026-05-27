import { AdminTransactionsService } from './admin-transactions.service';
import { AdminCreateIncomeDto, AdminCreateWithdrawalDto } from './dto/admin-transaction.dto';
interface JwtRequest extends Request {
    user: {
        sub: string;
        role: string;
        email: string;
        name: string;
    };
}
export declare class AdminTransactionsController {
    private adminTransactionsService;
    constructor(adminTransactionsService: AdminTransactionsService);
    addIncome(adminCreateIncomeDto: AdminCreateIncomeDto, req: JwtRequest): Promise<{
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
            nominal: import("@prisma/client-runtime-utils").Decimal;
            proofImage: string;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            verifiedBy: string | null;
            verifiedAt: Date | null;
        };
    }>;
    addWithdrawal(adminCreateWithdrawalDto: AdminCreateWithdrawalDto, req: JwtRequest): Promise<{
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
            nominal: import("@prisma/client-runtime-utils").Decimal;
            paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
            verifiedBy: string | null;
            verifiedAt: Date | null;
            reason: string;
            savingType: import("@prisma/client").$Enums.SavingType;
            rejectionReason: string | null;
        };
    }>;
}
export {};
