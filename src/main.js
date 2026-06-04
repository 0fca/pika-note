import {createApp} from 'vue'
import {createRouter,createWebHistory} from 'vue-router'
import App from './App'
import About from './components/About'
import WorkspaceLayout from "@/components/WorkspaceLayout"
import Callback from "@/components/Callback"
import { createStore } from 'vuex'

const NEW_NOTE_TAB_ID = '__new_note__';

function hasActiveEditorSession(state) {
  // `count` tracks editor character count so untitled drafts still count as an active editor session.
  return state.id !== '' || state.activeTabId !== null || state.name !== '' || state.content !== '' || state.count > 0;
}

function logInactivityDebug(message, payload = {}) {
  if (process.env.NODE_ENV !== 'production' || process.env.VUE_APP_INACTIVITY_DEBUG === 'true') {
    console.log(message, payload);
  }
}

const routes = [
  { path: '/', name: 'index', component: WorkspaceLayout },
  { path: '/editor', name: 'new-editor', component: WorkspaceLayout },
  { path: '/editor/:id', name: 'editor', component: WorkspaceLayout },
  { path: '/about', component: About },
  { path: '/callback', name: 'callback', component: Callback }
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
      autoSaveEnabled: localStorage.getItem('autoSaveEnabled') !== 'false', // Default true
      authLoading: true,
      bucketsLoading: false,
      notesLoading: false,
      loadingError: '',
      drawerOpen: false,
      // Inactivity counter: counts consecutive successful status checks
      inactivityCounter: 0,
      inactivityThreshold: 100,
      lastTimeoutClearedAt: 0,
      // Multi-tab state
      editorTabs: [],
      activeTabId: null
    }
  },
  mutations: {
    updateRawText (state, text) {
      state.rawText += text;
    },
    setCharactersCount(state, payload){
      state.count = payload.count;
    },
    increaseCharactersCounter(state){
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
      // Update localStorage when bucket changes
      localStorage.setItem('bucketUuid', payload.bucketUuid);
      localStorage.setItem('bucketName', payload.bucketName);
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
    },
    setAuthLoading(state, payload){
      state.authLoading = payload.authLoading;
    },
    setBucketsLoading(state, payload){
      state.bucketsLoading = payload.bucketsLoading;
    },
    setNotesLoading(state, payload){
      state.notesLoading = payload.notesLoading;
    },
    setLoadingError(state, payload){
      state.loadingError = payload.loadingError;
    },
    setDrawerOpen(state, payload){
      state.drawerOpen = payload.drawerOpen;
    },
    incrementInactivityCounter(state){
      state.inactivityCounter++;
      const hasActiveSession = hasActiveEditorSession(state);
      logInactivityDebug('[inactivity] incrementInactivityCounter', {
        counter: state.inactivityCounter,
        threshold: state.inactivityThreshold,
        hasActiveEditorSession: hasActiveSession,
        activeTabId: state.activeTabId,
        tabCount: state.editorTabs.length,
        noteId: state.id
      });
      if(state.inactivityCounter >= state.inactivityThreshold && hasActiveSession){
        logInactivityDebug('[inactivity] threshold reached, clearing active editor session', {
          counter: state.inactivityCounter,
          activeTabId: state.activeTabId,
          tabCount: state.editorTabs.length,
          noteId: state.id
        });
        // Unload current note
        state.id = '';
        state.name = '';
        state.content = '';
        state.count = 0;
        state.lastSavedAt = null;
        state.rawText = '';
        state.updateLock = false;
        state.inactivityCounter = 0;
        state.lastTimeoutClearedAt = Date.now();
        localStorage.removeItem('content');
        // Close all tabs
        state.editorTabs = [];
        state.activeTabId = null;
        logInactivityDebug('[inactivity] active editor session cleared', {
          lastTimeoutClearedAt: state.lastTimeoutClearedAt
        });
      }
    },
    resetInactivityCounter(state){
      state.inactivityCounter = 0;
    },
    // Tab mutations
    addOrReplaceTab(state, payload){
      // payload: { id, title, pinned }
      const existingIndex = state.editorTabs.findIndex(t => t.id === payload.id);
      if(existingIndex !== -1){
        // Already exists, just activate
        state.activeTabId = payload.id;
        return;
      }
      // Find unpinned, saved tab to replace
      const unpinnedIndex = state.editorTabs.findIndex(t => !t.pinned && t.id !== NEW_NOTE_TAB_ID && t.id === state.activeTabId);
      if(unpinnedIndex !== -1){
        // Replace the active unpinned tab
        state.editorTabs.splice(unpinnedIndex, 1, { id: payload.id, title: payload.title, pinned: false });
      } else {
        // Add new tab (pinned and unsaved notes stay open)
        state.editorTabs.push({ id: payload.id, title: payload.title, pinned: false });
      }
      state.activeTabId = payload.id;
    },
    addPinnedTab(state, payload){
      // Add as a new pinned tab (from double-click on tab)
      const existingIndex = state.editorTabs.findIndex(t => t.id === payload.id);
      if(existingIndex !== -1){
        state.editorTabs[existingIndex].pinned = true;
      }
    },
    closeTab(state, payload){
      const index = state.editorTabs.findIndex(t => t.id === payload.id);
      if(index !== -1){
        state.editorTabs.splice(index, 1);
        // If we closed the active tab, activate another
        if(state.activeTabId === payload.id){
          if(state.editorTabs.length > 0){
            const newIndex = Math.min(index, state.editorTabs.length - 1);
            state.activeTabId = state.editorTabs[newIndex].id;
          } else {
            state.activeTabId = null;
            state.id = '';
            state.name = '';
            state.content = '';
            state.count = 0;
            state.lastSavedAt = null;
          }
        }
      }
    },
    setActiveTab(state, payload){
      state.activeTabId = payload.id;
    },
    updateTabTitle(state, payload){
      const tab = state.editorTabs.find(t => t.id === payload.id);
      if(tab){
        tab.title = payload.title;
      }
    },
    clearAllTabs(state){
      state.editorTabs = [];
      state.activeTabId = null;
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
    },
    authLoading(state){
      return state.authLoading;
    },
    bucketsLoading(state){
      return state.bucketsLoading;
    },
    notesLoading(state){
      return state.notesLoading;
    },
    loadingError(state){
      return state.loadingError;
    },
    drawerOpen(state){
      return state.drawerOpen;
    },
    inactivityCounter(state){
      return state.inactivityCounter;
    },
    lastTimeoutClearedAt(state){
      return state.lastTimeoutClearedAt;
    },
    hasActiveEditorSession(state){
      return hasActiveEditorSession(state);
    },
    editorTabs(state){
      return state.editorTabs;
    },
    activeTabId(state){
      return state.activeTabId;
    }
  }
});
app.use(store);

app.mount('#app')
