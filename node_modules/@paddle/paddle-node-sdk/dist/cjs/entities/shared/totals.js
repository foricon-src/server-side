"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Totals = void 0;
class Totals {
    constructor(totals) {
        this.subtotal = totals.subtotal;
        this.discount = totals.discount;
        this.tax = totals.tax;
        this.total = totals.total;
    }
}
exports.Totals = Totals;
