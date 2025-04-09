<template>
  <div class="editor sticky-section" v-on:keydown.esc="$router.go(-1)" v-on:keydown.ctrl.s.prevent="save">
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
      <div id="editor"></div>
    </div>
  </div>
</template>

<script>
import M from 'materialize-css';
import NoteService from "@/services/noteService";
import MediumEditor from "medium-editor";

export default {
  components: {},
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
  data() {
    return {
      bucketId: this.$store.getters.bucketUuid,
      name: this.$store.getters.name,
      editor: null,
      editorDiscoveryMessage: localStorage.getItem('editors_discovery') === null ?? false
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
    this.noteService = new NoteService();
    M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'), {
      toolbarEnabled: false,
      hoverEnabled: false
    });
    if(this.id !== ''){
      this.noteService.getNote(this.id)
      .then(n => {
        const content = JSON.parse(n.content);
        this.$store.commit({type: 'updateContent', content: content.content});
        this.editor.setContent(this.$store.getters.content, 0);
        this.$store.commit({type: 'setCharactersCount', count: this.editor.elements[0].innerText.length});
        this.$store.commit({type: "updateIfError", error: false});
      }).catch(() => {
        console.log("Error while loading note, auto save feature won't be avialable");
          this.$store.commit({type: "updateIfError", error: true});
      });
    }
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
    });
    this.editor.subscribe('editablePaste', function(event){
      if(event.target.innerText !== ''){
        _this.$store.commit({type: 'setCharactersCount', count: event.target.innerText.length});
      }
    });
  },
  methods: {
    save: function () {
      if (document.getElementById('title-input').value) {
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
          this.noteService.saveNote(this.id, document.getElementById('title-input').value, content, this.editor.elements[0].innerText)
          .then((r) => {
            if(r.ok){
              M.toast({html: 'Note saved!'});
              const now = new Date();
              this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: `${now.toISOString()}`});
            } else {
              M.toast({html: `A server responded with non-success code: ${r.status}`});
            }
            this.$store.commit({type: 'updateIsSaving', isSaving: false});
          }).catch(() => {
            M.toast({html: 'An unexpected error occured, reload the page'});
            this.$store.commit({type: 'updateIsSaving', isSaving: false});
          });
        } else {
          this.noteService.addNote(this.bucketId, document.getElementById('title-input').value, content, this.editor.elements[0].innerText).then((r) => {
            if(r.ok){
              r.json().then(json => {
                const id = json.payload.id;
                this.$store.commit({type: 'updateId', id: id});
                const now = new Date();
                this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: `${now.toISOString()}`});
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
        console.log("auto-save");
          if(this.$store.getters.errorLoadingNote){
            return;
          }
          if(!this.$store.getters.canSave && !this.$store.getters.isSaving){
            this.save();
          }
      }, 300000);
      this.$store.commit({type: 'updateIntervalId', autoSaveJobId: autoSaveJobId});
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
.background {
  padding: 10px;
  background-color: ghostwhite;
  border-radius: 10px;
  height: fit-content;
  min-height: 50vh;
}
</style>