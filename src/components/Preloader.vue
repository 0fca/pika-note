<template>
  <div id="preloader">
  <p class="flow-text grey-text text-darken-2">{{ message}}</p>
  <div class="preloader-wrapper big active">
    <div class="spinner-layer spinner-red-only">
      <div class="circle-clipper left">
        <div class="circle"></div>
      </div><div class="gap-patch">
      <div class="circle"></div>
    </div><div class="circle-clipper right">
      <div class="circle"></div>
    </div>
    </div>
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