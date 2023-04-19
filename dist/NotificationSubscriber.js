"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
class NotificationSubscriber {
    constructor(params) {
        this.logger = params.loggerFactory.create(this.constructor.name);
        this.prefix = params.prefix;
        this.handler = params.handler;
        this.namespaces = params.namespaces;
        this.redisClient = new ioredis_1.default(params.redisConfig);
    }
    async subscribe() {
        for (const namespace of this.namespaces) {
            await this.register(namespace);
        }
        this.redisClient.on('message', async (channel, packet) => {
            if (!channel.endsWith('/tx')) {
                return;
            }
            const [, namespace] = channel.split('/');
            try {
                if (this.namespaces.includes(namespace)) {
                    await this.receivePacket(namespace, packet);
                }
            }
            catch (err) {
                this.logger.warn(err);
            }
        });
    }
    async register(namespace) {
        const channel = `${this.prefix}/${namespace}/tx`;
        await this.redisClient.subscribe(channel);
        this.logger.info(`Registered namespace ${namespace} [${channel}]`);
    }
    receivePacket(namespace, packet) {
        const { e: event, m: message, r: rooms, u: user, } = Object.assign({ u: null, r: [] }, JSON.parse(packet));
        return this.handler(namespace, event, message, rooms, user);
    }
}
exports.default = NotificationSubscriber;
