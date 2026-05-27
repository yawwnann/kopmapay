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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const payments_service_1 = require("./payments.service");
const create_payment_dto_1 = require("./dto/create-payment.dto");
const approve_payment_dto_1 = require("./dto/approve-payment.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const storage_service_1 = require("../storage/storage.service");
let PaymentsController = class PaymentsController {
    paymentsService;
    storageService;
    constructor(paymentsService, storageService) {
        this.paymentsService = paymentsService;
        this.storageService = storageService;
    }
    async create(req, createPaymentDto, file) {
        if (!file) {
            throw new common_1.BadRequestException('Proof image is required');
        }
        const url = await this.storageService.saveFile(file, 'proofs');
        createPaymentDto.nominal = parseFloat(createPaymentDto.nominal);
        const payment = await this.paymentsService.create(req.user.sub, createPaymentDto, url);
        return {
            message: 'Payment submitted successfully',
            payment,
        };
    }
    findAll(req, userId, startDate, endDate, status) {
        return this.paymentsService.findAll(req.user.role, req.user.sub, userId, startDate, endDate, status);
    }
    findOne(id, req) {
        return this.paymentsService.findOne(id, req.user.sub, req.user.role);
    }
    approve(id, approvePaymentDto, req) {
        return this.paymentsService.approve(id, approvePaymentDto, req.user.sub);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('proofImage')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_payment_dto_1.CreatePaymentDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('userId')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, approve_payment_dto_1.ApprovePaymentDto, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "approve", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        storage_service_1.StorageService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map