import React from 'react';
import line1 from '../../public/line1.png';
import line2 from '../../public/line2.png';

/**
 * DashboardTab Component
 * Main dashboard KPI cards, live line feeds, OEE gauges, and WO monitor table.
 * All state and computed values are passed as props from App.jsx.
 */
export default function DashboardTab({
  workOrders,
  inventory,
  activeWOsCount,
  pendingWOsCount,
  inProgressJobCardsCount,
  lowStockCount,
  totalProduction,
  goodProduction,
  looseProduction,
  woMonitorPage,
  setWoMonitorPage,
  setCurrentTab,
  setSelectedWOId,
  setFullscreenElement,
  WORK_ORDER_ACTIVE_STATUSES
}) {
  return (
    <div className="dashboard-content">
      {/* KPI Flow Cards */}
      <div className="flow-container">
        <div className="flow-card blue" onClick={() => setCurrentTab('work-orders')}>
          <div className="flow-icon-container">📝</div>
          <div className="flow-details">
            <h3>Work Orders</h3>
            <div className="flow-value">{workOrders.length}</div>
            <div className="flow-status text-muted">
              <span style={{ color: 'var(--info)' }}>●</span> {activeWOsCount} Active | {pendingWOsCount} Scheduled
            </div>
          </div>
        </div>

        <div className="flow-arrow">➔</div>

        <div className="flow-card" onClick={() => setCurrentTab('work-orders')}>
          <div className="flow-icon-container">⚙️</div>
          <div className="flow-details">
            <h3>Job Cards</h3>
            <div className="flow-value">{inProgressJobCardsCount}</div>
            <div className="flow-status text-muted">
              <span style={{ color: 'var(--warning)' }}>●</span> {inProgressJobCardsCount} In Process
            </div>
          </div>
        </div>

        <div className="flow-arrow">➔</div>

        <div className="flow-card green" onClick={() => setCurrentTab('inventory')}>
          <div className="flow-icon-container">📦</div>
          <div className="flow-details">
            <h3>Stock Alerts</h3>
            <div className="flow-value" style={{ color: lowStockCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {lowStockCount} Low Items
            </div>
            <div className="flow-status text-muted">
              <span>●</span> {Object.keys(inventory).length} total items
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-row">
        <div className="metric-widget">
          <div className="metric-widget-header">
            <span>Total Production</span>
            <span className="icon">🏆</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-val">{Number(totalProduction).toFixed(2)} Box</span>
            <span className="metric-change up">▲ 2.4%</span>
          </div>
        </div>

        <div className="metric-widget">
          <div className="metric-widget-header">
            <span>Good Qty</span>
            <span className="icon">✓</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-val">{goodProduction.toFixed(2)} Box</span>
            <span className="metric-change up">▲ 9.8%</span>
          </div>
        </div>

        <div className="metric-widget">
          <div className="metric-widget-header">
            <span>Loose Qty</span>
            <span className="icon">⚠</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-val">{looseProduction.toFixed(2)} Box</span>
            <span className="metric-change down">▼ 4.3%</span>
          </div>
        </div>

        <div className="metric-widget">
          <div className="metric-widget-header">
            <span>Safety Alerts</span>
            <span className="icon">🚨</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-val">{Number(lowStockCount).toFixed(2)} Items</span>
            <span className="metric-change down" style={{ color: 'var(--danger)' }}>Critical</span>
          </div>
        </div>
      </div>

      {/* Live Line Feeds */}
      <div className="live-lines-section">
        <div className="line-card">
          <div className="line-video-container" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img src={line1} alt="Filling Line 1" className="line-placeholder-img" style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }} />
              <div className="feed-noise" />
              <div className="feed-hud">
                <div className="hud-box" style={{ top: '25%', left: '30%', width: '45px', height: '45px' }}>
                  <span className="hud-label">BOT-041: 99.8%</span>
                </div>
                <div className="hud-box" style={{ top: '45%', left: '55%', width: '45px', height: '45px' }}>
                  <span className="hud-label">BOT-042: 100.0%</span>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', fontSize: '9px', fontFamily: 'monospace', color: '#00ff00', textShadow: '0 0 4px #00ff00', fontWeight: '600' }}>
                  FPS: 29.97 • RES: 1080P • AI VISION ACTIVE
                </div>
              </div>
            </div>
            <button className="fullscreen-btn" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '4px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }} onClick={() => setFullscreenElement('live1')} title="Fullscreen Feed">⛶</button>
            <div className="live-badge"><span className="live-dot"></span><span>LIVE</span></div>
            <div className="line-info-overlay">
              <h3 className="line-title">Filling Line 1 (Water Bottling)</h3>
              <div className="line-status-text"><span className="line-status-indicator"></span> Running Smoothly</div>
            </div>
          </div>
          <div className="line-card-footer">
            <div className="line-stat-item"><span className="line-stat-label">Active Job</span><span className="line-stat-value">Island Chill 1.5L Run</span></div>
            <div className="line-stat-item"><span className="line-stat-label">Conveyor Speed</span><span className="line-stat-value">120.00 cartons/hr</span></div>
            <div className="line-stat-item"><span className="line-stat-label">Operator</span><span className="line-stat-value">K. Reddy</span></div>
          </div>
        </div>

        <div className="line-card">
          <div className="line-video-container" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img src={line2} alt="Filling Line 2" className="line-placeholder-img" style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }} />
              <div className="feed-noise" />
              <div className="feed-hud">
                <div className="hud-box" style={{ top: '35%', left: '20%', width: '40px', height: '40px' }}>
                  <span className="hud-label">CAN-891: FILL OK</span>
                </div>
                <div className="hud-box" style={{ top: '50%', left: '60%', width: '40px', height: '40px' }}>
                  <span className="hud-label">CAN-892: SEAL OK</span>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', fontSize: '9px', fontFamily: 'monospace', color: '#00ff00', textShadow: '0 0 4px #00ff00', fontWeight: '600' }}>
                  FPS: 29.97 • RES: 1080P • AI VISION ACTIVE
                </div>
              </div>
            </div>
            <button className="fullscreen-btn" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '4px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }} onClick={() => setFullscreenElement('live2')} title="Fullscreen Feed">⛶</button>
            <div className="live-badge"><span className="live-dot"></span><span>LIVE</span></div>
            <div className="line-info-overlay">
              <h3 className="line-title">Filling Line 2 (Alcoholic & Cans)</h3>
              <div className="line-status-text"><span className="line-status-indicator"></span> Running Smoothly</div>
            </div>
          </div>
          <div className="line-card-footer">
            <div className="line-stat-item"><span className="line-stat-label">Active Job</span><span className="line-stat-value">RUM Cola 500ml Can</span></div>
            <div className="line-stat-item"><span className="line-stat-label">Conveyor Speed</span><span className="line-stat-value">95.00 cartons/hr</span></div>
            <div className="line-stat-item"><span className="line-stat-label">Operator</span><span className="line-stat-value">S. Prasad</span></div>
          </div>
        </div>
      </div>

      {/* Stats Charts Section */}
      <div className="dashboard-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginTop: '24px' }}>
        {/* OEE Gauges */}
        <div className="details-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="details-card-header" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="details-card-title">Plant OEE Metrics (%)</h3>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '4px' }} onClick={() => setFullscreenElement('chartOee')} title="Fullscreen Chart">⛶</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Availability', value: 92.45, color: 'var(--info)' },
              { label: 'Performance', value: 88.20, color: 'var(--warning)' },
              { label: 'Quality Rate', value: 98.76, color: 'var(--success)' },
              { label: 'Overall OEE', value: 80.54, color: 'var(--accent)' }
            ].map((gauge, gIdx) => (
              <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{gauge.label}</span>
                  <strong style={{ color: gauge.color }}>{gauge.value.toFixed(2)}%</strong>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${gauge.value}%`, backgroundColor: gauge.color, borderRadius: '4px', transition: 'width 1s ease' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Water Flow Rate */}
        <div className="details-card" style={{ padding: '20px' }}>
          <div className="details-card-header" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="details-card-title">Hourly Water Flow Rate (L/min)</h3>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '4px' }} onClick={() => setFullscreenElement('chartFlow')} title="Fullscreen Chart">⛶</button>
          </div>
          <div style={{ height: '110px', position: 'relative', marginTop: '16px' }}>
            <svg width="100%" height="100%" viewBox="0 0 300 110">
              <defs>
                <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--info)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--info)" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <polyline fill="url(#flowGrad)" stroke="var(--info)" strokeWidth="2" points="0,80 30,65 60,70 90,50 120,55 150,40 180,45 210,30 240,35 270,25 300,30 300,110 0,110" />
              <polyline fill="none" stroke="var(--info)" strokeWidth="2" points="0,80 30,65 60,70 90,50 120,55 150,40 180,45 210,30 240,35 270,25 300,30" />
              {[120, 115, 112, 125, 118, 130, 128, 135, 133, 138, 140].map((v, i) => (
                <text key={i} x={i * 30} y={110 - (v - 100)} fontSize="8" fill="var(--info)" textAnchor="middle">{v}</text>
              ))}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'].map(t => <span key={t}>{t}</span>)}
          </div>
        </div>

        {/* Energy Consumption */}
        <div className="details-card" style={{ padding: '20px' }}>
          <div className="details-card-header" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="details-card-title">Energy Consumption (kWh)</h3>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '4px' }} onClick={() => setFullscreenElement('chartEnergy')} title="Fullscreen Chart">⛶</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '100px', marginTop: '8px' }}>
            {[45, 62, 55, 78, 60, 88, 75, 90, 85, 95, 92].map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{ width: '100%', height: `${val}%`, backgroundColor: i === 10 ? 'var(--warning)' : 'var(--accent)', borderRadius: '3px 3px 0 0', opacity: 0.8 }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Work Order Monitor Table */}
      <div className="dashboard-card" style={{ padding: '20px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>📋 Work Order Monitor</h3>
          <button type="button" className="primary-btn" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => setCurrentTab('work-orders')}>
            View All →
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>WO ID</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.slice((woMonitorPage - 1) * 5, woMonitorPage * 5).map(wo => {
                const completedJC = wo.jobCards ? wo.jobCards.filter(jc => jc.status === 'Completed').length : 0;
                const totalJC = wo.jobCards ? wo.jobCards.length : 0;
                const pct = totalJC > 0 ? Math.round((completedJC / totalJC) * 100) : 0;
                return (
                  <tr key={wo.id}>
                    <td style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: '12px' }}>{wo.id}</td>
                    <td>{wo.productName || wo.product}</td>
                    <td>{wo.quantity}</td>
                    <td>
                      <span className={`badge ${wo.status === 'Completed' ? 'badge-completed' : wo.status === 'In Process' || WORK_ORDER_ACTIVE_STATUSES.includes(wo.status) ? 'badge-inprogress' : 'badge-pending'}`}>
                        {wo.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: wo.status === 'Completed' ? 'var(--success)' : 'var(--info)', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '32px' }}>{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <button type="button" className="secondary-btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => { setSelectedWOId(wo.id); setCurrentTab('work-orders'); }}>
                        👁 View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
          <button type="button" className="secondary-btn" disabled={woMonitorPage === 1} onClick={() => setWoMonitorPage(p => Math.max(1, p - 1))}>◀ Prev</button>
          <span style={{ fontSize: '12px', fontWeight: '600' }}>Page {woMonitorPage} of {Math.max(1, Math.ceil(workOrders.length / 5))}</span>
          <button type="button" className="secondary-btn" disabled={woMonitorPage >= Math.ceil(workOrders.length / 5)} onClick={() => setWoMonitorPage(p => p + 1)}>Next ▶</button>
        </div>
      </div>
    </div>
  );
}
