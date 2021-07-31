<template>
  <div class="container">
    <div class="row card-panel filter-bar z-depth-0">
      <div class="row" v-if="overallCount">
        <div class="col s12 m12 l12">
          <p> Zapisane notatki: {{ overallCount }}</p>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <select id="order" v-model="order" v-on:change="reloadOnOrderChange">
            <option value="0" selected>Ascending</option>
            <option value="1">Descending</option>
          </select>
          <label for="order">Order</label>
        </div>
      </div>
    </div>
    <div class="row" id="notes">
        <Preloader message="Now, it is all rolling, please wait!" v-if="!loaded"/>
        <Error v-if="error" />
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
import Preloader from "@/components/Preloader";
import Error from "@/components/Error";
import NoteService from "@/services/noteService";

let order = localStorage.order ?? 0;
let count = localStorage.count ?? 10;

export default {
  name: 'MainPage',
  components: {
    Error,
    Note,
    Preloader
  },
  mounted: function() {
    this.noteService = new NoteService()
    this.noteService.readData('/notes?order='+order+"&count="+count)
        .then(data => {
          this.onDataReceived(data);
        })
        .catch(() => {
          this.error = true;
          this.loaded = true;
        });

    let elems = document.querySelectorAll('select');
    M.FormSelect.init(elems, null);
  },
  data: function() {
    return {
      notes: [],
      order: localStorage.order ?? order,
      count: localStorage.count ?? count,
      overallCount: localStorage.overallCount,
      loaded: false,
      error: false
    }
  },
  methods: {
    reloadOnOrderChange: function (event){
      localStorage.order = event.target.value
      this.noteService.readData('/notes?order='+event.target.value+"&count="+count)
          .then(data => {
            this.onDataReceived(data);
          })
          .catch(() => {
            this.loaded = true;
          });
    },
    reloadOnCountChange: function (event){
      localStorage.count = event.target.value

      this.noteService.readData('/notes?order='+order+"&count="+event.target.value)
          .then(data => {
            this.onDataReceived(data);
          })
          .catch(() => {
            this.loaded = true;
          });
    },
    onDataReceived: function (data) {
      this.notes = data.payload;
      this.loaded = true;
    }
  }
}
</script>