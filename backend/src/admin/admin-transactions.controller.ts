import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminTransactionsService } from './admin-transactions.service';
import {
  AdminCreateIncomeDto,
  AdminCreateWithdrawalDto,
} from './dto/admin-transaction.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';

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
  constructor(
    private adminTransactionsService: AdminTransactionsService,
    private storageService: StorageService,
  ) {}

  /**
   * Admin adds income directly to member's savings
   * Creates an APPROVED payment directly WITH proof image (optional)
   */
  @Post('income')
  @UseInterceptors(FileInterceptor('proofImage'))
  async addIncome(
    @Body() adminCreateIncomeDto: AdminCreateIncomeDto,
    @Req() req: JwtRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let proofImageUrl: string | undefined;

    if (file) {
      proofImageUrl = await this.storageService.saveFile(file, 'proofs');
    }

    return this.adminTransactionsService.addIncome(
      req.user.sub,
      adminCreateIncomeDto,
      proofImageUrl,
    );
  }

  /**
   * Admin adds withdrawal directly for member
   * Creates an APPROVED withdrawal directly WITH proof image (optional)
   */
  @Post('withdrawal')
  @UseInterceptors(FileInterceptor('proofImage'))
  async addWithdrawal(
    @Body() adminCreateWithdrawalDto: AdminCreateWithdrawalDto,
    @Req() req: JwtRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let proofImageUrl: string | undefined;

    if (file) {
      proofImageUrl = await this.storageService.saveFile(file, 'proofs');
    }

    return this.adminTransactionsService.addWithdrawal(
      req.user.sub,
      adminCreateWithdrawalDto,
      proofImageUrl,
    );
  }
}
