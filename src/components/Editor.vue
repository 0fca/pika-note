<template>
  <div class="editor sticky-section" v-on:keydown.esc="$router.go(-1)" v-on:keydown.ctrl.s.prevent="save">
    <div class="row">
      <div class="fixed-action-btn">
        <a id="create_floating_btn" class="btn-floating btn-large red accent-2 toolbar-icon">
          <i class="large material-icons">mode_edit</i>
        </a>
        <ul>
          <li>
            <button @click="save" class="btn-floating red accent-2 toolbar-icon">
              <i class="material-icons">
                save
              </i>
            </button>
          </li>
          <li>
            <button @click="clearAll" class="btn-floating red accent-2 toolbar-icon">
              <i class="material-icons">
                clear_all
              </i>
            </button>
          </li>
        </ul>
      </div>
    </div>
    <div id="tap-target" class="tap-target red accent-2 white-text" data-target="create_floating_btn" v-if="this.editorDiscoveryMessage === true">
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
  data() {
    return {
      id: this.$store.getters.id,
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
      });
    }
    M.updateTextFields();
    this.editor = new MediumEditor('#editor', {
      placeholder: {
        text: 'Type your note...',
        hideOnClick: true
      }
    });
    this.$store.commit({type: 'updateRawText', content: this.editor.elements[0].innerText});
    this.$store.commit({type: 'setCharactersCount', count: this.editor.elements[0].innerText.length});
    const _this = this;
    this.editor.subscribe('editableInput', function (event) {
      if (event.inputType === 'insertText') {
        _this.$store.commit({type: 'updateRawText', update: event.data});
        _this.$store.commit('increaseCharactersCounter')
      }
      if(event.inputType === 'deleteContentBackward'){
        _this.$store.commit('decreaseCharactersCounter');
        _this.$store.commit({type: 'updateRawText', update: event.data});
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
        this.$store.commit({type: 'updateIsSaving', isSaving: true});
        if (this.$store.getters.id) {
          this.noteService.saveNote(this.id, document.getElementById('title-input').value, this.editor.getContent(0), this.editor.elements[0].innerText).then(() => {
            M.toast({html: 'Note saved!'});
            this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: `${now.toISOString()}`});
          }).catch(() => {
            M.toast({html: 'Note couldn\'t be saved!'})
          });
          const now = new Date();
          this.$store.commit({type: 'updateIsSaving', isSaving: false});
        } else {
          this.noteService.addNote(this.bucketId, document.getElementById('title-input').value, this.editor.getContent(0), this.editor.elements[0].innerText).then((r) => {
            r.json().then(json => {
              const id = json.payload.id;
              this.$store.commit({type: 'updateId', id: id});
              this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: `${now.toISOString()}`});
            });
            M.toast({html: 'Note created!'})
          }).catch(() => {
            M.toast({html: 'Note couldn\'t be created!'})
          });
          const now = new Date();
          this.$store.commit({type: 'updateIsSaving', isSaving: false});
        }
      } else {
        M.toast({html: 'It is a damn good idea to add a title!'})
      }
    },
    clearAll: function () {
      M.toast({html: 'Cleared!'})
      this.$store.commit({type: 'setCharactersCount', count: 0});
      this.editor.resetContent();
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

.toolbar-icon:hover {
  color: indigo;
}

.cursor-color {
  caret-color: #ff5252;
  border-bottom-color: #ff5252;
}

/* label underline focus color */
.input-field input[type=text]:focus {
  border-bottom: 1px solid #ff5252;
  box-shadow: 0 1px 0 0 #ff5252;
}

/* label color */
.input-field label {
  color: #000;
}

/* label focus color */
.input-field input[type=text]:focus + label {
  color: #ff5252;
}
</style>