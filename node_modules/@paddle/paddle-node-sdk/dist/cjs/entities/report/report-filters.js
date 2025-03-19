"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportFilters = void 0;
class ReportFilters {
    constructor(reportFiltersResponse) {
        var _a;
        this.name = reportFiltersResponse.name;
        this.operator = (_a = reportFiltersResponse.operator) !== null && _a !== void 0 ? _a : null;
        this.value = reportFiltersResponse.value;
    }
}
exports.ReportFilters = ReportFilters;
