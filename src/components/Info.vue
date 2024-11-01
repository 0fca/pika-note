<template>
  <div class="row card-panel blue accent-2 white-text">
    <output>{{message}}</output>
  </div>
</template>

<script>
export default {
  name: "Info",
  props: [
    'message'
  ]
}
</script>
