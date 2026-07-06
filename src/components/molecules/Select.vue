<template>
      <select ref="bucketSelect" id="bucket-select" class="browser-default custom-select" :value="bucketId" @change="handleChange">
        <option value="" disabled>Choose a bucket</option>
          <option :value="entry.id" v-for="entry in entries" :key="entry.id">
            {{ entry.text }}
          </option>
      </select>
</template>
<script>
export default {
    name: 'Select',
    emits: ['change'],
    props: [
        'dropdownText',
        'entries',
    ],
    computed: {
      bucketId() {
        return this.$store.getters.bucketUuid;
      }
    },
    watch: {
      bucketId() {
        this.syncSelectedBucket();
      },
      entries: {
        handler() {
          this.syncSelectedBucket();
        },
        deep: true
      }
    },
    mounted() {
      this.syncSelectedBucket();
    },
    methods: {
      handleChange(event) {
        this.$emit('change', event);
      },
      syncSelectedBucket() {
        if (this.$refs.bucketSelect) {
          this.$refs.bucketSelect.value = this.bucketId ?? '';
        }
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