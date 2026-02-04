<template>
  <transition name="discovery-fade">
    <div v-if="currentDiscovery" class="feature-discovery-container">
      <!-- Full screen overlay/backdrop -->
      <div class="feature-discovery-backdrop" @click="handleDismiss"></div>
      
      <!-- Spotlight effect on target element -->
      <div 
        v-if="targetRect" 
        class="feature-discovery-spotlight"
        :style="spotlightStyle"
      ></div>
      
      <!-- Discovery popup -->
      <div 
        v-if="targetRect"
        class="feature-discovery-popup"
        :style="popupStyle"
      >
        <div class="popup-content">
          <h5 class="popup-title">{{ currentDiscovery.title }}</h5>
          <p class="popup-description">{{ currentDiscovery.description }}</p>
          
          <div class="popup-actions">
            <button 
              class="btn-flat discovery-btn dismiss-btn" 
              @click="handleDismiss"
            >
              Dismiss All
            </button>
            <button 
              class="btn discovery-btn next-btn" 
              @click="handleNext"
            >
              {{ isLastDiscovery ? 'Got it!' : 'Next' }}
            </button>
          </div>
          
          <div class="popup-progress" v-if="discoveryQueue.length > 1">
            <span class="progress-text">
              {{ currentIndex + 1 }} of {{ discoveryQueue.length }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'FeatureDiscovery',
  props: {
    discoveries: {
      type: Array,
      required: true,
      // Each discovery object should have:
      // - id: unique identifier and localStorage key
      // - targetSelector: CSS selector for the target element
      // - title: popup title
      // - description: popup description
      // - position: 'top', 'bottom', 'left', 'right' (preferred position relative to target)
    }
  },
  data() {
    return {
      currentIndex: 0,
      targetRect: null,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      popupOffset: 20, // Distance from target element
      updateRectInterval: null
    };
  },
  computed: {
    discoveryQueue() {
      // Filter discoveries that haven't been shown yet
      return this.discoveries.filter(d => !localStorage.getItem(d.id));
    },
    currentDiscovery() {
      return this.discoveryQueue[this.currentIndex] || null;
    },
    isLastDiscovery() {
      return this.currentIndex === this.discoveryQueue.length - 1;
    },
    spotlightStyle() {
      if (!this.targetRect) return {};
      
      const padding = 8; // Padding around the target element
      return {
        top: `${this.targetRect.top - padding}px`,
        left: `${this.targetRect.left - padding}px`,
        width: `${this.targetRect.width + padding * 2}px`,
        height: `${this.targetRect.height + padding * 2}px`,
      };
    },
    popupStyle() {
      if (!this.targetRect || !this.currentDiscovery) return {};
      
      const position = this.currentDiscovery.position || 'bottom';
      const popupWidth = 320;
      const popupMaxHeight = 300;
      
      let top = 0;
      let left = 0;
      
      // Calculate position based on preferred position and available space
      switch (position) {
        case 'bottom':
          top = this.targetRect.bottom + this.popupOffset;
          left = this.targetRect.left + this.targetRect.width / 2 - popupWidth / 2;
          
          // Adjust if popup goes off screen
          if (top + popupMaxHeight > this.windowHeight) {
            // Show above instead
            top = this.targetRect.top - popupMaxHeight - this.popupOffset;
          }
          break;
          
        case 'top':
          top = this.targetRect.top - popupMaxHeight - this.popupOffset;
          left = this.targetRect.left + this.targetRect.width / 2 - popupWidth / 2;
          
          // Adjust if popup goes off screen
          if (top < 0) {
            // Show below instead
            top = this.targetRect.bottom + this.popupOffset;
          }
          break;
          
        case 'right':
          top = this.targetRect.top + this.targetRect.height / 2 - popupMaxHeight / 2;
          left = this.targetRect.right + this.popupOffset;
          
          // Adjust if popup goes off screen
          if (left + popupWidth > this.windowWidth) {
            // Show on left instead
            left = this.targetRect.left - popupWidth - this.popupOffset;
          }
          break;
          
        case 'left':
          top = this.targetRect.top + this.targetRect.height / 2 - popupMaxHeight / 2;
          left = this.targetRect.left - popupWidth - this.popupOffset;
          
          // Adjust if popup goes off screen
          if (left < 0) {
            // Show on right instead
            left = this.targetRect.right + this.popupOffset;
          }
          break;
      }
      
      // Ensure popup stays within viewport bounds
      if (left < 10) left = 10;
      if (left + popupWidth > this.windowWidth - 10) {
        left = this.windowWidth - popupWidth - 10;
      }
      if (top < 10) top = 10;
      
      return {
        top: `${top}px`,
        left: `${left}px`,
        maxWidth: `${popupWidth}px`
      };
    }
  },
  methods: {
    updateTargetRect() {
      if (!this.currentDiscovery) {
        this.targetRect = null;
        return;
      }
      
      const target = document.querySelector(this.currentDiscovery.targetSelector);
      if (target) {
        this.targetRect = target.getBoundingClientRect();
      } else {
        this.targetRect = null;
      }
    },
    handleNext() {
      if (this.currentDiscovery) {
        // Mark current discovery as seen
        localStorage.setItem(this.currentDiscovery.id, '1');
      }
      
      if (this.isLastDiscovery) {
        // Close the discovery
        this.$emit('complete');
      } else {
        // Move to next discovery
        this.currentIndex++;
        this.$nextTick(() => {
          this.updateTargetRect();
        });
      }
    },
    handleDismiss() {
      // Mark all discoveries as seen
      this.discoveries.forEach(discovery => {
        localStorage.setItem(discovery.id, '1');
      });
      
      this.$emit('dismiss');
    },
    handleResize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
      this.updateTargetRect();
    }
  },
  mounted() {
    if (this.currentDiscovery) {
      this.updateTargetRect();
      
      // Update target rect periodically in case the element moves
      this.updateRectInterval = setInterval(() => {
        this.updateTargetRect();
      }, 100);
      
      // Update on window resize
      window.addEventListener('resize', this.handleResize);
    }
  },
  beforeUnmount() {
    if (this.updateRectInterval) {
      clearInterval(this.updateRectInterval);
    }
    window.removeEventListener('resize', this.handleResize);
  },
  watch: {
    currentDiscovery() {
      if (this.currentDiscovery) {
        this.updateTargetRect();
      }
    }
  }
};
</script>

<style scoped>
/* Full screen container */
.feature-discovery-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

/* Backdrop overlay - semi-transparent dark overlay */
.feature-discovery-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  pointer-events: auto;
  cursor: pointer;
}

/* Spotlight effect - highlights the target element */
.feature-discovery-spotlight {
  position: absolute;
  border-radius: 8px;
  box-shadow: 
    0 0 0 4px rgba(255, 255, 255, 0.3),
    0 0 0 9999px rgba(0, 0, 0, 0.7);
  pointer-events: none;
  transition: all 0.3s ease;
  z-index: 10000;
}

/* Discovery popup */
.feature-discovery-popup {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  pointer-events: auto;
  z-index: 10001;
  animation: popupSlideIn 0.3s ease;
}

@keyframes popupSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.popup-content {
  padding: 24px;
}

.popup-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.popup-description {
  margin: 0 0 20px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #666;
}

.popup-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  align-items: center;
}

.discovery-btn {
  font-size: 14px;
  text-transform: none;
  border-radius: 4px;
  padding: 0 16px;
  height: 36px;
  line-height: 36px;
}

.dismiss-btn {
  color: #666;
}

.dismiss-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.next-btn {
  background-color: #1976d2;
  color: white;
}

.next-btn:hover {
  background-color: #1565c0;
}

.popup-progress {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  text-align: center;
}

.progress-text {
  font-size: 12px;
  color: #999;
}

/* Fade transition for the entire discovery */
.discovery-fade-enter-active,
.discovery-fade-leave-active {
  transition: opacity 0.3s ease;
}

.discovery-fade-enter-from,
.discovery-fade-leave-to {
  opacity: 0;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .feature-discovery-popup {
    background: #2c2c2c;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
  
  .popup-title {
    color: #f0f0f0;
  }
  
  .popup-description {
    color: #b0b0b0;
  }
  
  .dismiss-btn {
    color: #b0b0b0;
  }
  
  .dismiss-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .popup-progress {
    border-top-color: #444;
  }
  
  .progress-text {
    color: #888;
  }
}

/* Responsive design for small screens */
@media (max-width: 600px) {
  .feature-discovery-popup {
    position: fixed !important;
    bottom: 20px !important;
    left: 20px !important;
    right: 20px !important;
    top: auto !important;
    max-width: none !important;
  }
  
  .popup-content {
    padding: 20px;
  }
  
  .popup-title {
    font-size: 18px;
  }
  
  .popup-description {
    font-size: 13px;
  }
}
</style>
