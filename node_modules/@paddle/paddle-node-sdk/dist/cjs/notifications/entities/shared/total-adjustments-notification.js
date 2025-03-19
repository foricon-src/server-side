"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TotalAdjustmentsNotification = void 0;
class TotalAdjustmentsNotification {
    constructor(totalAdjustments) {
        this.subtotal = totalAdjustments.subtotal;
        this.tax = totalAdjustments.tax;
        this.total = totalAdjustments.total;
        this.fee = totalAdjustments.fee;
        this.earnings = totalAdjustments.earnings;
        this.currencyCode = totalAdjustments.currency_code;
    }
}
exports.TotalAdjustmentsNotification = TotalAdjustmentsNotification;
