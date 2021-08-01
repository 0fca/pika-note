<template>
  <div class="card white" v-once>
    <div class="card-content grey-text text-darken-1">
      <span class="card-title">About</span>
      <p>This application's purpose is to be a simple web notepad.</p>
      <p>This is PikaNote aka Alexis. v. {{ version }}</p>
      <p>Below you have hyperlinks to navigate to another systems in PikaCloud or another sites of mine.</p>
    </div>
    <div class="card-action">
      <a class="red-text text-accent-2" href="https://lukas-bownik.net/">Pika Cloundfront</a>
      <a class="red-text text-accent-2" href="https://core.lukas-bownik.net/">Pika Core</a>
      <a class="red-text text-accent-2" href="https://infra.lukas-bownik.net/">Pika Status</a>
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