import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  nominal: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['Cash', 'QRIS', 'BankTransfer', 'Bank Transfer'])
  @IsNotEmpty()
  paymentMethod: string;
}
