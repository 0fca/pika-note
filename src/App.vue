<template>
    <div class="fullscreen-container">
      <div class="row master-head z-depth-2">
        <div class="container center white-text">
          <h2>
            <router-link to="/">
            <a class="white-text">
              <img src="./assets/pikacloud_large-white.png" alt="Pika Cloud" height="150" class="img-responsive hide-on-small-and-down"/>
              <p class="hide-on-med-and-up">Pika Cloud</p>
            </a>
            </router-link>
          </h2>
          <small>This is <router-link to="/about" class="red-text text-accent-2">Pika Note</router-link> aka "Nicole"</small>
          <br/>
          <small>This is ALPHA build.</small>
        </div>
      </div>
      <div class="row whitesmoke pt-5">
        <div class="container center">
          <router-view></router-view>
        </div>
      </div>
    </div>
</template>

<script>
export default {
  name: 'App',
  components: {
  }
}
</script>
