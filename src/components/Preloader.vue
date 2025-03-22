<template>
  <div id="preloader" class="card-panel center havelock">
  <p class="flow-text white-text">{{ message}}</p>
      <div class="progress havelock">
        <div class="indeterminate"></div>
      </div>
  </div>
</template>

<script>
export default {
name: "Preloader",
  props:[
    'message'
  ]
}
</script>

<style scoped>

</style>