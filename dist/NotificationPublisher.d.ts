import { RedisOptions } from 'ioredis';
declare type ConstructorParams = {
    namespace: string;
    prefix: string;
    redisConfig: RedisOptions;
};
export default class NotificationPublisher {
    private namespace;
    private prefix;
    private redisClient;
    constructor(params: ConstructorParams);
    publish(event: string, message: unknown, rooms?: Array<string | number> | null, user?: string | number | null): Promise<void>;
}
export {};
