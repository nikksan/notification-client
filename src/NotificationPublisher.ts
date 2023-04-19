

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

  constructor(params: ConstructorParams) {
    this.namespace = params.namespace;
    this.prefix = params.prefix;
    this.redisClient = new Redis(params.redisConfig);
  }

  async publish(
    event: string,
    message: unknown,
    rooms: Array<string | number> | null = null,
    user: string | number | null = null
  ): Promise<void> {
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

    await this.redisClient.publish(`${this.prefix}/${this.namespace}/tx`, JSON.stringify(payload));
  }
}
