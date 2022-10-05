# notification-client
A two-way Redis-based notification client

## Basic example

```ts
import { NotificationPublisher, NotificationSubscriber } from './src/index';

(async () => {
  const publisher = new NotificationPublisher({
    namespace: 'test-ns',
    prefix: 'pre',
    redisConfig: {}
  });

  const subscriber = new NotificationSubscriber({
    handler: console.log,
    loggerFactory: { create: () => console } as any,
    prefix: 'pre',
    redisConfig: {}
  });

  await subscriber.subscribe();

  setInterval(async () => {
    await publisher.publish('event', 'some message');
  }, 1000);
})();

```

## API

### NotificationPublisher

#### `constructor(params: Object)`

Name                | Type            | Description
--------------------|-----------------|------------
params.namespace    | `String`        | The namespace that identifies this client
params.prefix       | `String`        | The prefix the server is configured with
params.redisConfig  | `Object`        | A [RedisOptions](https://luin.github.io/ioredis/index.html#RedisOptions) obj

#### `publish(event, message[, rooms, user])`

Name    | Type                      | Description
--------|---------------------------|------------
event   | `String`                  | The event name to emit
message | `Any`                     | The message to send - could be any JSON-serializable data
rooms   | `Array`                   | An optional list of rooms names to send the message to
user    | `Number or String`        | An optional user or handle ID to send the message to

### NotificationSubscriber

#### `constructor(params: Object)`

Name                | Type            | Description
--------------------|-----------------|------------
params.prefix       | `String`        | The prefix the server is configured with
params.redisConfig  | `Object`        | A [RedisOptions](https://luin.github.io/ioredis/index.html#RedisOptions) obj
params.handler      | `Function`      | Callback to be invoked when a message is received
