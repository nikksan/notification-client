import { LoggerFactory } from '@luckbox/logger-factory';
import { RedisOptions } from 'ioredis';
export declare type MessageHandler = (namespace: string, event: string, message: unknown, rooms: Array<string>, userIdOrSocketId: string | number | null) => void | Promise<void>;
declare type ConstructorParams = {
    prefix: string;
    namespaces: Array<string>;
    handler: MessageHandler;
    redisConfig: RedisOptions;
    loggerFactory: LoggerFactory;
};
export default class NotificationSubscriber {
    private namespaces;
    private logger;
    private redisClient;
    private prefix;
    private handler;
    constructor(params: ConstructorParams);
    subscribe(): Promise<void>;
    private register;
    private receivePacket;
}
export {};
