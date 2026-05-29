<template>
  <div class="empty-editor-state">
    <!-- Desktop view -->
    <div v-if="!isTouchScreen" class="empty-desktop">
      <div class="empty-left">
        <svg class="arrow-svg" width="120" height="180" viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Curved arrow pointing up-left toward the "Create New Note" card in sidebar -->
          <path 
            d="M100 170 C90 120, 80 80, 30 20" 
            stroke="#5379ba" 
            stroke-width="3" 
            stroke-linecap="round"
            fill="none"
          />
          <path 
            d="M100 170 C90 120, 80 80, 30 20" 
            stroke="#e8eef7" 
            stroke-width="6" 
            stroke-linecap="round"
            fill="none"
            opacity="0.4"
          />
          <path 
            d="M100 170 C90 120, 80 80, 30 20" 
            stroke="#5379ba" 
            stroke-width="2.5" 
            stroke-linecap="round"
            fill="none"
          />
          <!-- Arrowhead -->
          <polygon points="22,28 38,10 40,34" fill="#5379ba" stroke="#e8eef7" stroke-width="1"/>
        </svg>
        <span class="arrow-label">Create a new note</span>
      </div>
      <div class="empty-right">
        <img src="@/assets/pika_note.png" alt="Pika Note mascot" class="mascot-image" />
      </div>
    </div>
    <!-- Mobile view -->
    <div v-else class="empty-mobile">
      <span class="material-symbols-outlined empty-mobile-icon">edit_note</span>
      <p class="empty-mobile-text">Tap a note from the menu or create a new one</p>
    </div>
  </div>
</template>

<script>
import MobileDetectService from '@/services/mobileDetectService';

export default {
  name: 'EmptyEditorState',
  data() {
    return {
      isTouchScreen: MobileDetectService.isTouchScreen()
    }
  }
}
</script>

<style scoped>
.empty-editor-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 60vh;
  user-select: none;
}

/* Desktop layout */
.empty-desktop {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3rem;
  width: 100%;
  max-width: 700px;
}

.empty-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.arrow-svg {
  transform: rotate(-15deg);
  opacity: 0.85;
}

.arrow-label {
  color: var(--color-primary-soft);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.3px;
  opacity: 0.8;
}

.empty-right {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mascot-image {
  max-width: 220px;
  width: 100%;
  opacity: 0.9;
}

/* Mobile layout */
.empty-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
}

.empty-mobile-icon {
  font-size: 64px;
  color: #b0b0b0;
}

.empty-mobile-text {
  color: #999;
  font-size: var(--font-size-base);
  text-align: center;
  margin: 0;
  max-width: 240px;
  line-height: var(--line-height-relaxed);
}
</style>
