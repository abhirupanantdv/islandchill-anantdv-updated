import React, { useState } from 'react';
import { frappe } from '../services/frappe';

export default function InventoryTab({
  erpItems,
  inventory,
  showAdjustStockModal,
  setShowAdjustStockModal,
  adjustItemCode,
  setAdjustItemCode,
  adjustQty,
  setAdjustQty,
  handleAdjustStockSubmit,
  invSearchQuery,
  setInvSearchQuery,
  invPage,
  setInvPage,
  selectedItemCode,
  setSelectedItemCode,
  itemsLoading,
  isLoggedIn,
  workOrders
}) {
  const [stockEntries, setStockEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedEntryName, setSelectedEntryName] = useState(null);
  const [entryDetails, setEntryDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [glEntries, setGlEntries] = useState([]);
  const [glLoading, setGlLoading] = useState(false);
  const [entryActiveTab, setEntryActiveTab] = useState('items'); // 'items' | 'accounting'

  const [invTab, setInvTab] = useState('stock'); // 'stock' | 'transactions'
  const [allStockEntries, setAllStockEntries] = useState([]);
  const [allEntriesLoading, setAllEntriesLoading] = useState(false);
  const [expandedWOs, setExpandedWOs] = useState({});

  const toggleWODetails = (woId) => {
    setExpandedWOs(prev => ({
      ...prev,
      [woId]: !prev[woId]
    }));
  };

  const conn = frappe.getConnectionSettings();
  const isLiveMode = conn.isLive && conn.connected;

  const allInvItems = isLiveMode
    ? erpItems
    : Object.keys(inventory).map(code => ({ code, ...inventory[code] }));

  const filteredInvItems = allInvItems.filter(item =>
    item.code.toLowerCase().includes(invSearchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(invSearchQuery.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(invSearchQuery.toLowerCase())
  );

  const displayedInvItems = filteredInvItems.slice((invPage - 1) * 20, invPage * 20);
  const totalInvPages = Math.max(1, Math.ceil(filteredInvItems.length / 20));
  const selectedItem = filteredInvItems.find(i => i.code === selectedItemCode) || filteredInvItems[0] || allInvItems[0];

  React.useEffect(() => {
    if (!selectedItem) return;
    let active = true;
    const fetchEntries = async () => {
      setEntriesLoading(true);
      try {
        const data = await frappe.getStockEntriesForItem(selectedItem.code);
        if (active) {
          setStockEntries(data);
        }
      } catch (err) {
        console.error("Failed to load stock entries:", err);
      } finally {
        if (active) setEntriesLoading(false);
      }
    };
    fetchEntries();
    return () => {
      active = false;
    };
  }, [selectedItem?.code, isLoggedIn]);

  React.useEffect(() => {
    if (!selectedEntryName) {
      setEntryDetails(null);
      setGlEntries([]);
      setEntryActiveTab('items');
      return;
    }
    let active = true;
    const fetchDetails = async () => {
      setDetailsLoading(true);
      try {
        const data = await frappe.getStockEntryDetails(selectedEntryName);
        if (active) {
          setEntryDetails(data);
        }
      } catch (err) {
        console.error("Failed to load stock entry details:", err);
      } finally {
        if (active) setDetailsLoading(false);
      }
    };
    fetchDetails();
    return () => {
      active = false;
    };
  }, [selectedEntryName]);

  // Load GL entries when Accounting tab opened
  React.useEffect(() => {
    if (entryActiveTab !== 'accounting' || !selectedEntryName) return;
    let active = true;
    const fetchGL = async () => {
      setGlLoading(true);
      try {
        const data = await frappe.getGLEntriesForVoucher(selectedEntryName);
        if (active) setGlEntries(data || []);
      } catch (err) {
        console.error("Failed to load GL entries:", err);
      } finally {
        if (active) setGlLoading(false);
      }
    };
    fetchGL();
    return () => { active = false; };
  }, [entryActiveTab, selectedEntryName]);

  React.useEffect(() => {
    if (invTab !== 'transactions') return;
    let active = true;
    const fetchAllEntries = async () => {
      setAllEntriesLoading(true);
      try {
        const data = await frappe.getAllStockEntries(200);
        if (active) {
          setAllStockEntries(data);
        }
      } catch (err) {
        console.error("Failed to load all stock entries:", err);
      } finally {
        if (active) setAllEntriesLoading(false);
      }
    };
    fetchAllEntries();
    return () => {
      active = false;
    };
  }, [invTab, isLoggedIn]);

          return (
            <div className="inv-tab-container">
              <div className="wo-tab-header">
                <div className="tab-title-desc">
                  <h2>Warehouse Stocks & Inventory Control</h2>
                  <p>Monitor raw ingredients, bottle components, caps, and final finished goods boxes.</p>
                </div>
                {invTab === 'stock' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="text-input"
                      style={{ width: '200px', padding: '6px 12px', fontSize: '12px' }}
                      placeholder="Search Inventory..."
                      value={invSearchQuery}
                      onChange={e => setInvSearchQuery(e.target.value)}
                    />
                    <button className="primary-btn" onClick={() => {
                      const firstItem = Object.keys(inventory)[0];
                      setAdjustItemCode(firstItem);
                      setShowAdjustStockModal(true);
                    }}>
                      Adjust Stock
                    </button>
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', gap: '16px' }}>
                <button
                  className={`tab-nav-btn ${invTab === 'stock' ? 'active' : ''}`}
                  onClick={() => setInvTab('stock')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: 'none',
                    background: 'none',
                    color: invTab === 'stock' ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: invTab === 'stock' ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  📦 Stock Items
                </button>
                <button
                  className={`tab-nav-btn ${invTab === 'transactions' ? 'active' : ''}`}
                  onClick={() => setInvTab('transactions')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: 'none',
                    background: 'none',
                    color: invTab === 'transactions' ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: invTab === 'transactions' ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  🔄 Transactions
                </button>
              </div>

              {invTab === 'stock' && (
                <div className="inv-explorer-grid">
                <div className="details-card">
                  {itemsLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading Items from ERPNext...
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Item Code</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Qty In Stock</th>
                            <th>Safety Level</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedInvItems.map(item => {
                            let health = 'normal';
                            if (item.qty < item.minLevel) {
                              health = 'low';
                            } else if (item.qty < item.minLevel * 1.5) {
                              health = 'warning';
                            }

                            const isSelected = selectedItemCode === item.code;

                            return (
                              <tr
                                key={item.code}
                                onClick={() => setSelectedItemCode(item.code)}
                                style={{ cursor: 'pointer', backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.08)' : '' }}
                                className={isSelected ? 'active-row' : ''}
                              >
                                <td style={{ fontWeight: '600' }}>{item.code}</td>
                                <td>{item.name}</td>
                                <td>
                                  <span className="badge" style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                                    {item.category}
                                  </span>
                                </td>
                                <td style={{ fontWeight: '600' }}>
                                  {Number(item.qty).toFixed(2)} {item.unit}
                                </td>
                                <td className="text-muted">
                                  {Number(item.minLevel).toFixed(2)} {item.unit}
                                </td>
                                <td>
                                  <span className={`stock-alert-text ${health}`} style={{ fontWeight: '600', fontSize: '11px' }}>
                                    {health === 'low' && '🚨 REORDER'}
                                    {health === 'warning' && '⚠ WARNING'}
                                    {health === 'normal' && '✓ OK'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Pagination Controls */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px', padding: '16px 0' }}>
                    <button
                      className="secondary-btn"
                      disabled={invPage === 1}
                      onClick={() => setInvPage(prev => Math.max(1, prev - 1))}
                    >
                      ◀ Previous
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>
                      Page {invPage} of {totalInvPages}
                    </span>
                    <button
                      className="secondary-btn"
                      disabled={invPage === totalInvPages}
                      onClick={() => setInvPage(prev => Math.min(totalInvPages, prev + 1))}
                    >
                      Next ▶
                    </button>
                  </div>
                </div>

                {/* Right Side: Detailed Panel */}
                {selectedItem && (
                  <div className="details-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent)', fontWeight: 'bold' }}>
                        {selectedItem.category}
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: '8px', color: 'var(--text-heading)' }}>
                        {selectedItem.name}
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                        Item Code: {selectedItem.code}
                      </div>
                    </div>

                    {/* Dynamic Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Average Age</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '4px', color: 'var(--text-main)' }}>
                          {selectedItem.category === 'Finished Goods' ? '4.50 days' : '0.00 days'}
                        </div>
                      </div>
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Time to Produce</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '4px', color: 'var(--text-main)' }}>
                          {selectedItem.category === 'Finished Goods' ? (selectedItem.code.includes('RUM') ? '12.50 mins' : '8.00 mins') : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Trending Sparklines - Show only for Finished Goods */}
                    {selectedItem.category === 'Finished Goods' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '500' }}>Production Trend (7d)</span>
                            <span style={{ color: 'var(--success)', fontWeight: '600' }}>+12.4%</span>
                          </div>
                          <div style={{ height: '40px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden', padding: '4px' }}>
                            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
                              <path
                                d="M 0 25 Q 15 15 30 20 T 60 10 T 90 5"
                                fill="none"
                                stroke="var(--success)"
                                strokeWidth="2"
                              />
                            </svg>
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '500' }}>Consumption / Forecast</span>
                            <span style={{ color: 'var(--warning)', fontWeight: '600' }}>Balanced</span>
                          </div>
                          <div style={{ height: '40px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden', padding: '4px' }}>
                            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
                              <path
                                d="M 0 20 Q 25 15 50 25 T 100 12"
                                fill="none"
                                stroke="var(--warning)"
                                strokeWidth="2"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status Card */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Current Level:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{selectedItem.qty.toFixed(2)} {selectedItem.unit}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Safety Stock Limit:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{selectedItem.minLevel.toFixed(2)} {selectedItem.unit}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Storage Area:</span>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {selectedItem.category === 'Finished Goods' ? 'Finished Goods WH' : 'Raw Materials WH'}
                        </strong>
                      </div>
                    </div>

                    {/* Related Stock Entries Section */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-heading)', marginBottom: '8px' }}>
                        Related Stock Entries
                      </h4>
                      {entriesLoading ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
                          Loading related stock entries...
                        </div>
                      ) : stockEntries.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                          No stock entries recorded for this item.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                          {stockEntries.map(entry => (
                            <div
                              key={entry.name}
                              onClick={() => setSelectedEntryName(entry.name)}
                              style={{
                                padding: '8px 10px',
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              className="stock-entry-list-item"
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                            >
                              <div>
                                <strong style={{ color: 'var(--text-main)', display: 'block' }}>{entry.name}</strong>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{entry.stock_entry_type}</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span className="badge" style={{
                                  backgroundColor: entry.docstatus === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: entry.docstatus === 1 ? 'var(--success)' : 'var(--danger)',
                                  fontSize: '9px',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {entry.docstatus === 1 ? 'Submitted' : 'Draft'}
                                </span>
                                <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {entry.posting_date}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

              {invTab === 'transactions' && (
                <div className="details-card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
                    Work Order-wise Stock Entry Transactions
                  </h3>

                  {allEntriesLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading transactions...
                    </div>
                  ) : (workOrders || []).length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No Work Orders found.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(workOrders || []).map(wo => {
                        const woEntries = allStockEntries.filter(entry => entry.work_order === wo.id);
                        const isExpanded = !!expandedWOs[wo.id];

                        return (
                          <div
                            key={wo.id}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: 'rgba(255,255,255,0.01)'
                            }}
                          >
                            {/* Work Order Header */}
                            <div
                              onClick={() => toggleWODetails(wo.id)}
                              style={{
                                padding: '12px 16px',
                                backgroundColor: isExpanded ? 'rgba(245, 158, 11, 0.04)' : 'rgba(255,255,255,0.02)',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                                transition: 'background-color 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '12px', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>▶</span>
                                <div>
                                  <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>{wo.id}</strong>
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
                                    {wo.productName || wo.product} ({Number(wo.quantity).toFixed(0)} Box)
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className={`badge badge-${wo.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '10px' }}>
                                  {wo.status}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
                                  {woEntries.length} {woEntries.length === 1 ? 'Transaction' : 'Transactions'}
                                </span>
                              </div>
                            </div>

                            {/* Collapsible Details */}
                            {isExpanded && (
                              <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-content)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {woEntries.length === 0 ? (
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                                    No stock entry transactions recorded for this Work Order.
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                                    {woEntries.map(entry => (
                                      <div
                                        key={entry.name}
                                        onClick={() => setSelectedEntryName(entry.name)}
                                        style={{
                                          padding: '10px 12px',
                                          backgroundColor: 'rgba(255,255,255,0.02)',
                                          border: '1px solid var(--border-color)',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px',
                                          transition: 'all 0.2s'
                                        }}
                                        className="stock-entry-card"
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>{entry.name}</strong>
                                          <span className="badge" style={{
                                            backgroundColor: entry.docstatus === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: entry.docstatus === 1 ? 'var(--success)' : 'var(--danger)',
                                            fontSize: '9px',
                                            padding: '1px 5px',
                                            borderRadius: '3px'
                                          }}>
                                            {entry.docstatus === 1 ? 'Submitted' : 'Draft'}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          {entry.stock_entry_type}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                          <span>Posted: {entry.posting_date} {entry.posting_time}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Modal: Stock Entry Details */}
              {selectedEntryName && (
                <div className="modal-backdrop" style={{ zIndex: 1200 }} onClick={() => setSelectedEntryName(null)}>
                  <div className="modal-panel" style={{ maxWidth: '650px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3 className="modal-title">Stock Entry Details: {selectedEntryName}</h3>
                      <button className="close-btn" onClick={() => setSelectedEntryName(null)}>✕</button>
                    </div>

                    <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                      {detailsLoading ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Loading stock entry details...
                        </div>
                      ) : entryDetails ? (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Type</div>
                              <strong style={{ color: 'var(--text-main)' }}>{entryDetails.stock_entry_type}</strong>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Posting Time</div>
                              <strong style={{ color: 'var(--text-main)' }}>{entryDetails.posting_date} {entryDetails.posting_time}</strong>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Work Order</div>
                              <strong style={{ color: 'var(--text-main)' }}>{entryDetails.work_order || '-'}</strong>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Company</div>
                              <strong style={{ color: 'var(--text-main)' }}>{entryDetails.company}</strong>
                            </div>
                          </div>

                          {/* Sub-tabs */}
                          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)', marginTop: '14px', marginBottom: '12px' }}>
                            {['items', 'accounting'].map(tab => (
                              <button
                                key={tab}
                                onClick={() => setEntryActiveTab(tab)}
                                style={{
                                  padding: '7px 18px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  color: entryActiveTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                                  borderBottom: entryActiveTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {tab === 'items' ? '📦 Items Transferred' : '📒 Accounting Ledger'}
                              </button>
                            ))}
                          </div>

                          {entryActiveTab === 'items' && (
                            <div className="table-responsive">
                              <table className="custom-table" style={{ fontSize: '12px' }}>
                                <thead>
                                  <tr>
                                    <th>Item Code</th>
                                    <th>Source Warehouse</th>
                                    <th>Target Warehouse</th>
                                    <th>Qty</th>
                                    <th>UOM</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(entryDetails.items || []).map((row, rIdx) => (
                                    <tr key={rIdx}>
                                      <td style={{ fontWeight: '600' }}>{row.item_code}</td>
                                      <td>{row.s_warehouse || '-'}</td>
                                      <td>{row.t_warehouse || '-'}</td>
                                      <td style={{ fontWeight: '600' }}>{Number(row.qty).toFixed(2)}</td>
                                      <td>{row.uom || row.stock_uom || ''}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {entryActiveTab === 'accounting' && (
                            <div>
                              {glLoading ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                  Loading accounting entries...
                                </div>
                              ) : glEntries.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                  No accounting ledger entries found for this stock entry.<br />
                                  <small style={{ fontSize: '11px', opacity: 0.7 }}>GL entries are only created for submitted stock entries when perpetual inventory is enabled.</small>
                                </div>
                              ) : (
                                <div className="table-responsive">
                                  <table className="custom-table" style={{ fontSize: '12px' }}>
                                    <thead>
                                      <tr>
                                        <th>Account</th>
                                        <th>Cost Center</th>
                                        <th style={{ textAlign: 'right', color: 'var(--success)' }}>Debit (Dr)</th>
                                        <th style={{ textAlign: 'right', color: 'var(--danger)' }}>Credit (Cr)</th>
                                        <th>Date</th>
                                        <th>Remarks</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {glEntries.map((gl, gIdx) => (
                                        <tr key={gIdx}>
                                          <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{gl.account}</td>
                                          <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{gl.cost_center || '-'}</td>
                                          <td style={{ textAlign: 'right', color: Number(gl.debit) > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: Number(gl.debit) > 0 ? '700' : '400' }}>
                                            {Number(gl.debit) > 0 ? Number(gl.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                          </td>
                                          <td style={{ textAlign: 'right', color: Number(gl.credit) > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: Number(gl.credit) > 0 ? '700' : '400' }}>
                                            {Number(gl.credit) > 0 ? Number(gl.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                          </td>
                                          <td style={{ fontSize: '11px' }}>{gl.posting_date}</td>
                                          <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gl.remarks || '-'}</td>
                                        </tr>
                                      ))}
                                      {/* Totals row */}
                                      <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <td colSpan={2} style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-heading)' }}>Total</td>
                                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>
                                          {glEntries.reduce((s, g) => s + Number(g.debit || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--danger)' }}>
                                          {glEntries.reduce((s, g) => s + Number(g.credit || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td colSpan={2}></td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Failed to load stock entry details.
                        </div>
                      )}
                    </div>

                    <div className="modal-footer">
                      <button type="button" className="secondary-btn" onClick={() => setSelectedEntryName(null)}>Close</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
}