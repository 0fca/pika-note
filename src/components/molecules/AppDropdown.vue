<template>
  <transition name="dropdown">
    <div
      v-if="showAppMenu"
      ref="dropdown"
      class="app-menu-dropdown"
      role="menu"
      @click.stop
    >
      <div class="app-menu-header">
        <img :src="pikaAppsLogo" alt="Pika Apps" />
      </div>
      <div class="app-menu-items">
        <a
          href="https://cloud.lukas-bownik.net/"
          class="app-menu-item"
          title="Pika Cloudfront"
          role="menuitem"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
          </svg>
          <span>Pika Cloudfront</span>
        </a>
        <a
          href="https://core.lukas-bownik.net/"
          class="app-menu-item"
          title="Pika Core"
          role="menuitem"
        >
         <svg
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <!-- Top server tray -->
  <rect x="3" y="3" width="18" height="5" rx="1" ry="1"></rect>
  <line x1="7" y1="5.5" x2="7" y2="5.5"></line>
  <line x1="11" y1="5.5" x2="11" y2="5.5"></line>

  <!-- Middle server tray -->
  <rect x="3" y="9.5" width="18" height="5" rx="1" ry="1"></rect>
  <line x1="7" y1="12" x2="7" y2="12"></line>
  <line x1="11" y1="12" x2="11" y2="12"></line>

  <!-- Bottom server tray -->
  <rect x="3" y="16" width="18" height="5" rx="1" ry="1"></rect>
  <line x1="7" y1="18.5" x2="7" y2="18.5"></line>
  <line x1="11" y1="18.5" x2="11" y2="18.5"></line>
</svg>

          <span>Pika Core</span>
        </a>
        <a
          href="https://chat.lukas-bownik.net/"
          class="app-menu-item"
          title="Pika Chat"
          role="menuitem"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            ></path>
          </svg>
          <span>Pika Chat</span>
        </a>
        <a
          href="https://cloud.lukas-bownik.net/status"
          class="app-menu-item"
          title="Pika Status"
          role="menuitem"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>Pika Status</span>
        </a>
      </div>
    </div>
  </transition>
</template>

<script>
import pikaAppsLogo from '@/assets/pikacloud_apps.svg';

export default {
  name: 'AppDropdown',
  data() {
    return {
      showAppMenu: false,
      pikaAppsLogo
    };
  },
  methods: {
    toggleMenu() {
      if (this.showAppMenu) {
        this.closeMenu();
      } else {
        this.openMenu();
      }
    },
    openMenu() {
      if (this.showAppMenu) return;
      this.showAppMenu = true;
      this.addListeners();
    },
    closeMenu() {
      if (!this.showAppMenu) return;
      this.showAppMenu = false;
      this.removeListeners();
    },
    handleClickOutside(event) {
      const dropdown = this.$refs.dropdown;
      if (!event || !event.target) return;
      if (dropdown && !dropdown.contains(event.target)) {
        this.closeMenu();
      }
    },
    handleEscape(event) {
      if (event.key === 'Escape') {
        this.closeMenu();
      }
    },
    addListeners() {
      document.addEventListener('click', this.handleClickOutside);
      document.addEventListener('keydown', this.handleEscape);
    },
    removeListeners() {
      document.removeEventListener('click', this.handleClickOutside);
      document.removeEventListener('keydown', this.handleEscape);
    }
  },
  beforeUnmount() {
    this.removeListeners();
  }
};
</script>

<style scoped>
.app-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px #00000026;
  z-index: 1001;
  overflow: hidden;
}

.app-menu-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.app-menu-items {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.app-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #333;
  text-decoration: none;
  transition: background-color 0.2s ease;
  border: none !important;
}

.app-menu-item:hover {
  background: #f5f5f5;
}

.app-menu-item svg {
  stroke: currentColor;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: top right;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
