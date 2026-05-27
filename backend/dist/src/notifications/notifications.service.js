"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsService = class NotificationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const notification = await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                actionUrl: dto.actionUrl,
                isAdmin: dto.isAdminNotification || false,
            },
        });
        return {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            isRead: notification.isRead,
            actionUrl: notification.actionUrl || undefined,
            createdAt: notification.createdAt.toISOString(),
        };
    }
    async getUserNotifications(userId, role) {
        const whereConditions = {};
        if (role === 'ADMIN') {
            whereConditions.OR = [{ userId }, { isAdmin: true }, { userId: null }];
        }
        else {
            whereConditions.OR = [{ userId }, { userId: null, isAdmin: false }];
        }
        const notifications = await this.prisma.notification.findMany({
            where: whereConditions,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return notifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            isRead: n.isRead,
            actionUrl: n.actionUrl || undefined,
            createdAt: n.createdAt.toISOString(),
        }));
    }
    async markAsRead(notificationId) {
        await this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }
    async markAllAsRead(userId, role) {
        if (role === 'ADMIN') {
            await this.prisma.notification.updateMany({
                where: {
                    OR: [{ userId }, { isAdmin: true }],
                },
                data: { isRead: true },
            });
        }
        else {
            await this.prisma.notification.updateMany({
                where: {
                    OR: [{ userId }, { userId: null, isAdmin: false }],
                },
                data: { isRead: true },
            });
        }
    }
    async deleteAll(userId, role) {
        if (role === 'ADMIN') {
            await this.prisma.notification.deleteMany({
                where: {
                    OR: [{ userId }, { isAdmin: true }],
                },
            });
        }
        else {
            await this.prisma.notification.deleteMany({
                where: {
                    OR: [{ userId }, { userId: null, isAdmin: false }],
                },
            });
        }
    }
    async getUnreadCount(userId, role) {
        const where = { isRead: false };
        if (role === 'ADMIN') {
            where.OR = [{ userId }, { isAdmin: true }, { userId: null }];
        }
        else {
            where.OR = [{ userId }, { userId: null, isAdmin: false }];
        }
        return await this.prisma.notification.count({ where });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map