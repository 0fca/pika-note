<template>
  <div class="container center">
    <div class="card havelock white-text" v-once>
      <div class="card-content white-text">
        <span class="card-title">Pika Note v. {{version}}</span>
        <span class="card-action" style="border-top: none;">
          <a href="https://blog.lukas-bownik.net/posts/pika-cloud-changelog/#pika-note">Changelog</a>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import {version} from '/package.json';

export default {
  name: "About",
  data(){
    return {
      version: version
    }
  }
}
</script>