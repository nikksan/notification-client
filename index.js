const assert = require('assert');
const { parser } = require('@luckbox/token-data-middleware');

/**
 * @callback MessageCallback
 * @param {String} event
 * @param {*} message
 * @param {Object} user
 * @param {String} handle
 */

 /**
 * @callback SubscribeCallback
 * @param {String[]} rooms
 * @param {Object} user
 * @param {String} handle
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
   * @param {RedisClient} redisClient
   * @param {String|Buffer} publicKey
   */
  constructor(namespace, prefix, handlers, redisClient, publicKey) {
    assert(namespace, 'The NotificationClient cannot be initialized with an empty namespace');
    assert(prefix, 'The NotificationClient cannot be initialized with an empty prefix');
    assert(redisClient, 'The NotificationClient cannot be initialized without a Redis client');
    assert(typeof redisClient === 'object' && redisClient.constructor.name === 'RedisClient',
      'The "redisClient" argument must be a RedisClient instance');

    this.parser = parser(publicKey);
    this.config = { namespace, prefix };
    this.redisClients = {
      pub: redisClient,
      sub: redisClient.duplicate()
    };
    this.handlers = Object.assign({
      error: () => { },
      message: () => { },
      subscribe: () => true,
      unsubscribe: () => true
    }, handlers);

    this.channels = {};

    this.serverTx = `${prefix}/tx`;
    this.serverRx = `${prefix}/rx`;
    this.channelTx = `${prefix}/${namespace}/tx`;
    this.channelRx = `${prefix}/${namespace}/rx`;
    this.initialize();
  }

  initialize() {
    this.redisClients.sub.on('message', (channel, packet) => {
      if (channel in this.channels) {
        this.channels[channel](packet);
      }
    });

    this.pub(this.serverTx, this.config.namespace);
    this.sub(this.serverRx, packet => {
      if (packet === 'SERVER_INIT') {
        this.pub(this.serverTx, this.config.namespace);
      }
    });

    this.sub(this.channelRx, packet => {
      try {
        this.processIncomingPacket(packet);
      } catch (error) {
        this.handlers.error(error, { packet });
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
    this.channels[channel] = callback;
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
      h: handle,
      m: message,
      t: token
    } = JSON.parse(packet);

    const user = this.parser(token);

    if (event === 'subscribe' || event === 'unsubscribe') {
      const rooms = Array.isArray(message) ? message : [message];
      if (this.handlers[event](rooms, user, handle)) {
        this.send(event, '', rooms, handle);
      }
      return;
    }

    this.handlers.message(event, message, user, handle);
  }

  /**
   * Sends a message to the notification server
   * @param {String} event
   * @param {*} message
   * @param {String[]} rooms
   * @param {Number|String} user
   */
  send(event, message, rooms = null, user = null) {
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
   * @param {RedisClient} redisClient
   * @param {String|Buffer} publicKey
   */
  constructor(namespace, prefix, handlers, redisClient, publicKey) {
    const backend = new NotificationClientBackend(namespace, prefix, handlers, redisClient, publicKey);
    this._send = (...args) => backend.send(...args);
  }

  /**
   * Sends a message to the notification server
   * @param {String} event
   * @param {*} message
   * @param {String[]} rooms
   * @param {String|Number} user
   */
  send(event, message, rooms = null, user = null) {
    assert(event !== 'subscribe' && event !== 'unsubscribe', `The "${event}" event cannot be sent manually`);
    this._send(event, message, rooms, user);
  }
}

module.exports = NotificationClient;
