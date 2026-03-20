<template>
  <div>
    <!-- Edge Swipe Zone - mobile only, active when drawer is closed -->
    <div 
      v-if="!isDrawerOpen"
      class="edge-swipe-zone hide-on-large-only"
      @touchstart="handleEdgeSwipeStart"
      @touchmove="handleEdgeSwipeMove"
      @touchend="handleEdgeSwipeEnd"
    ></div>

    <!-- Drawer Overlay - mobile only -->
    <transition name="drawer-overlay">
      <div 
        v-if="isDrawerOpen" 
        class="drawer-overlay hide-on-large-only"
        @click="closeDrawer"
      ></div>
    </transition>

    <!-- Mobile Drawer -->
    <div 
      class="sidemenu-drawer hide-on-large-only"
      :class="{ 'drawer-open': isDrawerOpen }"
      :style="{ transform: drawerTransform }"
      @touchstart="handleDrawerTouchStart"
      @touchmove="handleDrawerTouchMove"
      @touchend="handleDrawerTouchEnd"
    >
      <div class="drawer-content">
        <!-- Login/Logout Button -->
        <div class="drawer-auth-section">
          <form v-if="!this.$store.getters.loggedIn" method="post" action="https://noteapi.lukas-bownik.net/Security/LocalLogin">
            <button class="btn-action drawer-auth-btn" type="submit">
              LOG IN
            </button>
          </form>
          <form v-else method="post" action="https://api-core.lukas-bownik.net/Identity/Gateway/Logout">
            <button class="btn-action drawer-auth-btn" type="submit">
              LOG OUT
            </button>
          </form>
        </div>

        <!-- Applications Section -->
        <div class="drawer-apps-section">
          <div class="drawer-section-title">Applications</div>
          <div class="drawer-apps-list">
            <a class="drawer-app-item" href="https://cloud.lukas-bownik.net/" title="Pika Cloudfront">
              <span class="material-symbols-outlined">cloud</span>
              <span>Pika Cloudfront</span>
            </a>
            <a class="drawer-app-item" href="https://core.lukas-bownik.net/" title="Pika Core">
              <span class="material-symbols-outlined">storage</span>
              <span>Pika Core</span>
            </a>
            <a class="drawer-app-item" href="https://ai.lukas-bownik.net/" title="Pika AI Assistant">
              <span class="material-symbols-outlined">chat</span>
              <span>Pika AI Assistant</span>
            </a>
            <a class="drawer-app-item" href="https://cloud.lukas-bownik.net/status" title="Pika Status">
              <span class="material-symbols-outlined">vital_signs</span>
              <span>Pika Status</span>
            </a>
          </div>
        </div>

        <div class="drawer-divider"></div>

        <!-- Version Label -->
        <div class="drawer-version">
          Pika Note v. {{ version }}
        </div>

        <div class="drawer-divider"></div>

        <!-- Bucket Select -->
        <div class="drawer-bucket-select" v-if="this.$store.getters.loggedIn">
          <Select 
            dropdownText="Choose bucket" 
            :entries="buckets" 
            :onchange="onBucketSelectChange" 
            v-if="this.$store.getters.loggedIn === true"
          />
        </div>
        
        <!-- Notes Controls -->
        <div class="drawer-notes-controls" v-if="this.$store.getters.loggedIn">
          <OrderSwitch @order-change="reloadOnOrderChange"/>
          <button class="btn-action search-btn" @click="openSearch">
            <span class="material-symbols-outlined">search</span>
          </button>
        </div>
        
        <!-- Notes List with Infinite Scroll -->
        <div class="drawer-notes-container" @scroll="handleScroll" ref="mobileNotesContainer">
          <Preloader 
            message="Loading notes..." 
            v-if="!loaded && this.$store.getters.loggedIn && !this.$store.getters.notesLoading"
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
              <span class="material-symbols-outlined create-icon">add_circle</span>
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
              @note-deleted="handleNoteDeleted"
            />
          </div>
          
          <Info 
            v-if="notes.length == 0 && loaded && !error && loggedIn && this.bucketId !== ''" 
            message="Click above to create your first note"
          />
          
          <InfiniteScrollLoader v-if="showInfiniteLoader" />
        </div>
      </div>
    </div>

    <!-- Bucket Selection Prompt Toast -->
    <transition name="toast">
      <div v-if="showBucketPrompt && this.$store.getters.loggedIn" class="bucket-prompt-toast">
        <div class="bucket-prompt-content">
          <span class="material-symbols-outlined">folder_open</span>
          <span>Open the menu and select a bucket</span>
          <button @click="dismissBucketPrompt" class="dismiss-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    </transition>
    
    <div class="workspace-layout">
      <!-- Desktop Sidebar - always visible on large screens -->
      <aside class="notes-sidebar hide-on-med-and-down">
        <div class="sidebar-header">
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
            <button class="btn-action search-btn" @click="openSearch">
              <span class="material-symbols-outlined">search</span>
            </button>
          </div>
        </div>

        <div class="notes-list-container" @scroll="handleScroll" ref="notesContainer">
          <Preloader 
            message="Loading notes..." 
            v-if="!loaded && this.$store.getters.loggedIn && !this.$store.getters.notesLoading"
          />
          <Error v-if="error"/>
          <Info 
            v-if="bucketId === '' && this.$store.getters.loggedIn === true" 
            message="Choose a bucket above to view notes"
          />
          
          <div 
            v-if="this.$store.getters.loggedIn && bucketId !== ''" 
            class="card create-note-card z-depth-0"
            @click="createNewNote"
          >
            <div class="card-content">
              <span class="material-symbols-outlined create-icon">add_circle</span>
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
              @note-deleted="handleNoteDeleted"
            />
          </transition-group>
          
          <Info 
            v-if="notes.length == 0 && loaded && !error && loggedIn && this.bucketId !== ''" 
            message="Click above to create your first note"
          />
          
          <InfiniteScrollLoader v-if="showInfiniteLoader" />
        </div>
      </aside>

      <!-- Editor Area -->
      <main class="editor-main">
        <Editor 
          v-if="this.$store.getters.loggedIn === true" 
          @note-saved="onNoteSaved"
        />
      </main>
    </div>

    <SearchOverlay
      :visible="showSearchOverlay"
      :bucketId="bucketId"
      @close="closeSearch"
      @note-selected="onSearchNoteSelected"
    />
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
import SearchOverlay from './molecules/SearchOverlay.vue';
import InfiniteScrollLoader from './InfiniteScrollLoader.vue';
import { toastService } from '@/services/toastService';
import packageJson from '/package.json';
import UnauthorizedException from "./exceptions/UnauthorizedException";

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
    OrderSwitch,
    SearchOverlay,
    InfiniteScrollLoader
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
    this.$store.commit({type: 'setBucketsLoading', bucketsLoading: true});
    this.noteService.getBuckets()
      .then(bucketsResponse => {
        if (!bucketsResponse.ok) {
          throw new UnauthorizedException();
        }
        return bucketsResponse.json();
      })
      .then(bucketsPayload => {
        this.$store.commit({type: 'setLoadingError', loadingError: ''});
        this.onBucketsPayloadReceived(bucketsPayload);
        this.loaded = true;
        this.loading = false;
      })
      .catch((err) => {
        const wasLoggedIn = this.$store.getters.loggedIn;
        if (err instanceof UnauthorizedException || !wasLoggedIn) {
          this.$store.commit({type: 'updateLoggedInState', loggedIn: false});
          this.$store.commit({type: 'setLoadingError', loadingError: ''});
        } else if (wasLoggedIn) {
          this.$store.commit({type: 'setLoadingError', loadingError: 'Unable to load buckets.'});
        }
      })
      .finally(() => {
        this.initialBucketsResolved = true;
        this.$store.commit({type: 'setBucketsLoading', bucketsLoading: false});
      });
      this.loadNotes();
    
    // Load note from route param if present
    const routeId = this.$route.params.id;
    if (routeId) {
      this.$store.commit({type: 'updateId', id: routeId});
    }
    
    // Enable drawer functionality after mount
    this.$nextTick(() => {
      this.isMounted = true;
    });
  },
  beforeUnmount() {
    // Clear infinite loader timer
    if (this.infiniteLoaderTimer) {
      clearTimeout(this.infiniteLoaderTimer);
    }
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
      showInfiniteLoader: false,
      infiniteLoaderTimer: null,
      hasMoreNotes: true,
      currentPage: 0,
      isMounted: false,
      isDrawerOpen: false,
      drawerTransform: 'translateX(-100%)',
      isDraggingDrawer: false,
      drawerTouchStartX: 0,
      drawerTouchStartY: 0,
      drawerCurrentX: 0,
      swipeStartX: 0,
      swipeStartY: 0,
      showBucketPrompt: false,
      appsMenuOpen: false,
      version: packageJson.version,
      initialBucketsResolved: false,
      initialNotesResolved: false,
      showSearchOverlay: false
    }
  },
  watch: {
    '$store.getters.drawerOpen'(newVal) {
      if (newVal && !this.isDrawerOpen) {
        this.openDrawer();
      } else if (!newVal && this.isDrawerOpen) {
        this.closeDrawer();
      }
    }
  },
  methods: {
    loadNotes() {
      this.$store.commit({type: 'setLoadingError', loadingError: ''});
      this.$store.commit({type: 'setNotesLoading', notesLoading: true});
      const order = this.$store.getters.order;
      this.noteService.readData('/notes?order=' + order + "&pageSize=" + pageSize + "&bucketId=" + this.bucketId)
        .then(data => {
          if (this.$store.getters.loadingError) {
            this.$store.commit({type: 'setLoadingError', loadingError: ''});
          }
          this.onDataReceived(data);
          this.error = false;
        })
        .catch((err) => {
          const wasLoggedIn = this.$store.getters.loggedIn;
          if (err instanceof UnauthorizedException || !wasLoggedIn) {
            this.error = false;
            this.$store.commit({type: 'updateLoggedInState', loggedIn: false});
            this.$store.commit({type: 'setLoadingError', loadingError: ''});
          } else {
            this.error = this.bucketId !== "" && wasLoggedIn === true;
            if (wasLoggedIn) {
              this.$store.commit({type: 'setLoadingError', loadingError: 'There was a problem loading your notes.'});
            }
          }
          this.loaded = true;
        })
        .finally(() => {
          this.$store.commit({type: 'setNotesLoading', notesLoading: false});
          if (!this.initialNotesResolved) {
            this.initialNotesResolved = true;
          }
        });
    },
    loadMoreNotes() {
      if (this.isLoadingMore || !this.hasMoreNotes) return;
      
      this.isLoadingMore = true;
      
      // Show loader only if loading takes longer than 300ms
      this.infiniteLoaderTimer = setTimeout(() => {
        if (this.isLoadingMore) {
          this.showInfiniteLoader = true;
        }
      }, 300);
      
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
        })
        .catch(() => {
          this.isLoadingMore = false;
          this.hasMoreNotes = false;
        })
        .finally(() => {
          clearTimeout(this.infiniteLoaderTimer);
          this.showInfiniteLoader = false;
          this.isLoadingMore = false;
        });
    },
    handleScroll(event) {
      const container = event.target;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
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
    onBucketsPayloadReceived: function(bucketsPayload) {
      if(bucketsPayload.success === true){
        for(let i in bucketsPayload.payload){
          this.buckets.push({
            id: bucketsPayload.payload[i].bucketId,
            text: bucketsPayload.payload[i].bucketName
          });
        }
        
        // After buckets are loaded, check if we have a selected bucket
        const storedBucketUuid = localStorage.getItem('bucketUuid');
        const storedBucketName = localStorage.getItem('bucketName');
        
        if (storedBucketUuid && storedBucketName) {
          // Update store with current bucket
          this.$store.commit({
            type: 'updateCurrentBucket', 
            bucketName: storedBucketName, 
            bucketUuid: storedBucketUuid
          });
        } else {
          // No bucket selected - show prompt toast
          this.showBucketPromptToast();
        }
      }
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
      
      if (this.$route.params.id !== note.id) {
        this.$router.push('/editor/' + note.id);
      }
    },
    createNewNote() {
      this.$store.commit({type: 'updateId', id: ''});
      this.$store.commit({type: 'updateName', name: ''});
      this.$store.commit({type: 'updateContent', content: ''});
      this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: null});
      this.$store.commit({type: 'setCharactersCount', count: 0});
      if (this.$route.path !== '/') {
        this.$router.push('/');
      }
    },
    createNewNoteAndCloseNav() {
      this.createNewNote();
      this.closeDrawer();
    },
    loadNoteIntoEditorAndCloseNav(note) {
      this.loadNoteIntoEditor(note);
      this.closeDrawer();
    },
    closeSidenav() {
      // Backward compatibility - close custom drawer
      this.closeDrawer();
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
    },
    handleEdgeSwipeStart(e) {
      // Only track swipes that start within 30px of the left edge
      if (e.touches[0].clientX <= 30) {
        this.swipeStartX = e.touches[0].clientX;
        this.swipeStartY = e.touches[0].clientY;
        this.isDraggingDrawer = true;
      } else {
        this.swipeStartX = -1;
      }
    },
    handleEdgeSwipeMove(e) {
      if (this.swipeStartX === -1 || this.swipeStartX > 30 || !this.isDraggingDrawer) return;
      
      e.preventDefault();
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - this.swipeStartX;
      
      // Only allow positive movement (opening)
      if (deltaX > 0) {
        const drawerWidth = 300; // Match CSS
        const progress = Math.min(deltaX / drawerWidth, 1);
        this.drawerTransform = `translateX(${-100 + (progress * 100)}%)`;
      }
    },
    handleEdgeSwipeEnd(e) {
      if (this.swipeStartX === -1 || this.swipeStartX > 30) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - this.swipeStartX;
      const deltaY = Math.abs(endY - this.swipeStartY);

      // Open drawer if swiped more than 100px horizontally and less than 50px vertically
      if (deltaX > 100 && deltaY < 50) {
        this.openDrawer();
      } else {
        // Reset transform if swipe wasn't sufficient
        this.drawerTransform = 'translateX(-100%)';
      }

      // Reset
      this.swipeStartX = -1;
      this.swipeStartY = -1;
      this.isDraggingDrawer = false;
    },
    handleDrawerTouchStart(e) {
      if (!this.isDrawerOpen) return;
      this.drawerTouchStartX = e.touches[0].clientX;
      this.drawerTouchStartY = e.touches[0].clientY;
      this.drawerCurrentX = e.touches[0].clientX;
      this.isDraggingDrawer = true;
    },
    handleDrawerTouchMove(e) {
      if (!this.isDraggingDrawer || !this.isDrawerOpen) return;
      
      this.drawerCurrentX = e.touches[0].clientX;
      const deltaX = this.drawerCurrentX - this.drawerTouchStartX;
      
      // Only allow negative movement (closing)
      if (deltaX < 0) {
        const drawerWidth = 300;
        const progress = Math.max(deltaX / drawerWidth, -1);
        this.drawerTransform = `translateX(${progress * 100}%)`;
      }
    },
    handleDrawerTouchEnd(e) {
      if (!this.isDraggingDrawer || !this.isDrawerOpen) return;
      
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - this.drawerTouchStartX;
      
      // Close if swiped more than 100px to the left
      if (deltaX < -100) {
        this.closeDrawer();
      } else {
        // Reset to open position
        this.drawerTransform = 'translateX(0)';
      }
      
      this.isDraggingDrawer = false;
    },
    openDrawer() {
      this.isDrawerOpen = true;
      this.drawerTransform = 'translateX(0)';
      document.body.style.overflow = 'hidden';
      
      // Sync store state
      if (!this.$store.getters.drawerOpen) {
        this.$store.commit({type: 'setDrawerOpen', drawerOpen: true});
      }
    },
    closeDrawer() {
      this.isDrawerOpen = false;
      this.drawerTransform = 'translateX(-100%)';
      document.body.style.overflow = '';
      
      // Sync store state
      if (this.$store.getters.drawerOpen) {
        this.$store.commit({type: 'setDrawerOpen', drawerOpen: false});
      }
    },
    showBucketPromptToast() {
      this.showBucketPrompt = true;
      setTimeout(() => {
        this.showBucketPrompt = false;
      }, 5000);
    },
    dismissBucketPrompt() {
      this.showBucketPrompt = false;
    },
    handleNoteDeleted(noteId) {
      // Immediately remove from UI
      this.notes = this.notes.filter(note => note.id !== noteId);
      this.actuallyLoaded = this.notes.length;
      // Fire delete request in background
      this.noteService.removeNote(noteId)
        .then(response => {
          if (response.ok) {
            toastService.success('Note deleted successfully');
          } else {
            toastService.error('Failed to delete note');
            this.loadNotes();
          }
        })
        .catch(() => {
          toastService.error('Error deleting note');
          this.loadNotes();
        });
    },
    openSearch() {
      this.showSearchOverlay = true;
    },
    closeSearch() {
      this.showSearchOverlay = false;
    },
    onSearchNoteSelected(note) {
      this.loadNoteIntoEditor(note);
      this.closeDrawer();
    }
  }
}
</script>

<style scoped>
/* ==========================================================================
   Responsive Hide Utilities
   ========================================================================== */

.hide-on-med-and-down {
  display: block;
}

.hide-on-large-only {
  display: block;
}

@media (max-width: 992px) {
  .hide-on-med-and-down {
    display: none !important;
  }
}

@media (min-width: 993px) {
  .hide-on-large-only {
    display: none !important;
  }
}

/* ==========================================================================
   Workspace Layout
   ========================================================================== */

.workspace-layout {
  display: flex;
  height: calc(100vh - 64px);
  width: 100%;
  overflow: hidden;
}

/* ==========================================================================
   Desktop Sidebar (always visible on large screens)
   ========================================================================== */

.notes-sidebar {
  width: 280px;
  min-width: 250px;
  max-width: 350px;
  background-color: var(--color-background-soft);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: var(--spacing-md);
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
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
  padding-bottom: 80px;
}

/* ==========================================================================
   Editor Area
   ========================================================================== */

.editor-main {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-background);
  padding: var(--spacing-lg);
}

@media (max-width: 992px) {
  .editor-main {
    width: 100%;
    height: calc(100vh - 64px);
  }
}

@media (max-width: 600px) {
  .editor-main {
    padding: var(--spacing-sm);
  }
}

/* ==========================================================================
   Mobile Drawer
   ========================================================================== */

.sidemenu-drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 300px;
  max-width: 85vw;
  height: 100vh;
  background-color: var(--color-background);
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidemenu-drawer.drawer-open {
  transform: translateX(0);
}

.drawer-content {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  pointer-events: auto;
  position: relative;
  z-index: 1;
}

/* Drawer Auth Section */
.drawer-auth-section {
  padding: var(--spacing-md);
  padding-top: calc(var(--spacing-md) + 8px);
}

.drawer-auth-btn {
  width: 100%;
  height: 48px;
  letter-spacing: 0.5px;
}

.drawer-auth-btn:hover {
  background: #083463 !important;
  color: white !important;
}

/* Drawer Applications Section */
.drawer-apps-section {
  padding: var(--spacing-md);
}

.drawer-section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-sm);
  padding: 0 var(--spacing-xs);
}

.drawer-apps-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.drawer-app-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text);
  text-decoration: none;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  font-weight: var(--font-weight-medium);
}

.drawer-app-item:hover {
  background-color: rgba(10, 68, 146, 0.1);
  color: var(--color-primary);
}

.drawer-app-item .material-symbols-outlined {
  color: var(--color-primary);
  font-size: 24px;
  flex-shrink: 0;
}

.drawer-app-item span:last-child {
  flex: 1;
}

/* Drawer Divider */
.drawer-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: var(--spacing-md) var(--spacing-md);
}

/* Drawer Version */
.drawer-version {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-soft);
  font-weight: var(--font-weight-medium);
}

/* Bucket Select in Drawer */
.drawer-bucket-select {
  padding: 0 var(--spacing-md);
}

/* Notes Controls in Drawer */
.drawer-notes-controls {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
}

/* Notes List in Drawer */
.drawer-notes-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--spacing-sm);
}

/* ==========================================================================
   Shared Styles (sidebar + drawer)
   ========================================================================== */

.search-btn {
  min-width: auto;
}

.search-btn:hover {
  background: whitesmoke !important;
  color: var(--color-primary) !important;
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

/* ==========================================================================
   Drawer Overlay
   ========================================================================== */

.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  cursor: pointer;
}

.drawer-overlay-enter-active,
.drawer-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-overlay-enter-from,
.drawer-overlay-leave-to {
  opacity: 0;
}

/* Edge Swipe Zone */
.edge-swipe-zone {
  position: fixed;
  left: 0;
  top: 0;
  width: 30px;
  height: 100vh;
  z-index: 999;
  touch-action: none;
  pointer-events: auto;
}

/* ==========================================================================
   Bucket Prompt Toast
   ========================================================================== */

.bucket-prompt-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(245, 124, 0, 0.95);
  max-width: 90%;
  border-radius: 28px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 1500;
  backdrop-filter: blur(10px);
}

.bucket-prompt-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  color: white;
}

.bucket-prompt-content .material-symbols-outlined {
  font-size: 24px;
  flex-shrink: 0;
}

.bucket-prompt-content span {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
}

.dismiss-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0.9;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.dismiss-btn:hover {
  opacity: 1;
}

/* Toast transition */
.toast-enter-active, .toast-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .bucket-prompt-toast {
    background-color: rgba(255, 152, 0, 0.95);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }
  
  .sidemenu-drawer {
    background-color: #1e1e1e;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.5);
  }
  
  .drawer-overlay {
    background-color: rgba(0, 0, 0, 0.7);
  }
}
</style>
