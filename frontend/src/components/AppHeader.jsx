import React from 'react';
import { frappe } from '../services/frappe';

/**
 * AppHeader Component
 * Top header bar with welcome message, search, notification bell, and live clock.
 */
export default function AppHeader({
  currentUser,
  currentTime,
  searchQuery,
  setSearchQuery,
  showNotifications,
  setShowNotifications,
  lowStockCount,
  inventory,
  tickets,
  setCurrentTab,
  setShowSettingsModal,
  setSettingsUrl,
  setSettingsApiKey,
  setSettingsApiSecret,
  setSyncStatusMsg
}) {
  const handleOpenSettings = () => {
    const conn = frappe.getConnectionSettings();
    setSettingsUrl(conn.url || 'https://demo.erpnext.com');
    setSettingsApiKey(conn.apiKey || '');
    setSettingsApiSecret(conn.apiSecret || '');
    setSyncStatusMsg('');
    setShowSettingsModal(true);
  };

  return (
    <header className="app-header">
      <div className="header-welcome">
        <h1>Welcome back, {currentUser.split(' ')[0]} 👋</h1>
        <p>
          Bottling Shop Floor Status. Mode:{' '}
          <strong style={{ color: frappe.getConnectionSettings().isLive ? 'var(--success)' : 'var(--warning)' }}>
            {frappe.getConnectionSettings().isLive ? 'Live ERPNext' : 'Offline Simulation'}
          </strong>
        </p>
      </div>

      <div className="header-actions">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search work orders, items..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="notification-bell"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            {lowStockCount > 0 && <span className="bell-badge">{lowStockCount}</span>}
          </button>
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>Alerts & Messages</h3>
                <button onClick={() => setShowNotifications(false)}>✕</button>
              </div>
              <div className="notification-body">
                {/* Low Stock Items */}
                {Object.keys(inventory).filter(key => inventory[key].qty < inventory[key].minLevel).length > 0 ? (
                  Object.keys(inventory).filter(key => inventory[key].qty < inventory[key].minLevel).map(key => (
                    <div key={key} className="notification-item warning" onClick={() => { setCurrentTab('inventory'); setShowNotifications(false); }}>
                      <span className="notification-icon">⚠️</span>
                      <div className="notification-info">
                        <div className="notification-title">Low Stock: {inventory[key].name}</div>
                        <div className="notification-text">Current qty is {inventory[key].qty} {inventory[key].unit} (Threshold: {inventory[key].minLevel})</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="notification-item success">
                    <span className="notification-icon">✅</span>
                    <div className="notification-info">
                      <div className="notification-title">Stock Levels Normal</div>
                      <div className="notification-text">No items are running below reorder levels.</div>
                    </div>
                  </div>
                )}
                {/* Recent Support Tickets */}
                {tickets && tickets.slice(0, 2).map(tkt => (
                  <div key={tkt.name} className="notification-item info" onClick={() => { setCurrentTab('support'); setShowNotifications(false); }}>
                    <span className="notification-icon">🎧</span>
                    <div className="notification-info">
                      <div className="notification-title">Support Desk: {tkt.name}</div>
                      <div className="notification-text">{tkt.subject} (Customer: {tkt.customer})</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings button */}
        <button
          className="notification-bell"
          onClick={handleOpenSettings}
          title="ERPNext Connection Settings"
          style={{ fontSize: '16px' }}
        >
          ⚙️
        </button>

        {/* Date/Time Display */}
        <div className="date-selector" title={`Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}>
          <span>📅</span>
          <span>
            {currentTime.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })} {currentTime.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        </div>
      </div>
    </header>
  );
}
