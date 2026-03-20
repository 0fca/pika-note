const listeners = [];

export const toastService = {
  subscribe(callback) {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    };
  },

  show(message, options = {}) {
    const payload = {
      message,
      duration: options.duration || 3000,
      type: options.type || 'default'
    };
    listeners.forEach(cb => cb(payload));
  },

  success(message, duration) {
    this.show(message, { type: 'success', duration });
  },

  error(message, duration) {
    this.show(message, { type: 'error', duration });
  },

  warning(message, duration) {
    this.show(message, { type: 'warning', duration });
  }
};
