<template>
  <div class="container">
    <div class="row card-panel filter-bar">
      <div class="input-field col s6">
        <select v-model="order" v-on:change="reloadOnOrderChange">
          <option value="0" selected>Ascending</option>
          <option value="1">Descending</option>
        </select>
        <label>Order</label>
      </div>
      <div class="input-field col s6">
        <select v-model="count" v-on:change="reloadOnCountChange">
          <option value="10">10</option>
          <option value="15">15</option>
          <option value="50">50</option>
        </select>
        <label>Count</label>
      </div>
    </div>
    <div class="row" id="notes">
      <Note v-for="(note, index) in notes"
            v-bind:key="index"
            v-bind:id="note.id"
            v-bind:name="note.name"
            v-bind:date="note.timestamp"
            v-bind:content="note.content"></Note>
    </div>
    <div class="fixed-action-btn">
      <router-link to="editor">
        <a class="btn-floating btn-large red"><i class="material-icons">add</i></a>
      </router-link>
    </div>
  </div>
</template>

<script>
import Note from '@/components/Note';
import M from 'materialize-css';

const baseUrl = "https://pikanoteapi.azurewebsites.net";
let order = localStorage.order ?? 0;
let count = localStorage.count ?? 10;

export default {
  name: 'MainPage',
  components: {
    Note
  },
  mounted: function() {
    readData(baseUrl + '/notes?order='+order+"&count="+count)
        .then(data => {
          this.notes = data.payload;
        })
        .catch((error) => {
          console.error('Error:', error);
        });

    let elems = document.querySelectorAll('select');
    M.FormSelect.init(elems, null);
  },
  data: function() {
    return {
      notes: [],
      order: localStorage.order ?? order,
      count: localStorage.count ?? count
    }
  },
  methods: {
    reloadOnOrderChange: function (event){
      localStorage.order = event.target.value
      readData(baseUrl + '/notes?order='+event.target.value+"&count="+count)
          .then(data => {
            this.notes = data.payload;
          })
          .catch((error) => {
            console.error('Error:', error);
          });
    },
    reloadOnCountChange: function (event){
      localStorage.count = event.target.value
      readData(baseUrl + '/notes?order='+order+"&count="+event.target.value)
          .then(data => {
            this.notes = data.payload;
          })
          .catch((error) => {
            console.error('Error:', error);
          });
    }
  }
}

async function readData(url = '') {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Origin': baseUrl
    }
  });
  return response.json();
}

</script>
