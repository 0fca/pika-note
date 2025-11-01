<template>
  <div id="preloader" class="card-panel center preloader-panel">
    <p class="flow-text preloader-text">{{ message }}</p>
    <div class="progress">
      <div class="indeterminate"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Preloader",
  props: [
    'message'
  ]
}
</script>

<style scoped>
.preloader-panel {
  background-color: var(--color-primary) !important;
  color: white !important;
}

.preloader-text {
  color: white !important;
}
</style>