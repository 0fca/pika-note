<template>
    <button class="btn-action order-switch-btn" v-on:click="$emit('orderChange')">
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
  /* additional overrides if needed */
}

.order-switch-btn:hover {
  background: whitesmoke !important;
  color: var(--color-primary) !important;
}
</style>