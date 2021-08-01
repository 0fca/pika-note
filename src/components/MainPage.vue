<template>
  <div class="container">
    <div class="row card-panel filter-bar z-depth-0">
      <div class="col s12">
         <p class="left" style="margin: unset;">Loaded {{ actuallyLoaded }} {{ actuallyLoaded > 1 || actuallyLoaded === 0 ? 'notes' : 'note' }}</p>
          <span class="material-icons right" style="cursor: pointer; margin-left: 15px;" v-on:click="reloadOnOrderChange">
              low_priority
          </span>
          <p class="right" style="margin:unset">{{ this.order }}</p>
      </div>
    </div>
    <div class="row" id="notes">
      <Preloader message="Now, it is all rolling, please wait!" v-if="!loaded"/>
      <Error v-if="error"/>
      <transition-group name="slide-fade" appear>
        <Note v-for="(note, index) in notes"
              v-bind:key="index"
              v-bind:id="note.id"
              v-bind:name="note.name"
              v-bind:date="note.timestamp"
              v-bind:content="note.content"></Note>
      </transition-group>
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
  mounted: function () {
    this.noteService = new NoteService()
    this.noteService.readData('/notes?order=' + order + "&count=" + count)
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
  data: function () {
    return {
      notes: [],
      order: localStorage.order ?? 0,
      count: localStorage.count ?? count,
      overallCount: localStorage.overallCount,
      loaded: false,
      error: false,
      actuallyLoaded: 0
    }
  },
  methods: {
    reloadOnOrderChange: function () {
     order = (order === 0) ? 1 : 0;
     localStorage.order = order;
      this.noteService.readData('/notes?order=' + order + "&count=" + count)
          .then(data => {
            this.onDataReceived(data);
          })
          .catch(() => {
            this.loaded = true;
          });
    },
    reloadOnCountChange: function (event) {
      localStorage.count = event.target.value

      this.noteService.readData('/notes?order=' + order + "&count=" + event.target.value)
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
      this.actuallyLoaded = this.notes.length;
    }
  }
}
</script>
