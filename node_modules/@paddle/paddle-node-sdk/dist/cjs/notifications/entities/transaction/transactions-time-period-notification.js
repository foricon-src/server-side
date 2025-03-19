"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsTimePeriodNotification = void 0;
class TransactionsTimePeriodNotification {
    constructor(transactionsTimePeriod) {
        this.startsAt = transactionsTimePeriod.starts_at;
        this.endsAt = transactionsTimePeriod.ends_at;
    }
}
exports.TransactionsTimePeriodNotification = TransactionsTimePeriodNotification;
