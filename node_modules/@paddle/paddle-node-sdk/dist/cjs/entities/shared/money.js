"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
class Money {
    constructor(money) {
        this.amount = money.amount;
        this.currencyCode = money.currency_code;
    }
}
exports.Money = Money;
