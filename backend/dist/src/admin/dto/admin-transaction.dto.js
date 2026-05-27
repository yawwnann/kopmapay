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
exports.AdminCreateWithdrawalDto = exports.AdminCreateIncomeDto = exports.WithdrawalPaymentMethod = exports.SavingType = exports.PaymentMethod = void 0;
const class_validator_1 = require("class-validator");
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "Cash";
    PaymentMethod["QRIS"] = "QRIS";
    PaymentMethod["BANK_TRANSFER"] = "BankTransfer";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var SavingType;
(function (SavingType) {
    SavingType["POKOK"] = "Pokok";
    SavingType["WAJIB"] = "Wajib";
    SavingType["SUKARELA"] = "Sukarela";
})(SavingType || (exports.SavingType = SavingType = {}));
var WithdrawalPaymentMethod;
(function (WithdrawalPaymentMethod) {
    WithdrawalPaymentMethod["CASH"] = "Cash";
    WithdrawalPaymentMethod["BANK_TRANSFER"] = "BankTransfer";
})(WithdrawalPaymentMethod || (exports.WithdrawalPaymentMethod = WithdrawalPaymentMethod = {}));
class AdminCreateIncomeDto {
    userId;
    nominal;
    description;
    paymentMethod;
}
exports.AdminCreateIncomeDto = AdminCreateIncomeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AdminCreateIncomeDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], AdminCreateIncomeDto.prototype, "nominal", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdminCreateIncomeDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PaymentMethod),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AdminCreateIncomeDto.prototype, "paymentMethod", void 0);
class AdminCreateWithdrawalDto {
    userId;
    nominal;
    reason;
    savingType;
    paymentMethod;
}
exports.AdminCreateWithdrawalDto = AdminCreateWithdrawalDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AdminCreateWithdrawalDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], AdminCreateWithdrawalDto.prototype, "nominal", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AdminCreateWithdrawalDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(SavingType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AdminCreateWithdrawalDto.prototype, "savingType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(WithdrawalPaymentMethod),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdminCreateWithdrawalDto.prototype, "paymentMethod", void 0);
//# sourceMappingURL=admin-transaction.dto.js.map