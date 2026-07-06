<template>
  <div class="editor sticky-section sheet-editor-shell" v-on:keydown.ctrl.s.prevent="save">
    <transition name="note-loading-fade">
      <div v-if="isLoadingNote" class="note-loading-overlay">
        <Preloader message="Loading note..." />
      </div>
    </transition>

    <div v-if="isNewNoteDraft" id="new-note-type-discovery" class="note-type-section">
      <label class="note-type-label" for="new-sheet-note-type">Note type</label>
      <select
        id="new-sheet-note-type"
        class="browser-default note-type-select"
        :value="noteType"
        @change="onNewNoteTypeChange($event.target.value)"
      >
        <option value="note">Note</option>
        <option value="sheet">Sheet</option>
      </select>
    </div>

    <div class="title-input-section">
      <div class="input-field">
        <input
          id="sheet-title-input"
          v-model="noteTitle"
          type="text"
          class="title-input"
          placeholder="Sheet title..."
        />
      </div>
    </div>

    <div class="row">
      <div class="fixed-action-btn" ref="fab">
        <a id="create_floating_btn" class="btn-floating btn-large floating-btn-orange toolbar-icon" @click.stop="fabOpen = !fabOpen">
          <span class="material-symbols-outlined fab-icon">table</span>
        </a>
        <ul :class="{ 'fab-open': fabOpen }">
          <li>
            <button @click.stop="save" class="btn-floating floating-btn-orange toolbar-icon">
              <span class="material-symbols-outlined fab-icon">save</span>
            </button>
          </li>
          <li>
            <button
              @click.stop="toggleAutoSave"
              class="btn-floating toolbar-icon"
              :class="autoSaveEnabled ? 'floating-btn-orange' : 'grey'"
              :title="autoSaveEnabled ? 'Auto-save: ON' : 'Auto-save: OFF'"
            >
              <span class="material-symbols-outlined fab-icon">
                {{ autoSaveEnabled ? 'sync' : 'sync_disabled' }}
              </span>
            </button>
          </li>
          <li>
            <button @click.stop="clearAll" class="btn-floating floating-btn-orange toolbar-icon">
              <span class="material-symbols-outlined fab-icon">clear_all</span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div class="row background sheet-background">
      <div class="sheet-frame" ref="sheetFrame">
        <vue-excel-editor
          ref="sheetEditor"
          v-model="sheetRows"
          class="sheet-grid"
          filter-row
          no-paging
          no-mass-update
          disable-panel-setting
          disable-panel-filter
          enter-to-south
          :height="sheetEditorHeight"
          width="100%"
          @update="onSheetChanged"
          @delete="onSheetChanged"
          @setting="onSheetSettingChange"
        >
          <vue-excel-column
            v-for="(column, index) in sheetColumns"
            :key="column.field"
            :field="column.field"
            :label="column.label"
            type="string"
            width="180px"
            :auto-fill-width="index === sheetColumns.length - 1"
          />
        </vue-excel-editor>

        <div class="sheet-actions">
          <button type="button" class="btn-action sheet-action-btn" @click="addSheetRow">Add row</button>
          <button type="button" class="btn-action sheet-action-btn" @click="addSheetColumn">Add column</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NoteService from '@/services/noteService';
import Preloader from '@/components/molecules/Preloader';
import { toastService } from '@/services/toastService';
import {
  countSheetCellCharacters,
  createEmptySheetState,
  extractSheetState,
  hasSheetContent,
  normalizeNoteType,
  parseDelimitedText,
  resolveNoteType,
  sanitizeSheetRows,
  serializeSheetRows,
  SHEET_INITIAL_ROW_COUNT,
  SHEET_MAX_ROW_COUNT,
  SHEET_ROW_EXPANSION_THRESHOLD,
  SHEET_INITIAL_COLUMN_COUNT,
  SHEET_MAX_COLUMN_COUNT,
  SHEET_COLUMN_EXPANSION_THRESHOLD,
  stringifySheetRows
} from '@/services/noteContentService';

const SHEET_EDITOR_OFFSET = 320;
const SHEET_EDITOR_MIN_HEIGHT = 360;
const AUTO_SAVE_INTERVAL_MS = 300000;
const AUTO_SAVE_DEBOUNCE_MS = 5000;

export default {
  name: 'SheetEditor',
  components: {
    Preloader
  },
  emits: ['note-saved'],
  computed: {
    id: {
      get() {
        return this.$store.getters.id;
      },
      set(id) {
        this.$store.commit({ type: 'updateId', id });
      }
    },
    bucketId() {
      return this.$store.getters.bucketUuid;
    },
    noteType() {
      return this.$store.getters.noteType;
    },
    isNewNoteDraft() {
      return this.id === '';
    }
  },
  watch: {
    id(newId, oldId) {
      if (newId === oldId) {
        return;
      }

      if (newId === '') {
        this.loadRequestId += 1;
        this.isLoadingNote = false;
        this.resetSheetDraft();
        return;
      }

      if (!this.applyPrefetchedNote(newId)) {
        this.loadNote(newId);
      }
      this.isProgrammaticTitleUpdate = true;
      this.noteTitle = this.$store.getters.name;
      this.isProgrammaticTitleUpdate = false;
    },
    noteTitle() {
      if (!this.isProgrammaticTitleUpdate && !this.isLoadingNote) {
        this.hasUnsavedChanges = true;
        this.triggerDebouncedAutoSave();
      }
    }
  },
  data() {
    const initialState = createEmptySheetState();

    return {
      noteService: null,
      noteTitle: '',
      autoSaveDebounceTimer: null,
      autoSaveEnabled: localStorage.getItem('autoSaveEnabled') !== 'false',
      hasUnsavedChanges: false,
      isProgrammaticTitleUpdate: false,
      isLoadingNote: false,
      loadRequestId: 0,
      isUnmounted: false,
      fabOpen: false,
      sheetColumns: initialState.columns,
      sheetRows: initialState.rows,
      sheetEditorHeight: '560px'
    };
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      if (vm.$store.getters.loggedIn === false) {
        toastService.show('Please, log in to use editor');
        vm.$router.push('/');
      }
    });
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutsideFab);
    window.addEventListener('resize', this.updateSheetEditorHeight);
    this.updateSheetEditorHeight();

    const savedAutoSave = localStorage.getItem('autoSaveEnabled');
    this.autoSaveEnabled = savedAutoSave !== 'false';
    this.$store.commit({ type: 'updateAutoSaveEnabled', autoSaveEnabled: this.autoSaveEnabled });

    this.noteService = new NoteService();
    this.runAutoSaveJob();
    this.syncSheetMetrics();

    if (this.id !== '') {
      if (!this.applyPrefetchedNote(this.id)) {
        this.loadNote(this.id);
      }
    }

    this.$nextTick(() => {
      this.attachSheetScrollListener();
      this.attachSheetPasteListener();
    });
  },
  unmounted() {
    this.isUnmounted = true;
    this.loadRequestId += 1;
    document.removeEventListener('click', this.handleClickOutsideFab);
    window.removeEventListener('resize', this.updateSheetEditorHeight);
    this.detachSheetScrollListener();
    this.detachSheetPasteListener();

    if (this.autoSaveDebounceTimer) {
      clearTimeout(this.autoSaveDebounceTimer);
      this.autoSaveDebounceTimer = null;
    }

    const intervalId = this.$store.getters.autoSaveJobId;
    clearInterval(intervalId);
    this.$store.commit({ type: 'updateIntervalId', autoSaveJobId: 0 });
  },
  methods: {
    consumePrefetchedNote(noteId) {
      const prefetchedNote = this.$store.getters.prefetchedNote;
      if (!prefetchedNote || prefetchedNote.id !== noteId) {
        return null;
      }

      this.$store.commit({ type: 'clearPrefetchedNote' });
      return prefetchedNote;
    },
    applyLoadedNote(note) {
      this.$store.commit({ type: 'updateNoteType', noteType: resolveNoteType(note) });
      const sheetState = extractSheetState(note.content);
      this.sheetColumns = sheetState.columns;
      this.sheetRows = sheetState.rows.length > 0 ? sheetState.rows : [this.createEmptyRow()];
      this.syncSheetMetrics();
      this.$store.commit({ type: 'updateIfError', error: false });
      this.$store.commit({ type: 'updateName', name: note.humanName });
      const noteDate = note.timestamp || note.lastModifiedDate || note.dateModified || note.modifiedAt || note.updatedAt || note.date;
      if (noteDate) {
        this.$store.commit({ type: 'updateLastSavedAt', lastSavedAt: noteDate });
      }
      this.isProgrammaticTitleUpdate = true;
      this.noteTitle = note.humanName;
      this.isProgrammaticTitleUpdate = false;
      this.hasUnsavedChanges = false;
    },
    applyPrefetchedNote(noteId) {
      if (!noteId) {
        return false;
      }

      const prefetchedNote = this.consumePrefetchedNote(noteId);
      if (!prefetchedNote) {
        return false;
      }

      this.isLoadingNote = true;
      this.applyLoadedNote(prefetchedNote);
      this.$nextTick(() => {
        this.isLoadingNote = false;
        this.hasUnsavedChanges = false;
        if (this.autoSaveDebounceTimer) {
          clearTimeout(this.autoSaveDebounceTimer);
          this.autoSaveDebounceTimer = null;
        }
      });
      return true;
    },
    handleClickOutsideFab(event) {
      if (this.fabOpen && this.$refs.fab && !this.$refs.fab.contains(event.target)) {
        this.fabOpen = false;
      }
    },
    updateSheetEditorHeight() {
      this.sheetEditorHeight = `${Math.max(window.innerHeight - SHEET_EDITOR_OFFSET, SHEET_EDITOR_MIN_HEIGHT)}px`;
    },
    resetSheetDraft() {
      const initialState = createEmptySheetState();
      this.sheetColumns = initialState.columns;
      this.sheetRows = initialState.rows;
      this.noteTitle = '';
      this.hasUnsavedChanges = false;
      this.$store.commit({ type: 'updateContent', content: '' });
      this.$store.commit({ type: 'setCharactersCount', count: 0 });
      this.$store.commit({ type: 'updateLastSavedAt', lastSavedAt: null });
    },
    syncSheetMetrics() {
      const normalizedRows = sanitizeSheetRows(this.sheetRows, this.sheetColumns);
      this.sheetRows = normalizedRows.length > 0 ? normalizedRows : [this.createEmptyRow()];
      this.$store.commit({ type: 'updateContent', content: serializeSheetRows(this.sheetRows, this.sheetColumns) });
      this.$store.commit({ type: 'setCharactersCount', count: countSheetCellCharacters(this.sheetRows, this.sheetColumns) });
    },
    createEmptyRow() {
      return this.sheetColumns.reduce((record, column) => {
        record[column.field] = '';
        return record;
      }, {});
    },
    onNewNoteTypeChange(noteType) {
      const normalizedType = normalizeNoteType(noteType);
      if (normalizedType === this.noteType) {
        return;
      }

      this.$store.commit('resetInactivityCounter');
      this.$store.commit({ type: 'updateNoteType', noteType: normalizedType });
      this.$store.commit({ type: 'updateDraftNoteType', noteType: normalizedType });
      this.$store.commit({ type: 'updateContent', content: '' });
      this.$store.commit({ type: 'setCharactersCount', count: 0 });
      this.hasUnsavedChanges = false;
    },
    onSheetChanged() {
      if (this.isLoadingNote) {
        return;
      }

      this.sheetRows = sanitizeSheetRows(this.sheetRows, this.sheetColumns);
      this.$store.commit('resetInactivityCounter');
      this.syncSheetMetrics();
      this.hasUnsavedChanges = true;
      this.triggerDebouncedAutoSave();
    },
    onSheetSettingChange(setting) {
      if (!setting || !Array.isArray(setting.fields) || setting.fields.length === 0) {
        return;
      }

      const nextColumns = this.sheetColumns.map(column => {
        const matchingField = setting.fields.find(field => field.name === column.field);
        return matchingField ? { ...column, label: matchingField.label || column.label } : column;
      });
      const labelsChanged = nextColumns.some((column, index) => column.label !== this.sheetColumns[index]?.label);

      if (!labelsChanged) {
        return;
      }

      this.sheetColumns = nextColumns;
      this.syncSheetMetrics();
      this.hasUnsavedChanges = true;
      this.triggerDebouncedAutoSave();
    },
    addSheetRow() {
      this.sheetRows = [...sanitizeSheetRows(this.sheetRows, this.sheetColumns), this.createEmptyRow()];
      this.onSheetChanged();
    },
    addSheetColumn() {
      if (this.sheetColumns.length >= SHEET_MAX_COLUMN_COUNT) return;
      const nextColumnIndex = this.sheetColumns.length + 1;
      const nextColumn = {
        field: `column_${nextColumnIndex}`,
        label: `Column ${nextColumnIndex}`
      };

      this.sheetColumns = [...this.sheetColumns, nextColumn];
      this.sheetRows = sanitizeSheetRows(this.sheetRows, this.sheetColumns)
        .map(row => ({ ...row, [nextColumn.field]: '' }));
      this.onSheetChanged();
    },
    loadNote(noteId) {
      const requestId = ++this.loadRequestId;
      this.isLoadingNote = true;
      this.noteService.getNote(noteId)
        .then(note => {
          if (this.isUnmounted || requestId !== this.loadRequestId) {
            return;
          }
          this.applyLoadedNote(note);
        })
        .catch(() => {
          if (this.isUnmounted || requestId !== this.loadRequestId) {
            return;
          }
          toastService.error('Error loading note');
        })
        .finally(() => {
          if (this.isUnmounted || requestId !== this.loadRequestId) {
            return;
          }
          this.$nextTick(() => {
            this.isLoadingNote = false;
            this.hasUnsavedChanges = false;
            if (this.autoSaveDebounceTimer) {
              clearTimeout(this.autoSaveDebounceTimer);
              this.autoSaveDebounceTimer = null;
            }
          });
        });
    },
    save() {
      if (this.autoSaveDebounceTimer) {
        clearTimeout(this.autoSaveDebounceTimer);
        this.autoSaveDebounceTimer = null;
      }

      const titleValue = this.noteTitle?.trim();
      if (!titleValue) {
        toastService.warning('It is a damn good idea to add a title!');
        return;
      }

      const normalizedRows = sanitizeSheetRows(this.sheetRows, this.sheetColumns);
      if (!hasSheetContent(normalizedRows, this.sheetColumns)) {
        toastService.warning('Add some sheet data before saving');
        return;
      }

      this.sheetRows = normalizedRows;
      const content = serializeSheetRows(normalizedRows, this.sheetColumns);
      const rawContent = stringifySheetRows(normalizedRows, this.sheetColumns);

      this.$store.commit({ type: 'updateIsSaving', isSaving: true });
      const request = this.$store.getters.id
        ? this.noteService.saveNote(this.id, titleValue, content, rawContent, this.noteType)
        : this.noteService.addNote(this.bucketId, titleValue, content, rawContent, this.noteType);

      request.then(async response => {
        if (!response.ok) {
          toastService.error(`A server responded with non-success code: ${response.status}`);
          return;
        }

        if (!this.$store.getters.id) {
          const json = await response.json();
          const id = json.payload.id;
          this.$store.commit({ type: 'updateId', id });
          this.$store.commit({ type: 'updateDraftNoteType', noteType: 'note' });
          this.$store.commit({ type: 'finalizeNewNoteTab', id, title: titleValue });
          if (this.$route.params.id !== id) {
            this.$router.replace('/editor/' + id);
          }
          toastService.success('Note created!');
        } else {
          toastService.success('Note saved!');
        }

        const now = new Date().toISOString();
        this.$store.commit({ type: 'updateName', name: titleValue });
        this.$store.commit({ type: 'updateLastSavedAt', lastSavedAt: now });
        this.$store.commit({ type: 'updateTabTitle', id: this.$store.getters.id, title: titleValue });
        this.syncSheetMetrics();
        this.hasUnsavedChanges = false;
        this.$emit('note-saved');
      }).catch(() => {
        toastService.error('An unexpected error occurred, reload the page');
      }).finally(() => {
        this.$store.commit({ type: 'updateIsSaving', isSaving: false });
      });
    },
    clearAll() {
      const initialState = createEmptySheetState(this.sheetColumns);
      this.sheetRows = initialState.rows;
      this.onSheetChanged();
      toastService.show('Cleared!');
    },
    runAutoSaveJob() {
      const autoSaveJobId = setInterval(() => {
        if (this.$store.getters.errorLoadingNote) {
          return;
        }
        if (!this.$store.getters.canSave && !this.$store.getters.isSaving) {
          this.triggerDebouncedAutoSave();
        }
      }, AUTO_SAVE_INTERVAL_MS);
      this.$store.commit({ type: 'updateIntervalId', autoSaveJobId });
    },
    triggerDebouncedAutoSave() {
      if (!this.autoSaveEnabled || this.isLoadingNote) {
        return;
      }

      if (this.autoSaveDebounceTimer) {
        clearTimeout(this.autoSaveDebounceTimer);
      }

      this.autoSaveDebounceTimer = setTimeout(() => {
        this.performAutoSave();
      }, AUTO_SAVE_DEBOUNCE_MS);
    },
    performAutoSave() {
      if (!this.hasUnsavedChanges) {
        return;
      }
      if (!this.noteTitle || !this.noteTitle.trim()) {
        return;
      }
      if (!hasSheetContent(this.sheetRows, this.sheetColumns)) {
        return;
      }
      if (!this.$store.getters.errorLoadingNote && !this.$store.getters.canSave && !this.$store.getters.isSaving) {
        this.save();
      }
    },
    toggleAutoSave() {
      this.autoSaveEnabled = !this.autoSaveEnabled;
      localStorage.setItem('autoSaveEnabled', this.autoSaveEnabled.toString());
      this.$store.commit({ type: 'updateAutoSaveEnabled', autoSaveEnabled: this.autoSaveEnabled });

      if (!this.autoSaveEnabled && this.autoSaveDebounceTimer) {
        clearTimeout(this.autoSaveDebounceTimer);
        this.autoSaveDebounceTimer = null;
      }

      toastService.show(this.autoSaveEnabled ? 'Auto-save enabled' : 'Auto-save disabled');
    },
    attachSheetScrollListener() {
      const frame = this.$refs.sheetFrame;
      if (!frame) return;
      frame.addEventListener('wheel', this.handleSheetWheel, { passive: false });
      frame.addEventListener('touchstart', this.handleSheetTouchStart, { passive: true });
      frame.addEventListener('touchmove', this.handleSheetTouchMove, { passive: false });
    },
    detachSheetScrollListener() {
      const frame = this.$refs.sheetFrame;
      if (!frame) return;
      frame.removeEventListener('wheel', this.handleSheetWheel);
      frame.removeEventListener('touchstart', this.handleSheetTouchStart);
      frame.removeEventListener('touchmove', this.handleSheetTouchMove);
    },
    handleSheetWheel(event) {
      const scrollable = this.getSheetScrollContainer();
      if (!scrollable) return;
      event.preventDefault();
      scrollable.scrollTop += event.deltaY;
      scrollable.scrollLeft += event.deltaX;
      this.checkRowExpansion(scrollable);
      this.checkColumnExpansion(scrollable);
    },
    handleSheetTouchStart(event) {
      if (event.touches.length === 1) {
        this._lastTouchY = event.touches[0].clientY;
        this._lastTouchX = event.touches[0].clientX;
      }
    },
    handleSheetTouchMove(event) {
      if (event.touches.length !== 1) return;
      const scrollable = this.getSheetScrollContainer();
      if (!scrollable) return;
      const touchY = event.touches[0].clientY;
      const touchX = event.touches[0].clientX;
      const deltaY = this._lastTouchY - touchY;
      const deltaX = this._lastTouchX - touchX;
      this._lastTouchY = touchY;
      this._lastTouchX = touchX;
      event.preventDefault();
      scrollable.scrollTop += deltaY;
      scrollable.scrollLeft += deltaX;
      this.checkRowExpansion(scrollable);
      this.checkColumnExpansion(scrollable);
    },
    getSheetScrollContainer() {
      const frame = this.$refs.sheetFrame;
      if (!frame) return null;
      return frame.querySelector('.table-content') || frame.querySelector('.systable')?.parentElement || null;
    },
    checkRowExpansion(scrollable) {
      if (!scrollable || this.sheetRows.length >= SHEET_MAX_ROW_COUNT) return;
      const distanceFromBottom = scrollable.scrollHeight - scrollable.scrollTop - scrollable.clientHeight;
      const rowHeight = scrollable.scrollHeight / Math.max(this.sheetRows.length, 1);
      const rowsFromEnd = distanceFromBottom / rowHeight;
      if (rowsFromEnd <= SHEET_ROW_EXPANSION_THRESHOLD) {
        this.expandSheetRows();
      }
    },
    checkColumnExpansion(scrollable) {
      if (!scrollable || this.sheetColumns.length >= SHEET_MAX_COLUMN_COUNT) return;
      const distanceFromRight = scrollable.scrollWidth - scrollable.scrollLeft - scrollable.clientWidth;
      const columnWidth = scrollable.scrollWidth / Math.max(this.sheetColumns.length, 1);
      const columnsFromEnd = distanceFromRight / columnWidth;
      if (columnsFromEnd <= SHEET_COLUMN_EXPANSION_THRESHOLD) {
        this.expandSheetColumns();
      }
    },
    expandSheetRows() {
      const currentCount = this.sheetRows.length;
      if (currentCount >= SHEET_MAX_ROW_COUNT) return;
      const newCount = Math.min(currentCount + SHEET_INITIAL_ROW_COUNT, SHEET_MAX_ROW_COUNT);
      const emptyRow = () => this.sheetColumns.reduce((row, col) => {
        row[col.field] = '';
        return row;
      }, {});
      for (let i = currentCount; i < newCount; i++) {
        this.sheetRows.push(emptyRow());
      }
    },
    expandSheetColumns() {
      const currentCount = this.sheetColumns.length;
      if (currentCount >= SHEET_MAX_COLUMN_COUNT) return;
      const newCount = Math.min(currentCount + SHEET_INITIAL_COLUMN_COUNT, SHEET_MAX_COLUMN_COUNT);
      const newColumns = [];
      for (let i = currentCount + 1; i <= newCount; i++) {
        newColumns.push({ field: `column_${i}`, label: `Column ${i}` });
      }
      this.sheetColumns = [...this.sheetColumns, ...newColumns];
      this.sheetRows = this.sheetRows.map(row => {
        const updatedRow = { ...row };
        newColumns.forEach(col => { updatedRow[col.field] = ''; });
        return updatedRow;
      });
    },
    attachSheetPasteListener() {
      const frame = this.$refs.sheetFrame;
      if (!frame) return;
      frame.addEventListener('paste', this.handleSheetPaste);
    },
    detachSheetPasteListener() {
      const frame = this.$refs.sheetFrame;
      if (!frame) return;
      frame.removeEventListener('paste', this.handleSheetPaste);
    },
    handleSheetPaste(event) {
      const text = (event.clipboardData || window.clipboardData)?.getData('text');
      if (!text || !text.includes('\n') && !text.includes('\t') && !text.includes(',') && !text.includes(';') && !text.includes(':')) {
        return;
      }
      const parsed = parseDelimitedText(text);
      if (!parsed || !parsed.rows || parsed.rows.length === 0) return;
      event.preventDefault();

      this.sheetColumns = parsed.columns;
      const totalRows = Math.min(
        Math.max(parsed.rows.length, SHEET_INITIAL_ROW_COUNT),
        SHEET_MAX_ROW_COUNT
      );
      const emptyRow = () => this.sheetColumns.reduce((row, col) => {
        row[col.field] = '';
        return row;
      }, {});
      const rows = [...parsed.rows];
      while (rows.length < totalRows) {
        rows.push(emptyRow());
      }
      this.sheetRows = rows;
      this.hasUnsavedChanges = true;
      this.syncSheetMetrics();
    }
  }
};
</script>

<style scoped>
.note-loading-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 10px;
}

.note-loading-fade-enter-active,
.note-loading-fade-leave-active {
  transition: opacity 0.2s ease;
}

.note-loading-fade-enter-from,
.note-loading-fade-leave-to {
  opacity: 0;
}

.note-type-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.note-type-label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.note-type-select {
  background-color: var(--color-background) !important;
  color: var(--color-text) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: 44px;
}

.title-input-section {
  margin-bottom: var(--spacing-lg);
}

.title-input {
  width: 100%;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  padding: var(--spacing-md);
  border: none;
  border-bottom: 2px solid var(--color-border);
  background-color: transparent;
  color: var(--color-heading);
  transition: border-color var(--transition-fast);
}

.title-input:focus {
  outline: none;
  border-bottom-color: var(--color-primary);
}

.title-input::placeholder {
  color: var(--color-text-muted);
}

.background {
  padding: 10px;
  background-color: var(--color-background-soft);
  border-radius: 10px;
  min-height: 50vh;
  position: relative;
}

.sheet-background {
  display: flex;
}

.sheet-frame {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.sheet-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.sheet-action-btn {
  min-width: 120px;
}

.fixed-action-btn {
  position: fixed;
  bottom: 60px;
  right: 24px;
  z-index: 998;
}

.fixed-action-btn > a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.fab-icon {
  color: whitesmoke !important;
  font-size: 24px;
}

.fixed-action-btn ul {
  list-style: none;
  margin: 0;
  padding: 0;
  position: absolute;
  bottom: 64px;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fixed-action-btn ul.fab-open {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.fixed-action-btn ul li button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  color: whitesmoke;
}

.sheet-editor-shell :deep(.vue-excel-editor) {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface, var(--color-background));
  color: var(--color-text);
}

.sheet-editor-shell :deep(.vue-excel-editor .table-content) {
  background: var(--color-surface, var(--color-background));
}

.sheet-editor-shell :deep(.systable thead th),
.sheet-editor-shell :deep(.systable .first-col),
.sheet-editor-shell :deep(.systable thead td.column-filter) {
  background: var(--color-background-mute, var(--color-background-soft)) !important;
  color: var(--color-heading) !important;
  border-color: var(--color-border) !important;
}

.sheet-editor-shell :deep(.systable th),
.sheet-editor-shell :deep(.systable td) {
  border-color: var(--color-border) !important;
}

.sheet-editor-shell :deep(.systable tbody td),
.sheet-editor-shell :deep(.systable tbody td.sticky-column) {
  background: var(--color-surface, var(--color-background)) !important;
  color: var(--color-text) !important;
}

.sheet-editor-shell :deep(.systable tr.select td),
.sheet-editor-shell :deep(.systable tbody td.focus) {
  background: color-mix(in srgb, var(--color-primary) 18%, var(--color-surface, var(--color-background))) !important;
}

.sheet-editor-shell :deep(.systable tbody td.error) {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-danger, #ff6b6b) 60%, transparent);
}

.sheet-editor-shell :deep(.systable input),
.sheet-editor-shell :deep(.systable textarea),
.sheet-editor-shell :deep(.systable select),
.sheet-editor-shell :deep(.systable [contenteditable='true']) {
  color: var(--color-text) !important;
}

@media (prefers-color-scheme: dark) {
  .note-loading-overlay {
    background-color: rgba(20, 20, 20, 0.95);
  }
}
</style>
