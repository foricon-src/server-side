"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjustmentTotalsBreakdown = void 0;
class AdjustmentTotalsBreakdown {
    constructor(adjustmentTotalsBreakdown) {
        this.credit = adjustmentTotalsBreakdown.credit;
        this.refund = adjustmentTotalsBreakdown.refund;
        this.chargeback = adjustmentTotalsBreakdown.chargeback;
    }
}
exports.AdjustmentTotalsBreakdown = AdjustmentTotalsBreakdown;
