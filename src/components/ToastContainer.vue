<template>
  <div class="toast-container" :class="positionClass">
    <transition-group name="toast-slide">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-item"
        :class="toast.type"
        @click="removeToast(toast.id)"
      >
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { toastService } from '@/services/toastService';

export default {
  name: 'ToastContainer',
  data() {
    return {
      toasts: [],
      unsubscribe: null
    };
  },
  computed: {
    positionClass() {
      return window.innerWidth <= 600 ? 'position-bottom' : 'position-top-right';
    }
  },
  mounted() {
    this.unsubscribe = toastService.subscribe(this.addToast);
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },
  methods: {
    addToast({ message, duration, type }) {
      const id = Date.now() + Math.random();
      this.toasts.push({ id, message, type: type || 'default' });
      setTimeout(() => this.removeToast(id), duration || 3000);
    },
    removeToast(id) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.position-top-right {
  top: 80px;
  right: 16px;
  align-items: flex-end;
}

.position-bottom {
  bottom: 16px;
  left: 16px;
  right: 16px;
  align-items: stretch;
}

.toast-item {
  pointer-events: auto;
  cursor: pointer;
  padding: 12px 20px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  max-width: 400px;
  word-break: break-word;
}

.position-bottom .toast-item {
  max-width: 100%;
}

.toast-item.default {
  background-color: #323232;
}

.toast-item.success {
  background-color: #2e7d32;
}

.toast-item.error {
  background-color: #c62828;
}

.toast-item.warning {
  background-color: #ef6c00;
}

/* Desktop: slide in from right */
.position-top-right .toast-slide-enter-active,
.position-top-right .toast-slide-leave-active {
  transition: all 0.3s ease;
}

.position-top-right .toast-slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.position-top-right .toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Mobile: slide up from bottom */
.position-bottom .toast-slide-enter-active,
.position-bottom .toast-slide-leave-active {
  transition: all 0.3s ease;
}

.position-bottom .toast-slide-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.position-bottom .toast-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

@media (prefers-color-scheme: dark) {
  .toast-item.default {
    background-color: #424242;
  }
}
</style>
