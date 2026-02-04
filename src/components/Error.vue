<template>
  <div class="row card-panel error-panel">
    <p class="flow-text">It appears that some unknown error happened, sorry for the inconvenience.</p>
  </div>
</template>

<script>
export default {
  name: "Error",
}
</script>

<style scoped>
.error-panel {
  background-color: var(--color-error-mute) !important;
  color: var(--color-text) !important;
  border-left: 4px solid var(--color-error);
}
</style>
