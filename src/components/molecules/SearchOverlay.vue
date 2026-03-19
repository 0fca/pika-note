<template>
  <transition name="search-overlay">
    <div v-if="visible" class="search-overlay-backdrop" @click.self="close">
      <div class="search-overlay-panel">
        <div class="search-input-wrapper">
          <i class="material-icons search-icon">search</i>
          <input
            ref="searchInput"
            type="text"
            v-model="query"
            :placeholder="useAiSearch ? 'Ask AI about your notes...' : 'Search notes by name...'"
            class="search-input"
            @input="onInput"
            @keydown.esc="close"
            @keydown.enter="onEnterKey"
          />
          <label class="ai-toggle" :title="useAiSearch ? 'Switch to keyword search' : 'Switch to AI search'">
            <input type="checkbox" v-model="useAiSearch" @change="onAiToggle" />
            <span class="ai-toggle-label">AI</span>
          </label>
          <button v-if="query" class="clear-btn" @click="clearQuery">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="search-results">
          <template v-if="useAiSearch">
            <div v-if="aiStreaming" class="ai-response">
              <div class="ai-response-text">{{ aiResponseText }}<span class="ai-cursor">|</span></div>
            </div>
            <div v-else-if="aiResponseText && !aiStreaming" class="ai-response">
              <div class="ai-response-text">{{ aiResponseText }}</div>
            </div>
            <div v-else-if="!query" class="search-status">
              <i class="material-icons">psychology</i>
              <span>Type a question and press Enter to search with AI</span>
            </div>
          </template>
          <template v-else>
          <div v-if="loading" class="search-status">
            <div class="search-spinner"></div>
            <span>Searching...</span>
          </div>
          <div v-else-if="query && results.length === 0 && searched" class="search-status">
            <i class="material-icons">search_off</i>
            <span>No notes found</span>
          </div>
          <div v-else-if="!query" class="search-status">
            <i class="material-icons">lightbulb</i>
            <span>Type to search across all notes in this bucket</span>
          </div>
          <div
            v-for="note in results"
            :key="note.id"
            class="search-result-item"
            @click="selectNote(note)"
          >
            <div class="result-name">{{ note.humanName }}</div>
            <div class="result-date">{{ formatDate(note.timestamp) }}</div>
          </div>
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import NoteService from "@/services/noteService";
import ChatRelayService from "@/services/chatRelayService";

export default {
  name: 'SearchOverlay',
  emits: ['close', 'note-selected'],
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    bucketId: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      query: '',
      results: [],
      loading: false,
      searched: false,
      debounceTimer: null,
      noteService: new NoteService(),
      useAiSearch: false,
      aiStreaming: false,
      aiResponseText: '',
      chatRelayService: new ChatRelayService()
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.searchInput?.focus();
        });
      } else {
        this.query = '';
        this.results = [];
        this.searched = false;
        this.aiResponseText = '';
        this.aiStreaming = false;
      }
    }
  },
  methods: {
    onInput() {
      if (this.useAiSearch) return;
      clearTimeout(this.debounceTimer);
      if (!this.query.trim()) {
        this.results = [];
        this.searched = false;
        return;
      }
      this.debounceTimer = setTimeout(() => {
        this.search();
      }, 300);
    },
    onEnterKey() {
      if (this.useAiSearch && this.query.trim()) {
        this.performAiSearch();
      }
    },
    onAiToggle() {
      this.results = [];
      this.searched = false;
      this.aiResponseText = '';
      this.aiStreaming = false;
    },
    async performAiSearch() {
      if (!this.query.trim()) return;
      this.aiStreaming = true;
      this.aiResponseText = '';

      const model = process.env.VUE_APP_CHAT_MODEL || 'llama3.2';
      const prompt = `Search notes for: ${this.query}`;

      await this.chatRelayService.sendMessageAndStream(
        model,
        prompt,
        { tool: 'search' },
        (event, data) => {
          if (event === 'message' || event === 'datamessage') {
            this.aiResponseText += data;
          }
        },
        () => {
          this.aiStreaming = false;
        },
        (err) => {
          this.aiResponseText = `Error: ${err.message}`;
          this.aiStreaming = false;
        }
      );
    },
    async search() {
      if (!this.query.trim() || !this.bucketId) return;
      this.loading = true;
      try {
        this.results = await this.noteService.searchNotes(this.bucketId, this.query.trim());
        this.searched = true;
      } catch {
        this.results = [];
        this.searched = true;
      } finally {
        this.loading = false;
      }
    },
    clearQuery() {
      this.query = '';
      this.results = [];
      this.searched = false;
      this.aiResponseText = '';
      this.aiStreaming = false;
      this.$refs.searchInput?.focus();
    },
    close() {
      this.$emit('close');
    },
    selectNote(note) {
      this.$emit('note-selected', note);
      this.close();
    },
    formatDate(date) {
      const locale = navigator.language.split("-")[0];
      const d = Date.parse(date);
      const ye = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(d);
      const mo = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
      const da = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(d);
      return `${da} ${mo} ${ye}`;
    }
  },
  beforeUnmount() {
    clearTimeout(this.debounceTimer);
  }
}
</script>

<style scoped>
.search-overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  justify-content: center;
  padding-top: 10vh;
}

.search-overlay-panel {
  background: var(--color-background, #fff);
  border-radius: 12px;
  width: 90%;
  max-width: 560px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  align-self: flex-start;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  gap: 8px;
}

.search-icon {
  color: var(--color-text-secondary, #888);
  font-size: 24px;
}

.search-input {
  flex: 1;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  font-size: 16px;
  color: var(--color-text, #333);
  background: transparent;
  margin: 0 !important;
  padding: 4px 0 !important;
  height: auto !important;
}

.search-input::placeholder {
  color: var(--color-text-secondary, #aaa);
}

.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--color-text-secondary, #888);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover {
  background: var(--color-background-soft, #f0f0f0);
}

.ai-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary, #888);
  transition: background 0.15s, color 0.15s;
}

.ai-toggle:has(input:checked) {
  background: var(--color-primary, #0a4492);
  color: #fff;
}

.ai-toggle input {
  display: none;
}

.ai-toggle-label {
  pointer-events: none;
}

.ai-response {
  padding: 16px;
}

.ai-response-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text, #333);
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-cursor {
  animation: blink 0.8s step-end infinite;
  color: var(--color-primary, #0a4492);
}

@keyframes blink {
  50% { opacity: 0; }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.search-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  color: var(--color-text-secondary, #888);
  font-size: 14px;
}

.search-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border, #ddd);
  border-top-color: var(--color-primary, #0a4492);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.search-result-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.search-result-item:hover {
  background: var(--color-background-soft, #f5f5f5);
}

.result-name {
  font-weight: 500;
  color: var(--color-text, #333);
  font-size: 14px;
}

.result-date {
  font-size: 12px;
  color: var(--color-text-secondary, #888);
  margin-top: 2px;
}

/* Transitions */
.search-overlay-enter-active {
  transition: opacity 0.2s ease;
}
.search-overlay-leave-active {
  transition: opacity 0.15s ease;
}
.search-overlay-enter-from,
.search-overlay-leave-to {
  opacity: 0;
}

.search-overlay-enter-active .search-overlay-panel {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.search-overlay-leave-active .search-overlay-panel {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.search-overlay-enter-from .search-overlay-panel {
  transform: scale(0.95);
  opacity: 0;
}
.search-overlay-leave-to .search-overlay-panel {
  transform: scale(0.95);
  opacity: 0;
}
</style>
