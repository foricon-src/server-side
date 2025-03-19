"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitTotals = void 0;
class UnitTotals {
    constructor(unitTotals) {
        this.subtotal = unitTotals.subtotal;
        this.discount = unitTotals.discount;
        this.tax = unitTotals.tax;
        this.total = unitTotals.total;
    }
}
exports.UnitTotals = UnitTotals;
