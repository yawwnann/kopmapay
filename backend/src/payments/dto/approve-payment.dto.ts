import { IsEnum, IsString, IsOptional } from 'class-validator';

export class ApprovePaymentDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  @IsString()
  status!: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
