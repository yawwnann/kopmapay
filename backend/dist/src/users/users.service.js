"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    prisma;
    notificationsService;
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    async create(createUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already exists');
        }
        let passwordToHash = createUserDto.password;
        if (!passwordToHash &&
            createUserDto.role === 'ANGGOTA' &&
            createUserDto.nim) {
            passwordToHash = createUserDto.nim;
        }
        if (!passwordToHash) {
            throw new common_1.BadRequestException('Password is required, or NIM for auto-generation.');
        }
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);
        const user = await this.prisma.user.create({
            data: {
                ...createUserDto,
                password: hashedPassword,
                role: createUserDto.role || 'ANGGOTA',
            },
        });
        await this.prisma.saving.create({
            data: {
                userId: user.id,
                total: 0,
            },
        });
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
    async findOne(id) {
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
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async update(id, updateUserDto) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updateData = { ...updateUserDto };
        if (updateData.email && updateData.email !== user.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: updateData.email },
            });
            if (existingUser) {
                throw new common_1.ConflictException('Email already exists');
            }
        }
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
    async remove(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
        return { message: 'User deactivated successfully' };
    }
    async updatePhoto(id, photoUrl) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
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
    async getUsersWithoutMandatoryPayment() {
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
        const usersWithoutPayment = [];
        for (const user of users) {
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
            if (mandatoryPayments.length === 0) {
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
                    monthsWithoutPayment: this.calculateMonthsDifference(lastMandatoryPayment?.createdAt || user.createdAt, new Date()),
                });
            }
        }
        return usersWithoutPayment.sort((a, b) => b.monthsWithoutPayment - a.monthsWithoutPayment);
    }
    calculateMonthsDifference(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();
        return yearsDiff * 12 + monthsDiff;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], UsersService);
//# sourceMappingURL=users.service.js.map