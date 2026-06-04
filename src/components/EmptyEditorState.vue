<template>
  <div class="empty-editor-state">
    <!-- Desktop view -->
    <div v-if="!isTouchScreen" class="empty-desktop">
      <img src="@/assets/pika_note.png" alt="Pika Note mascot" class="mascot-image" />
      <p class="empty-description">To start, click <strong>Create New Note</strong> for a new one, or choose an existing one from the list.</p>
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
}

.mascot-image {
  max-width: 280px;
  width: 100%;
  opacity: 0.9;
}

.empty-description {
  color: #999;
  font-size: var(--font-size-base);
  text-align: center;
  margin: 0;
  max-width: 320px;
  line-height: var(--line-height-relaxed);
  opacity: 0.85;
}

.empty-description strong {
  color: var(--color-primary-soft);
  font-weight: var(--font-weight-medium);
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
