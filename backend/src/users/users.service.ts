import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Handle Password Logic
    let passwordToHash = createUserDto.password;

    // If no password provided and it's a member (ANGGOTA), generate default password using NIM
    if (
      !passwordToHash &&
      createUserDto.role === 'ANGGOTA' &&
      createUserDto.nim
    ) {
      passwordToHash = createUserDto.nim;
    }

    if (!passwordToHash) {
      throw new BadRequestException(
        'Password is required, or NIM for auto-generation.',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    // Create user with initial savings
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: createUserDto.role || 'ANGGOTA',
      },
    });

    // Create initial savings record
    await this.prisma.saving.create({
      data: {
        userId: user.id,
        total: 0,
      },
    });

    // Create notification for admins about new member
    await this.notificationsService.create({
      type: 'system',
      title: 'Anggota Baru Terdaftar',
      message: `${user.name} telah terdaftar sebagai anggota baru`,
      actionUrl: `/admin/anggota`,
      isAdminNotification: true,
    });

    const { password: _, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'ANGGOTA',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        angkatan: true,
        nim: true,
        fakultas: true,
        prodi: true,
        birthDate: true,
        address: true,
        phone: true,
        photo: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        angkatan: true,
        nim: true,
        fakultas: true,
        prodi: true,
        birthDate: true,
        address: true,
        phone: true,
        photo: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If email is being updated, check for duplicates
    const updateData: any = { ...updateUserDto };
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password if being updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        angkatan: true,
        nim: true,
        fakultas: true,
        prodi: true,
        birthDate: true,
        address: true,
        phone: true,
        photo: true,
        isActive: true,
      },
    });

    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by setting isActive to false
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'User deactivated successfully' };
  }

  /**
   * Update user photo
   */
  async updatePhoto(id: string, photoUrl: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { photo: photoUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        angkatan: true,
        nim: true,
        fakultas: true,
        prodi: true,
        birthDate: true,
        address: true,
        phone: true,
        photo: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Get users who haven't paid mandatory savings for 5 consecutive months
   */
  async getUsersWithoutMandatoryPayment() {
    // Get all active members (not admins)
    const users = await this.prisma.user.findMany({
      where: {
        role: 'ANGGOTA',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        angkatan: true,
        nim: true,
        fakultas: true,
        prodi: true,
        phone: true,
        photo: true,
        createdAt: true,
      },
    });

    const usersWithoutPayment: Array<{
      id: string;
      name: string;
      email: string;
      angkatan: string | null;
      nim: string | null;
      fakultas: string | null;
      prodi: string | null;
      phone: string | null;
      photo: string | null;
      lastPaymentDate: Date | null;
      monthsWithoutPayment: number;
    }> = [];

    // Check each user's payment history
    for (const user of users) {
      // Get last 5 months of approved payments with "wajib" in description
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

      const mandatoryPayments = await this.prisma.payment.findMany({
        where: {
          userId: user.id,
          status: 'APPROVED',
          description: {
            contains: 'wajib',
            mode: 'insensitive',
          },
          createdAt: {
            gte: fiveMonthsAgo,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Check if user has made any mandatory payment in the last 5 months
      if (mandatoryPayments.length === 0) {
        // Get the last mandatory payment date (if any)
        const lastMandatoryPayment = await this.prisma.payment.findFirst({
          where: {
            userId: user.id,
            status: 'APPROVED',
            description: {
              contains: 'wajib',
              mode: 'insensitive',
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        usersWithoutPayment.push({
          id: user.id,
          name: user.name,
          email: user.email,
          angkatan: user.angkatan,
          nim: user.nim,
          fakultas: user.fakultas,
          prodi: user.prodi,
          phone: user.phone,
          photo: user.photo,
          lastPaymentDate: lastMandatoryPayment?.createdAt || null,
          monthsWithoutPayment: this.calculateMonthsDifference(
            lastMandatoryPayment?.createdAt || user.createdAt,
            new Date(),
          ),
        });
      }
    }

    // Sort by months without payment (descending)
    return usersWithoutPayment.sort(
      (a, b) => b.monthsWithoutPayment - a.monthsWithoutPayment,
    );
  }

  /**
   * Calculate the difference in months between two dates
   */
  private calculateMonthsDifference(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const yearsDiff = end.getFullYear() - start.getFullYear();
    const monthsDiff = end.getMonth() - start.getMonth();

    return yearsDiff * 12 + monthsDiff;
  }
}
