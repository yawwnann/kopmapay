import { SavingsService } from './savings.service';
export declare class SavingsController {
    private savingsService;
    constructor(savingsService: SavingsService);
    getMySavings(req: any): Promise<{
        user: {
            email: string;
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        total: import("@prisma/client-runtime-utils").Decimal;
        updatedAt: Date;
    }>;
    getSavingsBreakdown(req: any): Promise<{
        total: number;
        breakdown: {
            pokok: number;
            wajib: number;
            sukarela: number;
        };
        details: {
            type: string;
            amount: number;
        }[];
    }>;
    getSavingsChart(req: any): Promise<{
        labels: string[];
        data: {
            label: string;
            balance: number;
        }[];
    }>;
    getAllSavings(): Promise<({
        user: {
            email: string;
            id: string;
            name: string;
            angkatan: string | null;
        };
    } & {
        id: string;
        userId: string;
        total: import("@prisma/client-runtime-utils").Decimal;
        updatedAt: Date;
    })[]>;
    getSavingsBreakdownByUserId(id: string): Promise<{
        total: number;
        breakdown: {
            pokok: number;
            wajib: number;
            sukarela: number;
        };
        details: {
            type: string;
            amount: number;
        }[];
    }>;
    getSavingsHistory(userId: string): Promise<{
        userId: string;
        mandatorySavings: {
            id: string;
            month: number;
            year: number;
            nominal: number;
            status: import("@prisma/client").$Enums.MandatorySavingStatus;
            paidAt: Date | null;
            payment: {
                id: string;
                createdAt: Date;
                status: import("@prisma/client").$Enums.PaymentStatus;
                paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            } | null;
        }[];
        voluntarySavings: ({
            id: string;
            nominal: number;
            createdAt: Date;
            payment: {
                id: string;
                createdAt: Date;
                status: import("@prisma/client").$Enums.PaymentStatus;
                paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            } | null;
        } | {
            id: string;
            nominal: number;
            createdAt: Date;
            payment: {
                id: string;
                createdAt: Date;
                status: string;
                paymentMethod: import("@prisma/client").$Enums.WithdrawalPaymentMethod;
            };
        })[];
    }>;
}
