"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
class Event {
    constructor(eventData) {
        var _a;
        this.eventId = eventData.event_id;
        this.notificationId = (_a = eventData.notification_id) !== null && _a !== void 0 ? _a : null;
        this.eventType = eventData.event_type;
        this.occurredAt = eventData.occurred_at;
        this.data = eventData.data;
    }
}
exports.Event = Event;
