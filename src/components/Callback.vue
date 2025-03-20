<template>
    <div class="card small havelock white-text" v-once>
    <div class="card-content white-text">
      <h2 class="card-title">You have been successfully logged in</h2>
      <small>You will be redirected to note list in about 2 seconds...</small>
      <span class="card-action">
        <a href="https://note.lukas-bownik.net/">or click here if nothing happens</a>
      </span>
    </div>
  </div>
 </template>

<script>
export default {
    name:"Callback",
    mounted: function() {
      setTimeout(() => {
             this.$router.push({ path: "/"})
      }, 2000);
    }
}
</script>