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
                      <input type="date" className="form-input" style={{ height: '28px' }} required value={row.date} onChange={e => handleRowChange(idx, 'date', e.target.value)} />
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
                    <input type="date" className="form-input" value={breakdownDate} onChange={e => setBreakdownDate(e.target.value)} />
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
                    <input type="date" className="form-input" value={dateRepaired} onChange={e => setDateRepaired(e.target.value)} />
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
  setActiveMaintForm,
  maintPage,
  setMaintPage,
  setViewingRecord
}) {
  return (
              <div className="maintenance-tab-container">
            <div className="tab-title-desc">
              <h2>Preventive Maintenance Operations</h2>
              <p>Execute, log, and view status dashboards for Fiji Bottling Plant daily preventive maintenance schedules.</p>
            </div>

            {/* Dashboard metrics widgets */}
            <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Logged Checklists</span>
                  <span className="metric-icon">🔧</span>
                </div>
                <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>{maintenanceRecords.length}</div>
                <div className="metric-footer text-muted" style={{ fontSize: '11px' }}>Checklists completed</div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipment Monitored</span>
                  <span className="metric-icon">⚙️</span>
                </div>
                <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>
                  {Array.from(new Set(MAINTENANCE_TEMPLATES.map(t => t.equipment))).length} / {Array.from(new Set(MAINTENANCE_TEMPLATES.map(t => t.equipment))).length}
                </div>
                <div className="metric-footer text-success" style={{ fontSize: '11px', color: 'var(--success)' }}>● All Operational</div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Task Checks</span>
                  <span className="metric-icon">✓</span>
                </div>
                <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>
                  {maintenanceRecords.reduce((sum, r) => sum + (r.totalChecked || 0), 0)}
                </div>
                <div className="metric-footer text-muted" style={{ fontSize: '11px' }}>Completed check items</div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Activity</span>
                  <span className="metric-icon">⏱️</span>
                </div>
                <div className="metric-value" style={{ fontSize: '15px', fontWeight: '800', margin: '14px 0 13px 0', height: '24px', display: 'flex', alignItems: 'center' }}>
                  {maintenanceRecords[0] ? maintenanceRecords[0].timestamp.split(' ')[0] : 'No logs yet'}
                </div>
                <div className="metric-footer text-muted" style={{ fontSize: '11px' }}>Timestamp of last save</div>
              </div>
            </div>

            {/* Sub-Tabs selection bar for Maintenance */}
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', paddingBottom: '2px' }}>
              <button
                type="button"
                className={`tab-btn ${activeMaintSubTab === 'preventive' ? 'active' : ''}`}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeMaintSubTab === 'preventive' ? '3px solid var(--accent)' : 'none',
                  color: activeMaintSubTab === 'preventive' ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveMaintSubTab('preventive')}
              >
                ⚙️ Daily Preventive Checklists
              </button>
              <button
                type="button"
                className={`tab-btn ${activeMaintSubTab === 'regular-breakdown' ? 'active' : ''}`}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeMaintSubTab === 'regular-breakdown' ? '3px solid var(--accent)' : 'none',
                  color: activeMaintSubTab === 'regular-breakdown' ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveMaintSubTab('regular-breakdown')}
              >
                🛠️ Regular Checks & Breakdowns
              </button>
            </div>

            {activeMaintSubTab === 'preventive' && (
              <>
                {/* Main view container: Templates select list */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Available Daily Preventive Checklists</h3>
                  <button
                    type="button"
                    onClick={() => setMaintViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                    className="secondary-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}
                  >
                    {maintViewMode === 'grid' ? '📋 List View' : '🎚️ Grid View'}
                  </button>
                </div>

                {maintViewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                    {MAINTENANCE_TEMPLATES.map((tpl) => {
                      const countMatched = maintenanceRecords.filter(r => r.templateId === tpl.id).length;
                      const originalIdx = MAINTENANCE_TEMPLATES.findIndex(t => t.id === tpl.id);
                      return (
                        <div key={tpl.id} className="inv-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
                          <div>
                            <span className="badge" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'var(--accent)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
                              {tpl.area}
                            </span>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>
                              {tpl.equipment}
                            </h4>
                            <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>
                              {tpl.tasks.length} check points • {tpl.days.join(', ')} sequence
                            </p>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '500' }}>Logs: {countMatched}</span>
                            <button
                              type="button"
                              className="primary-btn"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => {
                                const todayStr = new Date().toISOString().substring(0, 10);
                                const weekNo = getWeekNumber(new Date()).toString();
                                setActiveMaintTemplate(originalIdx);
                                setMaintWeekNo(weekNo);
                                setMaintFromDate(todayStr);
                                setMaintToDate(todayStr);
                                setMaintCheckgrid({});
                                setMaintRemarks({});
                                setMaintOperator('');
                                setMaintSupervisor('');
                              }}
                            >
                              📝 Fill Checklist
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '32px' }}>
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                          <th style={{ padding: '8px', textAlign: 'left', width: '220px' }}>Equipment Title</th>
                          <th style={{ padding: '8px', textAlign: 'left', width: '120px' }}>Area</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Tasks & sequence</th>
                          <th style={{ padding: '8px', textAlign: 'center', width: '150px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MAINTENANCE_TEMPLATES.map(tpl => {
                          const countMatched = maintenanceRecords.filter(r => r.templateId === tpl.id).length;
                          const originalIdx = MAINTENANCE_TEMPLATES.findIndex(t => t.id === tpl.id);
                          return (
                            <tr key={tpl.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px', fontWeight: '700' }}>{tpl.equipment}</td>
                              <td style={{ padding: '8px' }}>
                                <span className="badge" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'var(--accent)', fontSize: '10px', padding: '3px 6px', borderRadius: '4px' }}>
                                  {tpl.area}
                                </span>
                              </td>
                              <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                                {tpl.tasks.length} check points • {tpl.days.join(', ')} sequence
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: '600' }}>Logs: {countMatched}</span>
                                  <button
                                    type="button"
                                    className="primary-btn"
                                    style={{ padding: '6px 14px', fontSize: '12px' }}
                                    onClick={() => {
                                      const todayStr = new Date().toISOString().substring(0, 10);
                                      const weekNo = getWeekNumber(new Date()).toString();
                                      setActiveMaintTemplate(originalIdx);
                                      setMaintWeekNo(weekNo);
                                      setMaintFromDate(todayStr);
                                      setMaintToDate(todayStr);
                                      setMaintCheckgrid({});
                                      setMaintRemarks({});
                                      setMaintOperator('');
                                      setMaintSupervisor('');
                                    }}
                                  >
                                    📝 Fill Checklist
                                  </button>
                                </div>
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
                <div className="inv-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
                  <div>
                    <span className="badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: 'var(--info)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
                      QUALITY CHECK
                    </span>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>
                      Form 88: Weight Check
                    </h4>
                    <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>
                      Execute and log weights checks for finished products. Required twice daily.
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '500' }}>Logs: {maintenanceRecords.filter(r => r.templateId === 'weight-check').length}</span>
                    <button
                      type="button"
                      className="primary-btn"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => setActiveMaintForm('weight-check')}
                    >
                      📝 Log Weight Check
                    </button>
                  </div>
                </div>

                {/* Machine Breakdown */}
                <div className="inv-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
                  <div>
                    <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
                      MAINTENANCE
                    </span>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>
                      Machine Breakdown Log
                    </h4>
                    <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>
                      Log requests, maintenance actions, and production handovers for machine breakdowns.
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '500' }}>Logs: {maintenanceRecords.filter(r => r.templateId === 'breakdown').length}</span>
                    <button
                      type="button"
                      className="primary-btn"
                      style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => setActiveMaintForm('breakdown')}
                    >
                      📝 Log Breakdown
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* History Log Table */}
            <div className="dashboard-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Checklist Log History</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Search by Log ID, Oper., Superv. ..."
                    className="form-input"
                    style={{ width: '220px', height: '34px', padding: '6px 12px', fontSize: '12px' }}
                    value={maintSearchQuery}
                    onChange={(e) => setMaintSearchQuery(e.target.value)}
                  />
                  <select
                    className="form-input"
                    style={{ width: '180px', height: '34px', padding: '6px 12px', fontSize: '12px' }}
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

              {filteredMaintRecords.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>
                  No matching maintenance records found.
                </p>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Log ID</th>
                          <th>Equipment</th>
                          <th>Area</th>
                          <th>Week No</th>
                          <th>Operator</th>
                          <th>Supervisor</th>
                          <th>Completion</th>
                          <th>Timestamp</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMaintRecords.slice((maintPage - 1) * 20, maintPage * 20).map((rec) => (
                          <tr key={rec.id}>
                            <td style={{ fontWeight: '600' }}>{rec.id}</td>
                            <td style={{ fontWeight: '600' }}>{rec.equipment}</td>
                            <td>{rec.area}</td>
                            <td style={{ fontWeight: '600' }}>{rec.weekNo ? `Wk ${rec.weekNo}` : 'N/A'}</td>
                            <td>👤 {rec.operator || 'Not Signed'}</td>
                            <td>👤 {rec.supervisor || 'Not Signed'}</td>
                            <td>
                              {rec.templateId === 'weight-check' ? (
                                <span className="badge badge-completed" style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                                  Logged Weight Check
                                </span>
                              ) : rec.templateId === 'breakdown' ? (
                                <span className="badge badge-completed" style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                                  Breakdown Logged
                                </span>
                              ) : (
                                <span className="badge badge-completed" style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px' }}>
                                  {rec.totalChecked} / {rec.maxPossible} checks ({Math.round((rec.totalChecked / (rec.maxPossible || 1)) * 100)}%)
                                </span>
                              )}
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rec.timestamp}</td>
                            <td>
                              <button
                                type="button"
                                className="secondary-btn"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => setViewingRecord(rec)}
                              >
                                👁️ View Report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Maintenance Pagination */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={maintPage === 1}
                      onClick={() => setMaintPage(prev => Math.max(1, prev - 1))}
                    >
                      ◀ Previous
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>
                      Page {maintPage} of {Math.max(1, Math.ceil(filteredMaintRecords.length / 20))}
                    </span>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={maintPage === Math.max(1, Math.ceil(filteredMaintRecords.length / 20))}
                      onClick={() => setMaintPage(prev => Math.min(Math.max(1, Math.ceil(filteredMaintRecords.length / 20)), prev + 1))}
                    >
                      Next ▶
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
  );
}