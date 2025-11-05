<template>
  <div>
    <!-- Login message when not logged in - shown above everything -->
    <div v-if="this.$store.getters.loggedIn === false" class="login-message-container">
      <Info message="Please log in to view or create notes" />
    </div>
    
    <div class="workspace-layout">
    <!-- Teleport all sidenav content to mobile sidenav - only render if target exists -->
    <Teleport to=".mobile-notes-section" v-if="isMounted && hasTeleportTarget">
      <div class="mobile-sidenav-content">
        <!-- Login/Logout buttons -->
        <div class="mobile-auth-section" v-if="this.$store.getters.loggedIn === false">
          <form method="post" action="https://noteapi.lukas-bownik.net/Security/LocalLogin">
            <button class="btn btn-flat">
              LOG IN
            </button>
          </form>
        </div>
        <div class="mobile-auth-section" v-if="this.$store.getters.loggedIn === true">
          <form method="post" action="https://api-core.lukas-bownik.net/Identity/Gateway/Logout">
            <button class="btn btn-flat">
              LOG OUT
            </button>
          </form>
        </div>
        
        <!-- Applications Collapsible Menu -->
        <div class="mobile-apps-section">
          <div class="mobile-collapsible">
            <div class="mobile-collapsible-header" @click="toggleAppsMenu">
              Applications
              <i class="material-icons right">{{ appsMenuOpen ? 'expand_less' : 'expand_more' }}</i>
            </div>
            <div class="mobile-collapsible-body" v-show="appsMenuOpen">
              <div class="mobile-apps-list">
                <a class="collection-item navlink app-menu-item" href="https://cloud.lukas-bownik.net/" title="Pika Cloudfront">
                  <span class="material-symbols-outlined secondary-content navlink havelock-text">
                    cloud
                  </span>
                  Pika Cloudfront
                </a>
                <a class="collection-item navlink app-menu-item" href="https://core.lukas-bownik.net/" title="Pika Core">
                  <span class="material-symbols-outlined secondary-content navlink havelock-text">
                    storage
                  </span>
                  Pika Core
                </a>
                <a class="collection-item navlink app-menu-item" href="https://chat.lukas-bownik.net/" title="Pika Chat">
                  <span class="material-symbols-outlined secondary-content navlink havelock-text">
                    chat
                  </span>
                  Pika Chat
                </a>
                <a class="collection-item navlink app-menu-item" href="https://core.lukas-bownik.net/status" title="Pika Status">
                  <span class="material-symbols-outlined secondary-content navlink havelock-text">
                    vital_signs
                  </span>
                  Pika Status
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <!-- About Link -->
        <div class="mobile-about-section">
          <a class="collection-item navlink app-menu-item" href="/About" title="About Pika Note">
            <span class="material-icons secondary-content navlink havelock-text">
              info_outline
            </span>
            About
          </a>
        </div>
        
        <!-- Divider -->
        <div class="mobile-divider"></div>
        
        <!-- Notes Section Header -->
        <div class="mobile-notes-header" v-if="this.$store.getters.loggedIn">
          <h6 class="sidenav-section-title">My Notes</h6>
        </div>
        
        <!-- Bucket Select and Order Controls for logged in users -->
        <div class="mobile-bucket-select" v-if="this.$store.getters.loggedIn">
          <Select 
            dropdownText="Choose bucket" 
            :entries="buckets" 
            :onchange="onBucketSelectChange" 
          />
        </div>
        
        <div class="mobile-notes-controls" v-if="this.$store.getters.loggedIn">
          <OrderSwitch @order-change="reloadOnOrderChange"/>
        </div>
        
        <div class="mobile-notes-list">
          <Preloader 
            message="Loading notes..." 
            v-if="!loaded && this.$store.getters.loggedIn"
          />
          <Error v-if="error"/>
          <Info 
            v-if="bucketId === '' && this.$store.getters.loggedIn === true" 
            message="Choose a bucket above"
          />
          
          <!-- Create New Note Card -->
          <div 
            v-if="this.$store.getters.loggedIn && bucketId !== ''" 
            class="card create-note-card z-depth-0"
            @click="createNewNoteAndCloseNav"
          >
            <div class="card-content">
              <i class="material-icons create-icon">add_circle_outline</i>
              <span class="create-text">Create New Note</span>
            </div>
          </div>
          
          <div v-if="this.$store.getters.loggedIn && notes.length > 0 && !error">
            <Note 
              v-for="note in notes"
              :key="note.id"
              :id="note.id"
              :name="note.humanName"
              :date="note.timestamp"
              @click="loadNoteIntoEditorAndCloseNav(note)"
            />
          </div>
          
          <Info 
            v-if="notes.length == 0 && loaded && !error && loggedIn && this.bucketId !== ''" 
            message="Click above to create your first note"
          />
          
          <!-- Loading indicator for infinite scroll -->
          <div v-if="isLoadingMore" class="loading-more">
            <div class="progress">
              <div class="indeterminate"></div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <!-- Left Sidebar: Notes List -->
    <aside class="notes-sidebar hide-on-med-and-down">
      <div class="sidebar-header">
        <div class="filter-controls">
          <div class="bucket-select-wrapper">
            <Select 
              dropdownText="Choose bucket" 
              :entries="buckets" 
              :onchange="onBucketSelectChange" 
              v-if="this.$store.getters.loggedIn === true"
            />
          </div>
          <div class="list-controls">
            <OrderSwitch @order-change="reloadOnOrderChange"/>
          </div>
        </div>
      </div>

      <div class="notes-list-container" @scroll="handleScroll" ref="notesContainer">
        <Preloader 
          message="Loading notes..." 
          v-if="!loaded && this.$store.getters.loggedIn"
        />
        <Error v-if="error"/>
        <Info 
          v-if="bucketId === '' && this.$store.getters.loggedIn === true" 
          message="Choose a bucket above to view notes"
        />
        
        <!-- Create New Note Card -->
        <div 
          v-if="this.$store.getters.loggedIn && bucketId !== ''" 
          class="card create-note-card z-depth-0"
          @click="createNewNote"
        >
          <div class="card-content">
            <i class="material-icons create-icon">add_circle_outline</i>
            <span class="create-text">Create New Note</span>
          </div>
        </div>
        
        <transition-group name="slide-fade" appear v-if="this.$store.getters.loggedIn && notes.length > 0 && !error">
          <Note 
            v-for="note in notes"
            :key="note.id"
            :id="note.id"
            :name="note.humanName"
            :date="note.timestamp"
            @click="loadNoteIntoEditor(note)"
          />
        </transition-group>
        
        <Info 
          v-if="notes.length == 0 && loaded && !error && loggedIn && this.bucketId !== ''" 
          message="Click above to create your first note"
        />
        
        <!-- Loading indicator for infinite scroll -->
        <div v-if="isLoadingMore" class="loading-more">
          <div class="progress">
            <div class="indeterminate"></div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right Side: Editor -->
    <main class="editor-main">
      <Editor 
        v-if="this.$store.getters.loggedIn === true" 
        @note-saved="onNoteSaved"
      />
    </main>
  </div>
  </div>
</template>

<script>
import Note from '@/components/Note';
import Editor from '@/components/Editor';
import Preloader from "@/components/Preloader";
import Error from "@/components/Error";
import Info from "@/components/Info";
import NoteService from "@/services/noteService";
import Select from './molecules/Select.vue';
import OrderSwitch from './molecules/OrderSwitch.vue';
import M from 'materialize-css';

const pageSize = 15;

export default {
  name: 'WorkspaceLayout',
  components: {
    Error,
    Note,
    Editor,
    Preloader,
    Select,
    Info,
    OrderSwitch
  },
  computed: {
    order: {
      get() {
        return this.$store.getters.order;
      },
      set(order){
        this.$store.commit({type: 'updateOrder', order: order});
      }
    },
    loggedIn: {
      get() {
        return this.$store.getters.loggedIn;
      },
      set(loggedIn) {
        this.$store.commit({type: 'updateLoggedInState', loggedIn: loggedIn});
      },
    },
    getActuallyLoaded() {
      return this.actuallyLoaded;
    }
  },
  mounted: function () {
    this.loggedIn = this.$store.getters.loggedIn;
    if(this.$store.getters.bucketUuid !== ""){
      this.bucketId = this.$store.getters.bucketUuid;
    }
    this.noteService = new NoteService();
    this.loadNotes();
    this.noteService.getBuckets()
      .then(buckets => {
        this.onBucketsReceived(buckets);
      });
    
    // Enable teleport after mount and check if target exists
    // Use a small delay to ensure the parent App component's sidenav is fully mounted
    this.$nextTick(() => {
      setTimeout(() => {
        this.isMounted = true;
        // Check if teleport target exists
        const target = document.querySelector('.mobile-notes-section');
        this.hasTeleportTarget = target !== null;
      }, 50);
    });
  },
  beforeUnmount() {
    // Clean up when component is destroyed
    this.hasTeleportTarget = false;
  },
  data: function () {
    return {
      notes: [],
      buckets: [],
      bucketId: "",
      orderString: "ASC",
      overallCount: localStorage.overallCount,
      loaded: false,
      error: false,
      actuallyLoaded: 0,
      isLoadingMore: false,
      hasMoreNotes: true,
      currentPage: 0,
      isMounted: false,
      hasTeleportTarget: false,
      appsMenuOpen: false
    }
  },
  methods: {
    loadNotes() {
      const order = this.$store.getters.order;
      this.noteService.readData('/notes?order=' + order + "&pageSize=" + pageSize + "&bucketId=" + this.bucketId)
        .then(data => {
          this.onDataReceived(data);
        })
        .catch(() => {
          this.error = this.bucketId !== "" && this.$store.getters.loggedIn === true;
          this.loaded = true;
        });
    },
    loadMoreNotes() {
      if (this.isLoadingMore || !this.hasMoreNotes) return;
      
      this.isLoadingMore = true;
      this.currentPage++;
      
      const order = this.$store.getters.order;
      const offset = this.currentPage * pageSize;
      
      this.noteService.readData('/notes?order=' + order + "&pageSize=" + pageSize + "&offset=" + offset + "&bucketId=" + this.bucketId)
        .then(data => {
          if (data.payload && data.payload.length > 0) {
            this.notes.push(...data.payload);
            this.actuallyLoaded = this.notes.length;
            this.hasMoreNotes = data.payload.length === pageSize;
          } else {
            this.hasMoreNotes = false;
          }
          this.isLoadingMore = false;
        })
        .catch(() => {
          this.isLoadingMore = false;
          this.hasMoreNotes = false;
        });
    },
    handleScroll(event) {
      const container = event.target;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      // Load more when scrolled to 80% of the container
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        this.loadMoreNotes();
      }
    },
    reloadOnOrderChange: function () {
      this.notes = [];
      this.loaded = false;
      this.currentPage = 0;
      this.hasMoreNotes = true;
      let order = this.$store.getters.order;
      if(order == 0){
        localStorage.setItem('order', 1);
        this.$store.commit({type: 'updateOrder', order: 1});
        order = 1;
      } else if(order == 1) {
        localStorage.setItem('order', 0);
        this.$store.commit({type: 'updateOrder', order: 0});
        order = 0;
      }
      this.loadNotes();
    },
    onDataReceived: function (data) {
      this.notes = data.payload;
      this.loaded = true;
      this.actuallyLoaded = this.notes.length;
    },
    onBucketsReceived: function(buckets) {
      buckets.json()
        .then(bucketsPayload => {
          if(bucketsPayload.success === true){
            for(let i in bucketsPayload.payload){
              this.buckets.push({
                id: bucketsPayload.payload[i].bucketId,
                text: bucketsPayload.payload[i].bucketName
              });
            }
          }
        });
    },
    onBucketSelectChange: function(e){
      const select = e.target;
      const bucketName = select.options[select.selectedIndex].text;
      const bucketUuid = select.value;
      this.bucketId = bucketUuid;
      // Update store - this will also update localStorage via mutation
      this.$store.commit({type: 'updateCurrentBucket', bucketName: bucketName, bucketUuid: bucketUuid});
      
      this.notes = [];
      this.currentPage = 0;
      this.hasMoreNotes = true;
      this.loadNotes();
    },
    loadNoteIntoEditor(note) {
      this.$store.commit({type: 'updateId', id: note.id});
      this.$store.commit({type: 'updateName', name: note.humanName});
      this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: note.timestamp});
      
      // Trigger editor to load the note
      // The Editor component will handle loading via mounted/watch
    },
    createNewNote() {
      this.$store.commit({type: 'updateId', id: ''});
      this.$store.commit({type: 'updateName', name: ''});
      this.$store.commit({type: 'updateContent', content: ''});
      this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: null});
      this.$store.commit({type: 'setCharactersCount', count: 0});
    },
    createNewNoteAndCloseNav() {
      this.createNewNote();
      this.closeSidenav();
    },
    loadNoteIntoEditorAndCloseNav(note) {
      this.loadNoteIntoEditor(note);
      this.closeSidenav();
    },
    closeSidenav() {
      // Close sidenav on mobile after selecting a note
      const sidenav = document.getElementById('slide-out');
      if (sidenav) {
        const instance = M.Sidenav.getInstance(sidenav);
        if (instance) {
          instance.close();
        }
      }
    },
    toggleAppsMenu() {
      this.appsMenuOpen = !this.appsMenuOpen;
    },
    onNoteSaved() {
      // Reload the notes list after successful save/update
      this.notes = [];
      this.currentPage = 0;
      this.hasMoreNotes = true;
      this.loaded = false;
      this.loadNotes();
    }
  }
}
</script>

<style scoped>
/* Login message container */
.login-message-container {
  padding: var(--spacing-md);
  max-width: 1100px;
  margin: 0 auto;
}

.workspace-layout {
  display: flex;
  height: calc(100vh - 64px); /* Account for navbar */
  width: 100%;
  overflow: hidden;
}

/* Left Sidebar: Notes List */
.notes-sidebar {
  width: 350px;
  min-width: 300px;
  max-width: 400px;
  background-color: var(--color-background-soft);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.sidebar-header {
  padding: var(--spacing-md);
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.bucket-select-wrapper {
  width: 100%;
}

.list-controls {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: space-between;
  align-items: center;
}

.notes-list-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
  padding-bottom: 80px; /* Extra padding to prevent stats footer from covering last note */
}

.loading-more {
  padding: var(--spacing-md);
}

.fab-wrapper {
  position: absolute;
  bottom: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 10;
}

/* Create New Note Card */
.create-note-card {
  cursor: pointer;
  background-color: var(--color-primary-mute) !important;
  border: 2px dashed var(--color-primary) !important;
  margin: var(--spacing-sm) !important;
  transition: all var(--transition-fast);
}

.create-note-card:hover {
  background-color: var(--color-primary-soft) !important;
  border-color: var(--color-primary-soft) !important;
  transform: translateY(-1px);
}

.create-note-card .card-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) !important;
}

.create-icon {
  color: var(--color-primary) !important;
  font-size: 2rem;
}

.create-note-card:hover .create-icon,
.create-note-card:hover .create-text {
  color: white !important;
}

.create-text {
  color: var(--color-primary) !important;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-lg);
}

/* Right Side: Editor */
.editor-main {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-background);
  padding: var(--spacing-lg);
}

.editor-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* Mobile sidenav content */
.mobile-sidenav-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.mobile-auth-section {
  padding: 16px 32px;
  flex-shrink: 0;
}

.mobile-auth-section .btn {
  width: 100%;
}

.mobile-apps-section {
  padding: 0;
  flex-shrink: 0;
}

.mobile-collapsible {
  margin: 0;
}

.mobile-collapsible-header {
  padding: 0 32px;
  height: 48px;
  line-height: 48px;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-collapsible-header:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.mobile-collapsible-body {
  padding: 0;
}

.mobile-apps-list {
  padding: 0;
  margin: 0;
}

.mobile-apps-list .collection-item {
  display: block;
  padding: 16px 32px;
  margin: 0;
  border: none;
}

.mobile-about-section {
  padding: 0;
  flex-shrink: 0;
}

.mobile-about-section .collection-item {
  display: block;
  padding: 16px 32px;
  margin: 0;
  border: none;
}

.mobile-divider {
  height: 1px;
  background-color: rgba(0, 0, 0, 0.12);
  margin: 8px 0;
  flex-shrink: 0;
}

.mobile-notes-header {
  padding: 16px 32px 8px;
  flex-shrink: 0;
}

.sidenav-section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0;
}

.mobile-bucket-select {
  padding: 0 16px;
  margin-bottom: var(--spacing-sm);
  flex-shrink: 0;
}

.mobile-notes-controls {
  padding: 0 16px;
  margin-bottom: var(--spacing-sm);
  flex-shrink: 0;
}

.mobile-notes-list {
  padding: 0 8px;
  padding-bottom: 80px; /* Extra padding to prevent stats footer from covering last note */
  overflow-y: auto;
  flex: 1;
}

.mobile-notes-list .create-note-card {
  margin: var(--spacing-xs) var(--spacing-sm) !important;
}

.mobile-notes-list .loading-more {
  padding: var(--spacing-sm);
}

/* Responsive */
@media (max-width: 992px) {
  .workspace-layout {
    flex-direction: row;
  }
  
  /* Hide the sidebar on mobile/tablet - notes will be in sidenav */
  .notes-sidebar {
    display: none;
  }
  
  .editor-main {
    width: 100%;
    height: calc(100vh - 64px);
  }
  
  .fab-wrapper {
    bottom: var(--spacing-md);
    right: var(--spacing-md);
  }
}

@media (max-width: 600px) {
  .editor-main {
    padding: var(--spacing-sm);
  }
}
</style>
