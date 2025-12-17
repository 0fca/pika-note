<template>
  <div>
    <!-- Edge Swipe Zone for Mobile Drawer - Only active when drawer is closed -->
    <div 
      v-if="!isDrawerOpen"
      class="edge-swipe-zone hide-on-large-only"
      @touchstart="handleEdgeSwipeStart"
      @touchmove="handleEdgeSwipeMove"
      @touchend="handleEdgeSwipeEnd"
    ></div>

    <!-- Mobile Drawer Overlay -->
    <transition name="drawer-overlay">
      <div 
        v-if="isDrawerOpen" 
        class="drawer-overlay hide-on-large-only"
        @click="closeDrawer"
      ></div>
    </transition>

    <!-- Mobile Drawer -->
    <div 
      class="mobile-drawer hide-on-large-only"
      :class="{ 'drawer-open': isDrawerOpen }"
      :style="{ transform: drawerTransform }"
    >
      <div class="drawer-content">
        <!-- Login/Logout Button -->
        <!-- Login/Logout Button -->
        <div class="drawer-auth-section">
          <form v-if="!this.$store.getters.loggedIn" method="post" action="https://noteapi.lukas-bownik.net/Security/LocalLogin">
            <button class="btn drawer-auth-btn waves-effect waves-light" type="submit">
              LOG IN
            </button>
          </form>
          <form v-else method="post" action="https://api-core.lukas-bownik.net/Identity/Gateway/Logout">
            <button class="btn drawer-auth-btn waves-effect waves-light" type="submit">
              LOG OUT
            </button>
          </form>
        </div>        <!-- Applications Section -->
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
            <a class="drawer-app-item" href="https://chat.lukas-bownik.net/" title="Pika Chat">
              <span class="material-symbols-outlined">chat</span>
              <span>Pika Chat</span>
            </a>
            <a class="drawer-app-item" href="https://core.lukas-bownik.net/status" title="Pika Status">
              <span class="material-symbols-outlined">vital_signs</span>
              <span>Pika Status</span>
            </a>
          </div>
        </div>

        <!-- Divider -->
        <div class="drawer-divider"></div>

        <!-- Version Label -->
        <div class="drawer-version">
          Pika Note v. {{ version }}
        </div>

        <!-- Divider -->
        <div class="drawer-divider"></div>

        <div class="mobile-bucket-select" v-if="this.$store.getters.loggedIn">
          <Select 
            dropdownText="Choose bucket" 
            :entries="buckets" 
            :onchange="onBucketSelectChange" 
            v-if="this.$store.getters.loggedIn === true"
          />
        </div>
        
        <div class="mobile-notes-controls" v-if="this.$store.getters.loggedIn">
          <OrderSwitch @order-change="reloadOnOrderChange"/>
        </div>
        
        <div class="mobile-notes-container">
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
    </div>

    <!-- Login message when not logged in - shown above everything -->
    <div v-if="this.$store.getters.loggedIn === false" class="login-message-container">
      <Info message="Please log in to view or create notes" />
    </div>

    <!-- Loading Toast for Mobile -->
    <transition name="toast">
      <div v-if="(!loaded || isDrawerOpening) && this.$store.getters.loggedIn" class="mobile-loading-toast hide-on-large-only">
        <div class="spinner-circle"></div>
      </div>
    </transition>

    <!-- Bucket Selection Prompt Toast -->
    <transition name="toast">
      <div v-if="showBucketPrompt && this.$store.getters.loggedIn" class="bucket-prompt-toast hide-on-large-only">
        <div class="bucket-prompt-content">
          <i class="material-icons">folder_open</i>
          <span>Select a bucket from the drawer menu</span>
          <button @click="dismissBucketPrompt" class="dismiss-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </transition>
    
    <div class="workspace-layout">
    <!-- Keep old teleport for backward compatibility if needed -->
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
        if (err instanceof UnauthorizedException) {
          this.$store.commit({type: 'updateLoggedInState', loggedIn: false});
          this.$store.commit({type: 'setLoadingError', loadingError: ''});
        } else {
          this.$store.commit({type: 'setLoadingError', loadingError: 'Unable to load buckets.'});
        }
      })
      .finally(() => {
        this.initialBucketsResolved = true;
        this.$store.commit({type: 'setBucketsLoading', bucketsLoading: false});
      });
      this.loadNotes();
    
    // Enable teleport after mount and check if target exists
    // Use a small delay to ensure the parent App component's sidenav is fully mounted
    this.$nextTick(() => {
      setTimeout(() => {
        this.isMounted = true;
        // Check if teleport target exists
        const target = document.querySelector('.mobile-notes-section');
        this.hasTeleportTarget = target !== null;
        
        // Setup hamburger button listener
        this.setupHamburgerListener();
      }, 50);
    });
  },
  beforeUnmount() {
    // Clean up when component is destroyed
    this.hasTeleportTarget = false;
    
    // Remove hamburger button listener
    const hamburger = document.querySelector('.sidenav-trigger');
    if (hamburger) {
      hamburger.removeEventListener('click', this.handleHamburgerClick);
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
      hasMoreNotes: true,
      currentPage: 0,
      isMounted: false,
      hasTeleportTarget: false,
      isDrawerOpening: false,
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
      initialNotesResolved: false
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
          this.error = this.bucketId !== "" && this.$store.getters.loggedIn === true;
          this.loaded = true;
          if (err instanceof UnauthorizedException || !this.$store.getters.loggedIn) {
            this.$store.commit({type: 'updateLoggedInState', loggedIn: false});
            this.$store.commit({type: 'setLoadingError', loadingError: ''});
          } else if (this.$store.getters.loggedIn) {
            this.$store.commit({type: 'setLoadingError', loadingError: 'There was a problem loading your notes.'});
          }
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
      this.isDrawerOpening = true;
      this.isDrawerOpen = true;
      this.drawerTransform = 'translateX(0)';
      
      // Hide loading after animation
      setTimeout(() => {
        this.isDrawerOpening = false;
      }, 300);
      
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    },
    closeDrawer() {
      this.isDrawerOpen = false;
      this.drawerTransform = 'translateX(-100%)';
      
      // Re-enable body scroll
      document.body.style.overflow = '';
    },
    setupHamburgerListener() {
      const hamburger = document.querySelector('.sidenav-trigger');
      if (hamburger) {
        hamburger.addEventListener('click', this.handleHamburgerClick);
      }
    },
    handleHamburgerClick(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Toggle drawer state
      if (this.isDrawerOpen) {
        this.closeDrawer();
      } else {
        this.openDrawer();
      }
    },
    showBucketPromptToast() {
      // Show prompt for 5 seconds
      this.showBucketPrompt = true;
      setTimeout(() => {
        this.showBucketPrompt = false;
      }, 5000);
    },
    dismissBucketPrompt() {
      this.showBucketPrompt = false;
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
  overflow-y: auto;
  overflow-x: hidden;
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

/* Mobile Drawer */
.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 300px;
  max-width: 85vw;
  height: 100vh;
  background-color: var(--color-background);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  overflow-x: hidden;
}

.mobile-drawer.drawer-open {
  transform: translateX(0);
}

.drawer-content {
  padding: var(--spacing-md) 0;
  min-height: 100%;
  pointer-events: auto;
  position: relative;
  z-index: 1;
}

/* Drawer Auth Section */
.drawer-auth-section {
  padding: var(--spacing-md);
}

.drawer-auth-btn {
  width: 100%;
  background-color: var(--color-primary) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  height: 48px;
  border-radius: 8px;
  font-weight: var(--font-weight-semibold);
}

.drawer-auth-btn:hover {
  background-color: #083463 !important;
}

.drawer-auth-btn .material-symbols-outlined {
  font-size: 20px;
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

/* Edge Swipe Zone for Mobile */
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

/* Mobile Loading Toast */
.mobile-loading-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(10, 68, 146, 0.95);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  backdrop-filter: blur(10px);
}

.spinner-circle {
  width: 100%;
  height: 100%;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  box-sizing: border-box;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Bucket Prompt Toast */
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

.bucket-prompt-content i.material-icons {
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

.dismiss-btn i {
  font-size: 20px;
}

/* Toast transition */
.toast-enter-active, .toast-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* Hide on large screens */
.hide-on-large-only {
  display: block;
}

@media (min-width: 1024px) {
  .hide-on-large-only {
    display: none !important;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .mobile-loading-toast {
    background-color: rgba(21, 101, 192, 0.95);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
  
  .spinner-circle {
    border-color: rgba(255, 255, 255, 0.2);
    border-top-color: white;
  }
  
  .bucket-prompt-toast {
    background-color: rgba(255, 152, 0, 0.95);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }
  
  .mobile-drawer {
    background-color: #1e1e1e;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.5);
  }
  
  .drawer-overlay {
    background-color: rgba(0, 0, 0, 0.7);
  }
}
</style>
