import {createApp} from 'vue'
import {createRouter,createWebHistory} from 'vue-router'
import App from './App'
import About from './components/About'
import WorkspaceLayout from "@/components/WorkspaceLayout"
import Callback from "@/components/Callback"
import NoteRedirectHandler from '@/components/NoteRedirectHandler'
import { createStore } from 'vuex'


const routes = [
  { path: '/', name: 'index', component: WorkspaceLayout },
  { path: '/about', component: About },
  { path: '/callback', name: 'callback', component: Callback },
  { path: '/note_redirect_handler', name: 'note_redirect_handler', component: NoteRedirectHandler }
]

const history =  createWebHistory()
const router = createRouter({routes: routes, history: history});

const app = createApp(App);
app.use(router)
// Create a new store instance.
const store = createStore({
  state () {
    return {
      rawText: '',
      count: 0,
      content: localStorage.getItem('content') ?? "",
      name: '',
      limit: 20000,
      id: '',
      order: localStorage.getItem('order') ?? 1,
      noteCount: localStorage.getItem('count') ?? 10,
      loggedIn: false,
      bucketName: localStorage.getItem('bucketName') ?? "",
      bucketUuid: localStorage.getItem('bucketUuid') ?? "",
      lastSavedAt: null,
      isSaving: false,
      errorLoadingNote: false,
      updateLock: false,
      autoSaveJobId: 0,
      autoSaveEnabled: localStorage.getItem('autoSaveEnabled') !== 'false' // Default true
    }
  },
  mutations: {
    updateRawText (state, text) {
      if(state.count >= state.limit){
        return;
      }
      state.rawText += text;
    },
    setCharactersCount(state, payload){
      state.count = payload.count;
    },
    increaseCharactersCounter(state){
      if(state.count >= state.limit){
        return;
      }
      state.count++;
    },
    decreaseCharactersCounter(state){
      if(state.count === 0){
        return;
      }
      state.count--;
    },
    updateContent(state, payload){
      state.content = payload.content;
      localStorage.setItem("content", state.content);
    },
    updateName(state, payload){
      state.name = payload.name;
    },
    updateId(state, payload){
      state.id = payload.id; 
    },
    updateOrder(state, payload){
      state.order = payload.order;
    },
    updateNoteCount(state, payload){
      state.noteCount = payload.noteCount;
    },
    updateLoggedInState(state, payload){
      state.loggedIn = payload.loggedIn;
    },
    updateCurrentBucket(state, payload){
      state.bucketUuid = payload.bucketUuid;
      state.bucketName = payload.bucketName;
    },
    updateLastSavedAt(state, payload){
      state.lastSavedAt = payload.lastSavedAt;
    },
    updateIsSaving(state, payload){
      state.isSaving = payload.isSaving;
    },
    updateIfError(state, payload){
      state.errorLoadingNote = payload.error;
    },
    updateLock(state, payload){
      state.updateLock = payload.updateLock;
    },
    updateIntervalId(state, payload){
      state.autoSaveJobId = payload.autoSaveJobId;
    },
    updateAutoSaveEnabled(state, payload){
      state.autoSaveEnabled = payload.autoSaveEnabled;
    }
  },
  getters: {
    count (state) {
      return state.count;
    },
    name(state){
      return state.name;
    },
    content(state){
      return state.content;
    },
    limit(state){
      return state.limit;
    },
    id(state){
      return state.id;
    },
    order(state){
      return state.order;
    },
    noteCount(state){
      return state.noteCount;
    },
    loggedIn(state){
      return state.loggedIn;
    },
    bucketName(state){
      return state.bucketName;
    },
    bucketUuid(state){
      return state.bucketUuid;
    },
    lastSavedAt(state){
      return state.lastSavedAt;
    },
    isSaving(state){
      return state.isSaving;
    },
    errorLoadingNote(state){
      return state.errorLoadingNote;
    },
    canSave(state){
      return state.updateLock;
    },
    autoSaveJobId(state){
      return state.autoSaveJobId;
    },
    autoSaveEnabled(state){
      return state.autoSaveEnabled;
    }
  }
});
app.use(store);

app.mount('#app')
