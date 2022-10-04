
import { Logger, LoggerFactory } from '@luckbox/logger-factory';
import Redis, { RedisOptions } from 'ioredis';

export type MessageHandler = (namespace: string, event: string, message: unknown, rooms: Array<string>, userIdOrSocketId: string | number | null) => void | Promise<void>;

type ConstructorParams = {
  prefix: string,
  handler: MessageHandler,
  redisConfig: RedisOptions,
  loggerFactory: LoggerFactory,
};

export default class NotificationSubscriber {
  private namespaces: Record<string, string> = {};
  private logger: Logger;
  private redisClient: Redis;
  private prefix: string;
  private handler: MessageHandler;

  constructor(params: ConstructorParams) {
    this.logger = params.loggerFactory.create(this.constructor.name);
    this.prefix = params.prefix;
    this.handler = params.handler;

    this.redisClient = new Redis(params.redisConfig);
  }

  async subscribe(): Promise<void> {
    this.redisClient.on('message', async (channel: string, packet: string) => {
      try {
        if (channel === `${this.prefix}/tx`) {
          await this.register(packet);
          return;
        }

        if (channel in this.namespaces) {
          await this.receivePacket(channel, packet);
        }
      } catch (err) {
        this.logger.warn(err);
      }
    });

    await this.redisClient.publish(`${this.prefix}/rx`, 'SERVER_INIT');
    await this.redisClient.subscribe(`${this.prefix}/tx`);
  }

  private async register(namespace: string) {
    const channel = `${this.prefix}/${namespace}/tx`;
    if (!(channel in this.namespaces)) {
      this.namespaces[channel] = namespace;
      await this.redisClient.subscribe(channel);
    }
  }

  private receivePacket(channel: string, packet: string) {
    const namespace = this.namespaces[channel];
    const {
      e: event,
      m: message,
      r: rooms,
      u: user,
    } = Object.assign({ u: null, r: [] }, JSON.parse(packet));

    return this.handler(namespace, event, message, rooms, user);
  }
}
