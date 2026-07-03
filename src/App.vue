<template>
  <div class="fullscreen-container">
    <div class="navbar-fixed">
      <nav class="z-depth-0">
        <div class="nav-wrapper whitesmoke">
          <div class="nav-flex">
            <div class="nav-left">
              <!-- Desktop: logo -->
              <router-link to="/" class="nav-brand hide-on-med-and-down">
                <img src="./assets/pikacloud_note.svg" height="40px" alt="Pika Note" />
              </router-link>
              <!-- Mobile: hamburger -->
              <button id="hamburger" class="nav-hamburger hide-on-large-only" @click.prevent.stop="toggleDrawer">
                <span class="material-symbols-outlined">menu</span>
              </button>
            </div>
            <div class="nav-center">
            </div>
            <div class="nav-right">
              <ul class="nav-actions hide-on-med-and-down">
                <li>
                  <router-link to="/About" class="navlink">
                    <span class="material-symbols-outlined">info</span>
                  </router-link>
                </li>
                <li class="dropdown-container">
                  <a
                    id="app-drop-link"
                    class="navlink"
                    href="#"
                    title="Pika Cloud Apps"
                    @click.prevent.stop="$refs.appMenuDropdown?.toggleMenu()"
                  >
                    <span class="material-symbols-outlined">apps</span>
                  </a>
                  <AppMenuDropdown ref="appMenuDropdown" />
                </li>
                <li v-if="this.$store.getters.loggedIn === false">
                  <form method="post" action="https://noteapi.lukas-bownik.net/Security/LocalLogin">
                    <button id="login" class="btn-flat navlink" style="height: inherit; border: none; background: none; cursor: pointer;">
                      <span class="material-symbols-outlined">exit_to_app</span>
                    </button>
                  </form>
                </li>
                <li v-if="this.$store.getters.loggedIn === true">
                  <form method="post" action="https://api-core.lukas-bownik.net/Identity/Gateway/Logout">
                    <button id="login" class="btn-flat navlink" style="height: inherit; border: none; background: none; cursor: pointer;">
                      <span class="material-symbols-outlined rotate">exit_to_app</span>
                    </button>
                  </form>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </div>
    <!-- Feature Discovery Component -->
    <FeatureDiscovery
      v-if="showFeatureDiscovery"
      :discoveries="featureDiscoveries"
      @complete="onDiscoveryComplete"
      @dismiss="onDiscoveryDismiss"
    />
    <div class="row whitesmoke">
      <router-view></router-view>
    </div>

    <footer class="stats-footer" v-if="$store.getters.loggedIn && ($store.getters.id !== '' || $store.getters.count > 0)">
      <div class="stats-grid">
        <!-- Top Left: Last Update -->
        <div class="stats-item">
          <small v-if="$store.getters.isSaving === false">
            <strong>Last saved:</strong> {{ formatDate($store.getters.lastSavedAt) ?? "Never saved"}}
          </small>
          <small v-if="$store.getters.isSaving === true">
            <span class="material-symbols-outlined animate-rotation" style="font-size: 16px; vertical-align: middle;">
              autorenew
            </span>
            <span>Saving...</span>
          </small>
        </div>
        
        <!-- Top Right: Character Counter -->
        <div class="stats-item">
          <small><strong>Characters:</strong> {{ $store.getters.count }}</small>
        </div>
        
        <!-- Bottom Left: Auto-save Status -->
        <div class="stats-item">
          <small v-if="$store.getters.autoSaveEnabled">
            <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">
              check
            </span>
            <span>Auto-save enabled</span>
          </small>
          <small v-if="!$store.getters.autoSaveEnabled">
            <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">
              block
            </span>
            <span>Auto-save disabled</span>
          </small>
        </div>
        
        <!-- Bottom Right: Current Bucket -->
        <div class="stats-item">
          <small v-if="$store.getters.bucketName">
            <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">folder</span>
            <span>{{ $store.getters.bucketName }}</span>
          </small>
          <small v-else>
            <span style="opacity: 0.6;">No bucket selected</span>
          </small>
        </div>
      </div>
    </footer>
    <ToastContainer />
    <LoadingOverlay
      :visible="overlayVisible"
      :needs-login="showLoginPrompt"
      :message="overlayMessage"
      :error-message="$store.getters.loadingError"
      :login-url="loginUrl"
    />
  </div>
</template>

<script>
import AppMenuDropdown from '@/components/AppMenuDropdown';
import SecurityService from '@/services/securityService';
import MobileDetectService from './services/mobileDetectService';
import LoadingOverlay from './components/LoadingOverlay.vue';
import FeatureDiscovery from './components/FeatureDiscovery.vue';
import ToastContainer from './components/ToastContainer.vue';

export default {
  name: 'App',
  components: {
    AppMenuDropdown,
    LoadingOverlay,
    FeatureDiscovery,
    ToastContainer
  },
  computed: {
    title: {
      get(){
        return this.$store.getters.name;
      },
      set(name){
        this.$store.commit({type: 'updateName', name: name})
      }
    },
    overlayLoading() {
      const waitingForData = this.isWaitingForData;
      return waitingForData && !this.$store.getters.loadingError;
    },
    isWaitingForData() {
      // Show overlay while authentication, buckets, or notes are loading.
      return this.$store.getters.authLoading || (this.$store.getters.loggedIn && (this.$store.getters.bucketsLoading || this.$store.getters.notesLoading));
    },
    showLoginPrompt() {
      return !this.overlayLoading && !this.$store.getters.loggedIn && !this.$store.getters.loadingError;
    },
    overlayVisible() {
      return this.overlayLoading || this.showLoginPrompt || !!this.$store.getters.loadingError;
    },
    overlayMessage() {
      if (this.overlayLoading) {
        return 'Loading your workspace...';
      }
      return '';
    },
    workspaceLoaded() {
      // Workspace is loaded when we're logged in and not loading
      return this.$store.getters.loggedIn && 
             !this.$store.getters.authLoading && 
             !this.$store.getters.bucketsLoading && 
             !this.$store.getters.notesLoading &&
             !this.$store.getters.loadingError;
    },
    discoveryStateKey() {
      return [
        this.$route.path,
        this.$store.getters.id,
        this.$store.getters.editorTabs.length
      ].join('|');
    },
    showFeatureDiscovery() {
      // Show feature discovery when workspace is loaded and there are discoveries to show
      return this.workspaceLoaded && this.hasUnseenDiscoveries;
    },
    featureDiscoveries() {
      // Computed property to access component instance properties
      const discoveries = [
        {
          id: 'login_discovery',
          targetSelector: this.isTouchScreen ? '#hamburger' : '#login',
          title: 'Federated Identity',
          description: this.isTouchScreen 
            ? 'Pika Note is federated with Pika Core with single identity. Tap here to open the drawer menu and then LOG IN to proceed to the login page.'
            : 'Pika Note is federated with Pika Core with single identity. Click this button to proceed to the login page.',
          position: 'bottom'
        },
        {
          id: 'editor_discovery',
          targetSelector: '#create_floating_btn',
          title: 'Editor Tools',
          description: 'Use this floating action button to save your notes, toggle auto-save, and clear content. Click to expand the menu.',
          position: 'left'
        }
      ];

      if (this.$store.getters.editorTabs.length > 0) {
        discoveries.push({
          id: 'tabs_discovery',
          targetSelector: '#editor-tabs-discovery',
          title: 'Pinned tabs',
          description: 'Pika Note allows you to easily open a note using a single tab, but if you need more opened at the same time - double click the tab header to pin the tab.',
          position: 'bottom'
        });
      }

      if (this.$route.path === '/editor' && !this.$store.getters.id) {
        discoveries.push({
          id: 'note_type_discovery',
          targetSelector: '#new-note-type-discovery',
          title: 'Note type',
          description: 'Pika Note allows you to handle simple numeric data (without formulas for now), just choose a note of a type during creation and then enter your text or numeric data, that\'s it!',
          position: 'bottom'
        });
      }

      return discoveries;
    }
  },
  methods: {
    toggleDrawer() {
      this.$store.commit({type: 'setDrawerOpen', drawerOpen: !this.$store.getters.drawerOpen});
    },
    formatDate(date){
      const locale = navigator.language.split("-")[0];

      if(date !== null && date !== undefined){
        const d = Date.parse(date);
        const ye = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(d)
        const mo = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d)
        const da = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(d)
        const h = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric'}).format(d);
        return `${da} ${mo} ${ye} ${h}`;
      }
      return null;
    },

    onDiscoveryComplete() {
      this.hasUnseenDiscoveries = false;
    },
    onDiscoveryDismiss() {
      this.hasUnseenDiscoveries = false;
    },
    checkForUnseenDiscoveries() {
      // Check if any discoveries haven't been seen
      this.hasUnseenDiscoveries = this.featureDiscoveries.some(
        d => !localStorage.getItem(d.id)
      );
    }
  },
  data(){
    return {
      isTouchScreen: MobileDetectService.isTouchScreen(),
      name: this.$store.getters.name,
      loginUrl: process.env.VUE_APP_LOGIN_URL || 'https://core.lukas-bownik.net/login',
      hasUnseenDiscoveries: false
    }
  },
  watch: {
    workspaceLoaded(newVal) {
      // When workspace is loaded, check for unseen discoveries
      if (newVal) {
        this.$nextTick(() => {
          this.checkForUnseenDiscoveries();
        });
      }
    },
    discoveryStateKey() {
      if (this.workspaceLoaded) {
        this.$nextTick(() => {
          this.checkForUnseenDiscoveries();
        });
      }
    }
  },
  mounted: async function() {
    // Check for unseen discoveries on mount
    this.checkForUnseenDiscoveries();
    
    const securityService = new SecurityService();
    this.$store.commit({type: 'setLoadingError', loadingError: ''});
    this.$store.commit({type: 'setAuthLoading', authLoading: true});
    try {
      const isLoggedIn = await securityService.validateLoggedInState();
      this.$store.commit({type: 'updateLoggedInState', loggedIn: isLoggedIn});
    } catch (error) {
      this.$store.commit({type: 'updateLoggedInState', loggedIn: false});
      this.$store.commit({type: 'setLoadingError', loadingError: ''});
    } finally {
      this.$store.commit({type: 'setAuthLoading', authLoading: false});
    }
  },
  beforeUnmount() {
  }
}
</script>

<style>
/* Import order matters - base styles first, then framework, then custom */
@import './assets/normalize.css';
@import './assets/main.css';
@import './assets/beagle.css';
</style>

<style scoped>
.padding {
  padding-top: var(--spacing-xl);
}

.nav-title {
  color: var(--color-nav-text);
  margin: 0;
  padding: 0;
  line-height: 64px;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Navbar icons */
nav .material-symbols-outlined {
  color: white !important;
}

/* Nav flexbox layout */
.nav-flex {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 16px;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.nav-brand {
  display: flex;
  align-items: center;
}

.nav-hamburger {
  background: none;
  border: none;
  color: var(--color-nav-text);
  cursor: pointer;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
  min-width: 48px;
  min-height: 48px;
}

.nav-hamburger .material-symbols-outlined {
  font-size: 28px;
}

.nav-hamburger:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.nav-center {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.nav-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: relative;
}

.nav-actions {
  list-style: none;
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  gap: 4px;
}

.nav-actions li {
  display: flex;
  align-items: center;
}

.nav-actions li a,
.nav-actions li button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: var(--radius-md);
}

.navlink {
  color: var(--color-nav-text) !important;
  transition: background-color var(--transition-fast);
}

.navlink:hover {
  background-color: rgba(255, 255, 255, 0.15) !important;
}

/* App dropdown positioning container */
.nav-actions li.dropdown-container {
  position: relative;
}

/* Responsive hide utilities */
.hide-on-med-and-down {
  display: flex;
}

.hide-on-large-only {
  display: flex;
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
</style>
