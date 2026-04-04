/**
 * WebSocket service - manages WebSocket connection, message sending/receiving and reconnection logic
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.url = '';
    this.reconnectInterval = 3000;
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
    this.listeners = new Map();
    this.messageQueue = [];
    this.isConnecting = false;
    this.shouldReconnect = true;
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - WebSocket server URL
   */
  connect(url = 'ws://localhost:8080') {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    this.url = url;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected', {});
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received:', data.type);
          this.emit('message', data);

          // Trigger specific event based on message type
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch (e) {
          console.error('[WebSocket] Parse error:', e);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });

        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnecting = false;
        this.emit('error', { error });
      };
    } catch (e) {
      console.error('[WebSocket] Connection error:', e);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (!this.shouldReconnect) return;

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect(this.url);
      }
    }, this.reconnectInterval);
  }

  /**
   * Send message
   * @param {object} data - message data
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.log('[WebSocket] Not connected, queuing message');
      this.messageQueue.push(data);
    }
  }

  /**
   * Send message and wait for response
   * @param {object} data - message data
   * @param {string} responseType - expected response type
   * @param {number} timeout - timeout in milliseconds
   * @returns {Promise}
   */
  sendAndWait(data, responseType, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off(responseType, handler);
        reject(new Error(`Timeout waiting for ${responseType}`));
      }, timeout);

      const handler = (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      };

      this.on(responseType, handler);
      this.send(data);
    });
  }

  /**
   * Flush message queue
   */
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const data = this.messageQueue.shift();
      this.send(data);
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Register event listener
   * @param {string} event - event type
   * @param {function} callback - callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - event type
   * @param {function} callback - callback function
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event
   * @param {string} event - event type
   * @param {any} data - event data
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;

    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`[WebSocket] Event handler error for ${event}:`, e);
      }
    });
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton
export const websocketService = new WebSocketService();
export default websocketService;