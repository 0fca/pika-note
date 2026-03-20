<template>
  <div class="about-page">
    <img src="@/assets/pika_note.png" alt="Pika Note Illustration" class="about-image" />
    <h1 class="about-title">Pika Note v. {{ version }}</h1>
    <a href="https://blog.lukas-bownik.net/posts/pika-cloud-changelog/#pika-note" class="changelog-link">Changelog</a>
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
.about-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: var(--spacing-2xl);
}

.about-image {
  max-width: 400px;
  width: 100%;
}

.about-title {
  color: var(--color-primary);
  font-size: var(--font-size-3xl);
  margin-top: var(--spacing-lg);
  text-align: center;
}

.changelog-link {
  color: var(--color-primary);
  text-decoration: underline;
  font-weight: var(--font-weight-medium);
  margin-top: var(--spacing-sm);
}

.changelog-link:hover {
  color: var(--color-accent-soft);
}
</style>