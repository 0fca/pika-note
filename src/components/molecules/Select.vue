<template>
      <select id="bucket-select" class="browser-default custom-select" v-model="this.bucketId">
        <option value="" disabled selected>Choose a bucket</option>
          <option :value="entry.id" v-for="entry in entries" :key="entry.id">
            {{ entry.text }}
          </option>
      </select>
</template>
<script>
export default {
    name: 'Select',
    props: [
        'dropdownText',
        'entries',
    ],
    data(){
      return {
        bucketId: this.$store.getters.bucketUuid
      }
    }
}
</script>

<style scoped>
.custom-select {
  background-color: var(--color-background) !important;
  color: var(--color-text) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
  width: 100%;
  height: 50px;
  box-sizing: border-box;
}

.custom-select:focus {
  border-color: var(--color-primary) !important;
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary-mute);
}

.custom-select option {
  background-color: var(--color-background) !important;
  color: var(--color-text) !important;
}
</style>