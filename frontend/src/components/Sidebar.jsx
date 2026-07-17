import React from 'react';
import logo from '../../public/logo.png';
import { frappe } from '../services/frappe';

/**
 * Sidebar Component
 * Navigation sidebar with brand header, nav items, and user profile footer.
 * All navigation state lives in App.jsx and is passed as props.
 */
export default function Sidebar({
  currentTab,
  setCurrentTab,
  currentUser,
  currentUserRole,
  mobileMenuOpen,
  setMobileMenuOpen,
  handleLogout,
  setSelectedWOId
}) {
  const navItems = [
    { id: 'workflow', label: '🔄 Business Workflow' },
    { id: 'dashboard', label: '📊 Dashboard', resetSelectedWO: true },
    { id: 'work-orders', label: '📋 Work Orders' },
    { id: 'inventory', label: '📦 Stock / Inventory' },
    { id: 'sales', label: '💰 Sales Desk' },
    { id: 'bom', label: '🧪 BOM Recipes' },
    { id: 'maintenance', label: '🔧 Maintenance' },
    { id: 'safety', label: '🦺 Health & Safety' },
    { id: 'laboratory', label: '🔬 Laboratory' },
    { id: 'cleaning', label: '🧹 Cleaning & Sanitation' },
    { id: 'support', label: '🎧 Support Helpdesk' },
    { id: 'hr', label: '👥 Human Resource' },
  ];

  return (
    <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div>
        <div className="sidebar-brand" style={{ gap: '8px', paddingBottom: '16px' }}>
          <img src={logo} alt="Island Chill Logo" style={{ height: '40px', width: 'auto' }} />
          <div>
            <div className="brand-text">Island Chill</div>
            <div className="brand-subtext">Carpenters Water Fiji</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentTab(item.id);
                setMobileMenuOpen(false);
                // Reset selected WO when navigating to Dashboard
                if (item.id === 'dashboard' && setSelectedWOId) {
                  setSelectedWOId(null);
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className="status-indicator">
            <span className="status-dot pulse"></span>
            <span>All Systems Operational</span>
          </div>
          <div className="status-chart">
            <div className="status-chart-bar" style={{ height: '40%' }}></div>
            <div className="status-chart-bar" style={{ height: '60%' }}></div>
            <div className="status-chart-bar" style={{ height: '55%' }}></div>
            <div className="status-chart-bar" style={{ height: '70%' }}></div>
            <div className="status-chart-bar" style={{ height: '90%' }}></div>
            <div className="status-chart-bar" style={{ height: '80%' }}></div>
            <div className="status-chart-bar" style={{ height: '85%' }}></div>
          </div>
        </div>

        <div className="user-profile" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar">{currentUser.substring(0, 2).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{currentUser}</span>
              <span className="user-role">{currentUserRole}</span>
            </div>
          </div>
          <button onClick={handleLogout} style={{ color: '#ef4444', fontSize: '14px', padding: '4px' }} title="Log Out">
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}
