"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payout = void 0;
class Payout {
    constructor(payout) {
        this.id = payout.id;
        this.status = payout.status;
        this.amount = payout.amount;
        this.currencyCode = payout.currency_code;
    }
}
exports.Payout = Payout;
