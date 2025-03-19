"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportMeta = void 0;
class ImportMeta {
    constructor(importMeta) {
        this.externalId = importMeta.external_id ? importMeta.external_id : null;
        this.importedFrom = importMeta.imported_from;
    }
}
exports.ImportMeta = ImportMeta;
