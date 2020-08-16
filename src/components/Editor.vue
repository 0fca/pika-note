<template>
  <div class="editor sticky-section">
        <div class="row">
      <div class="input-field col s12 m12 l12 active">
        <input id="title-input" class="validate" type="text" v-model="name" autofocus aria-selected="true"/>
        <label for="title-input">Title</label>
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
      <editor-content class="editor__content cursor-color editor-height" :editor="editor"/>
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from 'tiptap'
import M from 'materialize-css'
const baseUrl = "https://pikanoteapi.azurewebsites.net";
import {
  Blockquote,
  CodeBlock,
  HardBreak,
  Heading,
  OrderedList,
  BulletList,
  ListItem,
  TodoItem,
  TodoList,
  Bold,
  Code,
  Italic,
  Link,
  History,
} from 'tiptap-extensions'
export default {

  components: {
    EditorContent
  },
  data() {
    return {
      id: this.$route.params.id,
      name: localStorage.name ?? 'Sample title',
      content: localStorage.content ?? "Some stuff to do or other things",
      editor: new Editor({
        extensions: [
          new Blockquote(),
          new BulletList(),
          new CodeBlock(),
          new HardBreak(),
          new Heading({ levels: [1, 2, 3] }),
          new ListItem(),
          new OrderedList(),
          new TodoItem(),
          new TodoList(),
          new Bold(),
          new Code(),
          new Italic(),
          new Link(),
          new History(),
        ],
        content: JSON.parse(localStorage.content),
        onUpdate: function (promiseMirrorObject){
          localStorage.content = JSON.stringify(promiseMirrorObject.getJSON());
        }
      }),
    }
  },
  beforeDestroy() {
    localStorage.removeItem('name')
    localStorage.removeItem('content');
    this.editor.destroy()
  },
  mounted() {
    M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'), {
      toolbarEnabled: false,
      hoverEnabled: false
    });
  },
  methods:{
    save: function (){
      if(document.getElementById('title-input').value){
        if(this.id){
          saveNote(this.id, this.name, this.editor.content).then(data => {
            console.log(data);
            M.toast({html: 'Note saved!'})
          }).catch((error) => {
            console.log(error)
            M.toast({html: 'Note couldnt be saved!'})
          });
        }else{
          addNote(this.name, this.editor.content).then(data => {
            console.log(data);
            M.toast({html: 'Note created!'})
          }).catch((error) => {
            console.log(error)
            M.toast({html: 'Note couldnt be created!'})
          });
        }
      }else{
        M.toast({html: 'It is a damn good idea to add a title!'})
      }
    },
    clearAll: function (){
      M.toast({html: 'Cleared!'})
      this.editor.clearContent();
    }
  },
  watch: {
    name(newName) {
      localStorage.name = newName;
    }
  }
}

async function saveNote(id, name, content){
  const url = `${baseUrl}/notes/${id}/update`;
  return await fetch(url, {
    method: 'PUT',
    headers: {
      'Origin': baseUrl,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "name": name,
      "content": content
    })
  });
}

async function addNote(name, content){
  const url = `${baseUrl}/notes/add`;
  return await fetch(url, {
    method: 'POST',
    headers: {
      'Origin': baseUrl,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "name": name,
      "content": content
    })
  });
}
</script>

<style scoped>
  .background{
    padding: 10px;
    background-color: ghostwhite;
    border-radius: 10px;
    height: 50vh;
  }
  .toolbar-icon:hover{
    color: indigo;
  }
  .cursor-color{
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