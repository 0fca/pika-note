<template>
  <div id="editor-tabs-discovery" class="editor-tabs-bar" v-if="tabs.length > 0">
    <div 
      v-for="tab in tabs" 
      :key="tab.id"
      class="editor-tab"
      :class="{ 'editor-tab-active': tab.id === activeTabId, 'editor-tab-pinned': tab.pinned }"
      @click="selectTab(tab.id)"
      @dblclick="pinTab(tab.id)"
    >
      <span class="tab-title" :class="{ 'tab-title-italic': !tab.pinned }">{{ tab.title || 'Untitled' }}</span>
      <button v-if="tab.pinned" class="tab-reload" @click.stop="reloadTab(tab.id)" title="Reload from server">
        <span class="material-symbols-outlined tab-close-icon">refresh</span>
      </button>
      <button class="tab-close" @click.stop="closeTab(tab.id)" title="Close tab">
        <span class="material-symbols-outlined tab-close-icon">close</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EditorTabs',
  computed: {
    tabs() {
      return this.$store.getters.editorTabs;
    },
    activeTabId() {
      return this.$store.getters.activeTabId;
    }
  },
  methods: {
    selectTab(id) {
      if (id !== this.activeTabId) {
        this.$store.commit({ type: 'setActiveTab', id });
        this.$emit('tab-selected', id);
      }
    },
    pinTab(id) {
      this.$store.commit({ type: 'addPinnedTab', id });
    },
    closeTab(id) {
      const wasActive = id === this.activeTabId;
      this.$store.commit({ type: 'closeTab', id });
      if (wasActive && this.$store.getters.activeTabId) {
        this.$emit('tab-selected', this.$store.getters.activeTabId);
      } else if (wasActive) {
        this.$emit('tabs-empty');
      }
    },
    reloadTab(id) {
      this.$emit('tab-reload', id);
    }
  }
}
</script>

<style scoped>
.editor-tabs-bar {
  display: flex;
  gap: 0;
  background-color: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}

.editor-tabs-bar::-webkit-scrollbar {
  display: none;
}

.editor-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  background-color: var(--color-background-mute);
  border-right: 1px solid var(--color-border);
  min-width: 0;
  max-width: 200px;
  transition: background-color var(--transition-fast);
  user-select: none;
  flex-shrink: 0;
}

.editor-tab:hover {
  background-color: var(--color-background-soft);
}

.editor-tab-active {
  background-color: var(--color-background) !important;
  border-bottom: 2px solid var(--color-primary);
  position: relative;
}

.editor-tab-pinned .tab-title {
  font-style: normal !important;
}

.tab-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.tab-title-italic {
  font-style: italic;
}

.editor-tab-active .tab-title {
  color: var(--color-heading);
  font-weight: var(--font-weight-semibold);
}

.tab-close,
.tab-reload {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: opacity var(--transition-fast), background-color var(--transition-fast);
  flex-shrink: 0;
}

.editor-tab:hover .tab-close,
.editor-tab-active .tab-close,
.editor-tab:hover .tab-reload,
.editor-tab-active .tab-reload {
  opacity: 1;
}

.tab-close:hover,
.tab-reload:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.tab-close-icon {
  font-size: 16px;
  color: var(--color-text-soft);
}

.tab-close:hover .tab-close-icon,
.tab-reload:hover .tab-close-icon {
  color: var(--color-error);
}
</style>
