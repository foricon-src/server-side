"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjustmentTimePeriod = void 0;
class AdjustmentTimePeriod {
    constructor(adjustmentsTimePeriod) {
        this.startsAt = adjustmentsTimePeriod.starts_at;
        this.endsAt = adjustmentsTimePeriod.ends_at;
    }
}
exports.AdjustmentTimePeriod = AdjustmentTimePeriod;
