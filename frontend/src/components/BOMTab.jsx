import React from 'react';

export default function BOMTab({
  bomLoading,
  bomList,
  selectedBomId,
  setSelectedBomId,
  bomPage,
  setBomPage,
  activeBomMaterials
}) {
  return (
    <div className="maintenance-tab-container">
      <div className="module-header">
        <div className="module-title">
          <h2>Bill of Materials (BOM) Recipes</h2>
          <p>Explore production recipes, water components, and ingredient ratios synced from ERPNext.</p>
        </div>
      </div>

      <div className="dashboard-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* BOM Selector List */}
        <div className="details-card" style={{ padding: '20px' }}>
          <h3 className="details-card-title">Active Recipes</h3>
          {bomLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading BOMs...</div>
          ) : bomList.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No Active BOMs found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {bomList.slice((bomPage - 1) * 8, bomPage * 8).map(bom => {
                const isSelected = selectedBomId === bom.id;
                return (
                  <div
                    key={bom.id}
                    className={`bom-recipe-row ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedBomId(bom.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      boxShadow: isSelected ? '0 0 12px rgba(245, 158, 11, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ fontWeight: '700', color: isSelected ? 'var(--accent)' : 'var(--text-heading)' }}>{bom.id}</div>
                    <div style={{ fontSize: '11px', color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', marginTop: '4px' }}>Product: {bom.productName}</div>
                  </div>
                );
              })}

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                <button className="secondary-btn" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={bomPage === 1} onClick={() => setBomPage(p => Math.max(1, p - 1))}>◀</button>
                <span style={{ fontSize: '11px', alignSelf: 'center' }}>{bomPage} / {Math.ceil(bomList.length / 8)}</span>
                <button className="secondary-btn" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={bomPage >= Math.ceil(bomList.length / 8)} onClick={() => setBomPage(p => p + 1)}>▶</button>
              </div>
            </div>
          )}
        </div>

        {/* Selected BOM Materials details */}
        <div className="details-card" style={{ padding: '20px' }}>
          <h3 className="details-card-title">Recipe Ingredients & Materials</h3>
          {selectedBomId ? (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Viewing Materials for: <strong style={{ color: 'var(--text-main)' }}>{selectedBomId}</strong>
              </div>
              <div className="table-responsive">
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Quantity</th>
                      <th>UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBomMaterials.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          No raw materials linked or local simulation fallback.
                        </td>
                      </tr>
                    ) : (
                      activeBomMaterials.map((mat, mIdx) => (
                        <tr key={mIdx}>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{mat.item_code}</td>
                          <td>{mat.item_name}</td>
                          <td style={{ fontWeight: '600' }}>{Number(mat.qty).toFixed(4)}</td>
                          <td>{mat.uom}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
              Select a BOM recipe on the left to view raw materials.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}