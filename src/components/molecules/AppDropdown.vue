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
          href="https://note.lukas-bownik.net/"
          class="app-menu-item"
          title="Pika Note"
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
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            ></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>Pika Note</span>
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
  position: fixed;
  top: 72px;
  right: 16px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg, 0 10px 40px rgba(0, 0, 0, 0.18));
  width: 280px;
  z-index: 2000;
  padding: 12px 12px 8px;
  border-radius: 8px;
}

.app-menu-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.app-menu-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--color-text);
  text-decoration: none;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  border: none;
  border-bottom: none;
}

.app-menu-item:hover {
  background: var(--color-background-mute, rgba(0, 0, 0, 0.04));
  color: var(--color-primary);
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
