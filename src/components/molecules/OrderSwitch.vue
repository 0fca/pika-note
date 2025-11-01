<template>
    <button class="btn btn-flat order-switch-btn" v-on:click="$emit('orderChange')">
        {{ this.$store.getters.order == 0 ? 'DESC' : "ASC" }}
    </button>
</template>
<script>
export default {
    name: 'OrderSwitch',
}
</script>

<style scoped>
.order-switch-btn {
  background-color: var(--color-primary) !important;
  color: white !important;
  font-weight: var(--font-weight-medium);
}

.order-switch-btn:hover {
  background-color: var(--color-primary-soft) !important;
}
</style>