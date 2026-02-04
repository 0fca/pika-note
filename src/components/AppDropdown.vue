<template>
  <div v-if="isOpen" class="app-menu-dropdown">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'AppDropdown',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.app-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px #00000026;
  z-index: 1000;
  overflow: hidden;
}
</style>
