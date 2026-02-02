<template>
  <div class="infinite-scroll-loader">
    <div class="progress-bar">
      <div class="progress-bar-fill"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: "InfiniteScrollLoader"
}
</script>

<style scoped>
.infinite-scroll-loader {
  padding: var(--spacing-sm) 0;
  width: 100%;
}

.progress-bar {
  height: 3px;
  background-color: rgba(10, 68, 146, 0.1);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--color-primary);
  border-radius: 2px;
  animation: progress-animation 1.5s ease-in-out infinite;
}

@keyframes progress-animation {
  0% {
    width: 0%;
    margin-left: 0%;
  }
  50% {
    width: 50%;
    margin-left: 25%;
  }
  100% {
    width: 0%;
    margin-left: 100%;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .progress-bar {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .progress-bar-fill {
    background-color: #1565C0;
  }
}
</style>
