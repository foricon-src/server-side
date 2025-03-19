"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionCheckoutNotification = void 0;
class TransactionCheckoutNotification {
    constructor(transactionCheckout) {
        this.url = transactionCheckout.url ? transactionCheckout.url : null;
    }
}
exports.TransactionCheckoutNotification = TransactionCheckoutNotification;
