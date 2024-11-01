<template>
      <select id="bucket-select" v-model="this.bucketId">
        <option value="" disabled selected>Choose a bucket</option>
          <option :value="entry.id" v-for="entry in entries" :key="entry.id">
            {{ entry.text }}
          </option>
      </select>
</template>
<script>
import M from 'materialize-css';

export default {
    name: 'Select',
    props: [
        'dropdownText',
        'entries',
    ],
    data(){
      return {
        bucketId: this.$store.getters.bucketUuid
      }
    },
    updated: function() {
      const elems = document.getElementById("bucket-select");
      M.FormSelect.init(elems, null);
    }
}
</script>