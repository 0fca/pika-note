<template>
    <div class="fullscreen-container">
      <div class="navbar-fixed">
        <nav class="z-depth-0">
            <div class="nav-wrapper whitesmoke">
              <div class="row">
                <div class="col s2 m4 l4">
                  <router-link to="/" class="left hide-on-small-only">
                    <img src="./assets/pikacloud_note.svg" height="50px" style="margin-top: 5px;" alt="Pika Note" class="brand-logo"/>
                  </router-link>
                  <a href="#" data-target="slide-out" class="sidenav-trigger"><i class="material-icons">menu</i></a>
                </div>
                <div class="col s10 m4 l4 left">
                  <input class="input-field white-text" placeholder="Note title..." id="title-input"/>
                </div>
                <div class="col m4 l4 hide-on-med-and-down">
                  <div class="right">
                    <ul class="right hide-on-med-and-down">
                    <li>
                        <a id="app-drop-link" class='dropdown-trigger navlink havelock-text' href='#' data-target='app-dropdown' title="Pika Cloud Apps">
                            <i class="large material-icons">apps</i>
                        </a>
                    </li>
                    <li v-if="this.$store.getters.loggedIn === false">
                      <form method="post" action="https://noteapi.lukas-bownik.net/Security/LocalLogin">
                        <button class="btn btn-flat white-text left" style="height: inherit;">
                          <i class="material-icons" style="position:relative; height:inherit;">
                            exit_to_app
                          </i>
                        </button>
                      </form>
                    </li>
                    <li v-if="this.$store.getters.loggedIn === true">
                      <form method="post" action="https://core.lukas-bownik.net/Identity/Gateway/Logout">
                        <button class="btn btn-flat white-text left" style="height: inherit;">
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
      
      <ul id="slide-out" class="sidenav">
        <li>
          <a class="collection-item navlink app-menu-item" href="https://core.lukas-bownik.net/" title="Pika Core">
            <span class="material-icons secondary-content navlink red-text text-accent-2">
                search
            </span>
            Pika Core
        </a>
        </li>
        <li>
          <a class="collection-item navlink app-menu-item" href="https://infra.lukas-bownik.net/" title="Pika Status">
                  <span class="material-icons secondary-content navlink red-text text-accent-2">
                      favorite_border
                  </span>
                  Pika Status
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
        <div class="container center">
          <router-view></router-view>
        </div>
      </div>
      
      <AppDropdown />
      <footer class="stats-footer">
        <div class="row black-text">
          <div class="col s6 m3 l2 left">
              <small v-if="$store.getters.isSaving === false">Last saved: {{ $store.getters.lastSavedAt ?? "Never saved"}}</small>
              <small v-if="$store.getters.isSaving === true">
                <i class="material-icons animate-rotation">cached</i>  <span style="bottom: 8px;position: relative;">Saving...</span>
              </small>
          </div>
          <div class="col s4 m1 l1 left">
              <small>{{ $store.getters.count }}/{{ $store.getters.limit }} characters</small>
          </div>
        </div>
      </footer>
    </div>
</template>

<script>
import AppDropdown from '@/components/molecules/AppDropdown';
import SecurityService from '@/services/securityService';
import M from 'materialize-css';

export default {
  name: 'App',
  components: {
    AppDropdown
  },
  mounted: async function() {
    M.AutoInit();
    const securityService = new SecurityService();
    const isLoggedIn = await securityService.validateLoggedInState();
    this.$store.commit({type: 'updateLoggedInState', loggedIn: isLoggedIn});
    
    setInterval(async () => {
      const isLoggedIn = await securityService.validateLoggedInState();
      this.$store.commit({type: 'updateLoggedInState', loggedIn: isLoggedIn});
      
    }, 60000);
  }
}
</script>

<style scoped>
.padding{
  padding-top: 20px;
}
</style>
