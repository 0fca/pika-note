<template>
  <div class="editor sticky-section" v-on:keydown.esc="$router.go(-1)" v-on:keydown.ctrl.s.prevent="save">
    <div class="row">
      <div class="input-field col s12 m12 l12">
        <input id="title-input" class="validate" type="text" autofocus aria-selected="true" v-model='name'/>
        <label for="title-input">Title</label>
      </div>
      <div class="character-count right">
        <small>{{ $store.getters.count }}/{{ $store.getters.limit }} characters</small>
      </div>
      <div class="fixed-action-btn">
        <a class="btn-floating btn-large red accent-2 toolbar-icon">
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
      id: this.$route.params.id,
      name: this.$store.getters.name ?? 'Sample title',
      content: this.$store.getters.content ?? "<p>Some stuff to do or other things</p>",
      editor: null,
    }
  },
  unmount() {
    this.$store.commit({type: 'updateContent', content: ""})
    this.$store.commit(({type: 'updateName', name: ""}))
    this.editor.destroy();
  },
  mounted() {
    this.noteService = new NoteService();
    M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'), {
      toolbarEnabled: false,
      hoverEnabled: false
    });
    let content = this.$store.getters.content;
    M.updateTextFields();
    this.editor = new MediumEditor('#editor', {
      placeholder: {
        text: 'Type your note...',
        hideOnClick: true
      }
    })
    this.editor.setContent(content, 0);
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
        if (this.id) {

          this.noteService.saveNote(this.id, this.name, this.editor.getContent(0), this.editor.elements[0].innerText).then(() => {
            M.toast({html: 'Note saved!'})
          }).catch(() => {
            M.toast({html: 'Note couldn\'t be saved!'})
          });
        } else {
          this.noteService.addNote(this.name, this.editor.getContent(0), this.editor.elements[0].innerText).then(() => {
            M.toast({html: 'Note created!'})
          }).catch(() => {
            M.toast({html: 'Note couldn\'t be created!'})
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
    }
  },
}
</script>

<style scoped>
.background {
  padding: 10px;
  background-color: ghostwhite;
  border-radius: 10px;
  height: 50vh;
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