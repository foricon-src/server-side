"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsTimePeriod = void 0;
class TransactionsTimePeriod {
    constructor(transactionsTimePeriod) {
        this.startsAt = transactionsTimePeriod.starts_at;
        this.endsAt = transactionsTimePeriod.ends_at;
    }
}
exports.TransactionsTimePeriod = TransactionsTimePeriod;
