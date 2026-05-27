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
exports.AdminTransactionsController = void 0;
const common_1 = require("@nestjs/common");
const admin_transactions_service_1 = require("./admin-transactions.service");
const admin_transaction_dto_1 = require("./dto/admin-transaction.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let AdminTransactionsController = class AdminTransactionsController {
    adminTransactionsService;
    constructor(adminTransactionsService) {
        this.adminTransactionsService = adminTransactionsService;
    }
    addIncome(adminCreateIncomeDto, req) {
        return this.adminTransactionsService.addIncome(req.user.sub, adminCreateIncomeDto);
    }
    addWithdrawal(adminCreateWithdrawalDto, req) {
        return this.adminTransactionsService.addWithdrawal(req.user.sub, adminCreateWithdrawalDto);
    }
};
exports.AdminTransactionsController = AdminTransactionsController;
__decorate([
    (0, common_1.Post)('income'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_transaction_dto_1.AdminCreateIncomeDto, Object]),
    __metadata("design:returntype", void 0)
], AdminTransactionsController.prototype, "addIncome", null);
__decorate([
    (0, common_1.Post)('withdrawal'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_transaction_dto_1.AdminCreateWithdrawalDto, Object]),
    __metadata("design:returntype", void 0)
], AdminTransactionsController.prototype, "addWithdrawal", null);
exports.AdminTransactionsController = AdminTransactionsController = __decorate([
    (0, common_1.Controller)('admin/transactions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __metadata("design:paramtypes", [admin_transactions_service_1.AdminTransactionsService])
], AdminTransactionsController);
//# sourceMappingURL=admin-transactions.controller.js.map