

import Redis, { RedisOptions } from 'ioredis';

type ConstructorParams = {
  namespace: string,
  prefix: string,
  redisConfig: RedisOptions,
}

export default class NotificationPublisher {
  private namespace: string;
  private prefix: string;
  private redisClient: Redis;
  private hasPublishedServerInitCommand = false;

  constructor(params: ConstructorParams) {
    this.redisClient = new Redis(params.redisConfig);
  }

  publish(
    event: string,
    message: unknown,
    rooms: Array<string | number> | null = null,
    user: string | number | null = null
  ): void {
    this.publishServerInitCommandIfNotAlready();

    const payload: Record<string, unknown> = {
      e: event,
      m: message,
    };

    if (rooms) {
      payload.r = Array.isArray(rooms) ? rooms : [rooms];
    }

    if (user) {
      payload.u = user;
    }

    this.redisClient.publish(`${this.prefix}/${this.namespace}/tx`, JSON.stringify(payload));
  }

  private publishServerInitCommandIfNotAlready() {
    if (this.hasPublishedServerInitCommand) {
      return;
    }

    this.redisClient.publish(`${this.prefix}/tx`, this.namespace);

    this.hasPublishedServerInitCommand = true;
  }
}
