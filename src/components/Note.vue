<template>
  <router-link :to="{ name: 'editor', params: { id: this.id } }">
  <div class="card whitesmoke note-cursor" v-on:click="persist">
    <div class="card-content grey-text text-darken-1">
      <span class="card-title">{{ name }}</span>
      {{ date }}
    </div>
  </div>
  </router-link>
</template>

<script>
export default {
  name: "Note",
  props: [
    'id',
    'name',
    'date',
    'content'
  ],
  methods: {
    persist() {
      localStorage.name = this.name;
      localStorage.content = this.content;
    }
  }
}
</script>

<style scoped>
 .note-cursor{
    cursor: pointer;
  }
</style>