const assert = require('assert');

/**
 * @callback MessageCallback
 * @param {String} event
 * @param {*} message
 * @param {String} user
 */

 /**
 * @callback SubscribeCallback
 * @param {String[]} rooms
 * @param {String} user
 */

 /**
 * @callback ErrorCallback
 * @param {Error} error
 * @param {*} data
 */

class NotificationClientBackend {
  /**
   * @param {String} namespace
   * @param {String} prefix
   * @param {Object} handlers
   * @param {ErrorCallback} handlers.error
   * @param {MessageCallback} handlers.message
   * @param {SubscribeCallback} handlers.subscribe
   * @param {SubscribeCallback} handlers.unsubscribe
   * @param {Object} redisClients
   * @param {RedisClient} redisClients.pub
   * @param {RedisClient} redisClients.sub
   */
  constructor(namespace, prefix, handlers, redisClients) {
    assert(namespace, 'The NotificationClient cannot be initialized with an empty namespace');
    assert(prefix, 'The NotificationClient cannot be initialized with an empty prefix');
    assert(redisClients, 'The NotificationClient cannot be initialized without Redis clients');
    assert(typeof redisClients === 'object', 'The "redisClients" argument must be an object');
    assert(redisClients.pub && redisClients.sub, 'Both "pub" and "sub" properties must be present on "redisClients"');

    this.config = { namespace, prefix };
    this.redisClients = redisClients;
    this.handlers = Object.assign({
      error: () => { },
      message: () => { },
      subscribe: () => true,
      unsubscribe: () => true
    }, handlers);

    this.channelTx = `${prefix}/${namespace}/tx`;
    this.channelRx = `${prefix}/${namespace}/rx`;
    this.initialize();
  }

  initialize() {
    this.pub(this.config.prefix, this.config.namespace);
    this.sub(this.channelRx, (channel, packet) => {
      try {
        this.processIncomingPacket(packet);
      } catch (error) {
        this.handlers.error(error, { channel, packet });
      }
    });
  }

  /**
   * Publish message to the notification server
   * @param {String} channel
   * @param {*} message
   * @private
   */
  pub(channel, message) {
    return this.redisClients.pub.publish(channel, message);
  }

  /**
   * Subscribe for messages from the notification server
   * @param {String} channel
   * @param {Function} callback
   * @private
   */
  sub(channel, callback) {
    this.redisClients.sub.on('message', callback);
    this.redisClients.sub.subscribe(channel);
  }

  /**
   * Extracts the data from an incoming packet and routes it to the corresponding handler
   * @param {String} channel
   * @param {Function} callback
   * @private
   */
  processIncomingPacket(packet) {
    const {
      e: event,
      m: message,
      u: user
    } = JSON.parse(packet);

    if (event === 'subscribe' || event === 'unsubscribe') {
      const rooms = Array.isArray(message) ? message : [message];
      if (this.handlers[event](rooms, user)) {
        this.send(event, '', rooms, user);
      }
      return;
    }

    this.handlers.message(event, message, user);
  }

  /**
   * Sends a message to the notification server
   * @param {String} event
   * @param {*} message
   * @param {String[]} rooms
   * @param {String} user
   */
  send(event, message, rooms = null, user = null) {
    assert(event !== 'subscribe' && event !== 'unsubscribe', `The "${event}" event cannot be sent manually`);

    const payload = {
      e: event,
      m: message
    };

    if (rooms) {
      payload.r = Array.isArray(rooms) ? rooms : [rooms];
    }
    if (user) {
      payload.u = user;
    }
    this.pub(this.channelTx, JSON.stringify(payload));
  }
};

class NotificationClient {
  /**
   * @param {String} namespace
   * @param {String} prefix
   * @param {Object} handlers
   * @param {ErrorCallback} handlers.error
   * @param {MessageCallback} handlers.message
   * @param {SubscribeCallback} handlers.subscribe
   * @param {SubscribeCallback} handlers.unsubscribe
   * @param {Object} redisClients
   * @param {RedisClient} redisClients.pub
   * @param {RedisClient} redisClients.sub
   */
  constructor(namespace, prefix, handlers, redisClients) {
    const backend = new NotificationClientBackend(namespace, prefix, handlers, redisClients);
    this._send = (...args) => backend.send(...args);
  }

  /**
   * Sends a message to the notification server
   * @param {String} event
   * @param {*} message
   * @param {String[]} rooms
   * @param {String} user
   */
  send(event, message, rooms = null, user = null) {
    this._send(event, message, rooms = null, user = null);
  }
}

module.exports = NotificationClient;
