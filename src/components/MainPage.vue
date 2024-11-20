<template>
  <div class="container">
    <div class="row card-panel filter-bar z-depth-0">
      <div class="col s12">
          <div class="left">
            <Select dropdownText="Choose bucket" :entries="buckets" :onchange="onBucketSelectChange"  v-if="this.$store.getters.loggedIn === true"/>
          </div>
          <input class="right text-black" style="cursor: pointer; margin-left: 15px; width: 4em;"  :value="this.$store.getters.noteCount" type="number" min="10" max="250" v-on:change="reloadOnCountChange" />
          <span class="material-icons right" style="cursor: pointer; margin-left: 15px; margin-top: 10px;" v-on:click="reloadOnOrderChange">
              reorder
          </span>
          <p class="right" style="margin-left: 10px;">{{ this.$store.getters.order == 1 ? "ASC" : "DESC" }}</p>
          <div class="right"> 
            <p>Loaded {{ actuallyLoaded }} {{ actuallyLoaded > 1 || actuallyLoaded === 0 ? 'notes' : 'note' }}</p>
          </div>
      </div>
    </div>
    <div class="row" id="notes">
      <Preloader message="Now, it is all rolling, please wait!" v-if="!loaded && isLoggedIn"/>
      <Error v-if="error"/>
      <Info v-if="bucketId === '' && this.$store.getters.loggedIn === true" message="You should use a dropdown above to choose a bucket"/>
      <Info v-if="this.$store.getters.loggedIn === false" message="To view or create notes you have to log in first. To do so, click a button in the right upper corner."/>
      <transition-group name="slide-fade" appear>
        <Note v-for="(note, index) in notes"
              v-bind:key="index"
              v-bind:id="note.id"
              v-bind:name="note.humanName"
              v-bind:date="note.timestamp"
              v-bind:content="note.content"></Note>
      </transition-group>
    </div>
    <div class="fixed-action-btn" v-if="this.$store.getters.loggedIn === true">
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
import Info from "@/components/Info";
import NoteService from "@/services/noteService";
import Select from './molecules/Select.vue';

let order = localStorage.order;
let count = localStorage.count ?? 10;

export default {
  name: 'MainPage',
  components: {
    Error,
    Note,
    Preloader,
    Select,
    Info
  },
  mounted: function () {
    this.loggedIn = this.$store.getters.loggedIn;
    if(this.$store.getters.bucketUuid !== ""){
      this.bucketId = this.$store.getters.bucketUuid;
    }
    this.noteService = new NoteService()
    this.noteService.readData('/notes?order=' + order + "&pageSize=" + count + "&bucketId=" + this.bucketId)
        .then(data => {
          this.onDataReceived(data);
        })
        .catch(() => {
          this.error = this.bucketId !== "" && this.$store.getters.loggedIn === true;
          this.loaded = true;
        });
    this.noteService.getBuckets()
      .then(buckets => {
        this.onBucketsReceived(buckets);
      });
    let elems = document.querySelectorAll('select');
    this.$store.commit({type: 'updateId', id: ''});
    M.FormSelect.init(elems, null);
  },

  data: function () {
    return {
      notes: [],
      buckets: [],
      bucketId: "",
      order:  this.$store.getters.order ?? localStorage.order,
      count: this.$store.getters.count ?? localStorage.count,
      orderString: "ASC",
      overallCount: localStorage.overallCount,
      loaded: false,
      error: false,
      actuallyLoaded: 0,
      isLoggedIn: this.$store.getters.isLoggedIn
    }
  },
  methods: {
    reloadOnOrderChange: function () {
     order = (order === 0) ? 1 : 0;
     this.$store.commit('updateOrder', {order: order});
     localStorage.order = order;
      this.noteService.readData('/notes?order=' + order + "&pageSize=" + count + "&bucketId=" + this.bucketId)
          .then(data => {
            this.onDataReceived(data);
          })
          .catch(() => {
            this.loaded = true;
          });
    },
    reloadOnCountChange: function (event) {
      localStorage.count = event.target.value
      if(event.target.value === ""){
        localStorage.count = "10";
      }
      this.$store.commit('updateNoteCount', {noteCount: localStorage.count});

      this.noteService.readData('/notes?order=' + order + "&pageSize=" + localStorage.count + "&bucketId=" + this.bucketId)
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
    },
    onBucketsReceived: function(buckets) {
      buckets.json()
        .then(bucketsPayload => {
          if(bucketsPayload.success === true){
            for(let i in bucketsPayload.payload){
              this.buckets.push({
                id: bucketsPayload.payload[i].bucketId,
                text: bucketsPayload.payload[i].bucketName
              });
            }
          }
        });
    },
    onBucketSelectChange: function(e){
      const select = e.target;
      const bucketName = select.options[select.selectedIndex].text;
      const bucketUuid = select.value;
      this.bucketId = bucketUuid;
      this.$store.commit({type: 'updateCurrentBucket', bucketName: bucketName, bucketUuid: bucketUuid});
      localStorage.setItem('bucketName', bucketName);
      localStorage.setItem('bucketUuid', bucketUuid);
      this.noteService.readData('/notes?order=' + order + "&pageSize=" + count + "&bucketId="+this.bucketId)
        .then(data => {
          this.onDataReceived(data);
          this.error = false;
        })
        .catch(() => {
          this.error = true;
          this.loaded = true;
        });
    }
  }
}
</script>
