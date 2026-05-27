import { PrismaService } from '../prisma/prisma.service';
export declare class SavingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getMySavings(userId: string): Promise<{
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
    getSavingsBreakdown(userId: string): Promise<{
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
    getSavingsChart(userId: string): Promise<{
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
