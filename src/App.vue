<template>
    <div class="fullscreen-container">
      <div class="navbar-fixed">
        <nav class="z-depth-0">
            <div class="nav-wrapper whitesmoke">
              <div class="right">
                <ul class="right hide-on-med-and-down">
                <li>
                    <a id="app-drop-link" class='dropdown-trigger navlink havelock-text' href='#' data-target='app-dropdown' title="Pika Cloud Apps">
                        <i class="large material-icons">apps</i>
                    </a>
                </li>
                <li v-if="this.$store.getters.loggedIn === false">
                  <form method="post" action="https://pikanoteapi.azurewebsites.net/Security/LocalLogin">
                    <button class="btn btn-flat white-text">
                      LOGIN
                    </button>
                  </form>
                </li>
                <li v-if="this.$store.getters.loggedIn === true">
                  <form method="post" action="https://core.lukas-bownik.net/Identity/Gateway/Logout">
                    <button class="btn btn-flat white-text">
                      LOG OUT
                    </button>
                  </form>
                </li>
                </ul>
                </div>
              </div>
              </nav>
              </div>
      <div class="row master-head z-depth-2">
        <div class="container center white-text">
          <h2>
            <router-link to="/">
            <a class="white-text">
              <img src="./assets/pikacloud_note.svg" alt="Pika Note" height="150" class="img-responsive hide-on-small-and-down"/>
              <p class="hide-on-med-and-up">Pika Note</p>
            </a>
            </router-link>
            
          </h2>
          <small>This is <router-link to="/about" class="red-text text-accent-2">Pika Note</router-link> aka "Maria"</small>
        </div>
      </div>
      <div class="row whitesmoke padding">
        <div class="container center">
          <router-view></router-view>
        </div>
      </div>
      <AppDropdown />
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
