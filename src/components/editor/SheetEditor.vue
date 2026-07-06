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
      <div class="sheet-frame" ref="sheetFrame" @contextmenu.capture.prevent="openContextMenu($event)">
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
          @select="onSheetRowSelection"
          @cell-focus="onSheetCellFocus"
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

        <div
          v-if="contextMenuVisible"
          class="sheet-context-menu"
          :style="{ top: contextMenuTop + 'px', left: contextMenuLeft + 'px' }"
        >
          <button type="button" class="sheet-context-menu-item" :disabled="!canUndoSheetChange" @click="contextMenuUndo">Undo</button>
          <div class="sheet-context-menu-divider"></div>
          <button type="button" class="sheet-context-menu-item" :disabled="!canInsertRowHere" @click="contextMenuAddRowHere">Add new row here...</button>
          <button type="button" class="sheet-context-menu-item" @click="contextMenuAddRowAtEnd">Add new row at the end</button>
          <button type="button" class="sheet-context-menu-item" @click="contextMenuAddColumn">Add column</button>
          <template v-if="showDeleteActions">
            <div class="sheet-context-menu-divider"></div>
            <button v-if="hasSelectedRows" type="button" class="sheet-context-menu-item" @click="contextMenuDeleteRows">Delete selected row(s)</button>
            <button v-if="hasSelectedColumn" type="button" class="sheet-context-menu-item" @click="contextMenuDeleteColumn">Delete selected column</button>
          </template>
          <div class="sheet-context-menu-divider"></div>
          <button type="button" class="sheet-context-menu-item" @click="contextMenuCopy">Copy</button>
          <button type="button" class="sheet-context-menu-item" @click="contextMenuPaste">Paste</button>
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
  parseDelimitedTextMatrix,
  resolveNoteType,
  sanitizeSheetRows,
  serializeSheetRows,
  SHEET_INITIAL_ROW_COUNT,
  SHEET_MAX_ROW_COUNT,
  SHEET_INITIAL_COLUMN_COUNT,
  SHEET_MAX_COLUMN_COUNT,
  SHEET_COLUMN_EXPANSION_THRESHOLD,
  stringifySheetRows,
  trimSheetRowsToContent,
  trimSheetColumnsToContent
} from '@/services/noteContentService';

const SHEET_EDITOR_OFFSET = 320;
const SHEET_EDITOR_MIN_HEIGHT = 360;
const AUTO_SAVE_INTERVAL_MS = 300000;
const AUTO_SAVE_DEBOUNCE_MS = 5000;
const SHEET_UNDO_STORAGE_KEY = 'pika-note-sheet-editor-undo-snapshots';
const SHEET_UNDO_SNAPSHOT_LIMIT = 50;

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
    canInsertRowHere() {
      return this.resolveContextRowIndex() >= 0;
    },
    canUndoSheetChange() {
      return this.undoSnapshots.length > 1;
    },
    hasSelectedColumn() {
      return Number.isInteger(this.selectedColumnIndex);
    },
    hasSelectedRows() {
      return this.selectedRowIndexes.length > 0;
    },
    noteType() {
      return this.$store.getters.noteType;
    },
    showDeleteActions() {
      return this.hasSelectedRows || this.hasSelectedColumn;
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
      isApplyingSnapshot: false,
      sheetColumns: initialState.columns,
      sheetRows: initialState.rows,
      sheetEditorHeight: '560px',
      undoSnapshots: [],
      selectedRowIndexes: [],
      selectedColumnIndex: null,
      contextMenuVisible: false,
      contextMenuTop: 0,
      contextMenuLeft: 0,
      contextMenuTarget: null
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
    document.addEventListener('click', this.closeContextMenu);
    // Capture phase lets the sheet override vue3-excel-editor's window-level shortcuts when needed.
    window.addEventListener('keydown', this.handleSheetKeydown, true);
    window.addEventListener('resize', this.updateSheetEditorHeight);
    this.updateSheetEditorHeight();

    const savedAutoSave = localStorage.getItem('autoSaveEnabled');
    this.autoSaveEnabled = savedAutoSave !== 'false';
    this.$store.commit({ type: 'updateAutoSaveEnabled', autoSaveEnabled: this.autoSaveEnabled });

    this.noteService = new NoteService();
    this.runAutoSaveJob();
    this.syncSheetMetrics();
    this.initializeUndoHistory();

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
    document.removeEventListener('click', this.closeContextMenu);
    window.removeEventListener('keydown', this.handleSheetKeydown, true);
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
      const trimmedColumns = trimSheetColumnsToContent(sheetState.rows, sheetState.columns);
      const trimmedRows = trimSheetRowsToContent(sheetState.rows, trimmedColumns);
      this.sheetColumns = trimmedColumns;
      this.sheetRows = trimmedRows.length > 0 ? trimmedRows : [this.createEmptyRow()];
      this.syncSheetMetrics();
      this.selectedColumnIndex = null;
      this.selectedRowIndexes = [];
      this.initializeUndoHistory();
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
      this.selectedColumnIndex = null;
      this.selectedRowIndexes = [];
      this.noteTitle = '';
      this.hasUnsavedChanges = false;
      this.$store.commit({ type: 'updateContent', content: '' });
      this.$store.commit({ type: 'setCharactersCount', count: 0 });
      this.$store.commit({ type: 'updateLastSavedAt', lastSavedAt: null });
      this.initializeUndoHistory();
    },
    syncSheetMetrics() {
      const normalizedRows = sanitizeSheetRows(this.sheetRows, this.sheetColumns);
      this.sheetRows = normalizedRows.length > 0 ? normalizedRows : [this.createEmptyRow()];
      this.$store.commit({ type: 'updateContent', content: serializeSheetRows(this.sheetRows, this.sheetColumns) });
      this.$store.commit({ type: 'setCharactersCount', count: countSheetCellCharacters(this.sheetRows, this.sheetColumns) });
    },
    initializeUndoHistory() {
      this.undoSnapshots = [];
      this.recordUndoSnapshot(true);
      this.$nextTick(() => {
        this.applySelectedColumnStyles();
      });
    },
    buildSheetSnapshot() {
      return {
        columns: this.sheetColumns.map(column => ({ ...column })),
        rows: sanitizeSheetRows(this.sheetRows, this.sheetColumns).map(row => ({ ...row }))
      };
    },
    persistUndoSnapshots() {
      try {
        localStorage.setItem(SHEET_UNDO_STORAGE_KEY, JSON.stringify(this.undoSnapshots));
      } catch {
        // Ignore storage quota issues; undo remains available in memory for the current boot.
      }
    },
    recordUndoSnapshot(force = false) {
      if (this.isApplyingSnapshot) return;
      const snapshot = this.buildSheetSnapshot();
      const serializedSnapshot = JSON.stringify(snapshot);
      const lastSnapshot = this.undoSnapshots[this.undoSnapshots.length - 1];
      if (!force && lastSnapshot && JSON.stringify(lastSnapshot) === serializedSnapshot) {
        return;
      }
      this.undoSnapshots.push(snapshot);
      if (this.undoSnapshots.length > SHEET_UNDO_SNAPSHOT_LIMIT) {
        this.undoSnapshots.shift();
      }
      this.persistUndoSnapshots();
    },
    restoreUndoSnapshot(snapshot) {
      if (!snapshot) return;
      this.isApplyingSnapshot = true;
      this.selectedColumnIndex = null;
      this.sheetColumns = (snapshot.columns || []).map(column => ({ ...column }));
      this.sheetRows = (snapshot.rows || []).map(row => ({ ...row }));
      this.syncSheetMetrics();
      this.hasUnsavedChanges = true;
      this.clearSheetRowSelection();
      this.triggerDebouncedAutoSave();
      this.$nextTick(() => {
        this.isApplyingSnapshot = false;
        this.applySelectedColumnStyles();
      });
    },
    undoSheetChange() {
      if (!this.canUndoSheetChange) {
        return;
      }
      this.undoSnapshots = this.undoSnapshots.slice(0, -1);
      this.persistUndoSnapshots();
      this.restoreUndoSnapshot(this.undoSnapshots[this.undoSnapshots.length - 1]);
    },
    handleSheetKeydown(event) {
      const editor = this.$refs.sheetEditor;
      const frame = this.$refs.sheetFrame;
      if (!editor || !frame) return;
      const target = event.target;
      const isSheetTarget = target instanceof Node && frame.contains(target);
      if (!isSheetTarget && !editor.focused && !this.contextMenuVisible) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.stopPropagation();
        this.undoSheetChange();
        return;
      }

      if (editor.inputBoxShow && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.stopPropagation();
        return;
      }

      if (editor.inputBoxShow || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (this.hasSelectedColumn) {
          event.preventDefault();
          event.stopPropagation();
          this.deleteSelectedColumn();
          return;
        }
        if (this.hasSelectedRows) {
          event.preventDefault();
          event.stopPropagation();
          this.deleteSelectedRows();
        }
      }
    },
    createEmptyRow(columns = this.sheetColumns) {
      return columns.reduce((record, column) => {
        record[column.field] = '';
        return record;
      }, {});
    },
    applySelectedColumnStyles() {
      const table = this.getSheetTableElement();
      if (!table) return;
      table.querySelectorAll('.sheet-selected-column').forEach(cell => {
        cell.classList.remove('sheet-selected-column');
      });
      if (!Number.isInteger(this.selectedColumnIndex)) {
        return;
      }
      const columnNumber = this.selectedColumnIndex + 2;
      table.querySelectorAll(`tr > *:nth-child(${columnNumber})`).forEach(cell => {
        cell.classList.add('sheet-selected-column');
      });
    },
    onSheetCellFocus() {
      if (this.selectedColumnIndex !== null) {
        this.selectedColumnIndex = null;
        this.$nextTick(() => {
          this.applySelectedColumnStyles();
        });
      }
    },
    onSheetRowSelection() {
      const editor = this.$refs.sheetEditor;
      this.selectedRowIndexes = editor?.selected
        ? Object.keys(editor.selected).map(index => Number(index)).sort((a, b) => a - b)
        : [];
      if (this.selectedRowIndexes.length > 0 && this.selectedColumnIndex !== null) {
        this.selectedColumnIndex = null;
      }
      this.$nextTick(() => {
        this.applySelectedColumnStyles();
      });
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
      this.finalizeSheetMutation();
    },
    finalizeSheetMutation({ checkRowExpansion = true } = {}) {
      this.sheetRows = sanitizeSheetRows(this.sheetRows, this.sheetColumns);
      this.$store.commit('resetInactivityCounter');
      this.syncSheetMetrics();
      if (checkRowExpansion) {
        this.checkRowExpansion();
      }
      this.recordUndoSnapshot();
      this.hasUnsavedChanges = true;
      this.triggerDebouncedAutoSave();
      this.$nextTick(() => {
        this.applySelectedColumnStyles();
      });
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
      this.finalizeSheetMutation({ checkRowExpansion: false });
    },
    addSheetRow() {
      this.sheetRows = [...sanitizeSheetRows(this.sheetRows, this.sheetColumns), this.createEmptyRow()];
      this.finalizeSheetMutation({ checkRowExpansion: false });
    },
    addSheetRowHere() {
      const targetRowIndex = this.resolveContextRowIndex();
      if (targetRowIndex < 0) {
        this.addSheetRow();
        return;
      }
      const targetColumnIndex = this.resolveContextColumnIndex();
      const sanitizedRows = sanitizeSheetRows(this.sheetRows, this.sheetColumns);
      const insertIndex = Math.min(targetRowIndex + 1, sanitizedRows.length);
      this.sheetRows = [
        ...sanitizedRows.slice(0, insertIndex),
        this.createEmptyRow(),
        ...sanitizedRows.slice(insertIndex)
      ];
      this.finalizeSheetMutation({ checkRowExpansion: false });
      this.focusSheetCell(insertIndex, targetColumnIndex);
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
      this.finalizeSheetMutation({ checkRowExpansion: false });
    },
    buildSheetColumn(columnIndex) {
      const nextIndex = columnIndex + 1;
      return {
        field: `column_${nextIndex}`,
        label: `Column ${nextIndex}`
      };
    },
    focusSheetCell(rowIndex, columnIndex = 0) {
      this.$nextTick(() => {
        const editor = this.$refs.sheetEditor;
        if (!editor || typeof editor.moveTo !== 'function') return;
        editor.moveTo(Math.max(rowIndex, 0), Math.max(columnIndex, 0));
      });
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
      this.finalizeSheetMutation({ checkRowExpansion: false });
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
      return frame.querySelector('.table-content') || frame.querySelector('.systable') || null;
    },
    getSheetTableElement() {
      const frame = this.$refs.sheetFrame;
      if (!frame) return null;
      return frame.querySelector('.systable');
    },
    checkRowExpansion() {
      if (this.sheetRows.length >= SHEET_MAX_ROW_COUNT) return;
      const focusedRowIndex = this.getFocusedSheetRowIndex();
      if (focusedRowIndex < 0) return;
      const rowPositionFromBottom = this.sheetRows.length - focusedRowIndex;
      if (rowPositionFromBottom === 2 || rowPositionFromBottom === 3) {
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
      const matrix = parseDelimitedTextMatrix(text);
      if (matrix.length === 0) return;
      event.preventDefault();
      this.applyDelimitedPaste(text, matrix);
    },
    openContextMenu(event) {
      const frame = this.$refs.sheetFrame;
      if (!frame) return;
      event.stopPropagation();
      this.contextMenuTarget = this.resolveContextMenuTarget(event);
      if (this.contextMenuTarget?.type === 'column') {
        this.selectSheetColumn(this.contextMenuTarget.columnIndex);
      } else if (this.contextMenuTarget?.type === 'row') {
        this.selectSheetRow(this.contextMenuTarget.rowIndex);
      } else if (this.contextMenuTarget?.type === 'cell' && this.selectedColumnIndex !== null) {
        this.selectedColumnIndex = null;
        this.$nextTick(() => {
          this.applySelectedColumnStyles();
        });
      }
      const rect = frame.getBoundingClientRect();
      this.contextMenuTop = event.clientY - rect.top;
      this.contextMenuLeft = event.clientX - rect.left;
      this.contextMenuVisible = true;
    },
    resolveContextMenuTarget(event) {
      const table = this.getSheetTableElement();
      if (!table || !(event.target instanceof Element)) return null;
      const rowRibbon = event.target.closest('tbody td.first-col');
      if (rowRibbon) {
        const rowIndex = Number(rowRibbon.getAttribute('pos'));
        return Number.isInteger(rowIndex) ? { type: 'row', rowIndex } : null;
      }
      const columnRibbon = event.target.closest('thead th');
      if (columnRibbon && !columnRibbon.classList.contains('first-col')) {
        const columnIndex = Array.from(columnRibbon.parentElement.children).indexOf(columnRibbon) - 1;
        if (columnIndex >= 0) {
          return { type: 'column', columnIndex };
        }
      }
      const bodyCell = event.target.closest('tbody td');
      if (!bodyCell || bodyCell.classList.contains('first-col')) return null;
      const rowElement = bodyCell.closest('tr');
      const tbody = table.querySelector('tbody');
      if (!rowElement || !tbody) return null;
      const rowIndex = Array.from(tbody.children).indexOf(rowElement);
      const columnIndex = Array.from(rowElement.children).indexOf(bodyCell) - 1;
      if (rowIndex < 0 || columnIndex < 0 || columnIndex >= this.sheetColumns.length) return null;
      return {
        type: 'cell',
        rowIndex,
        columnIndex,
        field: this.sheetColumns[columnIndex].field
      };
    },
    closeContextMenu() {
      this.contextMenuVisible = false;
    },
    contextMenuUndo() {
      this.undoSheetChange();
      this.closeContextMenu();
    },
    contextMenuAddRowHere() {
      this.addSheetRowHere();
      this.closeContextMenu();
    },
    contextMenuAddRowAtEnd() {
      this.addSheetRow();
      this.closeContextMenu();
    },
    contextMenuAddColumn() {
      this.addSheetColumn();
      this.closeContextMenu();
    },
    contextMenuDeleteRows() {
      this.deleteSelectedRows();
      this.closeContextMenu();
    },
    contextMenuDeleteColumn() {
      this.deleteSelectedColumn();
      this.closeContextMenu();
    },
    contextMenuCopy() {
      this.closeContextMenu();
      const selectedCells = this.getSelectedCells(this.$refs.sheetEditor);
      if (!selectedCells || selectedCells.length === 0) return;

      let textToCopy;
      if (selectedCells.length === 1) {
        textToCopy = `${selectedCells[0].value ?? ''}`;
      } else {
        const rowMap = new Map();
        for (const cell of selectedCells) {
          if (!rowMap.has(cell.rowIndex)) {
            rowMap.set(cell.rowIndex, []);
          }
          rowMap.get(cell.rowIndex).push(`${cell.value ?? ''}`);
        }
        const sortedRows = [...rowMap.entries()].sort((a, b) => a[0] - b[0]);
        textToCopy = sortedRows.map(([, cells]) => cells.join(';')).join('\n');
      }
      navigator.clipboard.writeText(textToCopy).catch(() => {
        toastService.error('Failed to copy to clipboard');
      });
    },
    async contextMenuPaste() {
      try {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        const hasDelimiter = text.includes('\n') || text.includes('\t') || text.includes(',') || text.includes(';') || text.includes(':');
        if (hasDelimiter) {
          const matrix = parseDelimitedTextMatrix(text);
          if (matrix.length > 0) {
            this.applyDelimitedPaste(text, matrix);
            return;
          }
        }
        const selectedCells = this.getSelectedCells(this.$refs.sheetEditor);
        if (selectedCells && selectedCells.length === 1) {
          const cell = selectedCells[0];
          this.sheetRows[cell.rowIndex][cell.field] = text;
          this.finalizeSheetMutation();
        }
      } catch {
        toastService.error('Failed to read clipboard');
      } finally {
        this.closeContextMenu();
      }
    },
    resolveContextRowIndex() {
      if (Number.isInteger(this.contextMenuTarget?.rowIndex)) {
        return this.contextMenuTarget.rowIndex;
      }
      const focusedRowIndex = this.getFocusedSheetRowIndex();
      return focusedRowIndex >= 0 ? focusedRowIndex : -1;
    },
    resolveContextColumnIndex() {
      if (Number.isInteger(this.contextMenuTarget?.columnIndex)) {
        return this.contextMenuTarget.columnIndex;
      }
      const editor = this.$refs.sheetEditor;
      return Number.isInteger(editor?.currentColPos) ? editor.currentColPos : 0;
    },
    clearSheetRowSelection() {
      const editor = this.$refs.sheetEditor;
      if (typeof editor?.clearAllSelected === 'function') {
        editor.clearAllSelected();
      }
      this.selectedRowIndexes = [];
    },
    selectSheetColumn(columnIndex) {
      if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= this.sheetColumns.length) {
        return;
      }
      this.selectedColumnIndex = columnIndex;
      this.clearSheetRowSelection();
      this.$nextTick(() => {
        this.applySelectedColumnStyles();
      });
    },
    selectSheetRow(rowIndex) {
      if (!Number.isInteger(rowIndex) || rowIndex < 0) {
        return;
      }
      const editor = this.$refs.sheetEditor;
      if (typeof editor?.clearAllSelected === 'function') {
        editor.clearAllSelected();
      }
      if (typeof editor?.selectRecord === 'function') {
        editor.selectRecord(rowIndex);
      }
      this.selectedColumnIndex = null;
      this.onSheetRowSelection();
    },
    deleteSelectedRows() {
      const rowIndexes = this.selectedRowIndexes.length > 0
        ? this.selectedRowIndexes
        : (Number.isInteger(this.contextMenuTarget?.rowIndex) ? [this.contextMenuTarget.rowIndex] : []);
      if (rowIndexes.length === 0) {
        return;
      }
      const rowsToDelete = new Set(rowIndexes);
      const remainingRows = sanitizeSheetRows(this.sheetRows, this.sheetColumns)
        .filter((_, index) => !rowsToDelete.has(index));
      this.sheetRows = remainingRows.length > 0 ? remainingRows : [this.createEmptyRow()];
      this.clearSheetRowSelection();
      this.finalizeSheetMutation({ checkRowExpansion: false });
      this.focusSheetCell(Math.min(rowIndexes[0], this.sheetRows.length - 1), this.resolveContextColumnIndex());
    },
    deleteSelectedColumn() {
      if (!Number.isInteger(this.selectedColumnIndex)) {
        return;
      }
      if (this.sheetColumns.length <= 1) {
        toastService.warning('Keep at least one column in the sheet');
        return;
      }
      const nextColumns = this.sheetColumns.filter((_, index) => index !== this.selectedColumnIndex);
      this.sheetColumns = nextColumns;
      this.sheetRows = sanitizeSheetRows(this.sheetRows, nextColumns);
      const nextColumnIndex = Math.min(this.selectedColumnIndex, nextColumns.length - 1);
      this.selectedColumnIndex = null;
      this.finalizeSheetMutation({ checkRowExpansion: false });
      this.focusSheetCell(this.resolveContextRowIndex(), nextColumnIndex);
    },
    getFocusedSheetRowIndex() {
      const table = this.getSheetTableElement();
      if (!table) return -1;
      const focusedCell = table.querySelector('td.focus');
      if (!focusedCell) return -1;
      const rowEl = focusedCell.closest('tr');
      if (!rowEl) return -1;
      const tbody = table.querySelector('tbody');
      if (!tbody) return -1;
      return Array.from(tbody.children).indexOf(rowEl);
    },
    getSelectedCells(editor) {
      if (this.contextMenuTarget?.type === 'cell') {
        if (this.contextMenuTarget.rowIndex < 0 || this.contextMenuTarget.rowIndex >= this.sheetRows.length) {
          return [];
        }
        return [{
          rowIndex: this.contextMenuTarget.rowIndex,
          field: this.contextMenuTarget.field,
          value: this.sheetRows[this.contextMenuTarget.rowIndex]?.[this.contextMenuTarget.field] ?? ''
        }];
      }
      if (!editor) return [];
      if (typeof editor.getSelectedContent === 'function') {
        const content = editor.getSelectedContent();
        if (content && Array.isArray(content)) return content;
      }
      if (
        Number.isInteger(editor.currentRowPos)
        && editor.currentRowPos >= 0
        && editor.currentRowPos < this.sheetRows.length
        && Number.isInteger(editor.currentColPos)
        && editor.currentColPos >= 0
      ) {
        const field = this.sheetColumns[editor.currentColPos]?.field;
        if (field) {
          return [{
            rowIndex: editor.currentRowPos,
            field,
            value: editor.inputBoxShow ? editor.inputBox.value : (this.sheetRows[editor.currentRowPos]?.[field] ?? '')
          }];
        }
      }
      const table = this.getSheetTableElement();
      if (!table) return [];
      const focusedCell = table.querySelector('td.focus');
      if (!focusedCell) return [];
      const rowEl = focusedCell.closest('tr');
      if (!rowEl) return [];
      const tbody = table.querySelector('tbody');
      if (!tbody) return [];
      const rowIndex = Array.from(tbody.children).indexOf(rowEl);
      const cellIndex = Array.from(rowEl.children).indexOf(focusedCell) - 1;
      if (rowIndex < 0 || cellIndex < 0 || cellIndex >= this.sheetColumns.length) return [];
      const field = this.sheetColumns[cellIndex].field;
      return field ? [{
        rowIndex,
        field,
        value: this.sheetRows[rowIndex]?.[field] ?? ''
      }] : [];
    },
    applyDelimitedPaste(text, matrix) {
      const anchorCell = this.getSelectedCells(this.$refs.sheetEditor)[0] || null;
      if (this.shouldReplaceSheetFromPaste(anchorCell)) {
        const parsed = parseDelimitedText(text);
        if (parsed && parsed.rows && parsed.rows.length > 0) {
          this.replaceSheetFromPaste(parsed);
          return;
        }
      }

      this.pasteMatrixIntoSheet(matrix, anchorCell);
    },
    shouldReplaceSheetFromPaste(anchorCell) {
      return anchorCell
        && anchorCell.rowIndex === 0
        && this.resolvePasteColumnIndex(anchorCell) === 0
        && !hasSheetContent(this.sheetRows, this.sheetColumns);
    },
    resolvePasteColumnIndex(anchorCell) {
      const fieldIndex = anchorCell?.field
        ? this.sheetColumns.findIndex(column => column.field === anchorCell.field)
        : -1;
      if (fieldIndex >= 0) {
        return fieldIndex;
      }
      if (Number.isInteger(anchorCell?.columnIndex)) {
        return anchorCell.columnIndex;
      }
      const editor = this.$refs.sheetEditor;
      return Number.isInteger(editor?.currentColPos) ? editor.currentColPos : 0;
    },
    replaceSheetFromPaste(parsed) {
      this.sheetColumns = parsed.columns;
      const totalRows = Math.min(
        Math.max(parsed.rows.length, SHEET_INITIAL_ROW_COUNT),
        SHEET_MAX_ROW_COUNT
      );
      const rows = [...parsed.rows];
      while (rows.length < totalRows) {
        rows.push(this.createEmptyRow(this.sheetColumns));
      }
      this.sheetRows = rows;
      this.finalizeSheetMutation({ checkRowExpansion: false });
    },
    pasteMatrixIntoSheet(matrix, anchorCell) {
      const startRowIndex = Math.max(anchorCell?.rowIndex ?? this.getFocusedSheetRowIndex(), 0);
      const startColumnIndex = Math.max(this.resolvePasteColumnIndex(anchorCell), 0);
      const maxWidth = matrix.reduce((width, row) => Math.max(width, row.length), 0);
      const requiredColumnCount = Math.min(startColumnIndex + maxWidth, SHEET_MAX_COLUMN_COUNT);
      const requiredRowCount = Math.min(startRowIndex + matrix.length, SHEET_MAX_ROW_COUNT);
      const nextColumns = [...this.sheetColumns];

      while (nextColumns.length < requiredColumnCount) {
        nextColumns.push(this.buildSheetColumn(nextColumns.length));
      }

      const nextRows = sanitizeSheetRows(this.sheetRows, nextColumns);
      while (nextRows.length < requiredRowCount) {
        nextRows.push(this.createEmptyRow(nextColumns));
      }

      matrix.slice(0, SHEET_MAX_ROW_COUNT - startRowIndex).forEach((row, rowOffset) => {
        row.slice(0, SHEET_MAX_COLUMN_COUNT - startColumnIndex).forEach((cellValue, columnOffset) => {
          const column = nextColumns[startColumnIndex + columnOffset];
          if (column) {
            nextRows[startRowIndex + rowOffset][column.field] = cellValue ?? '';
          }
        });
      });

      this.sheetColumns = nextColumns;
      this.sheetRows = nextRows;
      this.finalizeSheetMutation({ checkRowExpansion: false });
      this.focusSheetCell(
        Math.min(startRowIndex + matrix.length - 1, this.sheetRows.length - 1),
        Math.min(startColumnIndex + maxWidth - 1, this.sheetColumns.length - 1)
      );
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
  position: relative;
}

.sheet-context-menu {
  position: absolute;
  z-index: 200;
  background: var(--color-surface, var(--color-background));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 6px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 140px;
}

.sheet-context-menu-item {
  display: block;
  width: 100%;
  padding: 6px 14px;
  border: none;
  background: none;
  color: var(--color-text);
  font-size: var(--font-size-sm, 14px);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
}

.sheet-context-menu-item:hover {
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface, var(--color-background)));
}

.sheet-context-menu-divider {
  height: 1px;
  margin: 4px 0;
  background: var(--color-border);
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

.sheet-editor-shell :deep(.systable .sheet-selected-column) {
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
