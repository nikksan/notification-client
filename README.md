# notification-client
A two-way Redis-based notification client

## Basic example

```js
const client = require('@luckbox/notification-client');
const redis = require('redis');

const pub = redis.createClient();
const sub = redis.createClient();

const handlers = {};
handlers.message = (event, message, user) => {
  console.log(`[${event}] ${user} says "${message}"`);
};

const client = new NotificationClient('example', 'notifications', handlers, { pub, sub });

client.send('new-announcenment', 'Hello everybody!');
```

## API

### Methods

#### `constructor(namespace, prefix, handlers, redisClients)`

Name         | Type   | Description
-------------|--------|------------
namespace    | String | The namespace that identifies this client
prefix       | String | The prefix the server is configured with
handlers     | Object | An object with optional callbacks
redisClients | Object | An object containing a `pub` and `sub` Redis clients

#### `send(event, message[, rooms, user])`

Name    | Type   | Description
--------|--------|------------
event   | String | The event name to emit
message | Any    | The message to send - could be any JSON-serializable data
rooms   | Array  | An optional list of rooms names to send the message to
user    | String | An optional user name to send the message to

### Callbacks

The following callbacks can be assigned in the `handlers` argument of the constructor

#### `message(event, message, user)`

Called when a new message is received from the server

Name    | Type   | Description
--------|--------|------------
event   | String | The event name the message was emitted with
message | Any    | The actual message
user    | String | The user name from which the message originates

#### `subscribe(rooms, user)` and `unsubscribe(rooms, user)`

Called when a user tries to `subscribe` / `unsubscribe` to or from a room. Returning `true` from this callback grants
the user request, while returning `false` denies it. If the handler is not set all requests are granted by default.

Name    | Type   | Description
--------|--------|------------
rooms   | Array  | The list of room names the user wants to subscribe to or unsubscribe from
user    | String | The name of the user making the request

#### `error(error[, data])`

Name    | Type   | Description
--------|--------|------------
error   | Error  | The original exception
data    | Any    | Any extra data provided alongside the exception
