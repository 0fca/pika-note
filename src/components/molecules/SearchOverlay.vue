<template>
  <transition name="search-overlay">
    <div v-if="visible" class="search-overlay-backdrop" @click.self="close">
      <div class="search-overlay-panel">
        <div class="search-input-wrapper">
          <span class="material-symbols-outlined search-icon">search</span>
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
          <label class="ai-toggle" :title="useAiSearch ? 'Switch to keyword search' : 'Switch to AI search (BETA)'">
            <input type="checkbox" v-model="useAiSearch" @change="onAiToggle" />
            <span class="ai-toggle-label">AI</span>
          </label>
          <button v-if="query" class="clear-btn" @click="clearQuery">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="search-results">
          <template v-if="useAiSearch">
            <div v-if="aiStreaming || aiResponseText || aiThinkingText || aiError" class="ai-response">
              <div v-if="aiIsThinking && !aiResponseText" class="ai-thinking-collapsed">
                <button class="ai-thinking-toggle" @click="thinkingActiveExpanded = !thinkingActiveExpanded">
                  <span class="material-symbols-outlined ai-thinking-chevron" :class="{ expanded: thinkingActiveExpanded }">chevron_right</span>
                  <span class="material-symbols-outlined ai-thinking-icon-sm">psychology</span>
                  <span>Thinking<span class="ai-thinking-dots-inline"><span>.</span><span>.</span><span>.</span></span></span>
                </button>
                <div v-if="thinkingActiveExpanded" class="ai-thinking-text-collapsed">{{ aiThinkingText }}<span class="ai-cursor">|</span></div>
              </div>
              <div v-if="aiThinkingText && (aiResponseText || !aiIsThinking)" class="ai-thinking-collapsed">
                <button class="ai-thinking-toggle" @click="thinkingExpanded = !thinkingExpanded">
                  <span class="material-symbols-outlined ai-thinking-chevron" :class="{ expanded: thinkingExpanded }">chevron_right</span>
                  <span class="material-symbols-outlined ai-thinking-icon-sm">psychology</span>
                  <span>Thought process</span>
                </button>
                <div v-if="thinkingExpanded" class="ai-thinking-text-collapsed">{{ aiThinkingText }}</div>
              </div>
              <div v-if="aiToolCallActive" class="ai-tool-call-indicator">
                <span class="material-symbols-outlined ai-tool-icon">build</span>
                <span>Executing tool</span>
                <span class="ai-thinking-dots-inline"><span>.</span><span>.</span><span>.</span></span>
              </div>
              <div v-if="aiError" class="ai-error-message">
                <span class="material-symbols-outlined ai-error-icon">error</span>
                <span>{{ aiError }}</span>
              </div>
              <div v-if="aiResponseText || (!aiIsThinking && !aiToolCallActive && !aiError && aiStreaming)" class="ai-response-text">
                {{ aiResponseText }}<span v-if="aiStreaming" class="ai-cursor">|</span>
              </div>
            </div>
            <div v-else-if="!query" class="search-status">
              <i class="material-symbols-outlined">psychology</i>
              <span>Type a question and press Enter to search with AI (BETA)</span>
            </div>
          </template>
          <template v-else>
          <div v-if="loading" class="search-status">
            <div class="search-spinner"></div>
            <span>Searching...</span>
          </div>
          <div v-else-if="query && results.length === 0 && searched" class="search-status">
            <span class="material-symbols-outlined">search_off</span>
            <span>No notes found</span>
          </div>
          <div v-else-if="!query" class="search-status">
            <span class="material-symbols-outlined">lightbulb</span>
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
import { getAvailableTools, isToolAvailable } from "@/services/chatToolService";

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
      aiThinkingText: '',
      aiIsThinking: false,
      thinkingExpanded: false,
      thinkingActiveExpanded: false,
      aiToolCallActive: false,
      aiError: '',
      chatRelayService: new ChatRelayService(),
      availableTools: [],
      toolsLoaded: false
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.searchInput?.focus();
        });
        if (!this.toolsLoaded) {
          this.loadTools();
        }
      } else {
        this.query = '';
        this.results = [];
        this.searched = false;
        this.aiResponseText = '';
        this.aiThinkingText = '';
        this.aiIsThinking = false;
        this.thinkingExpanded = false;
        this.thinkingActiveExpanded = false;
        this.aiToolCallActive = false;
        this.aiError = '';
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
      this.aiThinkingText = '';
      this.aiIsThinking = false;
      this.thinkingExpanded = false;
      this.thinkingActiveExpanded = false;
      this.aiToolCallActive = false;
      this.aiError = '';
      this.aiStreaming = false;
    },
    async loadTools() {
      try {
        this.availableTools = await getAvailableTools();
        this.toolsLoaded = true;
      } catch {
        this.availableTools = [];
      }
    },
    async performAiSearch() {
      if (!this.query.trim()) return;

      const tool = 'search';
      if (!isToolAvailable(tool, this.availableTools)) {
        this.aiResponseText = 'Error: AI search tool is not available';
        return;
      }

      this.aiStreaming = true;
      this.aiResponseText = '';
      this.aiThinkingText = '';
      this.aiIsThinking = false;
      this.thinkingExpanded = false;
      this.thinkingActiveExpanded = false;
      this.aiToolCallActive = false;
      this.aiError = '';

      const model = process.env.VUE_APP_CHAT_MODEL || 'lfm2.5-thinking';
      const prompt = `Search notes for: ${this.query}`;

      await this.chatRelayService.sendMessageAndStream(
        model,
        prompt,
        { tool: 'search', bucketId: this.bucketId },
        (event, data) => {
          if (event === 'ctlmessage') {
            if (data === 'await tool call') {
              this.aiIsThinking = false;
              this.aiToolCallActive = true;
            } else if (data === 'EMPTY RESP') {
              this.aiToolCallActive = false;
              this.aiError = 'Something went wrong — the model returned an empty response. Please try again.';
            }
            return;
          }
          if (event === 'message' || event === 'datamessage' || event === 'usermessage-chk' || event === 'usermessage') {
            const parsed = JSON.parse(data);
            if (parsed.message && parsed.message.thinking) {
              this.aiIsThinking = true;
              this.aiThinkingText += parsed.message.thinking;
            }
            if (parsed.message && parsed.message.content) {
              this.aiIsThinking = false;
              this.aiToolCallActive = false;
              this.aiResponseText += parsed.message.content;
            }
          }
        },
        () => {
          this.aiIsThinking = false;
          this.aiToolCallActive = false;
          this.aiStreaming = false;
        },
        (err) => {
          this.aiResponseText = `Error: ${err.message}`;
          this.aiIsThinking = false;
          this.aiToolCallActive = false;
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
      this.aiThinkingText = '';
      this.aiIsThinking = false;
      this.thinkingExpanded = false;
      this.thinkingActiveExpanded = false;
      this.aiToolCallActive = false;
      this.aiError = '';
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

/* Thinking phase - active */
.ai-thinking-dots-inline span {
  animation: dot-bounce 1.4s ease-in-out infinite;
  color: var(--color-primary, #0a4492);
  font-weight: 700;
}

.ai-thinking-dots-inline span:nth-child(2) {
  animation-delay: 0.2s;
}

.ai-thinking-dots-inline span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Tool call indicator */
.ai-tool-call-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  color: var(--color-text-secondary, #888);
  font-size: 13px;
}

.ai-tool-icon {
  font-size: 16px;
  color: var(--color-text-secondary, #888);
  animation: pulse-think 2s ease-in-out infinite;
}

/* Error message */
.ai-error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: #fef2f2;
  border-radius: 6px;
  font-size: 13px;
  color: #b91c1c;
}

.ai-error-icon {
  font-size: 18px;
  color: #dc2626;
}

@keyframes dot-bounce {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

@keyframes pulse-think {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Thinking phase - collapsed */
.ai-thinking-collapsed {
  margin-bottom: 12px;
}

.ai-thinking-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-secondary, #888);
  transition: background 0.15s, color 0.15s;
}

.ai-thinking-toggle:hover {
  background: var(--color-background-soft, #f0f0f0);
  color: var(--color-text, #333);
}

.ai-thinking-icon-sm {
  font-size: 16px;
}

.ai-thinking-chevron {
  font-size: 16px;
  transition: transform 0.2s ease;
}

.ai-thinking-chevron.expanded {
  transform: rotate(90deg);
}

.ai-thinking-text-collapsed {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary, #999);
  white-space: pre-wrap;
  word-break: break-word;
  border-left: 2px solid var(--color-border, #e0e0e0);
  padding-left: 12px;
  max-height: 200px;
  overflow-y: auto;
  font-style: italic;
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
