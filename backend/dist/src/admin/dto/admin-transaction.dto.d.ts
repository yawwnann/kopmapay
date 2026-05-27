export declare enum PaymentMethod {
    CASH = "Cash",
    QRIS = "QRIS",
    BANK_TRANSFER = "BankTransfer"
}
export declare enum SavingType {
    POKOK = "Pokok",
    WAJIB = "Wajib",
    SUKARELA = "Sukarela"
}
export declare enum WithdrawalPaymentMethod {
    CASH = "Cash",
    BANK_TRANSFER = "BankTransfer"
}
export declare class AdminCreateIncomeDto {
    userId: string;
    nominal: number;
    description?: string;
    paymentMethod: PaymentMethod;
}
export declare class AdminCreateWithdrawalDto {
    userId: string;
    nominal: number;
    reason: string;
    savingType: SavingType;
    paymentMethod?: WithdrawalPaymentMethod;
}
