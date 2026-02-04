<template>
  <div class="row card-panel info-panel">
    <output>{{message}}</output>
  </div>
</template>

<script>
export default {
  name: "Info",
  props: [
    'message'
  ]
}
</script>

<style scoped>
.info-panel {
  background-color: var(--color-info-mute) !important;
  color: var(--color-text) !important;
  border-left: 4px solid var(--color-info);
}
</style>
