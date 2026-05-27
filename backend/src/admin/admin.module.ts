import { Module } from '@nestjs/common';
import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminTransactionsService } from './admin-transactions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, NotificationsModule, EmailModule],
  controllers: [AdminTransactionsController],
  providers: [AdminTransactionsService],
  exports: [AdminTransactionsService],
})
export class AdminModule {}
