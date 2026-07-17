import React from 'react';
import { frappe } from '../services/frappe';

export default function WorkOrdersTab({
  woLoading,
  displayedWorkOrders,
  woStatusFilter,
  onStatusFilterChange,
  selectedWOId,
  setSelectedWOId,
  currentPage,
  setCurrentPage,
  totalWOPages,
  setShowNewWODrawer,
  handleDeleteWorkOrder,
  handleCancelWorkOrder,
  WORK_ORDER_STARTABLE_STATUSES,
  WORK_ORDER_ACTIVE_STATUSES,
  JOB_CARD_STARTABLE_STATUSES,
  JOB_CARD_RUNNING_STATUSES,
  JOB_CARD_PAUSED_STATUSES,
  handleStartWorkOrder,
  isWorkOrderReadyForFinish,
  woActionLoading,
  handleFinishWorkOrder,
  handleChangeWorkOrderStatus,
  openJobCardAction,
  setOperatorName,
  currentUser,
  setOperatorRemarks,
  setActiveTimelineJC
}) {
  const conn = frappe.getConnectionSettings();
  const isLiveMode = conn.isLive && conn.connected;

  return (
              <div className="wo-tab-container">
            <div className="wo-tab-header">
              <div className="tab-title-desc">
                <h2>Production Work Orders & Execution</h2>
                <p>Manage scheduling, job card statuses, and bottling operations checklist.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {isLiveMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Status:</label>
                    <select
                      value={woStatusFilter || 'All'}
                      onChange={(e) => onStatusFilterChange(e.target.value)}
                      className="form-input"
                      style={{ padding: '6px 12px', width: '170px', margin: 0, fontSize: '12px', height: '36px' }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Draft">Draft</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Not Started">Not Started</option>
                      <option value="In Process">In Process</option>
                      <option value="Stock Reserved">Stock Reserved</option>
                      <option value="Stock Partially Reserved">Stock Partially Reserved</option>
                      <option value="Completed">Completed</option>
                      <option value="Stopped">Stopped</option>
                      <option value="Closed">Closed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
                <button className="primary-btn" onClick={() => setShowNewWODrawer(true)}>
                  Create Work Order
                </button>
              </div>
            </div>

            <div className="wo-grid">
              {woLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading Work Orders from ERPNext...
                </div>
              ) : displayedWorkOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No Work Orders found.
                </div>
              ) : (
                displayedWorkOrders.map(wo => {
                  const isSelected = selectedWOId === wo.id;
                  let pct = 0;
                  if (wo.status === 'Completed') {
                    pct = 100;
                  } else if (wo.jobCards && wo.jobCards.length > 0) {
                    const completed = wo.jobCards.filter(jc => jc.status === 'Completed').length;
                    pct = (completed / wo.jobCards.length) * 100;
                  }

                  return (
                    <div key={wo.id} className="wo-card-container">
                      <div className="wo-card-header">
                        <div className="wo-card-title-block">
                          <div className="wo-card-icon">🏭</div>
                          <div className="wo-card-id-block">
                            <h3>{wo.id}</h3>
                            <p>{wo.productName || wo.product}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className={`badge badge-${wo.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {wo.status}
                          </span>
                          {WORK_ORDER_STARTABLE_STATUSES.includes(wo.status) && (
                            <button className="primary-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleStartWorkOrder(wo.id)}>
                              Start Run
                            </button>
                          )}
                          {isWorkOrderReadyForFinish(wo) && (
                            <button
                              className="primary-btn"
                              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                              disabled={woActionLoading}
                              onClick={() => handleFinishWorkOrder(wo)}
                            >
                              Finish WO
                            </button>
                          )}
                          {wo.status === 'Stopped' && (
                            <button
                              className="secondary-btn"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              disabled={woActionLoading}
                              onClick={() => handleChangeWorkOrderStatus(wo, 'Resumed')}
                            >
                              Re-open
                            </button>
                          )}
                          {!['Closed', 'Completed', 'Stopped', 'Cancelled'].includes(wo.status) && (
                            <button
                              className="secondary-btn"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              disabled={woActionLoading}
                              onClick={() => handleChangeWorkOrderStatus(wo, 'Stopped')}
                            >
                              Stop
                            </button>
                          )}
                          {wo.status !== 'Closed' && !['Draft', 'Cancelled'].includes(wo.status) && (
                            <button
                              className="secondary-btn"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              disabled={woActionLoading}
                              onClick={() => handleChangeWorkOrderStatus(wo, 'Closed')}
                            >
                              Close
                            </button>
                          )}
                          <button
                            className="secondary-btn"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => setSelectedWOId(isSelected ? null : wo.id)}
                          >
                            {isSelected ? 'Collapse' : 'Show Operations'}
                          </button>
                          {wo.status !== 'Cancelled' && (
                            <button
                              className="secondary-btn"
                              title="Cancel Work Order"
                              style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                              onClick={() => handleCancelWorkOrder(wo.id)}
                            >
                              🚫 Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="wo-metadata-grid">
                        <div className="metadata-item">
                          <span className="metadata-label">Filling Line</span>
                          <span className="metadata-value">{wo.lineNo}</span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-label">Batch Size</span>
                          <span className="metadata-value">{Number(wo.quantity).toFixed(2)} Box</span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-label">Produced Qty</span>
                          <span className="metadata-value">{Number(wo.produced || 0).toFixed(2)} Box</span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-label">Planned Start</span>
                          <span className="metadata-value">{wo.plannedStart}</span>
                        </div>
                      </div>

                      <div className="wo-progress-section">
                        <div className="progress-info">
                          <span>Work Order Progress Status</span>
                          <span>{pct.toFixed(2)}%</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="job-cards-section">
                          <h4 className="section-subtitle">Operational Job Cards ({wo.jobCards ? wo.jobCards.length : 0})</h4>

                          {(!wo.jobCards || wo.jobCards.length === 0) ? (
                            <p className="text-muted" style={{ fontSize: '13px', padding: '10px 0' }}>
                              No Job Cards found for this Work Order. If this is a new WO, click <strong>"Start Run"</strong> to issue materials and auto-generate job cards from the BOM operations. If the BOM has no operations defined, no job cards will be created in ERPNext.
                            </p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {wo.jobCards.map((jc, index) => (
                                <div key={jc.id} className="jc-item-row" style={{ gridTemplateColumns: '50px 1.8fr 1fr 1fr 2.2fr' }}>
                                  <div className="jc-index">{(index + 1).toString().padStart(2, '0')}</div>
                                  <div className="jc-op-details">
                                    <h4>{jc.operation}</h4>
                                    <p>{jc.station} {jc.status !== 'Completed' && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({jc.status})</span>}</p>
                                    {(() => {
                                      let start = jc.actualStartTime || '';
                                      let end = jc.actualEndTime || '';
                                      if (jc.remarksList) {
                                        for (let i = jc.remarksList.length - 1; i >= 0; i--) {
                                          const log = jc.remarksList[i];
                                          if (log.actualStartTime && !start) start = log.actualStartTime;
                                          if (log.actualEndTime && !end) end = log.actualEndTime;
                                        }
                                      }
                                      if (start || end) {
                                        return (
                                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            {start && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><strong>Start:</strong> {start.replace('T', ' ')}</span>}
                                            {end && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><strong>End:</strong> {end.replace('T', ' ')}</span>}
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>

                                  <div className="jc-operator-log text-muted">
                                    {jc.operator ? (
                                      <span>👤 {jc.operator}</span>
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </div>

                                  <div className="jc-status-badge">
                                    <span className={`badge badge-${jc.status.toLowerCase().replace(' ', '-')}`}>
                                      {jc.status}
                                    </span>
                                  </div>

                                  {/* Dynamic actions block matching work order.png */}
                                  <div className="jc-actions" style={{ gap: '4px' }}>
                                    {/* Action: Start */}
                                    {/* {jc.status === 'Not Started' && wo.status === 'In Progress' && ( */}
                                    {JOB_CARD_STARTABLE_STATUSES.includes(jc.status) && (WORK_ORDER_ACTIVE_STATUSES.includes(wo.status) || wo.materialTransferred) && (
                                      <button
                                        className="action-btn-small start"
                                        onClick={() => openJobCardAction(wo, jc, 'start')}
                                      >
                                        ▶ Start
                                      </button>
                                    )}

                                    {/* Actions: Pause, Finish */}
                                    {JOB_CARD_RUNNING_STATUSES.includes(jc.status) && (WORK_ORDER_ACTIVE_STATUSES.includes(wo.status) || wo.materialTransferred) && (
                                      <>
                                        <button
                                          className="action-btn-small"
                                          style={{ backgroundColor: 'var(--warning)', color: '#111' }}
                                          onClick={() => openJobCardAction(wo, jc, 'pause')}
                                        >
                                          ⏸ Pause
                                        </button>
                                        <button
                                          className="action-btn-small complete"
                                          onClick={() => openJobCardAction(wo, jc, 'finish')}
                                        >
                                          ✓ Finish
                                        </button>
                                      </>
                                    )}

                                    {/* Actions: Resume, Finish, Add Remarks */}
                                    {JOB_CARD_PAUSED_STATUSES.includes(jc.status) && (WORK_ORDER_ACTIVE_STATUSES.includes(wo.status) || wo.materialTransferred) && (
                                      <>
                                        <button
                                          className="action-btn-small start"
                                          onClick={() => openJobCardAction(wo, jc, 'resume')}
                                        >
                                          ▶ Resume
                                        </button>
                                        <button
                                          className="action-btn-small complete"
                                          onClick={() => openJobCardAction(wo, jc, 'finish')}
                                        >
                                          ✓ Finish
                                        </button>
                                      </>
                                    )}

                                    {/* Done Indicator */}
                                    {jc.status === 'Completed' && (
                                      <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '12px', marginRight: '6px' }}>✓ Done</span>
                                    )}

                                    {/* Action: Remarks (Unified entrypoint for viewing history and adding new remarks) */}
                                    <button
                                      className="action-btn-small remarks"
                                      style={{ padding: '6px 8px' }}
                                      onClick={() => {
                                        setOperatorName(jc.operator || currentUser || '');
                                        setOperatorRemarks('');
                                        setActiveTimelineJC({ woId: wo.id, jcId: jc.id, operation: jc.operation });
                                      }}
                                    >
                                      💬 Remarks
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
              <button
                className="secondary-btn"
                disabled={currentPage === 1 || woLoading}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                ◀ Previous
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                Page {currentPage} of {totalWOPages}
              </span>
              <button
                className="secondary-btn"
                disabled={currentPage === totalWOPages || woLoading}
                onClick={() => setCurrentPage(prev => Math.min(totalWOPages, prev + 1))}
              >
                Next ▶
              </button>
            </div>
          </div>
  );
}