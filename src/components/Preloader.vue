<template>
  <div class="preloader-container">
    <div class="preloader-spinner">
      <div class="spinner-pearl"></div>
      <div class="spinner-pearl"></div>
      <div class="spinner-pearl"></div>
    </div>
    <p v-if="message" class="preloader-message">{{ message }}</p>
  </div>
</template>

<script>
export default {
  name: "Preloader",
  props: {
    message: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.preloader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
}

.preloader-spinner {
  display: flex;
  gap: 8px;
  align-items: center;
}

.spinner-pearl {
  width: 12px;
  height: 12px;
  background-color: var(--color-primary);
  border-radius: 50%;
  animation: pearl-bounce 1.4s ease-in-out infinite;
}

.spinner-pearl:nth-child(1) {
  animation-delay: -0.32s;
}

.spinner-pearl:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes pearl-bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.preloader-message {
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  margin: 0;
  text-align: center;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .spinner-pearl {
    background-color: #1565C0;
  }
  
  .preloader-message {
    color: var(--color-text-soft);
  }
}
</style>