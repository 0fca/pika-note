<template>
  <div class="container">
    <div class="row card-panel filter-bar z-depth-0">
      <div class="col s12 m10 l6">
          <Select dropdownText="Choose bucket" :entries="buckets" :onchange="onBucketSelectChange"  v-if="this.$store.getters.loggedIn === true"/>
      </div>
      <div class="col s12 m2 l6">
        <div class="right"> 
            <div class="row">
            <div class="col s8 m6 l8">
              <NoteCountDropdown @count-changed="reloadOnCountChange" v-bind:loadedCount="getActuallyLoaded"></NoteCountDropdown>
            </div>
            <div class="col s4 m4 l2" style="display: flex; gap: 4px; align-items: center;">
              <OrderSwitch @order-change="reloadOnOrderChange"/>
              <button class="btn overlay-button" style="background-color: var(--color-primary) !important; color: white !important; min-width: 36px; padding: 0 8px;" @click="showSearchOverlay = true">
                <span class="material-symbols-outlined">search</span>
              </button>
            </div>
            </div>
          </div>
      </div>
    </div>
    <div class="row" id="notes">
      <Error v-if="error"/>
      <Info v-if="bucketId === '' && this.$store.getters.loggedIn === true" message="You should use a dropdown on the left to choose a bucket"/>
      <transition-group name="slide-fade" appear v-if="this.$store.getters.loggedIn && notes.length > 0 && !error">
        <Note v-for="(note, index) in notes"
              v-bind:key="index"
              v-bind:id="note.id"
              v-bind:name="note.humanName"
              v-bind:date="note.timestamp"
              @note-deleted="handleNoteDeleted">
        </Note>
      </transition-group>
      <Info v-if="notes.length == 0 && loaded && !error && loggedIn && this.bucketId !== ''" message="This bucket appears to be empty"/>
    </div>
    <SearchOverlay
      :visible="showSearchOverlay"
      :bucketId="bucketId"
      @close="showSearchOverlay = false"
      @note-selected="onSearchNoteSelected"
    />
    <div class="fixed-action-btn" v-if="this.$store.getters.loggedIn === true">
      <router-link to="editor">
        <a class="btn-floating btn-large floating-btn-orange"><span class="material-symbols-outlined">add</span></a>
      </router-link>
    </div>
  </div>
</template>

<script>
import Note from '@/components/Note';
import Preloader from "@/components/Preloader";
import Error from "@/components/Error";
import Info from "@/components/Info";
import NoteService from "@/services/noteService";
import Select from './molecules/Select.vue';
import NoteCountDropdown from './molecules/NoteCountDropdown.vue';
import OrderSwitch from './molecules/OrderSwitch.vue';
import SearchOverlay from './molecules/SearchOverlay.vue';
import { toastService } from '@/services/toastService';

let count = localStorage.count ?? 10;

export default {
  name: 'MainPage',
  components: {
    Error,
    Note,
    Preloader,
    Select,
    Info,
    NoteCountDropdown,
    OrderSwitch,
    SearchOverlay
  },
  computed: {
    order: {
      get() {
        return this.$store.getters.order;
      },
      set(order){
        this.$store.commit({type: 'updateOrder', order: order});
      }
    },
    count: {
      get() {
        return this.$store.getters.noteCount;
      },
      set(count) {
        this.$store.commit({type: 'updateNoteCount', noteCount: count});
      }
    },
    loggedIn: {
      get() {
        return this.$store.getters.loggedIn;
      },
      set(loggedIn)
      {
        this.$store.commit({type: 'updateLoggedInState', loggedIn: loggedIn});
      },
    },
    getActuallyLoaded()
    {
      return this.actuallyLoaded;
    }
  },
  mounted: function () {
    this.loggedIn = this.$store.getters.loggedIn;
    let order = this.$store.getters.order;
    if(this.$store.getters.bucketUuid !== ""){
      this.bucketId = this.$store.getters.bucketUuid;
    }
    this.noteService = new NoteService();
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
    this.$store.commit({type: 'updateId', id: ''});
  },

  data: function () {
    return {
      notes: [],
      buckets: [],
      bucketId: "",
      orderString: "ASC",
      overallCount: localStorage.overallCount,
      loaded: false,
      error: false,
      actuallyLoaded: 0,
      showSearchOverlay: false
    }
  },
  methods: {
    reloadOnOrderChange: function () {
      this.notes = [];
      this.loaded = false;
      let order = this.$store.getters.order;
      let count = this.$store.getters.noteCount;
      if(order == 0){
        localStorage.setItem('order', 1);
        this.$store.commit({type: 'updateOrder', order: 1});
        order = 1;
      } else if(order == 1) {
        localStorage.setItem('order', 0);
        this.$store.commit({type: 'updateOrder', order: 0});
        order = 0;
      }
      this.noteService.readData('/notes?order=' + order + "&pageSize=" + count + "&bucketId=" + this.bucketId)
          .then(data => {
            this.onDataReceived(data);
          })
          .catch(() => {
            this.loaded = true;
            this.error = true;
          });
    },
    reloadOnCountChange: function () {
      this.notes = [];
      this.loaded = false;
      let order = this.$store.getters.order;
      let count = this.$store.getters.noteCount;
      localStorage.setItem("count", this.$store.getters.noteCount);
      this.noteService.readData('/notes?order=' + order + "&pageSize=" + count + "&bucketId=" + this.bucketId)
          .then(data => {
            this.onDataReceived(data);
          })
          .catch(() => {
            this.loaded = true;
            this.error = true;
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
      let order = this.$store.getters.order;
      this.noteService.readData('/notes?order=' + order + "&pageSize=" + count + "&bucketId="+this.bucketId)
        .then(data => {
          this.onDataReceived(data);
          this.error = false;
        })
        .catch(() => {
          console.log("Error");
          this.error = true;
          this.loaded = true;
        });
    },
    handleNoteDeleted: function(noteId) {
      // Immediately remove from UI
      this.notes = this.notes.filter(note => note.id !== noteId);
      this.actuallyLoaded = this.notes.length;
      // Fire delete in background
      this.noteService.removeNote(noteId)
        .then(response => {
          if (response.ok) {
            toastService.success('Note deleted successfully');
          } else {
            toastService.error('Failed to delete note');
          }
        })
        .catch(() => {
          toastService.error('Error deleting note');
        });
    },
    onSearchNoteSelected: function(note) {
      this.$store.commit({type: 'updateId', id: note.id});
      this.$store.commit({type: 'updateName', name: note.humanName});
      this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: note.timestamp});
    }
  }
}
</script>
