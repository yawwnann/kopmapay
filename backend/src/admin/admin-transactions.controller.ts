import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AdminTransactionsService } from './admin-transactions.service';
import {
  AdminCreateIncomeDto,
  AdminCreateWithdrawalDto,
} from './dto/admin-transaction.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

interface JwtRequest extends Request {
  user: {
    sub: string;
    role: string;
    email: string;
    name: string;
  };
}

@Controller('admin/transactions')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminTransactionsController {
  constructor(private adminTransactionsService: AdminTransactionsService) {}

  /**
   * Admin adds income directly to member's savings
   * Creates an APPROVED payment directly without proof image
   */
  @Post('income')
  addIncome(
    @Body() adminCreateIncomeDto: AdminCreateIncomeDto,
    @Req() req: JwtRequest,
  ) {
    return this.adminTransactionsService.addIncome(
      req.user.sub,
      adminCreateIncomeDto,
    );
  }

  /**
   * Admin adds withdrawal directly for member
   * Creates an APPROVED withdrawal directly (no verification needed)
   */
  @Post('withdrawal')
  addWithdrawal(
    @Body() adminCreateWithdrawalDto: AdminCreateWithdrawalDto,
    @Req() req: JwtRequest,
  ) {
    return this.adminTransactionsService.addWithdrawal(
      req.user.sub,
      adminCreateWithdrawalDto,
    );
  }
}
