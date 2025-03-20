<template>
  <div class="row card-panel havelock white-text">
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
