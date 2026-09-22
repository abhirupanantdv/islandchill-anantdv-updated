import React, { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';

const parseSelectOptions = (rawOptions) => {
  if (!rawOptions) return [];
  if (Array.isArray(rawOptions)) {
    return rawOptions.map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return opt.value ?? opt.label ?? String(opt);
      }
      return String(opt).trim();
    }).filter(Boolean);
  }
  if (typeof rawOptions === 'string') {
    return rawOptions
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
};

const isDatetimeField = (fieldtype, fieldname, label) => {
  if (!fieldtype && !fieldname && !label) return false;
  const ft = (fieldtype || '').toLowerCase();
  const fn = (fieldname || '').toLowerCase();
  const lb = (label || '').toLowerCase();
  return (
    ft === 'datetime' ||
    ft === 'date time' ||
    ft.includes('datetime') ||
    lb.includes('date & time') ||
    lb.includes('date and time') ||
    lb.includes('datetime') ||
    fn.endsWith('_datetime') ||
    fn.endsWith('_date_time') ||
    fn.includes('incubation_in') ||
    fn.includes('incubation_out')
  );
};

// Helper to dynamically fetch Link options for target DocTypes
const fetchLinkOptionsMap = async (fields, childMetasObj) => {
  const linkDoctypes = new Set();
  (fields || []).forEach(f => {
    if (f.fieldtype === 'Link' && f.options) linkDoctypes.add(f.options);
  });
  Object.values(childMetasObj || {}).forEach(cFields => {
    (cFields || []).forEach(cf => {
      if (cf.fieldtype === 'Link' && cf.options) linkDoctypes.add(cf.options);
    });
  });

  const optsMap = {};
  await Promise.all(
    Array.from(linkDoctypes).map(async (dt) => {
      try {
        const res = await frappe.getLinkOptions(dt, 100);
        optsMap[dt] = (res || []).map(r => (typeof r === 'object' ? (r.name || r.title || String(r)) : String(r)));
      } catch (err) {
        console.warn(`Failed to fetch link options for ${dt}:`, err);
        optsMap[dt] = [];
      }
    })
  );
  return optsMap;
};

export const CLEANING_TEMPLATES = [
  { id: 'toilet-clean', name: 'Cleaning of Toilets', doctype: 'Cleaning of Toilets', description: 'Log daily toilet sanitation status.' },
  { id: 'toilet-purpose', name: 'Toilet Cleaning Purpose', doctype: 'Toilet Cleaning purpose', description: 'Log toilet cleaning purpose details.' },
  { id: 'dining-clean', name: 'Cleaning of Dining Room', doctype: 'Cleaning of Dining Room', description: 'Log daily dining room sanitation status.' },
  { id: 'dining-purpose', name: 'Dining Room Cleaning Purpose', doctype: 'Dining Room Cleaning Purpose', description: 'Log dining room cleaning purpose details.' },
  { id: 'floor-clean', name: 'Factory Floor Cleaning', doctype: 'Factory Floor', description: 'Log factory floor cleaning checklist.' },
  { id: 'floor-purpose', name: 'Factory Floor Cleaning Purpose', doctype: 'Factory Floor Cleaning Purpose', description: 'Log factory floor cleaning standards.' },
  { id: 'lab-office-clean', name: 'Cleaning of Lab and Office', doctype: 'Cleaning of Lab and Office', description: 'Log daily laboratory & office cleaning logs.' },
  { id: 'lab-office-purpose', name: 'Lab and Office Cleaning Purpose', doctype: 'Lab and Office Cleaning Purpose', description: 'Log lab & office cleaning purpose details.' },
  { id: 'balance-calib', name: 'Balance Check or Calibration', doctype: 'Balance Check or Callibration', description: 'Record balance check metrics & calibration variance.' },
  { id: 'sanitation', name: 'Equipment Sanitation & CIP', doctype: 'equipment sanitation and cip', description: 'Log chemical sanitation levels and contact times.' },
  { id: 'perimeter-clean', name: 'Form 46: Outside Perimeter Cleaning', doctype: 'Outside Perimeter Cleaning', description: 'Log outside perimeter cleaning inspection and checklist.' }
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
  const [formNumber, setFormNumber] = useState('');

  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [tableData, setTableData] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      if (templateId === 'perimeter-clean' || template?.doctype === 'Outside Perimeter Cleaning') {
        setLoadingMeta(true);
        try {
          console.log('[CleaningFormModal] Fetching DocType meta for "Outside Perimeter Cleaning"...');
          const doctypeMeta = await frappe.getDocTypeMeta('Outside Perimeter Cleaning');
          let fields = doctypeMeta?.fields;
          if (!fields || fields.length === 0) {
            fields = [
              { idx: 1, fieldname: 'posting_date', label: 'Posting Date', fieldtype: 'Date' },
              { idx: 2, fieldname: 'posting_time', label: 'Posting Time', fieldtype: 'Time' },
              { idx: 3, fieldname: 'cleaner', label: 'Cleaner / Performed By', fieldtype: 'Link', options: 'Employee' },
              { idx: 4, fieldname: 'supervisor', label: 'Verified By (Supervisor)', fieldtype: 'Link', options: 'Employee' },
              { idx: 5, fieldname: 'perimeter_area', label: 'Perimeter Area / Zone', fieldtype: 'Select', options: 'Main Gate & Entryway\nNorth Fence Line\nSouth Fence Line\nEast Yard & Loading Bay\nWest Boundary & Vegetation\nDrainage & Gutters' },
              { idx: 6, fieldname: 'trash_and_litter_cleared', label: 'Trash and Litter Cleared', fieldtype: 'Select', options: 'YES\nNO\nN/A' },
              { idx: 7, fieldname: 'grass_and_weeds_trimmed', label: 'Grass & Weeds Trimmed', fieldtype: 'Select', options: 'YES\nNO\nN/A' },
              { idx: 8, fieldname: 'outside_drains_unblocked', label: 'Outside Drains Unblocked', fieldtype: 'Select', options: 'YES\nNO\nN/A' },
              { idx: 9, fieldname: 'pest_harbourage_checked', label: 'Pest Harbourage Checked', fieldtype: 'Select', options: 'YES\nNO\nN/A' },
              { idx: 10, fieldname: 'overall_condition', label: 'Overall Condition / Status', fieldtype: 'Select', options: 'Clean (Satisfactory)\nNeeds Attention\nRequires Maintenance' },
              { idx: 11, fieldname: 'remarks', label: 'Observations / Remarks', fieldtype: 'Small Text' }
            ];
          }
          if (isMounted) {
            console.log('📋 OUTSIDE PERIMETER CLEANING DYNAMIC META:', doctypeMeta);
            setMeta({ ...(doctypeMeta || {}), fields });
            const tableFieldsList = fields.filter(f => f.fieldtype === 'Table' && f.options);
            const childMetasObj = {};
            for (const tf of tableFieldsList) {
              try {
                const childMeta = await frappe.getDocTypeMeta(tf.options);
                if (childMeta && childMeta.fields) {
                  childMetasObj[tf.options] = childMeta.fields;
                }
              } catch (e) {
                console.error(`Error fetching child meta for ${tf.options}:`, e);
              }
            }
            setChildMetas(childMetasObj);

            fetchLinkOptionsMap(fields, childMetasObj).then(optsMap => {
              if (isMounted) setLinkOptionsMap(optsMap);
            });
          }
        } catch (e) {
          console.error('[CleaningFormModal] Error fetching meta:', e);
        } finally {
          if (isMounted) setLoadingMeta(false);
        }
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, [templateId, template]);

  const handleTableInputChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, rIdx) =>
        rIdx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = (childMetas[childDoctype] || []);
    const newRow = {};
    childFields.forEach(f => {
      newRow[f.fieldname] = f.fieldtype === 'Select' ? (parseSelectOptions(f.options)[0] || '') : '';
    });
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: [...(prev[tableFieldName] || []), newRow]
    }));
  };

  const removeTableRow = (tableFieldName, rowIdx) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).filter((_, rIdx) => rIdx !== rowIdx)
    }));
  };

  useEffect(() => {
    async function loadFormNumber() {
      try {
        const forms = await frappe.getCleaningAndSanitationForm();
        if (forms && Array.isArray(forms) && template) {
          const tName = (template.name || '').trim().toLowerCase();
          const tDoc = (template.doctype || '').trim().toLowerCase();
          const match = forms.find(f => {
            const fName = (f.form_name || f.name || '').trim().toLowerCase();
            const fDoc = (f.document_type || '').trim().toLowerCase();
            return (
              (fName && (fName === tName || fName === tDoc)) ||
              (fDoc && (fDoc === tName || fDoc === tDoc))
            );
          });
          if (match && match.form_number) {
            setFormNumber(match.form_number);
          }
        }
      } catch (e) {
        console.error("Failed to load form number:", e);
      }
    }
    loadFormNumber();
  }, [templateId, template]);

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
          // Pass fields and filters so Frappe fetches 'equipments' and 'show_on_app'
          const equipmentParams = {
            fields: ['name', 'equipments', 'show_on_app'],
            filters: { show_on_app: 1 }
          };

          const [rawEqs, chems] = await Promise.all([
            frappe.getEquipmentList ? frappe.getEquipmentList(equipmentParams) : [],
            frappe.getCipChemicals ? frappe.getCipChemicals() : (frappe.getLinkOptions ? frappe.getLinkOptions('CIP Chemical') : [])
          ]);

          console.log("🔍 Equipment List API Response:", rawEqs);

          // Filter on client-side as fallback in case server returns all records
          let eqs = (rawEqs || []).filter(eq => {
            // If show_on_app field is present, respect its value
            if (eq.show_on_app !== undefined) {
              return eq.show_on_app === 1 || eq.show_on_app === true || eq.show_on_app === '1';
            }
            return true;
          });

          console.log("✅ Final Equipment List to Display:", eqs);

          setEqList(eqs);
          setChemTestsList(chems || []);

          const defaultEq = eqs && eqs.length > 0 ? eqs[0].name : '';
          const defaultChem = chems && chems.length > 0 ? (chems[0].name || chems[0].chemical_name || chems[0]) : '';

          setFormData(prev => ({
            ...prev,
            equipmentline_cleaned: defaultEq,
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
      ...formData,
      ...tableData
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
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>🧹 {template?.name}</h3>
            {formNumber && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>
                Form No: {formNumber}
              </div>
            )}
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleFormSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', fontSize: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="input-label">Date *</label>
                <input type="date" className="text-input" required min={new Date().toISOString().split('T')[0]} value={postingDate} onChange={e => setPostingDate(e.target.value)} />
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
            {['toilet-clean', 'dining-clean', 'floor-clean', 'lab-office-clean', 'sanitation', 'perimeter-clean'].includes(templateId) && (
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
                  <label className="input-label">Calibration Verification Status *</label>
                  <select
                    className="text-input"
                    required
                    value={formData.status || 'Pass'}
                    onChange={e => handleInputChange('status', e.target.value)}
                    style={{
                      backgroundColor: (formData.status === 'Pass' || formData.status === 'Clean') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: (formData.status === 'Pass' || formData.status === 'Clean') ? 'var(--success)' : 'var(--danger)',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </div>
              </>
            )}

            {/* Sanitation */}
            {/* Sanitation */}
            {templateId === 'sanitation' && (
              <>
                <div className="form-group">
                  <label className="input-label">Equipment/Line Cleaned *</label>
                  <select
                    className="text-input"
                    value={formData.equipmentline_cleaned || formData.equipment_sanitized || ''}
                    onChange={e => {
                      const val = e.target.value;
                      handleInputChange('equipmentline_cleaned', val);
                      handleInputChange('equipment_sanitized', val);
                    }}
                  >
                    {eqList.length > 0 ? (
                      eqList.map(eq => (
                        <option key={eq.name} value={eq.name}>
                          {eq.equipments || eq.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No equipment marked for app display</option>
                    )}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="input-label">Chemical/Method Used *</label>
                    <select className="text-input" value={formData.chemical_used || ''} onChange={e => handleInputChange('chemical_used', e.target.value)}>
                      {chemTestsList.length > 0 ? (
                        chemTestsList.map(chem => {
                          const val = typeof chem === 'string' ? chem : (chem.name || chem.chemical_name || '');
                          const label = typeof chem === 'string' ? chem : (chem.chemical_name || chem.name || '');
                          return (
                            <option key={val} value={val}>{label}</option>
                          );
                        })
                      ) : (
                        <>
                          <option value="Chlorine Solution (XY-12)">Chlorine Solution (XY-12)</option>
                          <option value="Caustic Soda (Sodium Hydroxide)">Caustic Soda (Sodium Hydroxide)</option>
                          <option value="Acid Sanitizer (Peracetic Acid)">Acid Sanitizer (Peracetic Acid)</option>
                          <option value="Hot Water Flushing (CIP)">Hot Water Flushing (CIP)</option>
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


            {/* Form 46: Outside Perimeter Cleaning Dynamic Fields */}
            {templateId === 'perimeter-clean' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {loadingMeta ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>
                    ⏳ Fetching dynamic meta fields from ERPNext DocType "Outside Perimeter Cleaning"...
                  </div>
                ) : (
                  <>
                    {(meta?.fields || []).filter(f =>
                      f.fieldtype !== 'Table' &&
                      f.fieldtype !== 'Section Break' &&
                      f.fieldtype !== 'Column Break' &&
                      f.fieldtype !== 'Fold' &&
                      f.fieldname !== 'amended_from' &&
                      f.fieldname !== 'work_order' &&
                      f.fieldname !== 'posting_date' &&
                      f.fieldname !== 'posting_time' &&
                      f.fieldname !== 'cleaner' &&
                      f.fieldname !== 'supervisor' &&
                      f.hidden !== 1
                    ).map(field => {
                      if (field.fieldtype === 'Select') {
                        const opts = parseSelectOptions(field.options);
                        return (
                          <div key={field.fieldname} className="form-group">
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <select
                              className="text-input"
                              value={formData[field.fieldname] ?? opts[0] ?? ''}
                              onChange={e => handleInputChange(field.fieldname, e.target.value)}
                            >
                              <option value="">-- Select {field.label} --</option>
                              {opts.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      if (field.fieldtype === 'Check') {
                        return (
                          <div key={field.fieldname} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              id={field.fieldname}
                              checked={!!formData[field.fieldname]}
                              onChange={e => handleInputChange(field.fieldname, e.target.checked ? 1 : 0)}
                            />
                            <label htmlFor={field.fieldname} className="input-label" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>
                              {field.label}
                            </label>
                          </div>
                        );
                      }

                      if (field.fieldtype === 'Small Text' || field.fieldtype === 'Text') {
                        return (
                          <div key={field.fieldname} className="form-group">
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <textarea
                              className="text-input"
                              style={{ minHeight: '60px' }}
                              value={formData[field.fieldname] || ''}
                              onChange={e => handleInputChange(field.fieldname, e.target.value)}
                            />
                          </div>
                        );
                      }

                      if (isDatetimeField(field.fieldtype, field.fieldname, field.label)) {
                        const now = new Date();
                        const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        return (
                          <div key={field.fieldname} className="form-group">
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <input
                              type="datetime-local"
                              className="text-input"
                              value={formData[field.fieldname] || localDT}
                              onChange={e => handleInputChange(field.fieldname, e.target.value)}
                            />
                          </div>
                        );
                      }

                      if (field.fieldtype === 'Date') {
                        return (
                          <div key={field.fieldname} className="form-group">
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <input
                              type="date"
                              className="text-input"
                              value={formData[field.fieldname] || ''}
                              onChange={e => handleInputChange(field.fieldname, e.target.value)}
                            />
                          </div>
                        );
                      }

                      if (field.fieldtype === 'Time') {
                        return (
                          <div key={field.fieldname} className="form-group">
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <input
                              type="time"
                              className="text-input"
                              value={formData[field.fieldname] || ''}
                              onChange={e => handleInputChange(field.fieldname, e.target.value)}
                            />
                          </div>
                        );
                      }

                      if (field.fieldtype === 'Datetime' || field.fieldtype === 'Date Time') {
                        const now = new Date();
                        const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        return (
                          <div key={field.fieldname} className="form-group">
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <input
                              type="datetime-local"
                              className="text-input"
                              value={formData[field.fieldname] || localDT}
                              onChange={e => handleInputChange(field.fieldname, e.target.value)}
                            />
                          </div>
                        );
                      }

                    if (field.fieldtype === 'Link') {
                      const targetDoctype = field.options || 'Employee';
                      const isEmpTarget = targetDoctype === 'Employee' || targetDoctype === 'User';
                      const sKey = field.fieldname;
                      const datalistId = `dl_clean_${sKey}`;

                      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
                      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
                      const combinedOpts = Array.from(new Set([
                        ...empOpts,
                        ...fetchedOpts
                      ])).filter(Boolean);

                      return (
                        <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <input
                            type="text"
                            list={isEmpTarget ? undefined : datalistId}
                            className="text-input"
                            placeholder={`Select or type ${field.label}...`}
                            value={formData[field.fieldname] || ''}
                            onChange={e => handleInputChange(field.fieldname, e.target.value)}
                            onFocus={() => {
                              if (isEmpTarget && handleSearchEmployees) {
                                handleSearchEmployees(formData[field.fieldname] || '', sKey);
                                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
                              }
                            }}
                          />
                          {!isEmpTarget && (
                            <datalist id={datalistId}>
                              {combinedOpts.map((opt, idx) => (
                                <option key={idx} value={opt} />
                              ))}
                            </datalist>
                          )}

                          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList?.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 1200, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                              {employeeList.map(emp => {
                                const empVal = `${emp.employee_name || emp.name} (${emp.name})`;
                                return (
                                  <div
                                    key={emp.name}
                                    style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                    onMouseDown={() => {
                                      handleInputChange(field.fieldname, empVal);
                                      if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                                    }}
                                  >
                                    <strong>{emp.employee_name}</strong> <span style={{ color: '#64748b' }}>({emp.name})</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={field.fieldname} className="form-group">
                        <label className="input-label" style={{ fontWeight: '600' }}>
                          {field.label} {field.reqd ? '*' : ''}
                        </label>
                        <input
                          type={field.fieldtype === 'Int' || field.fieldtype === 'Float' ? 'number' : 'text'}
                          className="text-input"
                          value={formData[field.fieldname] || ''}
                          onChange={e => handleInputChange(field.fieldname, e.target.value)}
                        />
                      </div>
                    );
                  })}

                  {/* Dynamic Table Fields (Child Tables) */}
                  {(meta?.fields || []).filter(f => f.fieldtype === 'Table').map(tf => {
                    const childDoctype = tf.options;
                    const childFields = (childMetas[childDoctype] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.hidden !== 1);
                    const currentRows = tableData[tf.fieldname] || [];

                    return (
                      <div key={tf.fieldname} className="form-group" style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label className="input-label" style={{ fontWeight: '700', fontSize: '13px' }}>📋 {tf.label}</label>
                          <button type="button" className="secondary-btn" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => addTableRow(tf.fieldname, childDoctype)}>
                            + Add Row
                          </button>
                        </div>

                        {currentRows.length === 0 ? (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px', border: '1px dashed var(--border-color)', borderRadius: '6px', textAlign: 'center' }}>
                            No rows added yet. Click "+ Add Row" above.
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                                  {childFields.map(cf => (
                                    <th key={cf.fieldname} style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>{cf.label}</th>
                                  ))}
                                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '40px' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentRows.map((row, rIdx) => (
                                  <tr key={rIdx}>
                                    {childFields.map(cf => (
                                      <td key={cf.fieldname} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>
                                        {cf.fieldtype === 'Select' ? (
                                          <select
                                            className="text-input"
                                            style={{ padding: '4px', fontSize: '11px' }}
                                            value={row[cf.fieldname] || ''}
                                            onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                          >
                                            <option value="">-- Select --</option>
                                            {parseSelectOptions(cf.options).map(opt => (
                                              <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                          </select>
                                        ) : cf.fieldtype === 'Link' ? (
                                          <>
                                            <input
                                              type="text"
                                              list={`dl_clean_tbl_${cf.fieldname}_${rIdx}`}
                                              className="text-input"
                                              style={{ padding: '4px', fontSize: '11px' }}
                                              value={row[cf.fieldname] || ''}
                                              onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                            />
                                            <datalist id={`dl_clean_tbl_${cf.fieldname}_${rIdx}`}>
                                              {(linkOptionsMap[cf.options || 'Employee'] || []).map(opt => (
                                                <option key={opt} value={opt} />
                                              ))}
                                            </datalist>
                                          </>
                                        ) : (
                                          <input
                                            type={cf.fieldtype === 'Date' ? 'date' : cf.fieldtype === 'Time' ? 'time' : (cf.fieldtype === 'Datetime' || cf.fieldtype === 'Date Time') ? 'datetime-local' : cf.fieldtype === 'Float' || cf.fieldtype === 'Int' ? 'number' : 'text'}
                                            className="text-input"
                                            style={{ padding: '4px', fontSize: '11px' }}
                                            value={row[cf.fieldname] || ((cf.fieldtype === 'Datetime' || cf.fieldtype === 'Date Time') ? (new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)) : '')}
                                            onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                          />
                                        )}
                                        </td>
                                      ))}
                                      <td style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                        <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => removeTableRow(tf.fieldname, rIdx)}>
                                          ✕
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Overall observations / remarks */}
            <div className="form-group">
              <label className="input-label">Observations / Remarks</label>
              <textarea className="text-input" style={{ minHeight: '50px' }} value={formData.remarks || ''} onChange={e => handleInputChange('remarks', e.target.value)} placeholder="Enter details..." />
            </div>

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '12px 16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
              Island Chill - Form no.{formNumber ? ` ${formNumber}` : ''}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-btn" style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>Save Log Record</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export const resolveEmployeeName = (val, employeeList = []) => {
  if (!val) return 'N/A';
  const strVal = String(val).trim();
  if (!strVal || strVal === 'null' || strVal === 'undefined') return 'N/A';

  const matchParen = strVal.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (matchParen) return matchParen[1];

  const emp = (employeeList || []).find(e =>
    (e.name && e.name.toLowerCase() === strVal.toLowerCase()) ||
    (e.employee_name && e.employee_name.toLowerCase() === strVal.toLowerCase())
  );
  if (emp && emp.employee_name) {
    return emp.employee_name;
  }
  return strVal;
};

export const resolveChemicalName = (val, cipChemicals = []) => {
  if (!val) return 'N/A';
  const strVal = String(val).trim();
  if (!strVal || strVal === 'null' || strVal === 'undefined') return 'N/A';

  const chem = (cipChemicals || []).find(c =>
    (c.name && c.name.toLowerCase() === strVal.toLowerCase()) ||
    (c.chemical_name && c.chemical_name.toLowerCase() === strVal.toLowerCase())
  );
  if (chem) {
    return chem.chemical_name || chem.name;
  }
  return strVal;
};

const formatValue = (value, employeeList = [], cipChemicals = []) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'N/A';
    return value
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          return item.name || item.purpose || item.title || JSON.stringify(item);
        }
        return resolveEmployeeName(resolveChemicalName(String(item), cipChemicals), employeeList);
      })
      .join(', ');
  }

  if (typeof value === 'object') {
    // Helper to map keys flexibly regardless of exact field casing or underscore variations
    const getDetailFieldLabel = (k) => {
      const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (norm.includes('equipment') || norm.includes('line')) return 'EQUIPMENT / LINE CLEANED';
      if (norm.includes('chemical') || norm.includes('method')) return 'CHEMICAL / METHOD USED';
      if (norm.includes('concentration') || norm.includes('ppm')) return 'CONCENTRATION (PPM)';
      if (norm.includes('contact') || norm.includes('mins')) return 'CONTACT TIME (MINS)';
      if (norm.includes('remark') || norm.includes('obs') || norm.includes('note')) return 'OBSERVATIONS / REMARKS';
      return null;
    };

    const entries = Object.entries(value)
      .map(([k, v]) => ({ key: k, label: getDetailFieldLabel(k), val: v }))
      .filter(item => item.label && item.val !== null && item.val !== undefined && item.val !== '');

    if (entries.length === 0) return 'N/A';

    return (
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', padding: '4px 0' }}>
        {entries.map(({ key, label, val }) => {
          let displayVal = val;
          const normKey = key.toLowerCase();
          if (normKey.includes('chemical') || normKey.includes('method') || label.includes('CHEMICAL')) {
            displayVal = resolveChemicalName(val, cipChemicals);
          } else if (normKey.includes('employee') || normKey.includes('user') || normKey.includes('cleaner') || normKey.includes('by') || String(val).startsWith('HR-EMP-') || String(val).startsWith('EMP-')) {
            displayVal = resolveEmployeeName(val, employeeList);
          }
          return (
            <div key={key} style={{ fontSize: '11px', lineHeight: '1.4' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{label}: </span>
              <span style={{ color: 'var(--text-heading, #1e293b)', fontWeight: '700' }}>{String(displayVal)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const str = String(value);
  if (str.startsWith('HR-EMP-') || str.startsWith('EMP-')) {
    return resolveEmployeeName(str, employeeList);
  }
  return resolveChemicalName(str, cipChemicals);
};




// Modal for viewing submitted report details
export function CleaningRecordDetailModal({ record, onClose, employeeList = [] }) {
  if (!record) return null;
  const tpl = CLEANING_TEMPLATES.find(t => t.doctype === record.type) || { name: record.type };
  const [formNumber, setFormNumber] = useState('');
  const [cipChemicals, setCipChemicals] = useState([]);

  useEffect(() => {
    async function loadRecordMeta() {
      try {
        const [forms, chems] = await Promise.all([
          frappe.getCleaningAndSanitationForm ? frappe.getCleaningAndSanitationForm() : [],
          frappe.getCipChemicals ? frappe.getCipChemicals() : (frappe.getLinkOptions ? frappe.getLinkOptions('CIP Chemical') : [])
        ]);
        if (forms && Array.isArray(forms)) {
          const tName = (tpl.name || '').trim().toLowerCase();
          const tDoc = (tpl.doctype || record.type || '').trim().toLowerCase();
          const match = forms.find(f => {
            const fName = (f.form_name || f.name || '').trim().toLowerCase();
            const fDoc = (f.document_type || '').trim().toLowerCase();
            return (
              (fName && (fName === tName || fName === tDoc)) ||
              (fDoc && (fDoc === tName || fDoc === tDoc))
            );
          });
          if (match && match.form_number) {
            setFormNumber(match.form_number);
          }
        }
        if (chems && Array.isArray(chems)) {
          setCipChemicals(chems);
        }
      } catch (e) {
        console.error("Failed to load form metadata for record detail:", e);
      }
    }
    loadRecordMeta();
  }, [record, tpl]);

  const rawTech = record.operator_name || record.cleaner || record.recorded_by || record.checked_by || record.performed_by;
  const technicianName = resolveEmployeeName(rawTech, employeeList);

  const rawSupervisor = record.supervisor_name || record.supervisor || record.verified_by_supervisor;
  const supervisorName = resolveEmployeeName(rawSupervisor, employeeList);

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-panel print-report-container" style={{ width: '720px', maxWidth: '95%' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-heading)', margin: 0 }}>📄 QC Clean Record: {record.id}</h3>
            {formNumber && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>
                Form No: {formNumber}
              </div>
            )}
          </div>
          <button className="no-print" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
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
                    record.type === 'Sanitation' || record.type === 'equipment sanitation and cip' ? 'Performed By (Operator):' : 'Technician Name:'}
              </span><br />
              <strong>{technicianName}</strong>
            </div>
            {supervisorName !== 'N/A' && (
              <div><span style={{ color: 'var(--text-muted)' }}>Verified By:</span><br /><strong>{supervisorName}</strong></div>
            )}
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontWeight: '700', fontSize: '13px', color: 'var(--text-heading)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Parameters & Checklist</h4>
            <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
              <tbody>
                {Object.entries(record).map(([key, val]) => {
                  if (['id', 'type', 'timestamp', 'cleaner', 'recorded_by', 'checked_by', 'performed_by', 'supervisor', 'operator_name', 'supervisor_name', 'remarks'].includes(key)) return null;
                  let cleanKey;
                  if (key === 'posting_date') {
                    cleanKey = 'SANITATION DATE';
                  } else if (key === 'posting_time') {
                    cleanKey = 'SANITATION TIME';
                  } else if (key === 'cleaner') {
                    cleanKey = 'TECHNICIAN NAME';
                  } else {
                    cleanKey = key.replace(/_/g, ' ').toUpperCase();
                  }
                  const passValues = ['YES', 'Clean', 'Pass', 'Satisfactory', 'Normal'];
                  const failValues = ['NO', 'Dirty', 'Fail', 'Unsatisfactory', 'Abnormal'];
                  const isPass = passValues.includes(val);
                  const isFail = failValues.includes(val);
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 0', fontWeight: '600', color: 'var(--text-muted)', verticalAlign: 'top' }}>{cleanKey}</td>
                      <td
                        style={{
                          padding: '6px 0',
                          textAlign: 'right',
                          fontWeight: '700',
                          color: isPass
                            ? 'var(--success)'
                            : isFail
                              ? 'var(--danger)'
                              : 'var(--text-heading)',
                          verticalAlign: 'top'
                        }}
                      >
                        {formatValue(val, employeeList, cipChemicals)}
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

          {/* Report Footnote & Approval Section (Included in Print) */}
          <div style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '12px',
            marginTop: '8px',
            fontSize: '12px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
              Island Chill - Form no.{formNumber ? ` ${formNumber}` : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Approved By: </span>
                <span style={{ fontWeight: '700', color: 'var(--text-heading)' }}>{supervisorName !== 'N/A' ? supervisorName : 'L. Chaudhry'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Signature: </span>
                <span style={{
                  fontFamily: "cursive, 'Brush Script MT', sans-serif",
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--accent)',
                  borderBottom: '1px solid var(--border-color)',
                  padding: '0 8px'
                }}>
                  {supervisorName !== 'N/A' ? supervisorName : 'L. Chaudhry'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px', gap: '10px' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={() => window.print()}
            style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', whiteSpace: 'nowrap' }}
          >
            🖨️ Print Report
          </button>
          <button type="button" className="secondary-btn" onClick={onClose} style={{ whiteSpace: 'nowrap' }}>Close Report</button>
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
  onRefreshCleaningRecords,
  employeeList = []
}) {
  useEffect(() => {
    if (onRefreshCleaningRecords) {
      onRefreshCleaningRecords();
    }

    // Call API for "Cleaning and Sanitation Form" doctype and print response to console only
    frappe.getCleaningAndSanitationForm()
      .then(response => {
        console.log('Cleaning and Sanitation Form response:', response);
      })
      .catch(error => {
        console.error('Error fetching Cleaning and Sanitation Form:', error);
      });
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
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: 'var(--text-heading)' }}>
            {cleaningRecords.length} Logs {cleaningFilterType !== 'All' || cleaningSearchQuery ? `(${filtered.length} Filtered)` : ''}
          </div>
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
                        <td style={{ padding: '10px' }}>👤 {resolveEmployeeName(rec.operator_name || rec.cleaner || rec.recorded_by || rec.checked_by || rec.performed_by, employeeList)}</td>
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
                            👁️ View Details / Print
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

            {/* History Table Footnote & Approval Section */}
            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: '600', color: 'var(--text-muted)' }}>
                Island Chill - Form no.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Approved By: </span>
                  <span style={{ fontWeight: '700', color: 'var(--text-heading)' }}>L. Chaudhry (QA Manager)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Signature: </span>
                  <span style={{
                    fontFamily: "cursive, 'Brush Script MT', sans-serif",
                    fontSize: '16px',
                    fontWeight: '700',
                    color: 'var(--accent)',
                    borderBottom: '1px solid var(--border-color)',
                    padding: '0 10px 2px 10px'
                  }}>
                    L. Chaudhry
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}