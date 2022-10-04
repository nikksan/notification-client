
import { Logger, LoggerFactory } from '@luckbox/logger-factory';
import Redis, { RedisOptions } from 'ioredis';

export type MessageHandler = (namespace: string, event: string, message: unknown, rooms: Array<string>, userIdOrSocketId: string | number | null) => any;

export default class NotificationSubscriber {
  private namespaces: Record<string, string> = {};
  private logger: Logger;
  private redisClient: Redis;

  constructor(
    private prefix: string,
    private handler: MessageHandler,
    redisConfig: RedisOptions,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create(this.constructor.name);
    this.redisClient = new Redis(redisConfig);
  }

  subscribe(): void {
    this.redisClient.on('message', (channel, packet) => {
      if (channel === `${this.prefix}/tx`) {
        this.register(packet);
      } else if (channel in this.namespaces) {
        try {
          this.receivePacket(channel, packet);
        } catch (error) {
          this.logger.warn(error);
        }
      }
    });
    this.redisClient.subscribe(`${this.prefix}/tx`);

    this.redisClient.duplicate().publish(`${this.prefix}/rx`, 'SERVER_INIT');
  }

  private register(namespace: string) {
    const channel = `${this.prefix}/${namespace}/tx`;
    if (!(channel in this.namespaces)) {
      this.namespaces[channel] = namespace;
      this.redisClient.subscribe(channel);
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

    this.handler(namespace, event, message, rooms, user);
  }
}
