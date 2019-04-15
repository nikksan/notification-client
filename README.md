# notification-client
A two-way Redis-based notification client

## Basic example

```js
const client = require('@luckbox/notification-client');
const redis = require('redis');

const redisClient = redis.createClient();

const handlers = {};
handlers.message = (event, message, { username = 'Anonymous' }, handle) => {
  console.log(`[${event}] ${username} says "${message}" via ${handle}`);
};

const fs = require('fs');
const publicKey = fs.readFileSync('id_ecdsa.pub.pem');

const client = new NotificationClient('example', 'notifications', handlers, redisClient, publicKey);

client.send('announcenments', 'Hello everybody!');
```

## API

### Methods

#### `constructor(namespace, prefix, handlers, redisClient)`

Name         | Type            | Description
-------------|-----------------|------------
namespace    | `String`        | The namespace that identifies this client
prefix       | `String`        | The prefix the server is configured with
handlers     | `Object`        | An object with optional callbacks
redisClient  | `RedisCleint`   | A RedisClient instance
publicKey    | `String|Buffer` | PEM-formatted public key

#### `send(event, message[, rooms, user])`

Name    | Type            | Description
--------|-----------------|------------
event   | `String`        | The event name to emit
message | `Any`           | The message to send - could be any JSON-serializable data
rooms   | `Array`         | An optional list of rooms names to send the message to
user    | `Number|String` | An optional user or handle ID to send the message to

### Callbacks

The following callbacks can be assigned in the `handlers` argument of the constructor

#### `message(event, message, user)`

Called when a new message is received from the server

Name    | Type     | Description
--------|----------|------------
event   | `String` | The event name the message was emitted with
message | `Any`    | The actual message
user    | `Object` | User data if any
handle  | `String` | Unique user handle

#### `subscribe(rooms, user)` and `unsubscribe(rooms, user)`

Called when a user tries to `subscribe` / `unsubscribe` to or from a room. Returning `true` from this callback grants
the user request, while returning `false` denies it. If the handler is not set all requests are granted by default.

Name    | Type     | Description
--------|----------|------------
rooms   | `Array`  | The list of room names the user wants to subscribe to or unsubscribe from
user    | `Object` | User data if any
handle  | `String` | Unique user handle

#### `error(error[, data])`

Name    | Type     | Description
--------|----------|------------
error   | `Error`  | The original exception
data    | `Any`    | Any extra data provided alongside the exception
