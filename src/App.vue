<template>
  <div class="fullscreen-container">
    <div class="navbar-fixed">
      <nav class="z-depth-0">
        <div class="nav-wrapper whitesmoke">
          <div class="row">
            <div id="hamburger" class="col s2 m2 l2">
              <router-link to="/" class="left">
                <img src="./assets/pikacloud_note.svg" height="50px" style="margin-top: 5px;" alt="Pika Note"
                  class="brand-logo only-large-scr" />
              </router-link>
              <a href="#" data-target="slide-out" class="sidenav-trigger"><i class="material-icons">menu</i></a>
            </div>
            <div class="col s8 m8 l8 center">
              <div v-if="$store.getters.id !== '' && $store.getters.name">
                <h5 class="nav-title">{{ $store.getters.name }}</h5>
              </div>
              <div v-else-if="$store.getters.bucketName && $store.getters.loggedIn" class="hide-on-large-only">
                <h5 class="nav-title">
                  {{ $store.getters.bucketName }}
                </h5>
              </div>
            </div>
            <div class="col s2 m2 l2 hide-on-med-and-down">
              <div class="right">
                <ul class="right hide-on-med-and-down">
                  <li>
                    <router-link to="/About" class="navlink">
                        <i class="material-icons">info_outline</i>
                    </router-link>
                  </li>
                  <li>
                    <a
                      id="app-drop-link"
                      class="navlink white-text"
                      href="#"
                      title="Pika Cloud Apps"
                      @click.prevent.stop="$refs.appDropdown?.toggleMenu()"
                    >
                      <i class="large material-icons">apps</i>
                    </a>
                  </li>
                  <li v-if="this.$store.getters.loggedIn === false">
                    <form method="post" action="https://noteapi.lukas-bownik.net/Security/LocalLogin">
                      <button id="login" class="btn-flat btn-nav navlink white-text left" style="height: inherit;">
                        <i class="material-icons" style="position:relative; height:inherit;">
                          exit_to_app
                        </i>
                      </button>
                    </form>
                  </li>
                  <li v-if="this.$store.getters.loggedIn === true">
                    <form method="post" action="https://api-core.lukas-bownik.net/Identity/Gateway/Logout">
                      <button class="btn-flat btn-nav navlink white-text left" style="height: inherit;">
                        <i class="material-icons rotate" style="position:relative; height:inherit;">
                          exit_to_app
                        </i>
                      </button>
                    </form>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
    <div id="login_discovery" class="tap-target feature-discovery white-text show-on-medium-and-up" data-target="login"
      v-if="this.loginDiscoveryMessage === true">
      <div class="tap-target-content">
        <h5>Federated Identity</h5>
        <p>Pika Note is federated with Pika Core with single identity. Tap this button to proceed to login page. Tap
          anywhere to dismiss.</p>
      </div>
    </div>
    <div id="login_discovery" class="tap-target feature-discovery white-text show-on-small-only" data-target="hamburger"
      v-if="this.loginDiscoveryMessage === true && isTouchScreen">
      <div class="tap-target-content">
        <h5>Federated Identity</h5>
        <p>Pika Note is federated with Pika Core with single identity. Tap here to open sidenav and then LOG IN to
          proceed to login page. Tap anywhere to dismiss.</p>
      </div>
    </div>
    <ul id="slide-out" class="sidenav">
      <!-- Mobile content will be teleported here from WorkspaceLayout -->
      <li class="mobile-notes-section hide-on-large-only"></li>
    </ul>
    <div class="row whitesmoke padding">
      <div class="container">
        <router-view></router-view>
      </div>
    </div>

    <AppDropdown ref="appDropdown" />
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
          <small><strong>Characters:</strong> {{ $store.getters.count }}/{{ $store.getters.limit }}</small>
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
            <i class="material-icons" style="font-size: 16px; vertical-align: middle;">folder</i>
            <span>{{ $store.getters.bucketName }}</span>
          </small>
          <small v-else>
            <span style="opacity: 0.6;">No bucket selected</span>
          </small>
        </div>
      </div>
    </footer>
    <LoadingOverlay
      :visible="overlayVisible"
      :needs-login="showLoginPrompt"
      :message="overlayMessage"
      :error-message="$store.getters.loadingError"
      :countdown="loginRedirectCountdown"
      :login-url="loginUrl"
    />
  </div>
</template>

<script>
import AppDropdown from '@/components/molecules/AppDropdown';
import SecurityService from '@/services/securityService';
import M from 'materialize-css';
import MobileDetectService from './services/mobileDetectService';
import LoadingOverlay from './components/LoadingOverlay.vue';

export default {
  name: 'App',
  components: {
    AppDropdown,
    LoadingOverlay
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
    }
  },
  methods: {
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
    startLoginRedirect() {
      this.clearLoginRedirect();
      this.loginRedirectCountdown = 5;
      this.loginRedirectTimer = setInterval(() => {
        if (this.loginRedirectCountdown <= 1) {
          window.location.href = this.loginUrl;
          return;
        }
        this.loginRedirectCountdown -= 1;
      }, 1000);
    },
    clearLoginRedirect() {
      if (this.loginRedirectTimer) {
        clearInterval(this.loginRedirectTimer);
        this.loginRedirectTimer = null;
      }
    }
  },
  data(){
    return {
      loginDiscoveryMessage: localStorage.getItem('login_discovery') === null,
      isTouchScreen: MobileDetectService.isTouchScreen(),
      name: this.$store.getters.name,
      loginRedirectCountdown: 5,
      loginRedirectTimer: null,
      loginUrl: process.env.VUE_APP_LOGIN_URL || 'https://core.lukas-bownik.net/login'
    }
  },
  watch: {
    showLoginPrompt(newVal) {
      if (newVal) {
        this.startLoginRedirect();
      } else {
        this.clearLoginRedirect();
      }
    }
  },
  mounted: async function() {
    M.AutoInit();
    if(localStorage.getItem('login_discovery') === null){
      const instance = M.TapTarget.getInstance(document.getElementById('login_discovery'));
      if(instance !== undefined){
        instance.open();
        localStorage.setItem('login_discovery', '1');
      }
    }
    const securityService = new SecurityService();
    this.$store.commit({type: 'setLoadingError', loadingError: ''});
    this.$store.commit({type: 'setAuthLoading', authLoading: true});
    try {
      const isLoggedIn = await securityService.validateLoggedInState();
      this.$store.commit({type: 'updateLoggedInState', loggedIn: isLoggedIn});
    } catch (error) {
      this.$store.commit({type: 'setLoadingError', loadingError: 'Unable to verify your session. Please try again.'});
    } finally {
      this.$store.commit({type: 'setAuthLoading', authLoading: false});
    }
    
    setInterval(async () => {
      try {
        const isLoggedIn = await securityService.validateLoggedInState();
        this.$store.commit({type: 'updateLoggedInState', loggedIn: isLoggedIn});
      } catch (error) {
        // Silent refresh failure - keep current state
      }
    }, 60000);
  },
  beforeUnmount() {
    this.clearLoginRedirect();
  }
}
</script>

<style>
/* Import order matters - base styles first, then framework, then custom */
@import './assets/normalize.css';
@import './assets/materialize.css';
@import './assets/material-icons.css';
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

.bucket-icon {
  font-size: 28px !important;
  vertical-align: middle;
  margin-right: 8px;
}

/* Navbar icons - ensure they're white */
nav .material-icons {
  color: white !important;
}

nav .btn-nav .material-icons {
  color: white !important;
}

/* Navbar hover effects for all buttons and links */
nav .navlink:hover {
  background-color: var(--color-nav-hover) !important;
}

nav .navlink:hover .material-icons {
  color: var(--color-primary) !important;
}

nav button.navlink {
  border: none;
  background-color: transparent;
}

nav button.navlink:hover {
  background-color: var(--color-nav-hover) !important;
}

/* Sidenav customizations */
.mobile-notes-section {
  padding: 0 !important;
  margin: 0 !important;
  height: 100%;
  overflow: hidden;
}
</style>
