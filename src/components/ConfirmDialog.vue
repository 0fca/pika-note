<template>
  <transition name="confirm-fade">
    <div v-if="visible" class="confirm-overlay" @click.self="cancel">
      <div class="confirm-dialog">
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button class="btn-confirm-cancel" @click="cancel">Cancel</button>
          <button class="btn-confirm-ok" @click="confirm">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'ConfirmDialog',
  props: {
    visible: { type: Boolean, default: false },
    message: { type: String, default: 'Are you sure?' },
    confirmText: { type: String, default: 'Delete' }
  },
  emits: ['confirm', 'cancel'],
  methods: {
    confirm() {
      this.$emit('confirm');
    },
    cancel() {
      this.$emit('cancel');
    }
  }
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-dialog {
  background-color: var(--color-background);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  min-width: 300px;
  max-width: 400px;
  box-shadow: var(--shadow-xl);
}

.confirm-message {
  font-size: var(--font-size-base);
  color: var(--color-text);
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.confirm-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.btn-confirm-cancel {
  background: none;
  border: 1px solid var(--color-border);
  padding: 8px 20px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  transition: background-color var(--transition-fast);
}

.btn-confirm-cancel:hover {
  background-color: var(--color-background-soft);
}

.btn-confirm-ok {
  background-color: var(--color-error);
  border: none;
  padding: 8px 20px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: white;
  font-weight: var(--font-weight-medium);
  transition: background-color var(--transition-fast);
}

.btn-confirm-ok:hover {
  background-color: var(--color-error-soft);
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
</style>
