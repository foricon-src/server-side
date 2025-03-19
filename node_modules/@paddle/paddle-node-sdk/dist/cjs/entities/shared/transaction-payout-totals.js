"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionPayoutTotals = void 0;
class TransactionPayoutTotals {
    constructor(transactionPayoutTotals) {
        this.subtotal = transactionPayoutTotals.subtotal;
        this.discount = transactionPayoutTotals.discount;
        this.tax = transactionPayoutTotals.tax;
        this.total = transactionPayoutTotals.total;
        this.credit = transactionPayoutTotals.credit;
        this.creditToBalance = transactionPayoutTotals.credit_to_balance;
        this.balance = transactionPayoutTotals.balance;
        this.grandTotal = transactionPayoutTotals.grand_total;
        this.fee = transactionPayoutTotals.fee;
        this.earnings = transactionPayoutTotals.earnings;
        this.currencyCode = transactionPayoutTotals.currency_code;
    }
}
exports.TransactionPayoutTotals = TransactionPayoutTotals;
