import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  IsIn,
} from 'class-validator';

export enum WithdrawalPaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'BankTransfer',
}

export enum SavingType {
  POKOK = 'Pokok',
  WAJIB = 'Wajib',
  SUKARELA = 'Sukarela',
}

export class CreateWithdrawalDto {
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
}
