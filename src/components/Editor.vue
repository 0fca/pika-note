<template>
  <div class="editor sticky-section" v-on:keydown.ctrl.s.prevent="save">
    <!-- Title Input for All Notes -->
    <div class="title-input-section">
      <div class="input-field">
        <input 
          type="text" 
          id="note-title-input" 
          v-model="noteTitle" 
          placeholder="Note title..."
          class="title-input"
          @focus="onTitleFocus"
        />
      </div>
    </div>
    
    <div class="row">
      <div class="fixed-action-btn">
        <a id="create_floating_btn" class="btn-floating btn-large floating-btn-orange toolbar-icon">
          <i class="large material-icons">mode_edit</i>
        </a>
        <ul>
          <li>
            <button @click="save" class="btn-floating floating-btn-orange toolbar-icon">
              <i class="material-icons">
                save
              </i>
            </button>
          </li>
          <li>
            <button 
              @click="toggleAutoSave" 
              class="btn-floating toolbar-icon"
              :class="autoSaveEnabled ? 'floating-btn-orange' : 'grey'"
              :title="autoSaveEnabled ? 'Auto-save: ON' : 'Auto-save: OFF'"
            >
              <i class="material-icons">
                {{ autoSaveEnabled ? 'sync' : 'sync_disabled' }}
              </i>
            </button>
          </li>
          <li>
            <button @click="clearAll" class="btn-floating floating-btn-orange toolbar-icon">
              <i class="material-icons">
                clear_all
              </i>
            </button>
          </li>
        </ul>
      </div>
    </div>
    <div id="tap-target" class="tap-target floating-btn-orange white-text" data-target="create_floating_btn" v-if="this.editorDiscoveryMessage === true">
      <div class="tap-target-content">
        <h5>Editor Context Actions</h5>
        <p>This floating button hides a context menu which allows you to either reset the editor's content or save your note. Tap anywhere to dismiss.</p>
      </div>
    </div>
    <div class="row background">
      <div id="editor" @focus="onEditorFocus"></div>
    </div>
  </div>
</template>

<script>
import M from 'materialize-css';
import NoteService from "@/services/noteService";
import MediumEditor from "medium-editor";

export default {
  components: {},
  emits: ['note-saved'],
  computed: {
    id: {
      get(){
        return this.$store.getters.id;
      },
      set(id){
        this.$store.commit({type: 'updateId', id: id});
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
          this.noteTitle = '';
          this.showStatsFooter = false;
        } else {
          // Load existing note
          this.loadNote(newId);
          this.noteTitle = this.$store.getters.name;
        }
      }
    },
    noteTitle() {
      // Trigger debounced auto-save when title changes
      this.triggerDebouncedAutoSave();
    }
  },
  data() {
    return {
      bucketId: this.$store.getters.bucketUuid,
      name: this.$store.getters.name,
      editor: null,
      editorDiscoveryMessage: localStorage.getItem('editors_discovery') === null ?? false,
      noteService: null,
      noteTitle: '',
      showStatsFooter: false,
      autoSaveDebounceTimer: null,
      autoSaveEnabled: localStorage.getItem('autoSaveEnabled') !== 'false' // Default true
    }
  },
  beforeRouteEnter(to, from, next){
    next(vm => {
      if(vm.$store.getters.loggedIn === false){
        M.toast({html: 'Please, log in to use editor'});
        vm.$router.push("/");
      }
    })
  },
  unmounted() {
    this.$store.commit({type: 'updateContent', content: ""});
    this.$store.commit(({type: 'updateName', name: ""}));
    this.$store.commit(({type: 'updateLastSavedAt', lastSavedAt: null}));
    this.editor.destroy();
    const id = this.$store.getters.autoSaveJobId;
    clearInterval(id);
    this.$store.commit({type: 'updateIntervalId', autoSaveJobId: 0});
    localStorage.removeItem('content');
  },
  mounted() {
    M.AutoInit();
    if(localStorage.getItem('editors_discovery') === null){
      const instance = M.TapTarget.getInstance(document.getElementById('tap-target'));
      if(instance !== undefined){
        instance.open();
        localStorage.setItem('editors_discovery', '1');
      }
    }
    
    // Initialize autoSaveEnabled from localStorage and sync with store
    const savedAutoSave = localStorage.getItem('autoSaveEnabled');
    this.autoSaveEnabled = savedAutoSave !== 'false'; // Default true
    this.$store.commit({type: 'updateAutoSaveEnabled', autoSaveEnabled: this.autoSaveEnabled});
    
    this.noteService = new NoteService();
    M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'), {
      toolbarEnabled: false,
      hoverEnabled: false
    });
    
    this.runAutoSaveJob();
    M.updateTextFields();
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
      // Trigger debounced auto-save on content change
      _this.triggerDebouncedAutoSave();
    });
    this.editor.subscribe('editablePaste', function(event){
      if(event.target.innerText !== ''){
        _this.$store.commit({type: 'setCharactersCount', count: event.target.innerText.length});
        // Trigger debounced auto-save on paste
        _this.triggerDebouncedAutoSave();
      }
    });
    
    // Load note if ID exists
    if(this.id !== ''){
      this.loadNote(this.id);
    }
  },
  methods: {
    onTitleFocus() {
      // When user focuses title input for new note, we don't show stats yet
      this.showStatsFooter = false;
    },
    onEditorFocus() {
      // When user focuses editor for new note, show stats footer
      if (this.$store.getters.id === '') {
        this.showStatsFooter = true;
      }
    },
    loadNote(noteId) {
      if (noteId && this.editor) {
        this.noteService.getNote(noteId)
          .then(n => {
            const content = JSON.parse(n.content);
            this.$store.commit({type: 'updateContent', content: content.content});
            this.editor.setContent(content.content, 0);
            this.$store.commit({type: 'setCharactersCount', count: this.editor.elements[0].innerText.length});
            this.$store.commit({type: "updateIfError", error: false});
            this.noteTitle = this.$store.getters.name;
          }).catch(() => {
            console.log("Error while loading note");
            this.$store.commit({type: "updateIfError", error: true});
            M.toast({html: 'Error loading note'});
          });
      }
    },
    save: function () {
      // Reset auto-save debounce timer when user manually saves
      if (this.autoSaveDebounceTimer) {
        clearTimeout(this.autoSaveDebounceTimer);
        this.autoSaveDebounceTimer = null;
      }
      
      // Always use the noteTitle from the input field
      const titleValue = this.noteTitle;
      
      if (titleValue) {
        if(this.$store.getters.count >= this.$store.getters.limit){
          M.toast({html: 'Okay, that\'s too much!'});
          return;
        }
        const content = this.editor.getContent(0);
        if(this.$store.getters.count === 0){
          return;
        }
        this.$store.commit({type: 'updateIsSaving', isSaving: true});
        if (this.$store.getters.id) {
          this.noteService.saveNote(this.id, titleValue, content, this.editor.elements[0].innerText)
          .then((r) => {
            if(r.ok){
              M.toast({html: 'Note saved!'});
              const now = new Date();
              this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: `${now.toISOString()}`});
              // Update the title in store after saving
              this.$store.commit({type: 'updateName', name: titleValue});
              // Emit event to parent to reload notes list
              this.$emit('note-saved');
            } else {
              M.toast({html: `A server responded with non-success code: ${r.status}`});
            }
            this.$store.commit({type: 'updateIsSaving', isSaving: false});
          }).catch(() => {
            M.toast({html: 'An unexpected error occured, reload the page'});
            this.$store.commit({type: 'updateIsSaving', isSaving: false});
          });
        } else {
          this.noteService.addNote(this.bucketId, titleValue, content, this.editor.elements[0].innerText).then((r) => {
            if(r.ok){
              r.json().then(json => {
                const id = json.payload.id;
                this.$store.commit({type: 'updateId', id: id});
                this.$store.commit({type: 'updateName', name: titleValue});
                const now = new Date();
                this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: `${now.toISOString()}`});
                // Emit event to parent to reload notes list
                this.$emit('note-saved');
              });
              M.toast({html: 'Note created!'})
            } else {
              M.toast({html: `A server responded with non-success code: ${r.status}`});
            }
            this.$store.commit({type: 'updateIsSaving', isSaving: false});
          }).catch(() => {
            M.toast({html: 'An unexpected error occured, reload the page'});
            this.$store.commit({type: 'updateIsSaving', isSaving: false});
          });
        }
      } else {
        M.toast({html: 'It is a damn good idea to add a title!'})
      }
    },
    clearAll: function () {
      M.toast({html: 'Cleared!'})
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
      M.toast({
        html: this.autoSaveEnabled ? 'Auto-save enabled' : 'Auto-save disabled',
        displayLength: 2000
      });
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
}
</style>