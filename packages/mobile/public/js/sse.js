// SSE Event Listener
const SSE = {
  source: null,
  handlers: {},

  connect() {
    if (this.source) this.source.close();
    this.source = new EventSource('/api/events');

    this.source.addEventListener('agent:status', (e) => {
      const data = JSON.parse(e.data);
      this._emit('agent:status', data);
    });

    this.source.addEventListener('task:updated', (e) => {
      const data = JSON.parse(e.data);
      this._emit('task:updated', data);
    });

    this.source.addEventListener('agent:message', (e) => {
      const data = JSON.parse(e.data);
      this._emit('agent:message', data);
    });

    this.source.addEventListener('pairing:confirmed', (e) => {
      const data = JSON.parse(e.data);
      this._emit('pairing:confirmed', data);
    });

    this.source.onerror = () => {
      // Auto-reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  },

  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  },

  _emit(event, data) {
    const handlers = this.handlers[event] || [];
    handlers.forEach(h => h(data));
  },

  disconnect() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
  }
};
