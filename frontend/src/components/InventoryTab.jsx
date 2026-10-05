import React, { useState, useEffect, useMemo } from 'react';
import { frappe } from '../services/frappe';

export default function InventoryTab({
  erpItems = [],
  inventory = {},
  availableWarehouses = [],
  invSearchQuery = '',
  setInvSearchQuery,
  invPage = 1,
  setInvPage,
  selectedItemCode,
  setSelectedItemCode,
  itemsLoading = false,
  isLoggedIn = false,
  workOrders = [],
  onRefreshItems
}) {
  const [stockEntries, setStockEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedEntryName, setSelectedEntryName] = useState(null);
  const [entryDetails, setEntryDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [glEntries, setGlEntries] = useState([]);
  const [glLoading, setGlLoading] = useState(false);
  const [entryActiveTab, setEntryActiveTab] = useState('items'); // 'items' | 'finished_goods' | 'accounting'

  const [invTab, setInvTab] = useState('stock'); // 'stock' | 'transactions'
  const [allStockEntries, setAllStockEntries] = useState([]);
  const [allEntriesLoading, setAllEntriesLoading] = useState(false);
  const [expandedWOs, setExpandedWOs] = useState({});

  // Warehouse & Category Filtering State
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [visibleInvCount, setVisibleInvCount] = useState(20);
  const [visibleTxnCount, setVisibleTxnCount] = useState(20);
  const [warehouses, setWarehouses] = useState(availableWarehouses || []);

  const toggleWODetails = (woId) => {
    setExpandedWOs(prev => ({
      ...prev,
      [woId]: !prev[woId]
    }));
  };

  const conn = frappe.getConnectionSettings();
  const isLiveMode = conn.isLive && conn.connected;

  // Sync / fetch warehouses
  useEffect(() => {
    if (availableWarehouses && availableWarehouses.length > 0) {
      setWarehouses(availableWarehouses);
    } else if (isLoggedIn) {
      frappe.getWarehouses().then(list => {
        if (list && list.length > 0) setWarehouses(list);
      }).catch(err => console.error('Failed to load warehouses in InventoryTab:', err));
    }
  }, [availableWarehouses, isLoggedIn]);

  // Clean, active leaf warehouses with normalized names
  const cleanWarehouses = useMemo(() => {
    return (warehouses || [])
      .filter(w => !w.is_group || w.is_group === 0 || w.is_group === '0')
      .map(w => {
        const rawName = w.warehouse_name || w.name;
        const clean = w.clean_name || (rawName.includes(' - ') ? rawName.split(' - ')[0].trim() : rawName);
        return {
          ...w,
          cleanName: clean
        };
      });
  }, [warehouses]);

  const selectedWarehouseCleanName = useMemo(() => {
    if (!selectedWarehouse || selectedWarehouse === 'all') return 'All Warehouses (Consolidated)';
    const found = cleanWarehouses.find(w => w.name === selectedWarehouse || w.cleanName === selectedWarehouse);
    return found ? found.cleanName : selectedWarehouse.replace(/ - CWFPL| - CWFL| - AD/g, '');
  }, [selectedWarehouse, cleanWarehouses]);

  // Unified items list (shows all enabled items from ERPNext)
  const allInvItems = useMemo(() => {
    if (isLiveMode && erpItems && erpItems.length > 0) {
      return erpItems;
    }
    return Object.keys(inventory).map(code => ({
      id: code,
      code,
      name: inventory[code].name || code,
      item_code: code,
      item_name: inventory[code].name || code,
      category: inventory[code].category || 'Standard',
      item_group: inventory[code].category || 'Standard',
      unit: inventory[code].unit || 'Nos',
      stock_uom: inventory[code].unit || 'Nos',
      qty: Number(inventory[code].qty || 0),
      total_qty: Number(inventory[code].qty || 0),
      minLevel: Number(inventory[code].minLevel || 0),
      valuation_rate: 0,
      stock_value: 0,
      total_stock_value: 0,
      warehouse_stocks: {
        'Stores - CWFPL': Number(inventory[code].qty || 0),
        'Stores': Number(inventory[code].qty || 0)
      },
      warehouses_with_stock: Number(inventory[code].qty || 0) > 0 ? ['Stores - CWFPL'] : []
    }));
  }, [isLiveMode, erpItems, inventory]);

  // Distinct Item Groups / Categories derived from enabled items
  const itemGroups = useMemo(() => {
    const groups = new Set();
    allInvItems.forEach(item => {
      const g = item.item_group || item.category;
      if (g) groups.add(g);
    });
    return Array.from(groups).sort();
  }, [allInvItems]);

  // Helper to get stock quantity based on selected warehouse with robust normalized lookup
  const getItemStock = (item, wh) => {
    if (!item) return 0;
    const targetWh = wh || selectedWarehouse;
    if (!targetWh || targetWh === 'all') {
      if (item.total_qty !== undefined && item.total_qty !== null) return Number(item.total_qty) || 0;
      return Number(item.qty) || 0;
    }
    if (item.warehouse_stocks && typeof item.warehouse_stocks === 'object') {
      // 1. Direct exact match
      if (item.warehouse_stocks[targetWh] !== undefined) {
        return Number(item.warehouse_stocks[targetWh]) || 0;
      }
      // 2. Normalized match (e.g. 'Stores' vs 'Stores - CWFPL')
      const cleanTarget = targetWh.replace(/ - CWFPL| - CWFL| - AD/gi, '').trim().toLowerCase();
      for (const [key, val] of Object.entries(item.warehouse_stocks)) {
        const cleanKey = key.replace(/ - CWFPL| - CWFL| - AD/gi, '').trim().toLowerCase();
        if (cleanKey === cleanTarget || key.toLowerCase() === targetWh.toLowerCase()) {
          return Number(val) || 0;
        }
      }
    }
    return 0;
  };

  // Helper to get stock valuation based on selected warehouse
  const getItemStockValue = (item, wh) => {
    if (!item) return 0;
    const targetWh = wh || selectedWarehouse;
    const qty = getItemStock(item, targetWh);
    const rate = Number(item.valuation_rate || 0);
    if (!targetWh || targetWh === 'all') {
      if (item.total_stock_value !== undefined && item.total_stock_value !== null && Number(item.total_stock_value) > 0) {
        return Number(item.total_stock_value) || 0;
      }
      if (item.stock_value !== undefined && item.stock_value !== null && Number(item.stock_value) > 0) {
        return Number(item.stock_value) || 0;
      }
    }
    if (rate > 0) return qty * rate;
    return 0;
  };

  // Format quantities with commas & 2 decimals
  const formatQty = (num) => {
    return Number(num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatShortQty = (num) => {
    const n = Number(num || 0);
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toFixed(0);
  };

  // Format currency
  const formatCurrency = (val) => {
    const n = Number(val || 0);
    return '$' + n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Live aggregate stats for the active view
  const currentViewStats = useMemo(() => {
    let totalUnits = 0;
    let totalVal = 0;
    let itemsWithStock = 0;

    allInvItems.forEach(item => {
      const q = getItemStock(item, selectedWarehouse);
      const v = getItemStockValue(item, selectedWarehouse);
      if (q > 0) {
        totalUnits += q;
        totalVal += v;
        itemsWithStock += 1;
      }
    });

    return {
      totalUnits,
      totalVal,
      itemsWithStock,
      totalItems: allInvItems.length
    };
  }, [allInvItems, selectedWarehouse]);

  // Filter & sort items by Search Query, Item Group / Category, and Warehouse
  const filteredInvItems = useMemo(() => {
    const list = allInvItems.filter(item => {
      // 1. Search Query filter (matches Code, Name, or Category)
      if (invSearchQuery && invSearchQuery.trim()) {
        const q = invSearchQuery.toLowerCase().trim();
        const codeMatch = (item.code || item.item_code || '').toLowerCase().includes(q);
        const nameMatch = (item.name || item.item_name || '').toLowerCase().includes(q);
        const catMatch = (item.category || item.item_group || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !catMatch) return false;
      }

      // 2. Item Group / Category Filter
      if (selectedCategory && selectedCategory !== 'all') {
        const cat = item.category || item.item_group || '';
        if (cat !== selectedCategory) return false;
      }

      // 3. In-Stock Only Filter
      const stockInSelected = getItemStock(item, selectedWarehouse);
      if (onlyInStock) {
        if (stockInSelected <= 0) return false;
      }

      return true;
    });

    // Priority Sort: items with positive stock in the selected warehouse come FIRST (highest quantity first),
    // followed by zero-stock items sorted alphabetically
    return list.sort((a, b) => {
      const stockA = getItemStock(a, selectedWarehouse);
      const stockB = getItemStock(b, selectedWarehouse);
      if (stockA > 0 && stockB <= 0) return -1;
      if (stockA <= 0 && stockB > 0) return 1;
      if (stockA > 0 && stockB > 0) {
        return stockB - stockA; // highest stocked first
      }
      return (a.name || a.code || '').localeCompare(b.name || b.code || '');
    });
  }, [allInvItems, invSearchQuery, selectedCategory, selectedWarehouse, onlyInStock]);

  // Selected item resolution
  const selectedItem = useMemo(() => {
    if (selectedItemCode) {
      const found = filteredInvItems.find(i => (i.code || i.item_code) === selectedItemCode);
      if (found) return found;
    }
    return filteredInvItems[0] || allInvItems[0] || null;
  }, [filteredInvItems, selectedItemCode, allInvItems]);

  // Auto-select the top stocked item when warehouse changes
  useEffect(() => {
    if (filteredInvItems.length > 0) {
      const topItem = filteredInvItems[0];
      const currentSelectedStock = getItemStock(selectedItem, selectedWarehouse);
      if (currentSelectedStock <= 0 && topItem) {
        const topCode = topItem.code || topItem.item_code;
        if (topCode && topCode !== selectedItemCode) {
          setSelectedItemCode(topCode);
        }
      }
    }
  }, [selectedWarehouse]);

  // Reset visible count when search or filter criteria change
  useEffect(() => {
    setVisibleInvCount(20);
  }, [invSearchQuery, selectedCategory, selectedWarehouse, onlyInStock]);

  const displayedInvItems = filteredInvItems.slice(0, visibleInvCount);

  // Fetch related stock entries when selectedItem changes
  useEffect(() => {
    if (!selectedItem) return;
    let active = true;
    const itemCode = selectedItem.code || selectedItem.item_code;
    const fetchEntries = async () => {
      setEntriesLoading(true);
      try {
        const data = await frappe.getStockEntriesForItem(itemCode);
        if (active) {
          setStockEntries(data || []);
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
  }, [selectedItem?.code, selectedItem?.item_code, isLoggedIn]);

  // Fetch Stock Entry details modal
  useEffect(() => {
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
          if (data && (data.stock_entry_type || '').toLowerCase() === 'manufacture') {
            setEntryActiveTab('finished_goods');
          } else {
            setEntryActiveTab('items');
          }
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
  useEffect(() => {
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

  // Fetch all stock entries for transactions tab
  useEffect(() => {
    if (invTab !== 'transactions') return;
    let active = true;
    const fetchAllEntries = async () => {
      setAllEntriesLoading(true);
      try {
        const data = await frappe.getAllStockEntries(200);
        if (active) {
          setAllStockEntries(data || []);
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
      {/* Header */}
      <div className="wo-tab-header">
        <div className="tab-title-desc">
          <h2>Warehouse Stocks & Inventory Control</h2>
          <p>Real-time stock balances, valuation, and item management from ERPNext.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {invTab === 'stock' && onRefreshItems && (
            <button
              className="secondary-btn"
              onClick={onRefreshItems}
              title="Reload latest inventory balances from ERPNext"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '12px' }}
            >
              🔄 Refresh
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation */}
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
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📦 Stock Items</span>
          <span style={{
            fontSize: '10px',
            backgroundColor: invTab === 'stock' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: invTab === 'stock' ? 'var(--accent)' : 'var(--text-muted)',
            padding: '2px 7px',
            borderRadius: '10px'
          }}>
            {allInvItems.length}
          </span>
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

      {/* ========================================================
          STOCK ITEMS SUB-TAB VIEW
         ======================================================== */}
      {invTab === 'stock' && (
        <>
          {/* Top Control Bar: Search + Warehouse Filter + Category Filter */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-card)',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            marginBottom: '16px'
          }}>
            {/* Top Search Option */}
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.6,
                fontSize: '13px',
                pointerEvents: 'none'
              }}>
                🔍
              </span>
              <input
                type="text"
                className="text-input"
                style={{
                  width: '100%',
                  paddingLeft: '34px',
                  paddingRight: invSearchQuery ? '30px' : '12px',
                  height: '38px',
                  fontSize: '13px',
                  backgroundColor: 'var(--bg-content)',
                  borderColor: invSearchQuery ? 'var(--accent)' : 'var(--border-color)',
                  borderRadius: '6px'
                }}
                placeholder="Search by Item Code, Name, or Category..."
                value={invSearchQuery}
                onChange={e => {
                  setInvSearchQuery(e.target.value);
                  if (setInvPage) setInvPage(1);
                }}
              />
              {invSearchQuery && (
                <button
                  onClick={() => {
                    setInvSearchQuery('');
                    if (setInvPage) setInvPage(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px'
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Top Filters: Warehouse-Wise Stock Selector + Item Group / Category Filter + In-Stock Toggle */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* Warehouse Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  🏬 Warehouse:
                </label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => {
                    setSelectedWarehouse(e.target.value);
                    if (setInvPage) setInvPage(1);
                  }}
                  className="text-input"
                  style={{
                    height: '38px',
                    fontSize: '12px',
                    padding: '6px 10px',
                    minWidth: '220px',
                    backgroundColor: 'var(--bg-content)',
                    borderColor: selectedWarehouse !== 'all' ? 'var(--accent)' : 'var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">🏬 All Warehouses (Consolidated)</option>
                  {cleanWarehouses.map(w => (
                    <option key={w.name} value={w.name}>
                      🏬 {w.cleanName} {w.item_count ? `(${w.item_count} items)` : (w.total_qty > 0 ? `(${formatShortQty(w.total_qty)})` : '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Group / Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  📁 Group:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    if (setInvPage) setInvPage(1);
                  }}
                  className="text-input"
                  style={{
                    height: '38px',
                    fontSize: '12px',
                    padding: '6px 10px',
                    minWidth: '170px',
                    backgroundColor: 'var(--bg-content)',
                    borderColor: selectedCategory !== 'all' ? 'var(--accent)' : 'var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">📁 All Groups ({allInvItems.length})</option>
                  {itemGroups.map(grp => {
                    const count = allInvItems.filter(i => (i.category || i.item_group) === grp).length;
                    return (
                      <option key={grp} value={grp}>
                        {grp} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* In-Stock Only Pill Filter */}
              <label
                onClick={() => {
                  setOnlyInStock(prev => !prev);
                  if (setInvPage) setInvPage(1);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: onlyInStock ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-content)',
                  border: onlyInStock ? '1px solid var(--success)' : '1px solid var(--border-color)',
                  color: onlyInStock ? 'var(--success)' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
                title="Toggle showing only items with positive stock quantity"
              >
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={() => {}}
                  style={{ accentColor: 'var(--success)', cursor: 'pointer', pointerEvents: 'none' }}
                />
                <span>In-Stock Only</span>
              </label>

              {/* Reset Filters button if search or filter active */}
              {(invSearchQuery || selectedWarehouse !== 'all' || selectedCategory !== 'all' || onlyInStock) && (
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setInvSearchQuery('');
                    setSelectedWarehouse('all');
                    setSelectedCategory('all');
                    setOnlyInStock(false);
                    if (setInvPage) setInvPage(1);
                  }}
                  style={{
                    height: '38px',
                    padding: '0 12px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--text-muted)'
                  }}
                  title="Reset all filters"
                >
                  ✕ Reset
                </button>
              )}
            </div>
          </div>

          {/* Executive Inventory KPI Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* 1. Total Stock Valuation */}
            <div className="details-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                <span>💰 Total In-Stock Value</span>
                <span style={{ color: 'var(--success)', fontSize: '11px' }}>● Live</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent)', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                {formatCurrency(currentViewStats.totalVal)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {selectedWarehouse === 'all' ? 'Consolidated value across plant' : `Total value in ${selectedWarehouseCleanName}`}
              </div>
            </div>

            {/* 2. Total In-Stock Units */}
            <div className="details-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                <span>📦 Total Stock Units</span>
                <span style={{ color: 'var(--info)' }}>🔢</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                {formatQty(currentViewStats.totalUnits)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Gross quantity in selected view
              </div>
            </div>

            {/* 3. Items In Stock */}
            <div className="details-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                <span>🏷️ Stocked SKUs</span>
                <span style={{ color: 'var(--accent)' }}>📋</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--success)', fontFamily: 'monospace' }}>
                {currentViewStats.itemsWithStock} <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)' }}>/ {allInvItems.length} SKUs</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Items available with stock &gt; 0
              </div>
            </div>

            {/* 4. Active Location */}
            <div className="details-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                <span>🏬 Filtered Facility</span>
                <span style={{ color: 'var(--info)' }}>📍</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedWarehouse === 'all' ? 'All Warehouses' : selectedWarehouseCleanName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {selectedWarehouse === 'all' ? 'Consolidated plant inventory' : selectedWarehouse}
              </div>
            </div>
          </div>

          {/* Quick Active Filter Sub-bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}>
            <div>
              Showing <strong style={{ color: 'var(--text-main)' }}>{Math.min(visibleInvCount, filteredInvItems.length)}</strong> of <strong style={{ color: 'var(--text-main)' }}>{filteredInvItems.length}</strong> items
              {selectedWarehouse !== 'all' && (
                <span style={{
                  marginLeft: '8px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--accent)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  🏬 {selectedWarehouseCleanName}
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span style={{
                  marginLeft: '8px',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  color: '#a78bfa',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  📁 {selectedCategory}
                </span>
              )}
              {onlyInStock && (
                <span style={{
                  marginLeft: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--success)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  ✓ In-Stock Only
                </span>
              )}
            </div>
          </div>

          {/* Master Explorer Grid */}
          <div className="inv-explorer-grid">
            <div className="details-card">
              {itemsLoading ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                  <div>Loading Enabled Items from ERPNext...</div>
                </div>
              ) : filteredInvItems.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                  <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>
                    No matching items found
                  </strong>
                  <div>Try adjusting your search query, warehouse, or in-stock filter.</div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Item Code</th>
                        <th>Item Name</th>
                        <th>Category / Group</th>
                        <th style={{ textAlign: 'right' }}>Valuation Rate</th>
                        <th style={{ textAlign: 'right' }}>
                          {selectedWarehouse === 'all' ? 'Total Qty in Stock' : `Qty in ${selectedWarehouseCleanName}`}
                        </th>
                        <th style={{ textAlign: 'right' }}>Total In-Stock Value</th>
                        <th>UOM</th>
                        <th>Stock Locations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedInvItems.map(item => {
                        const itemCode = item.code || item.item_code;
                        const itemName = item.name || item.item_name;
                        const isSelected = selectedItem && (selectedItem.code === itemCode || selectedItem.item_code === itemCode);
                        const stockQty = getItemStock(item, selectedWarehouse);
                        const stockVal = getItemStockValue(item, selectedWarehouse);
                        const valRate = Number(item.valuation_rate || 0);
                        const whStocks = item.warehouse_stocks || {};
                        const stockedWarehouses = Object.keys(whStocks).filter(w => whStocks[w] > 0 && !w.includes(' - AD'));

                        return (
                          <tr
                            key={itemCode}
                            onClick={() => setSelectedItemCode(itemCode)}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.09)' : ''
                            }}
                            className={isSelected ? 'active-row' : ''}
                          >
                            <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent)' }}>
                              {itemCode}
                            </td>
                            <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                              {itemName}
                            </td>
                            <td>
                              <span className="badge" style={{
                                backgroundColor: item.category === 'Finished Goods'
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : item.category === 'Raw Material'
                                    ? 'rgba(16, 185, 129, 0.12)'
                                    : 'rgba(255, 255, 255, 0.06)',
                                color: item.category === 'Finished Goods'
                                  ? 'var(--accent)'
                                  : item.category === 'Raw Material'
                                    ? 'var(--success)'
                                    : 'var(--text-muted)',
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}>
                                {item.category || item.item_group || 'Standard'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                              {valRate > 0 ? '$' + valRate.toFixed(2) : '—'}
                            </td>
                            <td style={{
                              textAlign: 'right',
                              fontWeight: '700',
                              color: stockQty > 0 ? 'var(--text-main)' : 'var(--text-muted)'
                            }}>
                              {formatQty(stockQty)}
                            </td>
                            <td style={{
                              textAlign: 'right',
                              fontWeight: '600',
                              fontFamily: 'monospace',
                              color: stockVal > 0 ? 'var(--accent)' : 'var(--text-muted)',
                              fontSize: '11.5px'
                            }}>
                              {stockVal > 0 ? formatCurrency(stockVal) : '$0.00'}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              {item.unit || item.stock_uom || 'Nos'}
                            </td>
                            <td>
                              {stockedWarehouses.length === 0 ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                                  No Stock
                                </span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {stockedWarehouses.slice(0, 3).map(whName => {
                                    const shortWh = whName.replace(/ - CWFPL| - CWFL| - AD/g, '');
                                    const q = whStocks[whName];
                                    const isSelectedWhBadge = selectedWarehouse === whName || selectedWarehouseCleanName === shortWh;
                                    return (
                                      <span
                                        key={whName}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedWarehouse(whName);
                                          if (setInvPage) setInvPage(1);
                                        }}
                                        title={`Click to filter by ${whName}: ${formatQty(q)} ${item.unit || item.stock_uom}`}
                                        style={{
                                          fontSize: '10px',
                                          padding: '1px 5px',
                                          borderRadius: '3px',
                                          cursor: 'pointer',
                                          backgroundColor: isSelectedWhBadge ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                          color: isSelectedWhBadge ? 'var(--accent)' : 'var(--text-muted)',
                                          border: isSelectedWhBadge ? '1px solid var(--accent)' : '1px solid transparent',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {shortWh}: {formatShortQty(q)}
                                      </span>
                                    );
                                  })}
                                  {stockedWarehouses.length > 3 && (
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                      +{stockedWarehouses.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ERPNext-Style List View with 20 Records & Load More */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '16px',
                padding: '14px 16px',
                borderTop: '1px solid var(--border-color)',
                fontSize: '12px'
              }}>
                <div style={{ color: 'var(--text-muted)' }}>
                  Showing <strong style={{ color: 'var(--text-main)' }}>{Math.min(visibleInvCount, filteredInvItems.length)}</strong> of <strong style={{ color: 'var(--text-main)' }}>{filteredInvItems.length}</strong> enabled items
                </div>

                {visibleInvCount < filteredInvItems.length && (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => setVisibleInvCount(prev => prev + 20)}
                    style={{
                      padding: '8px 24px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--accent)',
                      borderColor: 'var(--accent)',
                      marginTop: '4px'
                    }}
                  >
                    <span>⬇ Load More</span>
                    <span style={{ fontSize: '11px', opacity: 0.9 }}>
                      (+{Math.min(20, filteredInvItems.length - visibleInvCount)} More)
                    </span>
                  </button>
                )}

                {visibleInvCount >= filteredInvItems.length && filteredInvItems.length > 20 && (
                  <div style={{ color: 'var(--success)', fontSize: '11px', fontWeight: '500', marginTop: '2px' }}>
                    ✓ All {filteredInvItems.length} enabled items loaded
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Detailed Panel & Warehouse-Wise Distribution */}
            {selectedItem && (
              <div className="details-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="badge" style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      color: 'var(--accent)',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {selectedItem.category || selectedItem.item_group || 'Standard'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      UOM: {selectedItem.unit || selectedItem.stock_uom || 'Nos'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', marginTop: '8px', color: 'var(--text-heading)', lineHeight: '1.3' }}>
                    {selectedItem.name || selectedItem.item_name}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      Item Code: <strong style={{ color: 'var(--text-main)' }}>{selectedItem.code || selectedItem.item_code}</strong>
                    </span>
                    {Number(selectedItem.valuation_rate || 0) > 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                        Rate: <strong style={{ color: 'var(--accent)' }}>${Number(selectedItem.valuation_rate).toFixed(2)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Item Stock & Valuation Summary Card */}
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>📦 Stock & Valuation Overview</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontWeight: '700',
                      backgroundColor: (selectedItem.total_qty || selectedItem.qty) > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: (selectedItem.total_qty || selectedItem.qty) > 0 ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {(selectedItem.total_qty || selectedItem.qty) > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{
                      padding: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                        {selectedWarehouse === 'all' ? 'Total Available' : `Qty in ${selectedWarehouseCleanName}`}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-heading)' }}>
                        {formatQty(getItemStock(selectedItem, selectedWarehouse))}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px', fontWeight: 'normal' }}>
                          {selectedItem.unit || selectedItem.stock_uom}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      padding: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                        Valuation Rate
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)', fontFamily: 'monospace' }}>
                        {Number(selectedItem.valuation_rate || 0) > 0 ? `$${Number(selectedItem.valuation_rate).toFixed(2)}` : '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(245, 158, 11, 0.06)',
                    borderRadius: '6px',
                    border: '1px solid rgba(245, 158, 11, 0.16)',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Total In-Stock Value:</span>
                    <strong style={{ fontSize: '14px', color: 'var(--accent)', fontFamily: 'monospace' }}>
                      {formatCurrency(getItemStockValue(selectedItem, selectedWarehouse))}
                    </strong>
                  </div>
                </div>

                {/* Trending Sparklines - Show for Finished Goods */}
                {(selectedItem.category === 'Finished Goods' || selectedItem.item_group === 'Finished Goods') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '500' }}>Production Trend (7d)</span>
                        <span style={{ color: 'var(--success)', fontWeight: '600' }}>+12.4%</span>
                      </div>
                      <div style={{ height: '36px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden', padding: '4px' }}>
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
                      <div style={{ height: '36px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden', padding: '4px' }}>
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
        </>
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
                      {(workOrders || []).slice(0, visibleTxnCount).map(wo => {
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

                      {/* ERPNext-style Load More for Transactions */}
                      {(workOrders || []).length > 20 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '12px 0', borderTop: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Showing {Math.min(visibleTxnCount, (workOrders || []).length)} of {(workOrders || []).length} Work Orders
                          </div>
                          {visibleTxnCount < (workOrders || []).length ? (
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => setVisibleTxnCount(prev => prev + 20)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 24px',
                                fontWeight: '600',
                                fontSize: '13px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--accent)',
                                color: 'var(--accent)',
                                cursor: 'pointer'
                              }}
                            >
                              ⬇ Load More Work Orders (+20 More)
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              ✓ All {(workOrders || []).length} Work Orders loaded
                            </span>
                          )}
                        </div>
                      )}
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
                          {(() => {
                            const isManufacture = (entryDetails.stock_entry_type || '').toLowerCase() === 'manufacture';
                            const allItems = entryDetails.items || [];
                            const fgRows = allItems.filter(row =>
                              row.is_finished_item === 1 ||
                              (row.t_warehouse && !row.s_warehouse) ||
                              (entryDetails.production_item && row.item_code === entryDetails.production_item)
                            );
                            const effectiveFgRows = fgRows.length > 0 ? fgRows : (entryDetails.production_item ? [{
                              item_code: entryDetails.production_item,
                              item_name: entryDetails.production_item,
                              qty: entryDetails.fg_completed_qty || 1,
                              t_warehouse: entryDetails.to_warehouse || '',
                              uom: 'Nos'
                            }] : []);
                            const rawMaterialRows = isManufacture
                              ? allItems.filter(row => !fgRows.includes(row))
                              : allItems;

                            const modalTabs = isManufacture ? [
                              { id: 'finished_goods', label: '🎯 Finished Good' },
                              { id: 'items', label: '📦 Raw Materials Transferred' },
                              { id: 'accounting', label: '📒 Accounting Ledger' }
                            ] : [
                              { id: 'items', label: '📦 Items Transferred' },
                              { id: 'accounting', label: '📒 Accounting Ledger' }
                            ];

                            return (
                              <>
                                <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)', marginTop: '14px', marginBottom: '12px' }}>
                                  {modalTabs.map(tab => (
                                    <button
                                      key={tab.id}
                                      onClick={() => setEntryActiveTab(tab.id)}
                                      style={{
                                        padding: '7px 18px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        color: entryActiveTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                                        borderBottom: entryActiveTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>

                                {entryActiveTab === 'finished_goods' && (
                                  <div className="table-responsive">
                                    <table className="custom-table" style={{ fontSize: '12px' }}>
                                      <thead>
                                        <tr>
                                          <th>Finished Good</th>
                                          <th>Target Warehouse</th>
                                          <th style={{ textAlign: 'right' }}>Finished Good Qty</th>
                                          <th>UOM</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {effectiveFgRows.length === 0 ? (
                                          <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                                              No finished good details found in this stock entry.
                                            </td>
                                          </tr>
                                        ) : (
                                          effectiveFgRows.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                              <td style={{ fontWeight: '600' }}>
                                                <span style={{ color: 'var(--text-main)', fontSize: '13px' }}>{row.item_code}</span>
                                                {row.item_name && row.item_name !== row.item_code && (
                                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400', marginTop: '2px' }}>
                                                    {row.item_name}
                                                  </div>
                                                )}
                                              </td>
                                              <td>
                                                <span style={{ color: 'var(--accent)', fontWeight: '500' }}>
                                                  🏢 {row.t_warehouse || entryDetails.to_warehouse || '-'}
                                                </span>
                                              </td>
                                              <td style={{ fontWeight: '700', textAlign: 'right', color: 'var(--success)', fontSize: '13px' }}>
                                                {Number(row.qty || entryDetails.fg_completed_qty || 0).toFixed(2)}
                                              </td>
                                              <td style={{ color: 'var(--text-muted)' }}>{row.uom || row.stock_uom || ''}</td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {entryActiveTab === 'items' && (
                                  <div className="table-responsive">
                                    <table className="custom-table" style={{ fontSize: '12px' }}>
                                      <thead>
                                        <tr>
                                          <th>Item Code</th>
                                          <th>Source Warehouse</th>
                                          <th>Target Warehouse</th>
                                          <th style={{ textAlign: 'right' }}>Qty</th>
                                          <th>UOM</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rawMaterialRows.length === 0 ? (
                                          <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                                              No raw materials transferred for this stock entry.
                                            </td>
                                          </tr>
                                        ) : (
                                          rawMaterialRows.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                              <td style={{ fontWeight: '600' }}>
                                                <div>{row.item_code}</div>
                                                {row.item_name && row.item_name !== row.item_code && (
                                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>{row.item_name}</div>
                                                )}
                                              </td>
                                              <td>{row.s_warehouse || '-'}</td>
                                              <td>{row.t_warehouse || '-'}</td>
                                              <td style={{ fontWeight: '600', textAlign: 'right' }}>{Number(row.qty).toFixed(2)}</td>
                                              <td>{row.uom || row.stock_uom || ''}</td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </>
                            );
                          })()}

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