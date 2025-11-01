<template>
  <div v-bind:id="id" class="card whitesmoke note-cursor z-depth-0" v-on:click="persist(id)" v-on:mouseenter="addShadow(id)" v-on:mouseleave="removeShadow(id)">
    <div class="card-content grey-text text-darken-1">
      <strong class="card-title flow-text note-title">{{ name }}</strong>
      <span class="right">{{ formatDate(date) }}</span>
    </div>
  </div>
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
    persist(id) {
      this.$store.commit({type: 'updateId', id: id});
      this.$store.commit({type: 'updateName', name: this.name});
      this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: this.date});
    },
    addShadow(id){
      const card = document.getElementById(id);
      card.setAttribute("class", card.getAttribute("class").replace('z-depth-0', 'z-depth-2'));
    },
    removeShadow(id){
      const card = document.getElementById(id);
      card.setAttribute("class", card.getAttribute("class").replace('z-depth-2', 'z-depth-0'));
    },
    formatDate(date){
      const locale = navigator.language.split("-")[0];
      const d = Date.parse(date);
      const ye = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(d)
      const mo = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d)
      const da = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(d)
      const h = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric'}).format(d);
      return `${da} ${mo} ${ye} ${h}`;
    }
  }
}
</script>

<style scoped>
.note-cursor {
  cursor: pointer;
  transition: all var(--transition-base);
}

.card-content {
  color: var(--color-text) !important;
}

.card-title {
  color: var(--color-heading) !important;
}

.grey-text {
  color: var(--color-text) !important;
}
</style>