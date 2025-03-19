"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contacts = void 0;
class Contacts {
    constructor(contacts) {
        this.name = contacts.name ? contacts.name : null;
        this.email = contacts.email;
    }
}
exports.Contacts = Contacts;
