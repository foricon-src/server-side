"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjustmentItemTotalsNotification = void 0;
class AdjustmentItemTotalsNotification {
    constructor(adjustmentItemTotals) {
        this.subtotal = adjustmentItemTotals.subtotal;
        this.tax = adjustmentItemTotals.tax;
        this.total = adjustmentItemTotals.total;
    }
}
exports.AdjustmentItemTotalsNotification = AdjustmentItemTotalsNotification;
