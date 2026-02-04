<template>
  <div class="note-wrapper">
    <!-- Red delete background for swipe (mobile only) -->
    <div class="delete-background">
      <i class="material-icons delete-icon">delete</i>
    </div>
    
    <!-- Note card -->
    <div 
      v-bind:id="id" 
      class="card whitesmoke note-cursor z-depth-0" 
      v-on:click="handleClick"
      v-on:mouseenter="addShadow(id)" 
      v-on:mouseleave="removeShadow(id)"
      v-on:touchstart="handleTouchStart"
      v-on:touchmove="handleTouchMove"
      v-on:touchend="handleTouchEnd"
      :style="{ transform: `translateX(${swipeOffset}px)` }"
    >
      <div class="card-content grey-text text-darken-1">
        <div class="note-title-container">
          <strong class="card-title flow-text note-title">{{ name }}</strong>
          <!-- Desktop delete icon -->
          <i class="material-icons delete-icon-desktop" @click.stop="handleDelete">delete</i>
        </div>
        <span class="right">{{ formatDate(date) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import NoteService from '@/services/noteService';
import MobileDetectService from '@/services/mobileDetectService';

// Swipe gesture constants
const MIN_SWIPE_DISTANCE = 10;
const DELETE_THRESHOLD = 100;
const MAX_SWIPE_OFFSET = 150;
const SWIPE_RESET_DELAY = 300;

// Shared note service instance
let noteService = null;

export default {
  name: "Note",
  props: [
    'id',
    'name',
    'date',
    'content'
  ],
  data() {
    return {
      swipeOffset: 0,
      startX: 0,
      startY: 0,
      isSwiping: false,
      isTouchScreen: MobileDetectService.isTouchScreen()
    };
  },
  created() {
    // Create shared service instance once
    if (!noteService) {
      noteService = new NoteService();
    }
  },
  methods: {
    handleClick() {
      // Only trigger persist if not swiping
      if (!this.isSwiping) {
        this.persist(this.id);
      }
    },
    persist(id) {
      this.$store.commit({type: 'updateId', id: id});
      this.$store.commit({type: 'updateName', name: this.name});
      this.$store.commit({type: 'updateLastSavedAt', lastSavedAt: this.date});
    },
    addShadow(id){
      const card = document.getElementById(id);
      if (card) {
        card.setAttribute("class", card.getAttribute("class").replace('z-depth-0', 'z-depth-2'));
      }
    },
    removeShadow(id){
      const card = document.getElementById(id);
      if (card) {
        card.setAttribute("class", card.getAttribute("class").replace('z-depth-2', 'z-depth-0'));
      }
    },
    formatDate(date){
      const locale = navigator.language.split("-")[0];
      const d = Date.parse(date);
      const ye = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(d)
      const mo = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d)
      const da = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(d)
      const h = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric'}).format(d);
      return `${da} ${mo} ${ye} ${h}`;
    },
    async handleDelete() {
      try {
        await noteService.removeNote(this.id);
        // Emit event to parent to remove note from list
        this.$emit('note-deleted', this.id);
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    },
    handleTouchStart(event) {
      if (!this.isTouchScreen) return;
      
      this.startX = event.touches[0].clientX;
      this.startY = event.touches[0].clientY;
      this.isSwiping = false;
    },
    handleTouchMove(event) {
      if (!this.isTouchScreen) return;
      
      const currentX = event.touches[0].clientX;
      const currentY = event.touches[0].clientY;
      const diffX = currentX - this.startX;
      const diffY = currentY - this.startY;
      
      // Only allow right swipe
      if (diffX > MIN_SWIPE_DISTANCE && Math.abs(diffY) < Math.abs(diffX)) {
        this.isSwiping = true;
        this.swipeOffset = Math.min(diffX, MAX_SWIPE_OFFSET);
        event.preventDefault();
      }
    },
    async handleTouchEnd() {
      if (!this.isTouchScreen) return;
      
      // If swiped more than threshold, delete the note
      if (this.swipeOffset > DELETE_THRESHOLD) {
        await this.handleDelete();
      }
      
      // Reset swipe
      this.swipeOffset = 0;
      setTimeout(() => {
        this.isSwiping = false;
      }, SWIPE_RESET_DELAY);
    }
  }
}
</script>

<style scoped>
.note-wrapper {
  position: relative;
  margin-bottom: 12px;
}

.delete-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ff6b6b;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 20px;
  border-radius: var(--radius-lg);
  z-index: 0;
}

.delete-background .delete-icon {
  color: white;
  font-size: 32px;
}

.card {
  position: relative;
  z-index: 1;
  margin-bottom: 0 !important;
}

.note-cursor {
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow var(--transition-base);
  touch-action: pan-y;
}

.card-content {
  color: var(--color-text) !important;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px !important;
}

.note-title-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  color: var(--color-heading) !important;
  margin: 0 !important;
  line-height: 1.3;
  flex: 1;
}

.delete-icon-desktop {
  background: transparent;
  color: #999;
  cursor: pointer;
  transition: color 0.2s ease;
  font-size: 20px;
  padding: 4px;
  border-radius: 4px;
  display: none;
}

.delete-icon-desktop:hover {
  color: #ff6b6b;
}

/* Show delete icon on desktop only */
@media (min-width: 769px) {
  .delete-icon-desktop {
    display: block;
  }
}

.right {
  align-self: flex-start;
  font-size: 0.9em;
  color: var(--color-text-secondary, #666);
  margin-top: 4px;
}

.grey-text {
  color: var(--color-text) !important;
}

/* Mobile-specific fixes */
@media (max-width: 768px) {
  .card-content {
    padding: 12px !important;
  }
  
  .right {
    font-size: 0.85em;
  }
  
  /* Hide desktop delete icon on mobile */
  .delete-icon-desktop {
    display: none !important;
  }
}
</style>
