import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
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

  @IsIn(['Cash', 'QRIS', 'BankTransfer', 'Bank Transfer'])
  @IsNotEmpty()
  paymentMethod: string;

  @IsDateString()
  @IsOptional()
  transactionDate?: string;
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

  @IsIn(['Cash', 'BankTransfer', 'Bank Transfer'])
  @IsOptional()
  paymentMethod?: string;

  @IsDateString()
  @IsOptional()
  transactionDate?: string;
}
