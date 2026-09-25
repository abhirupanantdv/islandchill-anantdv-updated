import React, { useState } from 'react';

export default function BOMTab({
  BOMS,
  PRODUCTS,
  bomLoading,
  bomList,
  selectedBomId,
  setSelectedBomId,
  bomPage,
  setBomPage,
  activeBomMaterials,
  availableWarehouses = [],
  warehousesLoading = false,
  bomRawMaterialWarehouse = '',
  setBomRawMaterialWarehouse = () => { },
  bomFgWarehouse = '',
  setBomFgWarehouse = () => { }
}) {
  const [recipeSearch, setRecipeSearch] = useState('');

  // Filter only leaf warehouses (is_group === 0)
  const nonGroupWarehouses = (availableWarehouses || []).filter(
    w => !w.is_group || w.is_group === 0 || w.is_group === '0'
  );

  // Selected BOM object from list
  const selectedBomObj = (bomList || []).find(b => b.id === selectedBomId || b.name === selectedBomId);

  // Filter recipes by search term
  const filteredBoms = (bomList || []).filter(b => {
    const q = recipeSearch.toLowerCase();
    return (
      (b.id || '').toLowerCase().includes(q) ||
      (b.name || '').toLowerCase().includes(q) ||
      (b.productName || '').toLowerCase().includes(q) ||
      (b.item || '').toLowerCase().includes(q) ||
      (b.itemCode || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredBoms.length / 8) || 1;
  const currentPage = Math.min(Math.max(1, bomPage || 1), totalPages);
  const paginatedBoms = filteredBoms.slice((currentPage - 1) * 8, currentPage * 8);

  React.useEffect(() => {
    if (bomPage > totalPages) {
      setBomPage(totalPages);
    }
  }, [bomPage, totalPages, setBomPage]);

  // Finished good stock from first material or bomObj
  const fgStockQty = (activeBomMaterials && activeBomMaterials.length > 0 && activeBomMaterials[0].fg_available_qty !== undefined)
    ? activeBomMaterials[0].fg_available_qty
    : (selectedBomObj?.fg_available_qty ?? 0);

  const fgItemCode = (activeBomMaterials && activeBomMaterials.length > 0 && activeBomMaterials[0].fg_item)
    ? activeBomMaterials[0].fg_item
    : (selectedBomObj?.itemCode || selectedBomObj?.item || '');

  const fgItemName = (activeBomMaterials && activeBomMaterials.length > 0 && activeBomMaterials[0].fg_item_name)
    ? activeBomMaterials[0].fg_item_name
    : (selectedBomObj?.productName || selectedBomObj?.name || '');

  const bomBatchSize = (activeBomMaterials && activeBomMaterials.length > 0 && activeBomMaterials[0].bom_quantity)
    ? activeBomMaterials[0].bom_quantity
    : (selectedBomObj?.quantity || 1);

  const bomUom = (activeBomMaterials && activeBomMaterials.length > 0 && activeBomMaterials[0].bom_uom)
    ? activeBomMaterials[0].bom_uom
    : (selectedBomObj?.unit || 'Nos');

  return (
    <div className="maintenance-tab-container">
      {/* Header & Title */}
      <div className="module-header" style={{ marginBottom: '16px' }}>
        <div className="module-title">
          <h2>🧪 Bill of Materials (BOM) & Production Recipes</h2>
          <p>Explore formulations, raw material stock balances in Stores, and finished good inventory.</p>
        </div>
      </div>

      {/* Warehouse Selector Toolbar (is_group = 0) */}
      <div
        className="details-card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', flex: 1 }}>
          {/* Raw Material Warehouse Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>
              📦 Raw Material Source Warehouse <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}></span>
            </label>
            {warehousesLoading ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading warehouses...</span>
            ) : (
              <select
                className="form-input"
                style={{ height: '36px', fontSize: '13px', padding: '4px 10px', fontWeight: '500' }}
                value={bomRawMaterialWarehouse}
                onChange={(e) => setBomRawMaterialWarehouse(e.target.value)}
              >
                <option value="">-- Select Raw Material Warehouse --</option>
                {nonGroupWarehouses.map(wh => (
                  <option key={wh.name} value={wh.name}>
                    {wh.warehouse_name || wh.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Finished Goods Warehouse Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981' }}>
              🏭 Finished Goods Warehouse <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Leaf Only)</span>
            </label>
            {warehousesLoading ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading warehouses...</span>
            ) : (
              <select
                className="form-input"
                style={{ height: '36px', fontSize: '13px', padding: '4px 10px', fontWeight: '500' }}
                value={bomFgWarehouse}
                onChange={(e) => setBomFgWarehouse(e.target.value)}
              >
                <option value="">-- Select Finished Goods Warehouse --</option>
                {nonGroupWarehouses.map(wh => (
                  <option key={wh.name} value={wh.name}>
                    {wh.warehouse_name || wh.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Real-time sync badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
          <span>Live Stock Checked (is_group = 0)</span>
        </div>
      </div>

      {/* Main Grid: Left Recipes List | Right Ingredients & Details */}
      <div className="dashboard-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>

        {/* Left Card: Active Recipes */}
        <div className="details-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 className="details-card-title" style={{ margin: 0 }}>Active Recipes</h3>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
              {filteredBoms.length} Recipes
            </span>
          </div>

          {/* Search Recipes */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '12px', height: '32px', padding: '4px 8px' }}
              placeholder="Search recipe or item..."
              value={recipeSearch}
              onChange={(e) => {
                setRecipeSearch(e.target.value);
                setBomPage(1);
              }}
            />
          </div>

          {bomLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading BOMs...</div>
          ) : paginatedBoms.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No Active Recipes found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paginatedBoms.map(bom => {
                const isSelected = selectedBomId === bom.id || selectedBomId === bom.name;
                return (
                  <div
                    key={bom.id || bom.name}
                    className={`bom-recipe-row ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedBomId(bom.id || bom.name)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      boxShadow: isSelected ? '0 0 12px rgba(245, 158, 11, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '700', color: isSelected ? 'var(--accent)' : 'var(--text-heading)', fontSize: '13px' }}>
                        {bom.name || bom.id}
                      </div>
                      {bom.isDefault && (
                        <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                          Default
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
                      Product: {bom.productName || bom.item}
                    </div>

                    {/* Finished Good Stock in FG Warehouse */}
                    <div style={{ marginTop: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>FG Warehouse:</span>
                      <span style={{ fontWeight: '600', color: '#10b981' }}>
                        {(bom.fg_available_qty ?? 0).toLocaleString()} {bom.unit || 'Nos'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                  <button className="secondary-btn" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={currentPage <= 1} onClick={() => setBomPage(p => Math.max(1, p - 1))}>◀</button>
                  <span style={{ fontSize: '11px', alignSelf: 'center' }}>{currentPage} / {totalPages}</span>
                  <button className="secondary-btn" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={currentPage >= totalPages} onClick={() => setBomPage(p => Math.min(totalPages, p + 1))}>▶</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Card: Selected BOM Recipe Ingredients & Materials */}
        <div className="details-card" style={{ padding: '20px' }}>
          <h3 className="details-card-title">Recipe Ingredients & Raw Materials</h3>

          {selectedBomId ? (
            <div>
              {/* Recipe & Finished Good Stock Highlights Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '18px',
                  marginTop: '8px'
                }}
              >
                {/* Finished Good Link & Stock Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#059669', marginBottom: '4px' }}>
                    🏭 Finished Good Product
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-heading)' }}>
                    {fgItemName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Code: <code>{fgItemCode}</code> • Batch: {bomBatchSize?.toLocaleString()} {bomUom}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>In {bomFgWarehouse || 'Finished Goods'}:</span>
                    <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                      {fgStockQty?.toLocaleString()} {bomUom}
                    </span>
                  </div>
                </div>

                {/* Raw Material Warehouse Context Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '8px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#d97706', marginBottom: '4px' }}>
                    📦 Raw Materials Warehouse
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-heading)' }}>
                    {bomRawMaterialWarehouse || 'Stores - CWFPL'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Monitoring stock levels for {activeBomMaterials.length} raw ingredients
                  </div>
                  <div style={{ fontSize: '12px', color: '#b45309', fontWeight: '500' }}>
                    Recipe: <strong>{selectedBomId}</strong>
                  </div>
                </div>
              </div>

              {/* Raw Materials Table */}
              <div className="table-responsive">
                <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-muted, #f8fafc)' }}>
                      <th style={{ padding: '8px 10px' }}>Item Code</th>
                      <th style={{ padding: '8px 10px' }}>Item Name</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Recipe Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>In RM Warehouse</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Stock Status</th>
                      <th style={{ padding: '8px 10px' }}>UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBomMaterials.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No raw materials linked for this BOM.
                        </td>
                      </tr>
                    ) : (
                      activeBomMaterials.map((mat, mIdx) => {
                        const availQty = Number(mat.available_qty || 0);
                        const reqQty = Number(mat.qty || 0);
                        const isSufficient = availQty >= reqQty;
                        const isZero = availQty <= 0;

                        return (
                          <tr key={mat.item_code || mIdx}>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px', padding: '8px 10px' }}>
                              {mat.item_code || mat.code}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: '500' }}>
                              {mat.item_name || mat.name}
                            </td>
                            <td style={{ fontWeight: '600', textAlign: 'right', padding: '8px 10px' }}>
                              {Number(mat.qty).toFixed(4)}
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                padding: '8px 10px',
                                fontWeight: '600',
                                color: isZero ? '#dc2626' : isSufficient ? '#16a34a' : '#d97706'
                              }}
                            >
                              {availQty.toLocaleString()} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{mat.uom || mat.unit}</span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                              {isZero ? (
                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                                  ⛔ Out of Stock
                                </span>
                              ) : isSufficient ? (
                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d' }}>
                                  ✓ In Stock
                                </span>
                              ) : (
                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', backgroundColor: '#fef3c7', color: '#b45309' }}>
                                  ⚠ Low Stock
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                              {mat.uom || mat.unit}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)' }}>
              Select a BOM recipe on the left to view raw materials and warehouse stock.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}