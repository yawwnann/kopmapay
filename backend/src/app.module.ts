import * as dotenv from 'dotenv';

// Load environment variables BEFORE any module initialization
dotenv.config();

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { SavingsModule } from './savings/savings.module';
import { ReportsModule } from './reports/reports.module';
import { CommonModule } from './common/common.module';
import { StorageModule } from './storage/storage.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FakultasModule } from './fakultas/fakultas.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    PaymentsModule,
    WithdrawalsModule,
    SavingsModule,
    ReportsModule,
    StorageModule,
    EmailModule,
    NotificationsModule,
    DashboardModule,
    FakultasModule,
    AnnouncementsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
