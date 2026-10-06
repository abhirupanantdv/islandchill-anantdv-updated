(() => {
  const MES_ROLE = 'IslandChill MES User';
  const ADMIN_ROLE = 'IslandChill Admin User';
  const SWITCH_ID = 'islandchill-mes-switch';
  const DROPDOWN_SWITCH_ID = 'islandchill-mes-dropdown-switch';

  const getRoles = () => {
    if (window.frappe) {
      if (Array.isArray(frappe.user_roles) && frappe.user_roles.length > 0) return frappe.user_roles;
      if (frappe.boot?.user?.roles && Array.isArray(frappe.boot.user.roles)) return frappe.boot.user.roles;
      if (frappe.session?.user === 'Administrator') return ['Administrator', 'System Manager', 'IslandChill MES User', 'IslandChill Admin User'];
      if (frappe.boot?.user?.name === 'Administrator') return ['Administrator', 'System Manager', 'IslandChill MES User', 'IslandChill Admin User'];
    }
    return [];
  };

  const canSwitchToMES = () => {
    const roles = getRoles();
    if (roles.includes('Administrator') || roles.includes('System Manager')) return true;
    return roles.includes(MES_ROLE);
  };

  const installLogoutRedirect = () => {
    if (window.frappe && frappe.app) {
      frappe.app.redirect_to_login = () => {
        window.location.href = '/islandchill';
      };
    }
  };

  const installStyles = () => {
    if (document.getElementById('islandchill-portal-switch-style')) return;
    const style = document.createElement('style');
    style.id = 'islandchill-portal-switch-style';
    style.textContent = `
      #${SWITCH_ID} {
        display: inline-flex !important;
        align-items: center !important;
        margin-right: 12px !important;
        z-index: 1020 !important;
      }
      #${SWITCH_ID} .islandchill-switch-link {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 5px 13px !important;
        border: 1px solid #d97706 !important;
        border-radius: 8px !important;
        color: #b45309 !important;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.18)) !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        text-decoration: none !important;
        white-space: nowrap !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-shadow: 0 1px 3px rgba(217, 119, 6, 0.12) !important;
        cursor: pointer !important;
        line-height: 1.5 !important;
      }
      #${SWITCH_ID} .islandchill-switch-link:hover {
        border-color: #b45309 !important;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.28)) !important;
        color: #92400e !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px -1px rgba(217, 119, 6, 0.2) !important;
      }
      [data-theme="dark"] #${SWITCH_ID} .islandchill-switch-link,
      [data-theme-mode="dark"] #${SWITCH_ID} .islandchill-switch-link {
        border-color: rgba(245, 158, 11, 0.5) !important;
        background: rgba(245, 158, 11, 0.15) !important;
        color: #fbbf24 !important;
      }
    `;
    document.head.appendChild(style);
  };

  const createSwitchElement = () => {
    const item = document.createElement('div');
    item.id = SWITCH_ID;
    item.className = 'islandchill-switch-container';
    item.innerHTML = '<a class="islandchill-switch-link" href="/islandchill?portal=mes" title="Open IslandChill MES">🏭 Switch to IslandChill MES</a>';
    return item;
  };

  const installSwitchButton = () => {
    if (!canSwitchToMES()) return;
    installStyles();

    // Target 1: Desktop page header right-side actions (.desktop-notifications / .desktop-avatar inside .desktop-navbar)
    const desktopTarget = document.querySelector('.desktop-navbar .desktop-notifications, header.desktop-navbar .desktop-notifications, .desktop-navbar .desktop-avatar, header.desktop-navbar .desktop-avatar');
    
    // Target 2: Standard Desk navbar right items (#toolbar-user, .dropdown-navbar-user, .navbar .dropdown-notifications)
    const standardTarget = document.querySelector('#toolbar-user, .dropdown-navbar-user, .navbar .dropdown-notifications, .navbar-nav .dropdown-notifications');

    // Target 3: Generic navbar right flex (.navbar .ml-auto, .navbar-container > .flex, header .flex)
    const rightFlex = document.querySelector('.desktop-navbar > .flex:last-child, header.desktop-navbar > .flex:last-child, .navbar .ml-auto, .navbar-nav.ml-auto');

    let targetElement = null;
    let parentContainer = null;

    if (desktopTarget && desktopTarget.parentNode && !desktopTarget.closest('.desktop-search-wrapper')) {
      targetElement = desktopTarget;
      parentContainer = desktopTarget.parentNode;
    } else if (standardTarget && standardTarget.parentNode) {
      targetElement = standardTarget;
      parentContainer = standardTarget.parentNode;
    } else if (rightFlex) {
      parentContainer = rightFlex;
      targetElement = rightFlex.firstChild;
    }

    if (parentContainer) {
      const existing = document.getElementById(SWITCH_ID);
      if (!existing || !parentContainer.contains(existing)) {
        if (existing && existing.parentNode) {
          existing.parentNode.removeChild(existing);
        }
        const item = createSwitchElement();
        if (targetElement && targetElement !== item) {
          parentContainer.insertBefore(item, targetElement);
        } else {
          parentContainer.appendChild(item);
        }
      }
    }

    // User dropdown menu item
    const userDropdown = document.querySelector('#toolbar-user .dropdown-menu, .dropdown-navbar-user .dropdown-menu, .notifications-list .header-actions');
    if (userDropdown && !document.getElementById(DROPDOWN_SWITCH_ID)) {
      const dropItem = document.createElement('li');
      dropItem.id = DROPDOWN_SWITCH_ID;
      dropItem.innerHTML = '<a class="dropdown-item" href="/islandchill?portal=mes" style="font-weight: 600; color: #b45309;">🏭 Switch to IslandChill MES</a>';
      userDropdown.insertBefore(dropItem, userDropdown.firstChild);
    }
  };

  const hookAboutDialog = () => {
    if (!window.frappe?.ui?.misc) return;
    if (frappe.ui.misc._islandchill_hooked) return;
    frappe.ui.misc._islandchill_hooked = true;

    const originalAbout = frappe.ui.misc.about;
    frappe.ui.misc.about = function () {
      originalAbout.apply(this, arguments);
      setTimeout(() => {
        const dialog = frappe.ui.misc.about_dialog;
        if (!dialog || !dialog.$wrapper) return;
        if (dialog.$wrapper.find('.about-islandchill-card').length) return;

        const switchCard = `
          <div class="about-islandchill-card" style="margin: 14px 0 10px; padding: 12px 14px; border-radius: 8px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.18)); border: 1px solid #d97706; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <div>
              <div style="font-weight: 700; color: #b45309; font-size: 13px;">IslandChill MES Operations</div>
              <div style="font-size: 11px; color: var(--text-muted, #64748b); margin-top: 1px;">Switch directly to the plant execution portal</div>
            </div>
            <a href="/islandchill?portal=mes" class="btn btn-sm" style="font-weight: 700; background: #d97706; color: #ffffff; border: none; border-radius: 6px; padding: 6px 14px; text-decoration: none; white-space: nowrap; box-shadow: 0 1px 3px rgba(217, 119, 6, 0.2);">
              🏭 Open IslandChill MES
            </a>
          </div>
        `;
        const $infoRows = dialog.$wrapper.find('.about-info-rows');
        if ($infoRows.length) {
          $infoRows.after(switchCard);
        } else {
          dialog.$wrapper.find('.about-body').append(switchCard);
        }
      }, 80);
    };
  };

  const setup = () => {
    installLogoutRedirect();
    installSwitchButton();
    hookAboutDialog();
  };

  $(document).on('toolbar_setup page-change route app_ready', setup);
  if (window.frappe && frappe.router) {
    frappe.router.on('change', setup);
  }
  $(setup);

  if (window.MutationObserver) {
    const observer = new MutationObserver(() => {
      const hasHeader = document.querySelector('.desktop-navbar, header.navbar, .navbar, #toolbar-user');
      const hasSwitch = document.getElementById(SWITCH_ID);
      if (hasHeader && (!hasSwitch || !document.body.contains(hasSwitch))) {
        setup();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  setInterval(setup, 1000);
})();
