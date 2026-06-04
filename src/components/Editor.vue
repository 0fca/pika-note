<template>
  <div class="editor sticky-section" v-on:keydown.ctrl.s.prevent="save">
    <!-- Note Loading Overlay -->
    <transition name="note-loading-fade">
      <div v-if="isLoadingNote" class="note-loading-overlay">
        <Preloader message="Loading note..." />
      </div>
    </transition>
    
    <!-- Title Input for All Notes -->
    <div class="title-input-section">
      <div class="input-field">
        <input 
          type="text" 
          id="note-title-input" 
          v-model="noteTitle" 
          :placeholder="noteType === 'sheet' ? 'Sheet title...' : 'Note title...'"
          class="title-input"
          @focus="onTitleFocus"
          :readonly="noteType === 'sheet'"
          :aria-label="noteType === 'sheet' ? 'Sheet title, read only' : 'Note title'"
        />
      </div>
    </div>
    
    <div class="row" v-if="noteType !== 'sheet'">
      <div class="fixed-action-btn" ref="fab">
        <a id="create_floating_btn" class="btn-floating btn-large floating-btn-orange toolbar-icon" @click.stop="fabOpen = !fabOpen">
          <span class="material-symbols-outlined fab-icon">mode_edit</span>
        </a>
        <ul :class="{ 'fab-open': fabOpen }">
          <li>
            <button @click.stop="save" class="btn-floating floating-btn-orange toolbar-icon">
              <span class="material-symbols-outlined fab-icon">
                save
              </span>
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
              <span class="material-symbols-outlined fab-icon">
                clear_all
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
    <div class="row background">
      <div v-if="noteType !== 'sheet'" id="editor" @focus="onEditorFocus"></div>
      <div v-else class="sheet-container">
        <vue-excel-editor
          v-if="sheetRows.length > 0"
          v-model="sheetRows"
          filter-row
          readonly
          no-paging
          no-mass-update
          disable-panel-setting
          disable-panel-filter
          width="100%"
          height="480px"
        />
        <div v-if="sheetRows.length === 0" class="sheet-empty-state" role="status" aria-live="polite">
          No CSV rows available for this sheet.
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NoteService from "@/services/noteService";
import MediumEditor from "medium-editor";
import Preloader from "@/components/Preloader";
import { toastService } from '@/services/toastService';
import { extractNoteTextContent, extractSheetRows, normalizeNoteType } from '@/services/noteContentService';

export default {
  components: {
    Preloader
  },
  emits: ['note-saved'],
  computed: {
    id: {
      get(){
        return this.$store.getters.id;
      },
      set(id){
        this.$store.commit({type: 'updateId', id: id});
      }
    },
    bucketId: {
      get(){
        return this.$store.getters.bucketUuid;
      }
    },
    noteType: {
      get() {
        return this.$store.getters.noteType;
      }
    }
  },
  watch: {
    id(newId, oldId) {
      if (newId !== oldId && this.editor) {
        if (newId === '') {
          // New note - clear editor
          this.editor.setContent('', 0);
          this.$store.commit({type: 'updateContent', content: ''});
          this.$store.commit({type: 'setCharactersCount', count: 0});
          this.isProgrammaticTitleUpdate = true;
          this.noteTitle = '';
          this.isProgrammaticTitleUpdate = false;
          this.showStatsFooter = false;
          this.sheetRows = [];
          // Reset unsaved changes for new note
          this.hasUnsavedChanges = false;
        } else {
          // Load existing note
          this.loadNote(newId);
          this.isProgrammaticTitleUpdate = true;
          this.noteTitle = this.$store.getters.name;
          this.isProgrammaticTitleUpdate = false;
          // hasUnsavedChanges will be reset in loadNote
        }
      }
    },
    noteTitle() {
      if (this.noteType === 'sheet') {
        return;
      }
      // Only mark as unsaved if this is a user edit, not a programmatic update or note load
      if (!this.isProgrammaticTitleUpdate && !this.isLoadingNote) {
        // Mark as having unsaved changes when title changes
        this.hasUnsavedChanges = true;
        // Trigger debounced auto-save on title changes
        this.triggerDebouncedAutoSave();
      }
    },
    noteType(newType) {
      if (newType === 'sheet') {
        if (this.autoSaveDebounceTimer) {
          clearTimeout(this.autoSaveDebounceTimer);
          this.autoSaveDebounceTimer = null;
        }
        this.hasUnsavedChanges = false;
      }
    }
  },
  data() {
    return {
      name: this.$store.getters.name,
      editor: null,
      noteService: null,
      noteTitle: '',
      showStatsFooter: false,
      autoSaveDebounceTimer: null,
      autoSaveEnabled: localStorage.getItem('autoSaveEnabled') !== 'false', // Default true
      hasUnsavedChanges: false,
      isProgrammaticTitleUpdate: false,
      isLoadingNote: false,
      fabOpen: false,
      sheetRows: []
    }
  },
  beforeRouteEnter(to, from, next){
    next(vm => {
      if(vm.$store.getters.loggedIn === false){
        toastService.show('Please, log in to use editor');
        vm.$router.push("/");
      }
    })
  },
  unmounted() {
    document.removeEventListener('click', this.handleClickOutsideFab);
    this.$store.commit({type: 'updateContent', content: ""});
    this.$store.commit(({type: 'updateName', name: ""}));
    this.$store.commit(({type: 'updateLastSavedAt', lastSavedAt: null}));
    if (this.editor) {
      this.editor.destroy();
    }
    const id = this.$store.getters.autoSaveJobId;
    clearInterval(id);
    this.$store.commit({type: 'updateIntervalId', autoSaveJobId: 0});
    localStorage.removeItem('content');
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutsideFab);
    // Initialize autoSaveEnabled from localStorage and sync with store
    const savedAutoSave = localStorage.getItem('autoSaveEnabled');
    this.autoSaveEnabled = savedAutoSave !== 'false'; // Default true
    this.$store.commit({type: 'updateAutoSaveEnabled', autoSaveEnabled: this.autoSaveEnabled});
    
    this.noteService = new NoteService();
    
    this.runAutoSaveJob();
    this.editor = new MediumEditor('#editor', {
      targetBlank: true,
      paste: {
        forcePlainText: false,
        cleanPastedHTML: true,
        cleanAttrs: ['style', 'dir'],
        cleanTags: ['label', 'meta', 'script']
      },
      toolbar: {
          buttons: ['bold', 'italic', 'underline', 'strikethrough', 'quote', 'anchor', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'orderedlist', 'unorderedlist', 'outdent', 'indent', 'h2', 'h3', 'h4', 'h5', 'h6'],
      },
      'buttonLabels': 'fontawesome',
      placeholder: {
        text: 'Type your note...',
        hideOnClick: true
      },
      autoLink: true
    });
    this.$store.commit({type: 'updateRawText', content: this.editor.elements[0].innerText});
    this.$store.commit({type: 'setCharactersCount', count: this.editor.elements[0].innerText.length});
    const _this = this;
    this.editor.subscribe('editableInput', function (event) {
      _this.$store.commit({type: 'updateLock', updateLock: true});
      if (event.inputType === 'insertText') {
        _this.$store.commit({type: 'updateRawText', update: event.data});
        _this.$store.commit('increaseCharactersCounter');
      }
      if(event.inputType === 'deleteContentBackward'){
        if(_this.editor.elements[0].innerText !== null && _this.editor.elements[0].innerText !== undefined){
          _this.$store.commit('decreaseCharactersCounter');
        } 
        _this.$store.commit({type: 'updateRawText', update: event.data});
      }
      _this.runEditTimeout();
      if(event.inputType === 'deleteByCut'){
        _this.$store.commit({type: 'setCharactersCount', count: event.target.innerText.trim().length});
      }
      // Mark as having unsaved changes (skip during note loading)
      if (!_this.isLoadingNote) {
        _this.hasUnsavedChanges = true;
        // Trigger debounced auto-save on content change
        _this.triggerDebouncedAutoSave();
      }
    });
    this.editor.subscribe('editablePaste', function(event){
      if(event.target.innerText !== ''){
        _this.$store.commit({type: 'setCharactersCount', count: event.target.innerText.length});
        // Mark as having unsaved changes (skip during note loading)
        if (!_this.isLoadingNote) {
          _this.hasUnsavedChanges = true;
          // Trigger debounced auto-save on paste
          _this.triggerDebouncedAutoSave();
        }
      }
    });
    
    // Load note if ID exists
    if(this.id !== ''){
      this.loadNote(this.id);
    }
  },
  methods: {
    handleClickOutsideFab(event) {
      if (this.fabOpen && this.$refs.fab && !this.$refs.fab.contains(event.target)) {
        this.fabOpen = false;
      }
    },
    onTitleFocus() {
      // When user focuses title input for new note, we don't show stats yet
      this.showStatsFooter = false;
      // Reset inactivity counter on user interaction
      this.$store.commit('resetInactivityCounter');
    },
    onEditorFocus() {
      // When user focuses editor for new note, show stats footer
      if (this.$store.getters.id === '') {
        this.showStatsFooter = true;
      }
      // Reset inactivity counter on user interaction
      this.$store.commit('resetInactivityCounter');
    },
    loadNote(noteId) {
      if (noteId && this.editor) {
        this.isLoadingNote = true;
        this.noteService.getNote(noteId)
          .then(note => {
            const noteType = normalizeNoteType(note.noteType);
            this.$store.commit({type: 'updateNoteType', noteType: noteType});
            if (noteType === 'sheet') {
              this.sheetRows = extractSheetRows(note.content);
              this.$store.commit({type: 'updateContent', content: ''});
              this.editor.setContent('', 0);
              this.$store.commit({type: 'setCharactersCount', count: 0});
            } else {
              const content = extractNoteTextContent(note.content);
              this.sheetRows = [];
              this.$store.commit({type: 'updateContent', content: content});
              this.editor.setContent(content, 0);
              this.$store.commit({type: 'setCharactersCount', count: this.editor.elements[0].innerText.length});
            }
            this.$store.commit({type: "updateIfError", error: false});
            this.$store.commit({type: 'updateName', name: note.humanName});
            // Set Last Saved At to the note's last modified date from the API
            const noteDate = note.timestamp || note.lastModifiedDate || note.dateModified || note.modifiedAt || note.updatedAt || note.date;
            if (noteDate) {
              this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: noteDate});
            }
            this.isProgrammaticTitleUpdate = true;
            this.noteTitle = note.humanName;
            this.isProgrammaticTitleUpdate = false;
            // Reset unsaved changes flag when loading a note
            this.hasUnsavedChanges = false;
          }).catch(() => {
            toastService.error('Error loading note');
          }).finally(() => {
            this.isLoadingNote = false;
            // Clear any auto-save timer that may have been triggered during load
            if (this.autoSaveDebounceTimer) {
              clearTimeout(this.autoSaveDebounceTimer);
              this.autoSaveDebounceTimer = null;
            }
          });
      }
    },
    save: function () {
      if (this.noteType === 'sheet') {
        toastService.warning('Sheet notes are read-only');
        return;
      }
      // Reset auto-save debounce timer when user manually saves
      if (this.autoSaveDebounceTimer) {
        clearTimeout(this.autoSaveDebounceTimer);
        this.autoSaveDebounceTimer = null;
      }
      
      // Always use the noteTitle from the input field
      const titleValue = this.noteTitle;
      
      if (titleValue) {
        const content = this.editor.getContent(0);
        if(this.$store.getters.count === 0){
          return;
        }
        this.$store.commit({type: 'updateIsSaving', isSaving: true});
        if (this.$store.getters.id) {
          this.noteService.saveNote(this.id, titleValue, content, this.editor.elements[0].innerText)
          .then((r) => {
            if(r.ok){
              toastService.success('Note saved!');
              const now = new Date();
              this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: `${now.toISOString()}`});
              // Update the title in store after saving
              this.$store.commit({type: 'updateName', name: titleValue});
             // Update tab title
             this.$store.commit({type: 'updateTabTitle', id: this.id, title: titleValue});
             // Reset unsaved changes flag
             this.hasUnsavedChanges = false;
             // Emit event to parent to reload notes list
             this.$emit('note-saved');
           } else {
             toastService.error(`A server responded with non-success code: ${r.status}`);
           }
           this.$store.commit({type: 'updateIsSaving', isSaving: false});
          }).catch(() => {
           toastService.error('An unexpected error occured, reload the page');
           this.$store.commit({type: 'updateIsSaving', isSaving: false});
          });
        } else {
          this.noteService.addNote(this.bucketId, titleValue, content, this.editor.elements[0].innerText).then((r) => {
           if(r.ok){
             r.json().then(json => {
               const id = json.payload.id;
               this.$store.commit({type: 'updateId', id: id});
               this.$store.commit({type: 'updateName', name: titleValue});
               // Add tab for new note
               this.$store.commit({type: 'addOrReplaceTab', id: id, title: titleValue, pinned: false});
               const now = new Date();
               this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: `${now.toISOString()}`});
               // Reset unsaved changes flag
               this.hasUnsavedChanges = false;
               // Update URL to reflect the new note id
               if (this.$route.params.id !== id) {
                 this.$router.replace('/editor/' + id);
               }
               // Emit event to parent to reload notes list
               this.$emit('note-saved');
             });
             toastService.success('Note created!')
           } else {
             toastService.error(`A server responded with non-success code: ${r.status}`);
           }
           this.$store.commit({type: 'updateIsSaving', isSaving: false});
          }).catch(() => {
           toastService.error('An unexpected error occured, reload the page');
           this.$store.commit({type: 'updateIsSaving', isSaving: false});
          });
        }
      } else {
        toastService.warning('It is a damn good idea to add a title!')
      }
    },
    clearAll: function () {
      if (this.noteType === 'sheet') {
        return;
      }
      toastService.show('Cleared!')
      this.$store.commit({type: 'setCharactersCount', count: 0});
      this.editor.resetContent();
    },
    runAutoSaveJob: function() {
      const autoSaveJobId = setInterval(() => {
        console.log("auto-save interval check");
        if(this.$store.getters.errorLoadingNote){
          return;
        }
        if(!this.$store.getters.canSave && !this.$store.getters.isSaving){
          this.triggerDebouncedAutoSave();
        }
      }, 300000);
      this.$store.commit({type: 'updateIntervalId', autoSaveJobId: autoSaveJobId});
    },
    
    triggerDebouncedAutoSave() {
      if (this.noteType === 'sheet') {
        return;
      }
      // Only trigger debounced auto-save if enabled
      if (!this.autoSaveEnabled) {
        return;
      }
      
      // Clear existing timer
      if (this.autoSaveDebounceTimer) {
        clearTimeout(this.autoSaveDebounceTimer);
      }
      
      // Set new timer for 5 seconds
      this.autoSaveDebounceTimer = setTimeout(() => {
        this.performAutoSave();
      }, 5000);
    },
    
    performAutoSave() {
      if (this.noteType === 'sheet') {
        return;
      }
      // Check if there are unsaved changes
      if (!this.hasUnsavedChanges) {
        console.log("No unsaved changes, skipping auto-save");
        return;
      }
      
      // Validate that we have content before auto-saving
      if (!this.noteTitle || !this.noteTitle.trim()) {
        return;
      }
      
      // Check if editor has content
      const content = this.$store.getters.count;
      if (!content || content === 0) {
        return;
      }
      
      // Perform save
      if (!this.$store.getters.errorLoadingNote && !this.$store.getters.canSave && !this.$store.getters.isSaving) {
        console.log("Performing auto-save");
        this.save();
      }
    },
    
    toggleAutoSave() {
      this.autoSaveEnabled = !this.autoSaveEnabled;
      localStorage.setItem('autoSaveEnabled', this.autoSaveEnabled.toString());
      
      // Update store
      this.$store.commit({type: 'updateAutoSaveEnabled', autoSaveEnabled: this.autoSaveEnabled});
      
      // Clear any pending auto-save when disabling
      if (!this.autoSaveEnabled && this.autoSaveDebounceTimer) {
        clearTimeout(this.autoSaveDebounceTimer);
        this.autoSaveDebounceTimer = null;
      }
      
      // Show feedback
      toastService.show(
        this.autoSaveEnabled ? 'Auto-save enabled' : 'Auto-save disabled'
      );
    },
    runEditTimeout: function(){
      setTimeout(() => {
        this.$store.commit({type: 'updateLock', updateLock: false});
      }, 5000);
    }
  },
}
</script>

<style scoped>
/* Note Loading Overlay */
.note-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  height: fit-content;
  min-height: 50vh;
  position: relative;
}

.sheet-container {
  width: 100%;
}

.sheet-empty-state {
  padding: var(--spacing-md);
  color: var(--color-text-muted);
}

/* Dark mode support for note loading */
@media (prefers-color-scheme: dark) {
  .note-loading-overlay {
    background-color: rgba(30, 30, 30, 0.95);
  }
}

/* FAB (Floating Action Button) - CSS-only implementation */
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
</style>