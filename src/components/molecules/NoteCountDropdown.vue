<template>
    <div class="note-count-dropdown" v-click-outside="closeDropdown">
      <a class="btn btn-flat havelock white-text" style="font-size:x-small" href="#" @click.prevent="toggleDropdown">
        Loaded {{ loadedCount }} {{ loadedCount > 1 || loadedCount === 0 ? 'notes' : 'note' }}
      </a>
      <ul v-if="open" class="count-dropdown-content">
        <li
          v-for="opt in options"
          :key="opt"
          :class="{ 'selected-option': opt === currentCount }"
          @click="onOptionChoice(opt)"
        >{{ opt }}</li>
      </ul>
    </div>
</template>

<script>
export default {
    name: 'NoteCountDropdown',
    props: [
        'loadedCount'
    ],
    emits: [
        'countChanged'
    ],
    data() {
      return {
        open: false,
        options: [10, 15, 20, 25, 50, 100]
      };
    },
    computed: {
      currentCount() {
        return this.$store.getters.noteCount;
      }
    },
    directives: {
      'click-outside': {
        mounted(el, binding) {
          el._clickOutside = (e) => {
            if (!el.contains(e.target)) binding.value();
          };
          document.addEventListener('click', el._clickOutside);
        },
        unmounted(el) {
          document.removeEventListener('click', el._clickOutside);
        }
      }
    },
    methods: {
        toggleDropdown() {
          this.open = !this.open;
        },
        closeDropdown() {
          this.open = false;
        },
        onOptionChoice(count) {
            this.$store.commit({ type: 'updateNoteCount', noteCount: count });
            this.$emit('countChanged');
            this.open = false;
        }
    }
}
</script>

<style scoped>
.note-count-dropdown {
  position: relative;
  display: inline-block;
}
.count-dropdown-content {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  min-width: 80px;
  background: var(--color-background, #fff);
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  list-style: none;
  padding: 4px 0;
  z-index: 100;
}
.count-dropdown-content li {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text, #333);
}
.count-dropdown-content li:hover {
  background-color: var(--color-primary-light, #e3f2fd);
}
.selected-option {
  background-color: var(--color-primary) !important;
  color: white !important;
}
</style>