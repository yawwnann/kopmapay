import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum PaymentMethod {
  CASH = 'Cash',
  QRIS = 'QRIS',
  BANK_TRANSFER = 'BankTransfer',
}

export enum SavingType {
  POKOK = 'Pokok',
  WAJIB = 'Wajib',
  SUKARELA = 'Sukarela',
}

export enum WithdrawalPaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'BankTransfer',
}

/**
 * DTO for Admin to add income directly to member savings
 * No proof image required - admin creates transaction directly
 */
export class AdminCreateIncomeDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  nominal: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;
}

/**
 * DTO for Admin to add withdrawal directly for member
 */
export class AdminCreateWithdrawalDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  nominal: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsEnum(SavingType)
  @IsNotEmpty()
  savingType: SavingType;

  @IsEnum(WithdrawalPaymentMethod)
  @IsOptional()
  paymentMethod?: WithdrawalPaymentMethod;
}