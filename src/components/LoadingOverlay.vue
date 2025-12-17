<template>
  <transition name="overlay-fade">
    <div v-if="visible" class="overlay-backdrop">
      <div class="overlay-card">
        <img src="@/assets/pikacloud_note.svg" alt="Pika Note logo" class="overlay-logo" />

        <div class="overlay-body">
          <div v-if="errorMessage" class="loader loader-error" role="status" aria-live="polite">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div v-else-if="needsLogin" class="login-block">
            <p class="overlay-text">Please log in to continue.</p>
            <p class="overlay-subtext">Redirecting in {{ countdown }}s…</p>
            <a class="btn overlay-button" :href="loginUrl">Go to login</a>
          </div>

          <div v-else class="loader loader-classic" role="status" aria-live="polite">
            <span></span>
          </div>

          <p v-if="message && !needsLogin && !errorMessage" class="overlay-text">{{ message }}</p>
          <p v-if="errorMessage" class="overlay-text">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'LoadingOverlay',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    needsLogin: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: ''
    },
    errorMessage: {
      type: String,
      default: ''
    },
    countdown: {
      type: Number,
      default: 0
    },
    loginUrl: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.overlay-backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--color-overlay-backdrop, rgba(11, 21, 46, 0.82));
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 24px;
}

.overlay-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 20px;
  padding: 32px 28px;
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.25);
  max-width: 420px;
  width: 100%;
  text-align: center;
}

.overlay-logo {
  width: 120px;
  height: auto;
  margin: 0 auto 20px;
  display: block;
}

.overlay-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.overlay-text {
  color: #f8fbff;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.overlay-subtext {
  color: rgba(248, 251, 255, 0.85);
  margin: 0;
  font-size: 14px;
}

.overlay-button {
  margin-top: 6px;
  background: #0a4492;
  border-radius: 10px;
  padding: 0 18px;
}

.loader {
  position: relative;
  width: 72px;
  height: 72px;
}

/* Classic loader #2 */
.loader-classic span {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 72px;
  height: 72px;
  margin: 6px;
  border: 6px solid #f8fbff;
  border-radius: 50%;
  border-color: #f8fbff transparent #f8fbff transparent;
  animation: loader-dual-ring 1.2s linear infinite;
  top: 0;
  left: 0;
}

@keyframes loader-dual-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Error loader inspired by loader #35 */
.loader-error {
  display: grid;
  grid-template-columns: repeat(2, 24px);
  grid-template-rows: repeat(2, 24px);
  gap: 10px;
}

.loader-error span {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #ff5252, #ff8a80);
  border-radius: 6px;
  animation: pulse-square 1s ease-in-out infinite;
}

.loader-error span:nth-child(2) {
  animation-delay: 0.15s;
}

.loader-error span:nth-child(3) {
  animation-delay: 0.3s;
}

.loader-error span:nth-child(4) {
  animation-delay: 0.45s;
}

@keyframes pulse-square {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

.login-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.25s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
