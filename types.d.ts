import { RedisClientType } from 'redis';
import * as Buffer from 'buffer';

declare type ErrorCallback = (error: Error, data: unknown) => void;
declare type SubscribeCallback = (rooms: Array<string>, user: Record<string, unknown>, handle: string) => boolean;
declare type MessageCallback = (event: string, message: unknown, user: Record<string, unknown>, handle: string) => void;

declare class NotificationClient {
  constructor(
    namespace: string,
    prefix: string,
    handlers: {
      error?: ErrorCallback,
      message?: MessageCallback,
      subscribe?: SubscribeCallback,
      unsubscribe?: SubscribeCallback,
    },
    redisClient: RedisClientType<any, any, any>,
    publicKey: string | Buffer,
  );

  send(event: string, message: unknown, rooms?: Array<string> | null, user?: string | number): void;
}

export default NotificationClient;
