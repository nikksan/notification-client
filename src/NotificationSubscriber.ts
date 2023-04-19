
import { Logger, LoggerFactory } from '@luckbox/logger-factory';
import Redis, { RedisOptions } from 'ioredis';

export type MessageHandler = (namespace: string, event: string, message: unknown, rooms: Array<string>, userIdOrSocketId: string | number | null) => void | Promise<void>;

type ConstructorParams = {
  prefix: string,
  namespaces: Array<string>,
  handler: MessageHandler,
  redisConfig: RedisOptions,
  loggerFactory: LoggerFactory,
};

export default class NotificationSubscriber {
  private namespaces: Array<string>;
  private logger: Logger;
  private redisClient: Redis;
  private prefix: string;
  private handler: MessageHandler;

  constructor(params: ConstructorParams) {
    this.logger = params.loggerFactory.create(this.constructor.name);
    this.prefix = params.prefix;
    this.handler = params.handler;
    this.namespaces = params.namespaces;

    this.redisClient = new Redis(params.redisConfig);
  }

  async subscribe(): Promise<void> {
    for (const namespace of this.namespaces) {
      await this.register(namespace);
    }

    this.redisClient.on('message', async (channel: string, packet: string) => {
      if (
        !channel.startsWith(this.prefix) ||
        !channel.endsWith('/tx')
      ) {
        return;
      }

      const namespace = channel.slice(this.prefix.length + 1, -3);
      try {
        if (this.namespaces.includes(namespace)) {
          await this.receivePacket(namespace, packet);
        }
      } catch (err) {
        this.logger.warn(err);
      }
    });
  }

  private async register(namespace: string) {
    const channel = `${this.prefix}/${namespace}/tx`;
    await this.redisClient.subscribe(channel);
    this.logger.info(`Registered namespace ${namespace} [${channel}]`);
  }

  private receivePacket(namespace: string, packet: string) {
    const {
      e: event,
      m: message,
      r: rooms,
      u: user,
    } = Object.assign({ u: null, r: [] }, JSON.parse(packet));

    return this.handler(namespace, event, message, rooms, user);
  }
}
