/**
 * WebSocket服务 - 管理WebSocket连接、消息收发和重连逻辑
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
   * 连接到WebSocket服务器
   * @param {string} url - WebSocket服务器URL
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

          // 根据消息类型触发特定事件
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
   * 定时重连
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
   * 发送消息
   * @param {object} data - 消息数据
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
   * 发送消息并等待响应
   * @param {object} data - 消息数据
   * @param {string} responseType - 期望的响应类型
   * @param {number} timeout - 超时时间(毫秒)
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
   * 刷新消息队列
   */
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const data = this.messageQueue.shift();
      this.send(data);
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件类型
   * @param {function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件类型
   * @param {function} callback - 回调函数
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
   * 触发事件
   * @param {string} event - 事件类型
   * @param {any} data - 事件数据
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
   * 获取连接状态
   * @returns {boolean}
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// 导出单例
export const websocketService = new WebSocketService();
export default websocketService;