"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
class NotificationPublisher {
    constructor(params) {
        this.namespace = params.namespace;
        this.prefix = params.prefix;
        this.redisClient = new ioredis_1.default(params.redisConfig);
    }
    async publish(event, message, rooms = null, user = null) {
        const payload = {
            e: event,
            m: message,
        };
        if (rooms) {
            payload.r = Array.isArray(rooms) ? rooms : [rooms];
        }
        if (user) {
            payload.u = user;
        }
        await this.redisClient.publish(`${this.prefix}/${this.namespace}/tx`, JSON.stringify(payload));
    }
}
exports.default = NotificationPublisher;
