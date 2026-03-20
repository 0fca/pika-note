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
        <img src="/pika-logos/pikacloud_apps.svg" alt="Pika Apps" />
      </div>
      <div class="app-menu-items">
        <a
          href="https://cloud.lukas-bownik.net/"
          class="app-menu-item"
          title="Pika Cloudfront"
          role="menuitem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="5" rx="1" ry="1"></rect>
            <line x1="7" y1="5.5" x2="7" y2="5.5"></line>
            <line x1="11" y1="5.5" x2="11" y2="5.5"></line>
            <rect x="3" y="9.5" width="18" height="5" rx="1" ry="1"></rect>
            <line x1="7" y1="12" x2="7" y2="12"></line>
            <line x1="11" y1="12" x2="11" y2="12"></line>
            <rect x="3" y="16" width="18" height="5" rx="1" ry="1"></rect>
            <line x1="7" y1="18.5" x2="7" y2="18.5"></line>
            <line x1="11" y1="18.5" x2="11" y2="18.5"></line>
          </svg>
          <span>Pika Core</span>
        </a>
        <a
          href="https://ai.lukas-bownik.net/"
          class="app-menu-item"
          title="Pika AI Assistant"
          role="menuitem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
          </svg>
          <span>Pika AI Assistant</span>
        </a>
        <a
          href="https://note.lukas-bownik.net/"
          class="app-menu-item"
          title="Pika Note"
          role="menuitem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
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
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>Pika Status</span>
        </a>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'AppMenuDropdown',
  data() {
    return {
      showAppMenu: false,
    }
  },
  methods: {
    toggleMenu() {
      if (this.showAppMenu) {
        this.closeMenu()
      } else {
        this.openMenu()
      }
    },
    openMenu() {
      if (this.showAppMenu) return
      this.showAppMenu = true
      this.addListeners()
    },
    closeMenu() {
      if (!this.showAppMenu) return
      this.showAppMenu = false
      this.removeListeners()
    },
    handleClickOutside(event) {
      const dropdown = this.$refs.dropdown
      if (!event || !event.target) return
      if (dropdown && !dropdown.contains(event.target)) {
        this.closeMenu()
      }
    },
    handleEscape(event) {
      if (event.key === 'Escape') {
        this.closeMenu()
      }
    },
    addListeners() {
      document.addEventListener('click', this.handleClickOutside)
      document.addEventListener('keydown', this.handleEscape)
    },
    removeListeners() {
      document.removeEventListener('click', this.handleClickOutside)
      document.removeEventListener('keydown', this.handleEscape)
    },
  },
  beforeUnmount() {
    this.removeListeners()
  },
}
</script>

<style scoped>
.app-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  overflow: hidden;
}

.app-menu-header {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
}

.app-menu-header img {
  height: 40px;
}

.app-menu-items {
  padding: 8px 0;
}

.app-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #424242;
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
}

.app-menu-item:hover {
  background: #f5f5f5;
  color: #0a4492;
}

.app-menu-item svg {
  color: #0a4492;
  flex-shrink: 0;
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

@media (prefers-color-scheme: dark) {
  .app-menu-dropdown {
    background: #1e1e1e;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .app-menu-header {
    border-bottom-color: #333;
  }

  .app-menu-item {
    color: #e0e0e0;
  }

  .app-menu-item:hover {
    background: #2a2a2a;
    color: #6ba3ff;
  }

  .app-menu-item svg {
    color: #6ba3ff;
  }
}
</style>
