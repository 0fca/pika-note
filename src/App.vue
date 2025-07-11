<template>
  <div class="fullscreen-container">
    <div class="navbar-fixed">
      <nav class="z-depth-0">
        <div class="nav-wrapper whitesmoke">
          <div class="row">
            <div id="hamburger" class="col s2 m4 l4">
              <router-link to="/" class="left">
                <img src="./assets/pikacloud_note.svg" height="50px" style="margin-top: 5px;" alt="Pika Note"
                  class="brand-logo only-large-scr" />
              </router-link>
              <a href="#" data-target="slide-out" class="sidenav-trigger"><i class="material-icons">menu</i></a>
            </div>
            <div class="col s10 m4 l4 left">
              <input v-if="$router.currentRoute.value.fullPath.endsWith('editor') === true"
                class="input-field white-text" placeholder="Note title..." id="title-input" v-model="title"/>
            </div>
            <div class="col m4 l4 hide-on-med-and-down">
              <div class="right">
                <ul class="right hide-on-med-and-down">
                  <li>
                    <router-link to="/About">
                        <i class="material-icons">info_outline</i>
                    </router-link>
                  </li>
                  <li>
                    <a id="app-drop-link" class='dropdown-trigger navlink white-text' href='#'
                      data-target='app-dropdown' title="Pika Cloud Apps">
                      <i class="large material-icons">apps</i>
                    </a>
                  </li>
                  <li v-if="this.$store.getters.loggedIn === false">
                    <form method="post" action="https://noteapi.lukas-bownik.net/Security/LocalLogin">
                      <button id="login" class="btn-flat btn-nav white-text left" style="height: inherit;">
                        <i class="material-icons" style="position:relative; height:inherit;">
                          exit_to_app
                        </i>
                      </button>
                    </form>
                  </li>
                  <li v-if="this.$store.getters.loggedIn === true">
                    <form method="post" action="https://core.lukas-bownik.net/Identity/Gateway/Logout">
                      <button class="btn-flat btn-nav white-text left" style="height: inherit;">
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
      <li>
        <a class="collection-item navlink app-menu-item" href="https://cloud.lukas-bownik.net/" title="Pika Cloudfront">
          <span class="material-symbols-outlined secondary-content navlink havelock-text">
              cloud
          </span>
          Pika Cloudfront
        </a>
      </li>
      <li>
        <a class="collection-item navlink app-menu-item" href="https://core.lukas-bownik.net/" title="Pika Core">
          <span class="material-symbols-outlined secondary-content navlink havelock-text">
              storage
          </span>
          Pika Core
        </a>
      </li>
      <li>
        <a class="collection-item navlink app-menu-item" href="https://chat.lukas-bownik.net/" title="Pika Chat">
          <span class="material-symbols-outlined secondary-content navlink havelock-text">
              chat
          </span>
          Pika Chat
        </a>
      </li>
      <li>
        <a class="collection-item navlink app-menu-item" href="https://core.lukas-bownik.net/status" title="Pika Status">
          <span class="material-symbols-outlined secondary-content navlink havelock-text">
              vital_signs
          </span>
          Pika Status
        </a>
      </li>
      <li>
        <a class="collection-item navlink app-menu-item" href="/About" title="About Pika Note">
          <span class="material-icons secondary-content navlink havelock-text">
            info_outline
          </span>
          About
        </a>
      </li>
      <li v-if="this.$store.getters.loggedIn === false">
        <form method="post" action="https://noteapi.lukas-bownik.net/Security/LocalLogin">
          <button class="btn btn-flat">
            LOG IN
          </button>
        </form>
      </li>
      <li v-if="this.$store.getters.loggedIn === true">
        <form method="post" action="https://core.lukas-bownik.net/Identity/Gateway/Logout">
          <button class="btn btn-flat">
            LOG OUT
          </button>
        </form>
      </li>
    </ul>
    <div class="row whitesmoke padding">
      <div class="container">
        <router-view></router-view>
      </div>
    </div>

    <AppDropdown />
    <footer class="stats-footer" v-if="$router.currentRoute.value.fullPath.endsWith('editor') === true">
      <div class="row black-text">
        <div class="col s6 m4 l4 left">
          <small v-if="$store.getters.isSaving === false">Last saved: {{ formatDate($store.getters.lastSavedAt) ?? "Never saved"}}</small>
          <small v-if="$store.getters.isSaving === true">
            <span class="material-symbols-outlined animate-rotation">
              autorenew
              </span>
            <span style="bottom: 8px;position: relative;">Saving...</span>
          </small>
        </div>
        <div class="col s4 m3 l3 left">
          <small>{{ $store.getters.count }}/{{ $store.getters.limit }} characters</small>
        </div>
        <div class="col s2 m2 l2 right">
          <small v-if="$store.getters.autoSaveJobId > 0" style="cursor:pointer;">
            <span class="material-symbols-outlined" style="font-size: large;" v-if="$store.getters.autoSaveJobId > 0">
              check
            </span>
            <span>
              Auto-save enabled
            </span>
          </small>
          <small v-if="$store.getters.autoSaveJobId === 0" style="cursor:pointer;">
            <span class="material-symbols-outlined" style="font-size:large;" v-if="$store.getters.autoSaveJobId === 0">
              block
            </span>
            <span>
              Auto-save disabled
            </span>
          </small>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import AppDropdown from '@/components/molecules/AppDropdown';
import SecurityService from '@/services/securityService';
import M from 'materialize-css';
import MobileDetectService from './services/mobileDetectService';

export default {
  name: 'App',
  components: {
    AppDropdown
  },
  computed: {
    title: {
      get(){
        return this.$store.getters.name;
      },
      set(name){
        this.$store.commit({type: 'updateName', name: name})
      }
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
    }
  },
  data(){
    return {
      loginDiscoveryMessage: localStorage.getItem('login_discovery') === null,
      isTouchScreen: MobileDetectService.isTouchScreen(),
      name: this.$store.getters.name
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
    const isLoggedIn = await securityService.validateLoggedInState();
    this.$store.commit({type: 'updateLoggedInState', loggedIn: isLoggedIn});
    
    setInterval(async () => {
      const isLoggedIn = await securityService.validateLoggedInState();
      this.$store.commit({type: 'updateLoggedInState', loggedIn: isLoggedIn});
      
    }, 60000);
  },
}
</script>

<style scoped>
@import 'assets/main.css';
@import 'assets/materialize.css';
@import 'assets/material-icons.css';
@import 'assets/normalize.css';
@import 'assets/beagle.css';
.padding{
  padding-top: 20px;
}


</style>
