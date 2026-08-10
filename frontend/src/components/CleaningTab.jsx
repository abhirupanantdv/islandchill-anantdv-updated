import React, { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';

export const CLEANING_TEMPLATES = [
  { id: 'toilet-clean', name: 'Cleaning of Toilets', doctype: 'Cleaning of Toilets', description: 'Log daily toilet sanitation status.' },
  { id: 'toilet-purpose', name: 'Toilet Cleaning Purpose', doctype: 'Toilet Cleaning purpose', description: 'Log toilet cleaning purpose details.' },
  { id: 'dining-clean', name: 'Cleaning of Dining Room', doctype: 'Cleaning of Dining Room', description: 'Log daily dining room sanitation status.' },
  { id: 'dining-purpose', name: 'Dining Room Cleaning Purpose', doctype: 'Dining Room Cleaning Purpose', description: 'Log dining room cleaning purpose details.' },
  { id: 'floor-clean', name: 'Factory Floor Cleaning', doctype: 'Factory Floor', description: 'Log factory floor cleaning checklist.' },
  { id: 'floor-purpose', name: 'Factory Floor Cleaning Purpose', doctype: 'Factory Floor Cleaning Purpose', description: 'Log factory floor cleaning standards.' },
  { id: 'lab-office-clean', name: 'Cleaning of Lab and Office', doctype: 'Cleaning of Lab and Office', description: 'Log daily laboratory & office cleaning logs.' },
  { id: 'lab-office-purpose', name: 'Lab and Office Cleaning Purpose', doctype: 'Lab and Office Cleaning Purpose', description: 'Log lab & office cleaning purpose details.' },
  { id: 'incubator-temp', name: 'Incubator Temperature Record', doctype: 'Incubator Temperature Record', description: 'Record incubator daily temp & humidity logs.' },
  { id: 'balance-calib', name: 'Balance Check or Calibration', doctype: 'Balance Check or Callibration', description: 'Record balance check metrics & calibration variance.' },
  { id: 'sanitation', name: 'Equipment Sanitation & CIP', doctype: 'equipment sanitation and cip', description: 'Log chemical sanitation levels and contact times.' }
];

export function CleaningFormModal({ templateId, onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, setActiveSearchField }) {
  const template = CLEANING_TEMPLATES.find(t => t.id === templateId);
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [postingTime, setPostingTime] = useState(new Date().toTimeString().slice(0, 5));

  // Cleaner / Checker autocomplete
  const [cleanerSearch, setCleanerSearch] = useState('');
  const [cleaner, setCleaner] = useState('');
  const [cleanerId, setCleanerId] = useState('');

  // Supervisor autocomplete
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [supervisorId, setSupervisorId] = useState('');

  // Balance cleaning done by autocomplete
  const [balanceCleanerSearch, setBalanceCleanerSearch] = useState('');
  const [balanceCleaner, setBalanceCleaner] = useState('');
  const [balanceCleanerId, setBalanceCleanerId] = useState('');

  const [formData, setFormData] = useState({});

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest && !e.target.closest('.form-group') && !e.target.closest('.autocomplete-dropdown') && !e.target.closest('.dropdown-item')) {
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
  const [purposesList, setPurposesList] = useState([]);
  const [selectedPurposes, setSelectedPurposes] = useState({});
  const [loadingPurposes, setLoadingPurposes] = useState(false);
  const [eqList, setEqList] = useState([]);
  const [chemTestsList, setChemTestsList] = useState([]);

  useEffect(() => {
    async function fetchPurposes() {
      if (templateId === 'toilet-clean' || templateId === 'toilet-purpose') {
        setLoadingPurposes(true);
        try {
          const list = await frappe.getToiletCleaningPurposes();
          setPurposesList(list || []);
          const initial = {};
          (list || []).forEach(p => {
            initial[p.name] = true;
          });
          setSelectedPurposes(initial);

          if (templateId === 'toilet-purpose') {
            const defaultPurpose = list && list.length > 0 ? list[0].name : '';
            setFormData(prev => ({
              ...prev,
              purpose: defaultPurpose
            }));
          }
        } catch (e) {
          console.error("Failed to load toilet cleaning purposes:", e);
        } finally {
          setLoadingPurposes(false);
        }
      } else if (templateId === 'dining-clean' || templateId === 'dining-purpose') {
        setLoadingPurposes(true);
        try {
          const list = await frappe.getDiningRoomCleaningPurposes();
          setPurposesList(list || []);
          const initial = {};
          (list || []).forEach(p => {
            initial[p.name] = true;
          });
          setSelectedPurposes(initial);

          if (templateId === 'dining-purpose') {
            const defaultPurpose = list && list.length > 0 ? list[0].name : '';
            setFormData(prev => ({
              ...prev,
              purpose: defaultPurpose
            }));
          }
        } catch (e) {
          console.error("Failed to load dining room cleaning purposes:", e);
        } finally {
          setLoadingPurposes(false);
        }
      } else if (templateId === 'floor-clean') {
        setLoadingPurposes(true);
        try {
          const list = await frappe.getFactoryFloorCleaningPurposes();
          setPurposesList(list || []);
          const initial = {};
          (list || []).forEach(p => {
            initial[p.name] = true;
          });
          setSelectedPurposes(initial);
        } catch (e) {
          console.error("Failed to load factory floor cleaning purposes:", e);
        } finally {
          setLoadingPurposes(false);
        }
      } else if (templateId === 'lab-office-clean') {
        setLoadingPurposes(true);
        try {
          const list = await frappe.getLabOfficeCleaningPurposes();
          setPurposesList(list || []);
          const initial = {};
          (list || []).forEach(p => {
            initial[p.name] = true;
          });
          setSelectedPurposes(initial);
        } catch (e) {
          console.error("Failed to load lab and office cleaning purposes:", e);
        } finally {
          setLoadingPurposes(false);
        }
      } else if (templateId === 'sanitation') {
        setLoadingPurposes(true);
        try {
          const [eqs, chems] = await Promise.all([
            frappe.getEquipmentList(),
            frappe.getChemicalTests()
          ]);
          setEqList(eqs || []);
          setChemTestsList(chems || []);
          
          const defaultEq = eqs && eqs.length > 0 ? eqs[0].name : 'Syrup Tank';
          const defaultChem = chems && chems.length > 0 ? chems[0].name : '';
          setFormData(prev => ({
            ...prev,
            equipment_sanitized: defaultEq,
            chemical_used: defaultChem,
            concentration_ppm: 200,
            contact_time_mins: 15,
            status: 'Satisfactory'
          }));
        } catch (e) {
          console.error("Failed to load sanitation dropdowns:", e);
        } finally {
          setLoadingPurposes(false);
        }
      }
    }
    fetchPurposes();
  }, [templateId]);

  useEffect(() => {
    // Set default values based on template type
    if (templateId === 'toilet-clean') {
      setFormData({ soap_refilled: 'YES', toilet_paper_refilled: 'YES', floor_mopped: 'YES', trash_emptied: 'YES', disinfected: 'YES', status: 'Clean' });
    } else if (templateId === 'toilet-purpose') {
      setFormData({ purpose: 'Regular toilet sanitization and cleanliness maintenance', frequency: 'Daily', cleaning_agent_used: 'Sodium Hypochlorite 5%' });
    } else if (templateId === 'dining-clean') {
      setFormData({ tables_cleaned: 'YES', floor_swept_mopped: 'YES', trash_emptied: 'YES', status: 'Clean' });
    } else if (templateId === 'dining-purpose') {
      setFormData({ purpose: 'Dining room sanitation and tables disinfection', frequency: 'Daily', cleaning_agent_used: 'Diversey Quat Sanitizer' });
    } else if (templateId === 'floor-clean') {
      setFormData({ area: 'Bottling Line', swept_scrubbed: 'YES', spillages_cleared: 'YES', drains_cleaned: 'YES', status: 'Clean' });
    } else if (templateId === 'floor-purpose') {
      setFormData({ purpose: 'Factory floor scrubbing & hygiene standard compliance', frequency: 'Shift-wise', cleaning_agent_used: 'Caustic floor cleaner' });
    } else if (templateId === 'lab-office-clean') {
      setFormData({ desk_surfaces_wiped: 'YES', floor_vacuumed_mopped: 'YES', bins_emptied: 'YES', status: 'Clean' });
    } else if (templateId === 'lab-office-purpose') {
      setFormData({ purpose: 'Laboratory bench space & office sanitation', frequency: 'Daily', cleaning_agent_used: 'Isopropyl Alcohol 70%' });
    } else if (templateId === 'incubator-temp') {
      setFormData({ time: new Date().toTimeString().slice(0, 5), incubator_1: '37.0', time_2: new Date().toTimeString().slice(0, 5), incubator_2: '37.0', remarks: '' });
    } else if (templateId === 'balance-calib') {
      setFormData({ weight_10g: 10.0, weight_20g: 20.0, weight_50g: 50.0, tolerance: '(+/- 2%)', using: 'soft brush', status: 'Pass' });
    } else if (templateId === 'sanitation') {
      setFormData({ equipment_sanitized: 'Syrup Tank', chemical_used: 'Chlorine', concentration_ppm: 200, contact_time_mins: 15, status: 'Satisfactory' });
    }
  }, [templateId]);

  const handleCheckboxChange = (key) => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key] === 'YES' ? 'NO' : 'YES'
    }));
  };

  const handleInputChange = (key, val) => {
    setFormData(prev => {
      const updated = { ...prev, [key]: val };
      // Auto-compute status if weight fields changed in balance calibration based on +/- 2% tolerance
      if (templateId === 'balance-calib' && (key === 'weight_10g' || key === 'weight_20g' || key === 'weight_50g')) {
        const w10 = parseFloat(key === 'weight_10g' ? val : prev.weight_10g) || 0;
        const w20 = parseFloat(key === 'weight_20g' ? val : prev.weight_20g) || 0;
        const w50 = parseFloat(key === 'weight_50g' ? val : prev.weight_50g) || 0;
        const w10_pass = Math.abs(w10 - 10) <= 0.2;
        const w20_pass = Math.abs(w20 - 20) <= 0.4;
        const w50_pass = Math.abs(w50 - 50) <= 1.0;
        updated.status = (w10_pass && w20_pass && w50_pass) ? 'Pass' : 'Fail';
      }
      return updated;
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const finalData = {
      posting_date: postingDate,
      posting_time: postingTime,
      ...formData
    };
    if (templateId === 'incubator-temp') {
      if (!cleaner) { alert('Please select inspector name.'); return; }
      finalData.recorded_by = cleaner;
      finalData.cleanerId = cleanerId;
    } else if (templateId === 'balance-calib') {
      if (!cleaner) { alert('Please select checking officer name.'); return; }
      finalData.checked_by = cleaner;
      finalData.checkedById = cleanerId;
      if (!balanceCleaner) { alert('Please select who performed cleaning of the balance.'); return; }
      finalData.cleaning_of_the_balance_done_by = balanceCleaner;
      finalData.balanceCleanerId = balanceCleanerId;
    } else if (templateId === 'sanitation') {
      if (!cleaner) { alert('Please select operator name.'); return; }
      finalData.performed_by = cleaner;
      finalData.cleanerId = cleanerId;
      if (supervisor) {
        finalData.supervisor = supervisor;
        finalData.supervisorId = supervisorId;
      }
    } else {
      // Cleaning checklists
      if (!cleaner) { alert('Please select cleaner name.'); return; }
      finalData.cleaner = cleaner;
      finalData.cleanerId = cleanerId;
      if (supervisor) {
        finalData.supervisor = supervisor;
        finalData.supervisorId = supervisorId;
      }
    }
    if (templateId === 'toilet-clean' || templateId === 'dining-clean' || templateId === 'floor-clean' || templateId === 'lab-office-clean') {
      const activePurposes = Object.keys(selectedPurposes).filter(k => selectedPurposes[k]);
      if (activePurposes.length === 0 && purposesList.length > 0) {
        alert('Please select at least one cleaning purpose.');
        return;
      }
      finalData.selectedPurposes = activePurposes;
    }
    onSubmit(finalData);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setShowEmployeeDropdown(false)}>
      <div className="modal-panel" style={{ width: '550px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>🧹 {template?.name}</h3>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleFormSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', fontSize: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="input-label">Date *</label>
                <input type="date" className="text-input" required value={postingDate} onChange={e => setPostingDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">Time *</label>
                <input type="time" className="text-input" required value={postingTime} onChange={e => setPostingTime(e.target.value)} />
              </div>
            </div>

            {/* Operator/Cleaner field */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="input-label" style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {templateId === 'incubator-temp' ? 'Recorded By (Analyst/Chemist) *' :
                    templateId === 'balance-calib' ? 'Checked By (Officer/Tech) *' :
                      templateId === 'sanitation' ? 'Performed By (Operator) *' : 'Cleaner Name *'}
                </span>
                {cleanerId && (
                  <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '700', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    ✓ {cleanerId}
                  </span>
                )}
              </label>
              <input
                type="text"
                className="text-input"
                required
                placeholder="Search employee name or ID..."
                value={cleanerSearch}
                onChange={e => {
                  const val = e.target.value;
                  setCleanerSearch(val);
                  setCleaner(val);
                  setCleanerId('');
                  if (handleSearchEmployees) handleSearchEmployees(val, 'cleaner');
                  setActiveSearchField('cleaner');
                  setShowEmployeeDropdown(true);
                }}
                onFocus={() => {
                  if (handleSearchEmployees && employeeList.length === 0) handleSearchEmployees('', 'cleaner');
                  setActiveSearchField('cleaner');
                  setShowEmployeeDropdown(true);
                }}
              />
              {showEmployeeDropdown && activeSearchField === 'cleaner' && (
                <div
                  className="autocomplete-dropdown"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 99999,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    padding: '4px'
                  }}
                >
                  {employeeList.length === 0 ? (
                    <div style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      No matching employees found
                    </div>
                  ) : (
                    employeeList.map(emp => (
                      <div
                        key={emp.name}
                        className="dropdown-item"
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '2px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        onMouseDown={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          const fullName = emp.employee_name || emp.name;
                          setCleanerSearch(`${fullName} (${emp.name})`);
                          setCleaner(fullName);
                          setCleanerId(emp.name);
                          setShowEmployeeDropdown(false);
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          const fullName = emp.employee_name || emp.name;
                          setCleanerSearch(`${fullName} (${emp.name})`);
                          setCleaner(fullName);
                          setCleanerId(emp.name);
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                          {(emp.employee_name || emp.name || 'E').substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{emp.employee_name || emp.name}</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>{emp.name}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.designation || 'Staff'} {emp.department ? `• ${emp.department}` : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Supervisor field (where applicable) */}
            {['toilet-clean', 'dining-clean', 'floor-clean', 'lab-office-clean', 'sanitation'].includes(templateId) && (
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="input-label" style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Verified By (Supervisor)</span>
                  {supervisorId && (
                    <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '700', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      ✓ {supervisorId}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Search employee name or ID..."
                  value={supervisorSearch}
                  onChange={e => {
                    const val = e.target.value;
                    setSupervisorSearch(val);
                    setSupervisor(val);
                    setSupervisorId('');
                    if (handleSearchEmployees) handleSearchEmployees(val, 'supervisor');
                    setActiveSearchField('supervisor');
                    setShowEmployeeDropdown(true);
                  }}
                  onFocus={() => {
                    if (handleSearchEmployees && employeeList.length === 0) handleSearchEmployees('', 'supervisor');
                    setActiveSearchField('supervisor');
                    setShowEmployeeDropdown(true);
                  }}
                />
                {showEmployeeDropdown && activeSearchField === 'supervisor' && (
                  <div
                    className="autocomplete-dropdown"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      zIndex: 99999,
                      maxHeight: '180px',
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                      padding: '4px'
                    }}
                  >
                    {employeeList.length === 0 ? (
                      <div style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No matching employees found
                      </div>
                    ) : (
                      employeeList.map(emp => (
                        <div
                          key={emp.name}
                          className="dropdown-item"
                          style={{
                            padding: '8px 10px',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '2px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          onMouseDown={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const fullName = emp.employee_name || emp.name;
                            setSupervisorSearch(`${fullName} (${emp.name})`);
                            setSupervisor(fullName);
                            setSupervisorId(emp.name);
                            setShowEmployeeDropdown(false);
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            const fullName = emp.employee_name || emp.name;
                            setSupervisorSearch(`${fullName} (${emp.name})`);
                            setSupervisor(fullName);
                            setSupervisorId(emp.name);
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                            {(emp.employee_name || emp.name || 'E').substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{emp.employee_name || emp.name}</span>
                              <span style={{ fontSize: '10px', fontWeight: '700', color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>{emp.name}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {emp.designation || 'Staff'} {emp.department ? `• ${emp.department}` : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dynamic content for toilet clean */}
            {templateId === 'toilet-clean' && (
              <>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <label className="input-label" style={{ fontWeight: '700', marginBottom: '4px' }}>Select Toilet Cleaning Purposes *</label>
                  {loadingPurposes ? (
                    <div>Loading purposes...</div>
                  ) : purposesList.length === 0 ? (
                    <div style={{ color: 'var(--danger)', fontWeight: '600' }}>
                      ⚠️ No toilet cleaning purposes found. Please add a purpose first using the "Toilet Cleaning Purpose" form.
                    </div>
                  ) : (
                    purposesList.map(p => (
                      <label key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedPurposes[p.name]}
                          onChange={() => setSelectedPurposes(prev => ({ ...prev, [p.name]: !prev[p.name] }))}
                        />
                        {p.name}
                      </label>
                    ))
                  )}
                </div>
                <div className="form-group">
                  <label className="input-label">Cleaning Status</label>
                  <select className="text-input" value={formData.status || 'Clean'} onChange={e => handleInputChange('status', e.target.value)}>
                    <option value="Clean">Clean (OK)</option>
                    <option value="Needs Attention">Needs Attention</option>
                  </select>
                </div>
              </>
            )}

            {/* Toilet purpose / Dining purpose / Floor purpose / Lab purpose */}
            {['toilet-purpose', 'dining-purpose', 'floor-purpose', 'lab-office-purpose'].includes(templateId) && (
              <>
                <div className="form-group">
                  <label className="input-label">Cleaning Purpose *</label>
                  <textarea className="text-input" required style={{ minHeight: '60px' }} value={formData.purpose || ''} onChange={e => handleInputChange('purpose', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="input-label">Frequency *</label>
                    <select className="text-input" value={formData.frequency || 'Daily'} onChange={e => handleInputChange('frequency', e.target.value)}>
                      <option value="Daily">Daily</option>
                      <option value="Shift-wise">Shift-wise</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-weekly">Bi-weekly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Cleaning Agent Used *</label>
                    <input type="text" className="text-input" required value={formData.cleaning_agent_used || ''} onChange={e => handleInputChange('cleaning_agent_used', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="input-label">Additional Notes</label>
                  <textarea className="text-input" style={{ minHeight: '40px' }} value={formData.notes || ''} onChange={e => handleInputChange('notes', e.target.value)} />
                </div>
              </>
            )}

            {/* Dining clean */}
            {templateId === 'dining-clean' && (
              <>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <label className="input-label" style={{ fontWeight: '700', marginBottom: '4px' }}>Select Dining Room Cleaning Purposes *</label>
                  {loadingPurposes ? (
                    <div>Loading purposes...</div>
                  ) : purposesList.length === 0 ? (
                    <div style={{ color: 'var(--danger)', fontWeight: '600' }}>
                      ⚠️ No dining room cleaning purposes found. Please add a purpose first using the "Dining Room Cleaning Purpose" form.
                    </div>
                  ) : (
                    purposesList.map(p => (
                      <label key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedPurposes[p.name]}
                          onChange={() => setSelectedPurposes(prev => ({ ...prev, [p.name]: !prev[p.name] }))}
                        />
                        {p.name}
                      </label>
                    ))
                  )}
                </div>
                <div className="form-group">
                  <label className="input-label">Sanitation Status</label>
                  <select className="text-input" value={formData.status || 'Clean'} onChange={e => handleInputChange('status', e.target.value)}>
                    <option value="Clean">Clean (OK)</option>
                    <option value="Needs Attention">Needs Attention</option>
                  </select>
                </div>
              </>
            )}

            {/* Factory floor clean */}
            {templateId === 'floor-clean' && (
              <>
                <div className="form-group">
                  <label className="input-label">Factory Area Zone *</label>
                  <select className="text-input" value={formData.area || 'Bottling Line'} onChange={e => handleInputChange('area', e.target.value)}>
                    <option value="Bottling Line">Bottling Line (CSD/RTD)</option>
                    <option value="Blowing Section">Blowing Section</option>
                    <option value="Warehouse">Warehouse & Dispatch</option>
                    <option value="Mixing Room">Syrup / Mixing Room</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <label className="input-label" style={{ fontWeight: '700', marginBottom: '4px' }}>Select Factory Floor Cleaning Purposes *</label>
                  {loadingPurposes ? (
                    <div>Loading purposes...</div>
                  ) : purposesList.length === 0 ? (
                    <div style={{ color: 'var(--danger)', fontWeight: '600' }}>
                      ⚠️ No factory floor cleaning purposes found. Please add a purpose first using the "Factory Floor Cleaning Purpose" form.
                    </div>
                  ) : (
                    purposesList.map(p => (
                      <label key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedPurposes[p.name]}
                          onChange={() => setSelectedPurposes(prev => ({ ...prev, [p.name]: !prev[p.name] }))}
                        />
                        {p.name}
                      </label>
                    ))
                  )}
                </div>
                <div className="form-group">
                  <label className="input-label">Floor Status</label>
                  <select className="text-input" value={formData.status || 'Clean'} onChange={e => handleInputChange('status', e.target.value)}>
                    <option value="Clean">Clean (OK)</option>
                    <option value="Needs Attention">Needs Attention</option>
                  </select>
                </div>
              </>
            )}

            {/* Lab and office clean */}
            {templateId === 'lab-office-clean' && (
              <>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <label className="input-label" style={{ fontWeight: '700', marginBottom: '4px' }}>Select Lab & Office Cleaning Purposes *</label>
                  {loadingPurposes ? (
                    <div>Loading purposes...</div>
                  ) : purposesList.length === 0 ? (
                    <div style={{ color: 'var(--danger)', fontWeight: '600' }}>
                      ⚠️ No lab and office cleaning purposes found. Please add a purpose first using the "Lab and Office Cleaning Purpose" form.
                    </div>
                  ) : (
                    purposesList.map(p => (
                      <label key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedPurposes[p.name]}
                          onChange={() => setSelectedPurposes(prev => ({ ...prev, [p.name]: !prev[p.name] }))}
                        />
                        {p.name}
                      </label>
                    ))
                  )}
                </div>
                <div className="form-group">
                  <label className="input-label">Sanitation Status</label>
                  <select className="text-input" value={formData.status || 'Clean'} onChange={e => handleInputChange('status', e.target.value)}>
                    <option value="Clean">Clean (OK)</option>
                    <option value="Needs Attention">Needs Attention</option>
                  </select>
                </div>
              </>
            )}

            {/* Incubator temperature */}
            {templateId === 'incubator-temp' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-heading)', fontSize: '13px' }}>🌡️ Incubator No. 1</span>
                    <div className="form-group">
                      <label className="input-label">Check Time *</label>
                      <input
                        type="time"
                        className="text-input"
                        required
                        value={formData.time || ''}
                        onChange={e => handleInputChange('time', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Thermometer Reading (°C) *</label>
                      <input
                        type="text"
                        className="text-input"
                        required
                        value={formData.incubator_1 || ''}
                        onChange={e => handleInputChange('incubator_1', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-heading)', fontSize: '13px' }}>🌡️ Incubator No. 2</span>
                    <div className="form-group">
                      <label className="input-label">Check Time *</label>
                      <input
                        type="time"
                        className="text-input"
                        required
                        value={formData.time_2 || ''}
                        onChange={e => handleInputChange('time_2', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Thermometer Reading (°C) *</label>
                      <input
                        type="text"
                        className="text-input"
                        required
                        value={formData.incubator_2 || ''}
                        onChange={e => handleInputChange('incubator_2', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="input-label">Remarks</label>
                  <input
                    type="text"
                    className="text-input"
                    value={formData.remarks || ''}
                    onChange={e => handleInputChange('remarks', e.target.value)}
                    placeholder="Enter remarks..."
                  />
                </div>
              </>
            )}

            {/* Balance Calibration */}
            {templateId === 'balance-calib' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="input-label">10g weight reading = *</label>
                    <input type="number" step="any" className="text-input" required value={formData.weight_10g || ''} onChange={e => handleInputChange('weight_10g', parseFloat(e.target.value) || 0.0)} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">20g weight reading = *</label>
                    <input type="number" step="any" className="text-input" required value={formData.weight_20g || ''} onChange={e => handleInputChange('weight_20g', parseFloat(e.target.value) || 0.0)} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">50g weight reading = *</label>
                    <input type="number" step="any" className="text-input" required value={formData.weight_50g || ''} onChange={e => handleInputChange('weight_50g', parseFloat(e.target.value) || 0.0)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="input-label">Tolerance (Read Only)</label>
                    <input type="text" className="text-input" style={{ backgroundColor: '#f3f4f6' }} readOnly value={formData.tolerance || '(+/- 2%)'} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Using *</label>
                    <input type="text" className="text-input" required value={formData.using || 'soft brush'} onChange={e => handleInputChange('using', e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="input-label" style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Cleaning of the Balance done by *</span>
                    {balanceCleanerId && (
                      <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '700', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        ✓ {balanceCleanerId}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    className="text-input"
                    required
                    placeholder="Search employee name or ID..."
                    value={balanceCleanerSearch}
                    onChange={e => {
                      const val = e.target.value;
                      setBalanceCleanerSearch(val);
                      setBalanceCleaner(val);
                      setBalanceCleanerId('');
                      if (handleSearchEmployees) handleSearchEmployees(val, 'balanceCleaner');
                      setActiveSearchField('balanceCleaner');
                      setShowEmployeeDropdown(true);
                    }}
                    onFocus={() => {
                      if (handleSearchEmployees && employeeList.length === 0) handleSearchEmployees('', 'balanceCleaner');
                      setActiveSearchField('balanceCleaner');
                      setShowEmployeeDropdown(true);
                    }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'balanceCleaner' && (
                    <div
                      className="autocomplete-dropdown"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        zIndex: 99999,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                        padding: '4px'
                      }}
                    >
                      {employeeList.length === 0 ? (
                        <div style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                          No matching employees found
                        </div>
                      ) : (
                        employeeList.map(emp => (
                          <div
                            key={emp.name}
                            className="dropdown-item"
                            style={{
                              padding: '8px 10px',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              marginBottom: '2px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            onMouseDown={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              const fullName = emp.employee_name || emp.name;
                              setBalanceCleanerSearch(`${fullName} (${emp.name})`);
                              setBalanceCleaner(fullName);
                              setBalanceCleanerId(emp.name);
                              setShowEmployeeDropdown(false);
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              const fullName = emp.employee_name || emp.name;
                              setBalanceCleanerSearch(`${fullName} (${emp.name})`);
                              setBalanceCleaner(fullName);
                              setBalanceCleanerId(emp.name);
                              setShowEmployeeDropdown(false);
                            }}
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                              {(emp.employee_name || emp.name || 'E').substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{emp.employee_name || emp.name}</span>
                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>{emp.name}</span>
                              </div>
                              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {emp.designation || 'Staff'} {emp.department ? `• ${emp.department}` : ''}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="input-label">Calibration Verification Status</label>
                  <div className="form-input" style={{
                    backgroundColor: formData.status === 'Pass' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: formData.status === 'Pass' ? 'var(--success)' : 'var(--danger)',
                    fontWeight: '700',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                  }}>
                    Status: {formData.status || 'Pass'}
                  </div>
                </div>
              </>
            )}

            {/* Sanitation */}
            {templateId === 'sanitation' && (
              <>
                <div className="form-group">
                  <label className="input-label">Equipment/Line Cleaned *</label>
                  <select className="text-input" value={formData.equipment_sanitized || ''} onChange={e => handleInputChange('equipment_sanitized', e.target.value)}>
                    {eqList.length > 0 ? (
                      eqList.map(eq => (
                        <option key={eq.name} value={eq.name}>{eq.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Syrup Tank">Syrup Tank</option>
                        <option value="Filling Valves">Filling Valves (CSD)</option>
                        <option value="Capping Machine">Capping Machine</option>
                        <option value="Pipes">Product Pipelines</option>
                        <option value="Bottle Conveyor">Bottle Conveyor Track</option>
                      </>
                    )}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="input-label">Chemical/Method Used *</label>
                    <select className="text-input" value={formData.chemical_used || ''} onChange={e => handleInputChange('chemical_used', e.target.value)}>
                      {chemTestsList.length > 0 ? (
                        chemTestsList.map(chem => (
                          <option key={chem.name} value={chem.name}>{chem.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Chlorine">Chlorine Solution (XY-12)</option>
                          <option value="Caustic Soda">Caustic Soda (Sodium Hydroxide)</option>
                          <option value="Acid Sanitizer">Acid Sanitizer (Peracetic Acid)</option>
                          <option value="Hot Water">Hot Water Flushing (CIP)</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Concentration (ppm / %)</label>
                    <input type="number" className="text-input" value={formData.concentration_ppm || ''} onChange={e => handleInputChange('concentration_ppm', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="input-label">Contact Time (mins) *</label>
                    <input type="number" className="text-input" required value={formData.contact_time_mins || ''} onChange={e => handleInputChange('contact_time_mins', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Sanitation Result *</label>
                    <select className="text-input" value={formData.status || 'Satisfactory'} onChange={e => handleInputChange('status', e.target.value)}>
                      <option value="Satisfactory">Satisfactory</option>
                      <option value="Unsatisfactory">Unsatisfactory</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Overall observations / remarks */}
            <div className="form-group">
              <label className="input-label">Observations / Remarks</label>
              <textarea className="text-input" style={{ minHeight: '50px' }} value={formData.remarks || ''} onChange={e => handleInputChange('remarks', e.target.value)} placeholder="Enter details..." />
            </div>

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>Save Log Record</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal for viewing submitted report details

export function CleaningRecordDetailModal({ record, onClose }) {
  if (!record) return null;
  const tpl = CLEANING_TEMPLATES.find(t => t.doctype === record.type) || { name: record.type };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-panel" style={{ width: '500px', maxWidth: '95%' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-heading)' }}>📄 QC Clean Record: {record.id}</h3>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <div className="modal-content" style={{ padding: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Document Type:</span><br /><strong>{tpl.name}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Logged Timestamp:</span><br /><strong>{record.timestamp}</strong></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>
                {record.type === 'Incubator Temperature Record' ? 'Recorded By:' :
                  record.type === 'Balance Check or Callibration' ? 'Checked By:' :
                    record.type === 'Sanitation' ? 'Performed By:' : 'Cleaner Name:'}
              </span><br />
              <strong>{record.cleaner || record.recorded_by || record.checked_by || record.performed_by || 'N/A'}</strong>
            </div>
            {record.supervisor && (
              <div><span style={{ color: 'var(--text-muted)' }}>Verified By:</span><br /><strong>{record.supervisor}</strong></div>
            )}
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontWeight: '700', fontSize: '13px', color: 'var(--text-heading)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Parameters & Checklist</h4>
            <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
              <tbody>
                {Object.entries(record).map(([key, val]) => {
                  if (['id', 'type', 'timestamp', 'cleaner', 'recorded_by', 'checked_by', 'performed_by', 'supervisor', 'remarks'].includes(key)) return null;
                  const cleanKey = key.replace(/_/g, ' ').toUpperCase();
                  const isPass = val === 'YES' || val === 'Clean' || val === 'Pass' || val === 'Satisfactory' || val === 'Normal';
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 0', fontWeight: '600', color: 'var(--text-muted)' }}>{cleanKey}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '700', color: isPass ? 'var(--success)' : 'var(--danger)' }}>
                        {String(val)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {record.remarks && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Observations / Remarks:</span>
              <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: '#444' }}>{record.remarks}</p>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <button className="primary-btn" onClick={onClose}>Close Report</button>
        </div>
      </div>
    </div>
  );
}

export default function CleaningTab({
  cleaningRecords,
  CLEANING_TEMPLATES,
  cleaningSearchQuery,
  setCleaningSearchQuery,
  cleaningFilterType,
  setCleaningFilterType,
  cleaningPage,
  setCleaningPage,
  setActiveCleaningForm,
  setViewingCleaningRecord,
  onRefreshCleaningRecords
}) {
  useEffect(() => {
    if (onRefreshCleaningRecords) {
      onRefreshCleaningRecords();
    }
  }, []);

  const filtered = cleaningRecords.filter(rec => {
    const matchesSearch =
      rec.id.toLowerCase().includes(cleaningSearchQuery.toLowerCase()) ||
      rec.type.toLowerCase().includes(cleaningSearchQuery.toLowerCase()) ||
      (rec.cleaner || rec.recorded_by || rec.checked_by || rec.performed_by || '').toLowerCase().includes(cleaningSearchQuery.toLowerCase()) ||
      (rec.supervisor || '').toLowerCase().includes(cleaningSearchQuery.toLowerCase()) ||
      (rec.remarks || '').toLowerCase().includes(cleaningSearchQuery.toLowerCase());

    const matchesType = cleaningFilterType === 'All' || rec.type === cleaningFilterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="maintenance-tab-container">
      <div className="tab-title-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Cleaning & Sanitation Control</h2>
          <p>Track, schedule, and log hygiene compliance, toilet & dining facility checks, factory floor cleaning, incubator logs, and chemical balance calibrations.</p>
        </div>
        {onRefreshCleaningRecords && (
          <button
            onClick={() => onRefreshCleaningRecords()}
            className="secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px' }}
          >
            🔄 Sync ERPNext Logs
          </button>
        )}
      </div>

              {/* Quick Metrics */}
              <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="metric-card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                  <span className="metric-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL LOGS SUBMITTED</span>
                  <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: 'var(--text-heading)' }}>{cleaningRecords.length} Records</div>
                </div>
                <div className="metric-card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                  <span className="metric-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>COMPLIANCE STATUS</span>
                  <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: 'var(--success)' }}>
                    {cleaningRecords.length > 0 ? (
                      `${Math.round((cleaningRecords.filter(r => r.status === 'Clean' || r.status === 'Pass' || r.status === 'Satisfactory' || r.status === 'Normal').length / cleaningRecords.length) * 100)}% Pass`
                    ) : '100%'}
                  </div>
                </div>
                <div className="metric-card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                  <span className="metric-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>HYGIENE LOGS TODAY</span>
                  <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: 'var(--accent)' }}>
                    {cleaningRecords.filter(r => r.timestamp?.startsWith(new Date().toISOString().substring(0, 10))).length} Logs
                  </div>
                </div>
              </div>

              {/* Template Card Grids */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-heading)' }}>📋 Select Sanitation or Calibration Form</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                  {CLEANING_TEMPLATES.map(tpl => (
                    <div
                      key={tpl.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--text-heading)' }}>🧹 {tpl.name}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{tpl.description}</p>
                      </div>
                      <button
                        className="primary-btn"
                        style={{ alignSelf: 'flex-start', fontSize: '11px', padding: '6px 12px' }}
                        onClick={() => setActiveCleaningForm(tpl.id)}
                      >
                        📝 Fill Form
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* History Table */}
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: 'var(--text-heading)' }}>📋 Sanitation & QC Log History</h3>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Search */}
                    <input
                      type="text"
                      className="text-input"
                      style={{ width: '200px', padding: '6px 12px', fontSize: '11px' }}
                      placeholder="Search logs..."
                      value={cleaningSearchQuery}
                      onChange={e => setCleaningSearchQuery(e.target.value)}
                    />
                    {/* Filter Type */}
                    <select
                      className="text-input"
                      style={{ width: '180px', padding: '6px', fontSize: '11px' }}
                      value={cleaningFilterType}
                      onChange={e => setCleaningFilterType(e.target.value)}
                    >
                      <option value="All">All Form Types</option>
                      {CLEANING_TEMPLATES.map(t => (
                        <option key={t.id} value={t.doctype}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No logs matched your criteria.</div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="custom-table" style={{ width: '100%' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Log ID</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Form Template</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Performed By</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Submitted</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.slice((cleaningPage - 1) * 20, cleaningPage * 20).map(rec => {
                            const isPass = rec.status === 'Clean' || rec.status === 'Pass' || rec.status === 'Satisfactory' || rec.status === 'Normal';
                            return (
                              <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ fontWeight: '700', padding: '10px' }}>{rec.id}</td>
                                <td style={{ padding: '10px' }}>
                                  <strong>{rec.type}</strong>
                                </td>
                                <td style={{ padding: '10px' }}>👤 {rec.cleaner || rec.recorded_by || rec.checked_by || rec.performed_by}</td>
                                <td style={{ padding: '10px' }}>
                                  <span className={`badge ${isPass ? 'badge-completed' : 'badge-failed'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                    {isPass ? '✓ Satisfactory' : '⚠️ Action Required'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{rec.timestamp}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    className="secondary-btn"
                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                    onClick={() => setViewingCleaningRecord(rec)}
                                  >
                                    👁️ View Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={cleaningPage === 1}
                        onClick={() => setCleaningPage(prev => Math.max(1, prev - 1))}
                      >
                        ◀ Previous
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>
                        Page {cleaningPage} of {Math.max(1, Math.ceil(filtered.length / 20))}
                      </span>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={cleaningPage === Math.max(1, Math.ceil(filtered.length / 20))}
                        onClick={() => setCleaningPage(prev => Math.min(Math.max(1, Math.ceil(filtered.length / 20)), prev + 1))}
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