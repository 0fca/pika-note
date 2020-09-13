<template>
    <div class="fullscreen-container">
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
          <small>This is <router-link to="/about" class="red-text text-accent-2">Pika Note</router-link> aka "Alexis"</small>
          <br/>
          <small>This is ALPHA build.</small>
        </div>
      </div>
      <div class="row whitesmoke padding">
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

<style scoped>
.padding{
  padding-top: 20px;
}
</style>
