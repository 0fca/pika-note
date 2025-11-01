<template>
  <div class="container center">
    <div class="card about-card" v-once>
      <div class="card-content">
        <span class="card-title about-title">Pika Note v. {{version}}</span>
        <span class="card-action" style="border-top: none;">
          <a href="https://blog.lukas-bownik.net/posts/pika-cloud-changelog/#pika-note" class="changelog-link">Changelog</a>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import packageJson from '/package.json';

export default {
  name: "About",
  data(){
    return {
      version: packageJson.version
    }
  }
}
</script>

<style scoped>
.about-card {
  background-color: var(--color-primary) !important;
  color: white !important;
  margin-top: var(--spacing-2xl);
}

.about-title {
  color: white !important;
  font-size: var(--font-size-3xl);
}

.changelog-link {
  color: white !important;
  text-decoration: underline;
  font-weight: var(--font-weight-medium);
}

.changelog-link:hover {
  color: var(--color-accent-soft) !important;
}
</style>