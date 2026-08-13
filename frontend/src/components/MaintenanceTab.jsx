import React, { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';

export function MaintWeightCheckModal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [rows, setRows] = useState(Array.from({ length: 8 }, () => ({
    date: new Date().toISOString().slice(0, 10),
    checkedBy: '',
    verifiedBy: '',
    productDesc: 'Island Chill Artesian Water',
    weight1: '602',
    weight2: '601'
  })));

  const [overallComments, setOverallComments] = useState('');

  const handleRowChange = (idx, key, val) => {
    setRows(prev => prev.map((r, rIdx) => rIdx === idx ? { ...r, [key]: val } : r));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest && !e.target.closest('td') && !e.target.closest('.autocomplete-dropdown') && !e.target.closest('.dropdown-item')) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [setShowEmployeeDropdown]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      rows,
      checkedBy: rows[0].checkedBy || 'Chemist',
      verifiedBy: rows[0].verifiedBy || 'QC SV',
      overallComments
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '900px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Island Chill / Crush / US Cola</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 88: For Weight Check Checklist</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
            <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderLeft: '4px solid var(--accent)', color: 'var(--text-heading)' }}>
              <strong>Weight Check frequency:</strong> Weight Check frequency is twice per Day.
            </div>

            <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ width: '50px' }}>Slot</th>
                  <th style={{ width: '110px' }}>Date</th>
                  <th style={{ width: '160px' }}>Checked By *</th>
                  <th style={{ width: '160px' }}>Verified By *</th>
                  <th>Product Description</th>
                  <th style={{ width: '80px' }}>Weight 1</th>
                  <th style={{ width: '80px' }}>Weight 2</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}><strong>#{idx + 1}</strong></td>
                    <td>
                      <input type="date" className="form-input" style={{ height: '28px' }} required min={new Date().toISOString().split('T')[0]} value={row.date} onChange={e => handleRowChange(idx, 'date', e.target.value)} />
                    </td>
                    <td style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '28px' }}
                        required
                        placeholder="Search Checked By..."
                        value={row.checkedBy}
                        onChange={(e) => { handleRowChange(idx, 'checkedBy', e.target.value); handleSearchEmployees(e.target.value, `weightCheckedBy-${idx}`); }}
                      />
                      {showEmployeeDropdown && activeSearchField === `weightCheckedBy-${idx}` && (
                        <div className="autocomplete-dropdown">
                          {employeeList.map(emp => (
                            <div key={emp.name} className="dropdown-item" onClick={() => { handleRowChange(idx, 'checkedBy', `${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                              👤 {emp.employee_name || emp.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '28px' }}
                        required
                        placeholder="Search Verified By..."
                        value={row.verifiedBy}
                        onChange={(e) => { handleRowChange(idx, 'verifiedBy', e.target.value); handleSearchEmployees(e.target.value, `weightVerifiedBy-${idx}`); }}
                      />
                      {showEmployeeDropdown && activeSearchField === `weightVerifiedBy-${idx}` && (
                        <div className="autocomplete-dropdown">
                          {employeeList.map(emp => (
                            <div key={emp.name} className="dropdown-item" onClick={() => { handleRowChange(idx, 'verifiedBy', `${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                              👤 {emp.employee_name || emp.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <input type="text" className="form-input" style={{ height: '28px' }} value={row.productDesc} onChange={e => handleRowChange(idx, 'productDesc', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" className="form-input" style={{ height: '28px' }} value={row.weight1} onChange={e => handleRowChange(idx, 'weight1', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" className="form-input" style={{ height: '28px' }} value={row.weight2} onChange={e => handleRowChange(idx, 'weight2', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600' }}>Overall Comments / Remarks</label>
              <textarea
                className="form-input"
                style={{ minHeight: '50px', padding: '6px' }}
                value={overallComments}
                onChange={e => setOverallComments(e.target.value)}
                placeholder="Enter any additional observations, non-conformance notes, or adjustments made..."
              />
            </div>
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Save Weight Checks</button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function MaintBreakdownModal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [requestorName, setRequestorName] = useState('');
  const [machineName, setMachineName] = useState('');
  const [breakdownDate, setBreakdownDate] = useState(new Date().toISOString().slice(0, 10));
  const [breakdownTime, setBreakdownTime] = useState('10:00');
  const [breakdownDesc, setBreakdownDesc] = useState('');
  const [checkedBySV, setCheckedBySV] = useState('');
  const [approvedByFM, setApprovedByFM] = useState('');

  const [receivedBy, setReceivedBy] = useState('');
  const [workAssessment, setWorkAssessment] = useState('Maintenance');
  const [workCarriedOut, setWorkCarriedOut] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [dateRepaired, setDateRepaired] = useState(new Date().toISOString().slice(0, 10));
  const [timeRepaired, setTimeRepaired] = useState('12:30');
  const [repairedDoneBy, setRepairedDoneBy] = useState('');
  const [approvedByMM, setApprovedByMM] = useState('');

  const [checkedByProdSV, setCheckedByProdSV] = useState('');
  const [approvedByProdFM, setApprovedByProdFM] = useState('');
  const [overallComments, setOverallComments] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      requestorName, machineName, breakdownDate, breakdownTime, breakdownDesc, checkedBySV, approvedByFM,
      receivedBy, workAssessment, workCarriedOut, partsUsed, dateRepaired, timeRepaired, repairedDoneBy, approvedByMM,
      checkedByProdSV, approvedByProdFM, overallComments
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Island Chill - Carpenters Waters (Fiji) PTE Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Machine Breakdown Record Form (SOP-Island 002)</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '72vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {/* Section 1 */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px', fontWeight: '700' }}>Section 1: To be filled-up by the Requestor</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <label>Requestor Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={requestorName}
                    onChange={(e) => { setRequestorName(e.target.value); handleSearchEmployees(e.target.value, 'breakdownRequestor'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'breakdownRequestor' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setRequestorName(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label>Machine Name & No. *</label>
                  <input type="text" className="form-input" required value={machineName} onChange={e => setMachineName(e.target.value)} placeholder="e.g. Coder - Domino #2" />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ flex: 1 }}>
                    <label>Breakdown Date</label>
                    <input type="date" className="form-input" min={new Date().toISOString().split('T')[0]} value={breakdownDate} onChange={e => setBreakdownDate(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Time</label>
                    <input type="time" className="form-input" value={breakdownTime} onChange={e => setBreakdownTime(e.target.value)} />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label>Breakdown Description *</label>
                <textarea className="form-input" required style={{ minHeight: '50px', padding: '6px' }} value={breakdownDesc} onChange={e => setBreakdownDesc(e.target.value)} placeholder="Describe the failure symptoms..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <label>Checked By (SV Name & Sign) *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={checkedBySV}
                    onChange={(e) => { setCheckedBySV(e.target.value); handleSearchEmployees(e.target.value, 'breakdownCheckedSV'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'breakdownCheckedSV' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setCheckedBySV(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <label>Approved By (FM Name & Sign) *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={approvedByFM}
                    onChange={(e) => { setApprovedByFM(e.target.value); handleSearchEmployees(e.target.value, 'breakdownApprovedFM'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'breakdownApprovedFM' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setApprovedByFM(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px', fontWeight: '700' }}>Section 2: To be filled-up by Maintenance</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <label>Received By *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={receivedBy}
                    onChange={(e) => { setReceivedBy(e.target.value); handleSearchEmployees(e.target.value, 'breakdownReceivedBy'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'breakdownReceivedBy' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setReceivedBy(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label>Work In-charge Assessment</label>
                  <select className="form-input" value={workAssessment} onChange={e => setWorkAssessment(e.target.value)}>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ flex: 1 }}>
                    <label>Date Repaired</label>
                    <input type="date" className="form-input" min={new Date().toISOString().split('T')[0]} value={dateRepaired} onChange={e => setDateRepaired(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Time Repaired</label>
                    <input type="time" className="form-input" value={timeRepaired} onChange={e => setTimeRepaired(e.target.value)} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <label>Description of Work Carried Out *</label>
                  <textarea className="form-input" required style={{ minHeight: '50px', padding: '6px' }} value={workCarriedOut} onChange={e => setWorkCarriedOut(e.target.value)} />
                </div>
                <div>
                  <label>Parts Used</label>
                  <textarea className="form-input" style={{ minHeight: '50px', padding: '6px' }} value={partsUsed} onChange={e => setPartsUsed(e.target.value)} placeholder="List spare parts replaced..." />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <label>Repaired Done By (Name & Sign) *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={repairedDoneBy}
                    onChange={(e) => { setRepairedDoneBy(e.target.value); handleSearchEmployees(e.target.value, 'breakdownRepairedBy'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'breakdownRepairedBy' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setRepairedDoneBy(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <label>Approved By (MM Name & Sign) *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={approvedByMM}
                    onChange={(e) => { setApprovedByMM(e.target.value); handleSearchEmployees(e.target.value, 'breakdownApprovedMM'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'breakdownApprovedMM' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setApprovedByMM(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px', marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600' }}>Overall Comments / Remarks</label>
              <textarea
                className="form-input"
                style={{ minHeight: '50px', padding: '6px' }}
                value={overallComments}
                onChange={e => setOverallComments(e.target.value)}
                placeholder="Enter any additional breakdown repair comments, root cause details, or notes..."
              />
            </div>

            {/* Section 3 */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px', fontWeight: '700' }}>Section 3: To be filled-up by Production</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <label>Checked By (Production SV Name & Sign) *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={checkedByProdSV}
                    onChange={(e) => { setCheckedByProdSV(e.target.value); handleSearchEmployees(e.target.value, 'breakdownCheckedProdSV'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'breakdownCheckedProdSV' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setCheckedByProdSV(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <label>Approved By (FM Name & Sign) *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={approvedByProdFM}
                    onChange={(e) => { setApprovedByProdFM(e.target.value); handleSearchEmployees(e.target.value, 'breakdownApprovedProdFM'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'breakdownApprovedProdFM' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setApprovedByProdFM(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Save Breakdown</button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── STATUS COLORS ────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  'In Process': '#10b981',
  'Not Started': '#f59e0b',
  'Completed': '#6b7280',
  'Stopped': '#ef4444',
  default: '#6b7280'
};

function WOSelectorPopup({ workOrders, onSelect, onClose }) {
  const [searchQ, setSearchQ] = useState('');
  const [liveWOs, setLiveWOs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const conn = frappe.getConnectionSettings();
    if (conn.isLive) {
      setLoading(true);
      frappe.getWorkOrderDashboard({ limit: 100, status: 'All' })
        .then(res => {
          if (res && res.data) {
            setLiveWOs(res.data);
          }
        })
        .catch(err => console.warn('Failed to refresh WO selector list:', err))
        .finally(() => setLoading(false));
    }
  }, []);

  const sourceWOs = liveWOs.length > 0 ? liveWOs : (workOrders || []);
  const activeWOs = sourceWOs.filter(wo => (wo.status || '').toLowerCase() !== 'completed');

  const filtered = activeWOs.filter(wo =>
    !searchQ ||
    (wo.id || '').toLowerCase().includes(searchQ.toLowerCase()) ||
    (wo.productName || wo.product || '').toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-panel" style={{ width: '680px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Select Work Order for Maintenance</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Choose an active Work Order to associate all PM Schedule logs</span>
          </div>
          {onClose && <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={onClose}>✕</button>}
        </div>
        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Search */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }}>🔍</span>
            <input
              className="form-input"
              style={{ paddingLeft: '36px', height: '40px', width: '100%' }}
              placeholder="Search active Work Order ID or Item..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              autoFocus
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
              <p>No active work orders found matching your search</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map(wo => {
                const statusColor = STATUS_COLOR[wo.status] || STATUS_COLOR.default;
                return (
                  <div
                    key={wo.id}
                    onClick={() => onSelect(wo)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${statusColor}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      backgroundColor: 'var(--card-bg)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--card-bg)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    {/* Status dot */}
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }} />
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-heading)' }}>{wo.id}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {wo.productName || wo.product || wo.item}
                      </div>
                    </div>
                    {/* Status badge */}
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: `${statusColor}20`,
                      color: statusColor,
                      whiteSpace: 'nowrap'
                    }}>
                      {wo.status}
                    </span>
                    {/* Qty */}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      Qty: {wo.qty || wo.quantity || '—'}
                    </span>
                    <span style={{ color: 'var(--accent)', fontSize: '16px' }}>›</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── MAIN MAINTENANCE TAB ─────────────────────────────────────────────────────
export default function MaintenanceTab({
  maintenanceRecords,
  maintSearchQuery,
  setMaintSearchQuery,
  maintFilterEquipment,
  setMaintFilterEquipment,
  MAINTENANCE_TEMPLATES,
  filteredMaintRecords,
  activeMaintSubTab,
  setActiveMaintSubTab,
  maintViewMode,
  setMaintViewMode,
  getWeekNumber,
  setActiveMaintTemplate,
  setMaintWeekNo,
  setMaintFromDate,
  setMaintToDate,
  setMaintCheckgrid,
  setMaintRemarks,
  setMaintOperator,
  setMaintSupervisor,
  setMaintOperatorDisplay,
  setMaintSupervisorDisplay,
  setActiveMaintForm,
  maintPage,
  setMaintPage,
  setViewingRecord,
  workOrders,
  maintWorkOrder,
  setMaintWorkOrder,
}) {
  // Global selected WO for this tab
  const [globalMaintWO, setGlobalMaintWO] = useState(null);
  const [showWOSelector, setShowWOSelector] = useState(true); // show on first entry
  const [dashStats, setDashStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [historyWOFilter, setHistoryWOFilter] = useState('all');
  const [erpHistory, setErpHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [checklistSearch, setChecklistSearch] = useState('');

  // Load dynamic stats when globalMaintWO changes
  useEffect(() => {
    const conn = frappe.getConnectionSettings();
    if (!conn.isLive) return;
    setStatsLoading(true);
    frappe.getMaintenanceDashboardStats(globalMaintWO ? globalMaintWO.id : null)
      .then(data => setDashStats(data))
      .finally(() => setStatsLoading(false));

    if (globalMaintWO && globalMaintWO.id) {
      setHistoryWOFilter(globalMaintWO.id);
    }
  }, [globalMaintWO]);

  // Load ERP history when historyWOFilter changes
  useEffect(() => {
    const conn = frappe.getConnectionSettings();
    if (!conn.isLive) return;
    setHistoryLoading(true);
    frappe.getMaintenanceLogHistory(historyWOFilter === 'all' ? null : historyWOFilter)
      .then(data => setErpHistory(data))
      .finally(() => setHistoryLoading(false));
  }, [historyWOFilter]);

  const handleSelectWO = (wo) => {
    setGlobalMaintWO(wo);
    if (setMaintWorkOrder) setMaintWorkOrder(wo.id);
    setShowWOSelector(false);
  };

  // Live stats values derived dynamically from live maintenanceRecords
  const matchesTplRecord = (r, tpl) => {
    if (!r || !tpl) return false;
    const recTplId = (r.templateId || '').toLowerCase().trim();
    const tplId = (tpl.id || '').toLowerCase().trim();
    const recEq = (r.equipment || r.name || '').toLowerCase().trim();
    const tplEq = (tpl.equipment || '').toLowerCase().trim();
    return (
      recTplId === tplId ||
      recEq === tplEq ||
      recTplId === tplEq ||
      (recEq && tplEq && (recEq.includes(tplEq) || tplEq.includes(recEq)))
    );
  };

  const activeWoRecords = globalMaintWO
    ? maintenanceRecords.filter(r => (r.workOrder && r.workOrder === globalMaintWO.id) || (r.work_order && r.work_order === globalMaintWO.id))
    : maintenanceRecords;

  const totalChecklists = activeWoRecords.length;

  const eqCount = (MAINTENANCE_TEMPLATES || []).filter(tpl =>
    maintenanceRecords.some(r =>
      matchesTplRecord(r, tpl) && (
        !globalMaintWO ||
        (r.workOrder && r.workOrder === globalMaintWO.id) ||
        (r.work_order && r.work_order === globalMaintWO.id)
      )
    )
  ).length;

  const lastActivity = maintenanceRecords[0]
    ? (maintenanceRecords[0].timestamp || maintenanceRecords[0].creation || '').split(' ')[0]
    : (dashStats?.last_activity || 'No logs yet');

  // Filtered checklist templates for search
  const filteredTemplates = (MAINTENANCE_TEMPLATES || []).filter(t => {
    if (!checklistSearch) return true;
    const q = checklistSearch.toLowerCase();
    return (t.equipment || '').toLowerCase().includes(q) || (t.area || '').toLowerCase().includes(q);
  });

  return (
    <div className="maintenance-tab-container">

      {/* WO Selector Popup */}
      {showWOSelector && (
        <WOSelectorPopup
          workOrders={workOrders || []}
          onSelect={handleSelectWO}
          onClose={() => setShowWOSelector(false)}
        />
      )}

      <div className="tab-title-desc">
        <h2>Preventive Maintenance Operations</h2>
        <p>Execute, log, and view status dashboards for Fiji Bottling Plant daily preventive maintenance schedules.</p>
      </div>

      {/* Global WO Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        marginBottom: '20px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        backgroundColor: globalMaintWO ? 'rgba(251, 191, 36, 0.05)' : 'var(--bg-secondary)',
        borderLeft: globalMaintWO ? '4px solid var(--accent)' : '4px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>📋</span>
          <div>
            {globalMaintWO ? (
              <>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '1px' }}>Current Selected Work Order</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-heading)' }}>
                  {globalMaintWO.id}
                  <span style={{ fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    — {globalMaintWO.productName || globalMaintWO.product || globalMaintWO.item}
                  </span>
                  <span style={{
                    display: 'inline-block',
                    marginLeft: '10px',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: `${STATUS_COLOR[globalMaintWO.status] || '#6b7280'}20`,
                    color: STATUS_COLOR[globalMaintWO.status] || '#6b7280',
                  }}>
                    {globalMaintWO.status}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No Work Order selected — click to filter dashboards by Work Order</div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="secondary-btn"
          style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600' }}
          onClick={() => setShowWOSelector(true)}
        >
          {globalMaintWO ? '⟳ Change Work Order' : '+ Select Work Order'}
        </button>
      </div>

      {/* Dashboard metrics widgets */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Logged Checklists</span>
            <span className="metric-icon">🔧</span>
          </div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>
            {totalChecklists}
          </div>
          <div className="metric-footer text-muted" style={{ fontSize: '11px' }}>
            {globalMaintWO ? `For ${globalMaintWO.id}` : 'Checklists completed'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipment Monitored</span>
            <span className="metric-icon">⚙️</span>
          </div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>
            {`${eqCount} / ${MAINTENANCE_TEMPLATES.length}`}
          </div>
          <div className="metric-footer text-success" style={{ fontSize: '11px', color: eqCount >= MAINTENANCE_TEMPLATES.length ? 'var(--success)' : 'var(--warning)' }}>
            {eqCount >= MAINTENANCE_TEMPLATES.length ? '● All Operational' : `● ${MAINTENANCE_TEMPLATES.length - eqCount} Pending`}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Activity</span>
            <span className="metric-icon">⏱️</span>
          </div>
          <div className="metric-value" style={{ fontSize: '15px', fontWeight: '800', margin: '14px 0 13px 0', height: '24px', display: 'flex', alignItems: 'center' }}>
            {lastActivity}
          </div>
          <div className="metric-footer text-muted" style={{ fontSize: '11px' }}>Timestamp of last save</div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', paddingBottom: '2px' }}>
        {[
          { key: 'preventive', label: '⚙️ Daily Preventive Checklists' },
          { key: 'regular-breakdown', label: '🛠️ Regular Checks & Breakdowns' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              background: 'none',
              border: 'none',
              borderBottom: activeMaintSubTab === tab.key ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeMaintSubTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
            onClick={() => setActiveMaintSubTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeMaintSubTab === 'preventive' && (
        <>
          {/* Header + search + view toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Available Daily Preventive Checklists</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}>🔍</span>
                <input
                  className="form-input"
                  style={{ paddingLeft: '32px', height: '34px', width: '200px', fontSize: '12px' }}
                  placeholder="Search equipment..."
                  value={checklistSearch}
                  onChange={e => setChecklistSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setMaintViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                className="secondary-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', height: '34px' }}
              >
                {maintViewMode === 'grid' ? '📋 List View' : '🎚️ Grid View'}
              </button>
            </div>
          </div>

          {maintViewMode === 'grid' ? (
            // ── GRID VIEW ──────────────────────────────────────────────────────
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {filteredTemplates.map((tpl) => {
                const matchesTemplate = (r) => {
                  if (!r || !tpl) return false;
                  const recTplId = (r.templateId || '').toLowerCase().trim();
                  const tplId = (tpl.id || '').toLowerCase().trim();
                  const recEq = (r.equipment || r.name || '').toLowerCase().trim();
                  const tplEq = (tpl.equipment || '').toLowerCase().trim();
                  return (
                    recTplId === tplId ||
                    recEq === tplEq ||
                    recTplId === tplEq ||
                    (recEq && tplEq && (recEq.includes(tplEq) || tplEq.includes(recEq)))
                  );
                };

                const originalIdx = MAINTENANCE_TEMPLATES.findIndex(t => t.id === tpl.id);
                const doneForWO = globalMaintWO && maintenanceRecords.some(r =>
                  matchesTemplate(r) && (
                    (r.workOrder && r.workOrder === globalMaintWO.id) ||
                    (r.work_order && r.work_order === globalMaintWO.id)
                  )
                );
                return (
                  <div
                    key={tpl.id}
                    className="inv-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderLeft: doneForWO ? '4px solid var(--success)' : '4px solid transparent',
                      transition: 'all 0.2s ease',
                      cursor: 'default',
                      opacity: doneForWO ? 0.75 : 1,
                      filter: doneForWO ? 'grayscale(0.15)' : 'none'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: doneForWO ? 'var(--success)' : 'var(--warning)'
                        }} />
                        <span className="badge" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'var(--accent)', fontSize: '10px', fontWeight: 'bold', padding: '3px 7px', borderRadius: '4px' }}>
                          {tpl.area}
                        </span>
                        {doneForWO && <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '700' }}>✓ Completed</span>}
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-heading)' }}>{tpl.equipment}</h4>
                      <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>
                        {tpl.tasks.length} check points • {(tpl.days || []).join(', ') || 'Daily'} sequence
                      </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: doneForWO ? 'var(--success)' : 'var(--warning)' }}>
                        {doneForWO ? '✓ Submitted' : '⏳ Pending'}
                      </span>
                      <button
                        type="button"
                        className="primary-btn"
                        disabled={doneForWO}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          opacity: doneForWO ? 0.6 : 1,
                          cursor: doneForWO ? 'not-allowed' : 'pointer',
                          backgroundColor: doneForWO ? 'var(--text-muted, #9ca3af)' : 'var(--primary)',
                          borderColor: doneForWO ? 'var(--text-muted, #9ca3af)' : 'var(--primary)'
                        }}
                        onClick={() => {
                          if (doneForWO) return;
                          const todayStr = new Date().toISOString().substring(0, 10);
                          const weekNo = getWeekNumber(new Date()).toString();
                          setActiveMaintTemplate(originalIdx);
                          setMaintWeekNo(weekNo);
                          setMaintFromDate(todayStr);
                          setMaintToDate(todayStr);
                          setMaintCheckgrid({});
                          setMaintRemarks({});
                          setMaintOperator('');
                          if (setMaintOperatorDisplay) setMaintOperatorDisplay('');
                          setMaintSupervisor('');
                          if (setMaintSupervisorDisplay) setMaintSupervisorDisplay('');
                          if (setMaintWorkOrder) setMaintWorkOrder(globalMaintWO ? globalMaintWO.id : '');
                        }}
                      >
                        {doneForWO ? '✓ Submitted' : '📝 Fill Checklist'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // ── LIST VIEW ──────────────────────────────────────────────────────
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '32px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', width: '16px' }}></th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '220px' }}>Equipment</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', width: '140px' }}>Area</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tasks</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', width: '160px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map(tpl => {
                    const matchesTemplate = (r) => {
                      if (!r || !tpl) return false;
                      const recTplId = (r.templateId || '').toLowerCase().trim();
                      const tplId = (tpl.id || '').toLowerCase().trim();
                      const recEq = (r.equipment || r.name || '').toLowerCase().trim();
                      const tplEq = (tpl.equipment || '').toLowerCase().trim();
                      return (
                        recTplId === tplId ||
                        recEq === tplEq ||
                        recTplId === tplEq ||
                        (recEq && tplEq && (recEq.includes(tplEq) || tplEq.includes(recEq)))
                      );
                    };

                    const originalIdx = MAINTENANCE_TEMPLATES.findIndex(t => t.id === tpl.id);
                    const doneForWO = globalMaintWO && maintenanceRecords.some(r =>
                      matchesTemplate(r) && (
                        (r.workOrder && r.workOrder === globalMaintWO.id) ||
                        (r.work_order && r.work_order === globalMaintWO.id)
                      )
                    );
                    const dotColor = doneForWO ? 'var(--success)' : 'var(--warning)';
                    return (
                      <tr
                        key={tpl.id}
                        style={{ borderBottom: '1px solid var(--border-color)', opacity: doneForWO ? 0.75 : 1, transition: 'background 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dotColor }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-heading)' }}>
                          {tpl.equipment}
                          {doneForWO && <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--success)', fontWeight: '700' }}>✓ Submitted</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'var(--accent)', fontSize: '10px', fontWeight: '700', padding: '3px 7px', borderRadius: '4px' }}>
                            {tpl.area}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                          {tpl.tasks.length} check points • {(tpl.days || []).join(', ') || 'Daily'} sequence
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="primary-btn"
                            disabled={doneForWO}
                            style={{
                              padding: '5px 12px',
                              fontSize: '11px',
                              opacity: doneForWO ? 0.6 : 1,
                              cursor: doneForWO ? 'not-allowed' : 'pointer',
                              backgroundColor: doneForWO ? 'var(--text-muted, #9ca3af)' : 'var(--primary)',
                              borderColor: doneForWO ? 'var(--text-muted, #9ca3af)' : 'var(--primary)'
                            }}
                            onClick={() => {
                              if (doneForWO) return;
                              const todayStr = new Date().toISOString().substring(0, 10);
                              const weekNo = getWeekNumber(new Date()).toString();
                              setActiveMaintTemplate(originalIdx);
                              setMaintWeekNo(weekNo);
                              setMaintFromDate(todayStr);
                              setMaintToDate(todayStr);
                              setMaintCheckgrid({});
                              setMaintRemarks({});
                              setMaintOperator('');
                              if (setMaintOperatorDisplay) setMaintOperatorDisplay('');
                              setMaintSupervisor('');
                              if (setMaintSupervisorDisplay) setMaintSupervisorDisplay('');
                            }}
                          >
                            {doneForWO ? '✓ Submitted' : '📝 Fill Checklist'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeMaintSubTab === 'regular-breakdown' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {/* Weight Check (Form 88) */}
          <div
            className="inv-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div>
              <span className="badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: 'var(--info)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>QUALITY CHECK</span>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>Form 88: Weight Check</h4>
              <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>Execute and log weights checks for finished products. Required twice daily.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button type="button" className="primary-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setActiveMaintForm('weight-check')}>📝 Log Weight Check</button>
            </div>
          </div>

          {/* Machine Breakdown */}
          <div
            className="inv-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div>
              <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>MAINTENANCE</span>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>Machine Breakdown Log</h4>
              <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>Log requests, maintenance actions, and production handovers for machine breakdowns.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button type="button" className="primary-btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setActiveMaintForm('breakdown')}>📝 Log Breakdown</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checklist Log History ─────────────────────────────────────────── */}
      <div className="dashboard-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Checklist Log History</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Work Order filter for history */}
            <select
              className="form-input"
              style={{ height: '34px', padding: '6px 10px', fontSize: '12px', minWidth: '200px' }}
              value={historyWOFilter}
              onChange={e => { setHistoryWOFilter(e.target.value); setMaintPage(1); }}
            >
              <option value="all">All Work Orders</option>
              {(workOrders || []).filter(wo => !['Cancelled'].includes(wo.status)).map(wo => (
                <option key={wo.id} value={wo.id}>{wo.id} — {wo.productName || wo.product || wo.item}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search logs..."
              className="form-input"
              style={{ width: '180px', height: '34px', padding: '6px 12px', fontSize: '12px' }}
              value={maintSearchQuery}
              onChange={(e) => setMaintSearchQuery(e.target.value)}
            />
            <select
              className="form-input"
              style={{ width: '160px', height: '34px', padding: '6px 12px', fontSize: '12px' }}
              value={maintFilterEquipment}
              onChange={(e) => setMaintFilterEquipment(e.target.value)}
            >
              <option value="All">All Equipments</option>
              {Array.from(new Set(MAINTENANCE_TEMPLATES.map(t => t.equipment))).map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
              <option value="Weight Check">Weight Check</option>
              <option value="Machine Breakdown">Machine Breakdown</option>
            </select>
          </div>
        </div>

        {/* ERP Log History Table */}
        {erpHistory !== null ? (
          historyLoading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading history…</div>
          ) : erpHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📂</div>
              <p>No checklist records found{historyWOFilter !== 'all' ? ` for ${historyWOFilter}` : ''}.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Equipment</th>
                    <th>Area</th>
                    <th>Work Order</th>
                    <th>Operator</th>
                    <th>Supervisor</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {erpHistory
                    .filter(rec => {
                      if (!maintSearchQuery) return true;
                      const q = maintSearchQuery.toLowerCase();
                      return (rec.name || '').toLowerCase().includes(q) ||
                        (rec.equipment || '').toLowerCase().includes(q) ||
                        (rec.work_order || '').toLowerCase().includes(q);
                    })
                    .filter(rec => maintFilterEquipment === 'All' || rec.equipment === maintFilterEquipment)
                    .slice((maintPage - 1) * 20, maintPage * 20)
                    .map(rec => (
                      <tr
                        key={rec.name}
                        style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                      >
                        <td style={{ fontWeight: '700', color: 'var(--accent)' }}>{rec.name}</td>
                        <td style={{ fontWeight: '600' }}>{rec.equipment}</td>
                        <td>{rec.area}</td>
                        <td>
                          {rec.work_order ? (
                            <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(251,191,36,0.1)', color: 'var(--accent)' }}>
                              {rec.work_order}
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
                        </td>
                        <td>👤 {rec.sign_of_the_operator || '—'}</td>
                        <td>👤 {rec.sign_of_supervisor || '—'}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{String(rec.creation).split(' ')[0]}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                <button type="button" className="secondary-btn" disabled={maintPage === 1} onClick={() => setMaintPage(p => Math.max(1, p - 1))}>◀ Prev</button>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Page {maintPage}</span>
                <button type="button" className="secondary-btn" disabled={erpHistory.length < 20} onClick={() => setMaintPage(p => p + 1)}>Next ▶</button>
              </div>
            </div>
          )
        ) : (
          /* Fall back to local records when not connected to ERPNext */
          filteredMaintRecords.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>No matching maintenance records found.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Log ID</th><th>Equipment</th><th>Area</th><th>Week No</th>
                      <th>Operator</th><th>Supervisor</th><th>Completion</th><th>Timestamp</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaintRecords.slice((maintPage - 1) * 20, maintPage * 20).map((rec) => (
                      <tr
                        key={rec.id}
                        style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                      >
                        <td style={{ fontWeight: '600' }}>{rec.id}</td>
                        <td style={{ fontWeight: '600' }}>{rec.equipment}</td>
                        <td>{rec.area}</td>
                        <td style={{ fontWeight: '600' }}>{rec.weekNo ? `Wk ${rec.weekNo}` : 'N/A'}</td>
                        <td>👤 {rec.operator || 'Not Signed'}</td>
                        <td>👤 {rec.supervisor || 'Not Signed'}</td>
                        <td>
                          <span className="badge badge-completed" style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px' }}>
                            {rec.totalChecked} / {rec.maxPossible} ({Math.round((rec.totalChecked / (rec.maxPossible || 1)) * 100)}%)
                          </span>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rec.timestamp}</td>
                        <td>
                          <button type="button" className="secondary-btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setViewingRecord(rec)}>👁️ View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                <button type="button" className="secondary-btn" disabled={maintPage === 1} onClick={() => setMaintPage(p => Math.max(1, p - 1))}>◀ Previous</button>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Page {maintPage} of {Math.max(1, Math.ceil(filteredMaintRecords.length / 20))}</span>
                <button type="button" className="secondary-btn" disabled={maintPage >= Math.ceil(filteredMaintRecords.length / 20)} onClick={() => setMaintPage(p => p + 1)}>Next ▶</button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}