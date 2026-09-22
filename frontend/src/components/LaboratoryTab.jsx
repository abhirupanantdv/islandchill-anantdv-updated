import React, { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';

// Helper to safely parse Select field options from Frappe metadata string, array, or object
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

const resolveLinkValue = (val, targetDoctype, linkOptionsMap) => {
  if (!val || typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (!trimmed) return trimmed;

  const parenMatch = trimmed.match(/\(([^)]+)\)$/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim();
  }

  const opts = linkOptionsMap ? linkOptionsMap[targetDoctype] : null;
  if (opts && opts.length > 0) {
    if (opts.includes(trimmed)) return trimmed;

    const lower = trimmed.toLowerCase();
    const exactCi = opts.find(o => String(o).toLowerCase() === lower);
    if (exactCi) return exactCi;

    const containedOpt = opts.find(o => {
      const oLower = String(o).toLowerCase();
      return lower.includes(oLower) || oLower.includes(lower);
    });
    if (containedOpt) return containedOpt;
  }

  return trimmed;
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


export function FormFootnote({ doctype, defaultFormNo, formTitle }) {
  const [configs, setConfigs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchConfigs() {
      try {
        const res = await frappe.getFormNumberConfigurations();
        if (isMounted && res && Array.isArray(res)) {
          setConfigs(res);
        }
      } catch (err) {
        console.warn('FormFootnote config fetch error:', err);
      }
    }
    fetchConfigs();
    return () => { isMounted = false; };
  }, []);

  const target = (doctype || '').toLowerCase();
  const matched = configs.find(c => {
    const dt = (c.doctype_name || c.form_name || c.doctype || c.name || '').toLowerCase();
    const fno = (c.form_number || c.form_no || c.code || '').toLowerCase();
    return (target && dt.includes(target)) || (target && target.includes(dt)) || (fno && target.includes(fno));
  });

  const formNo = matched?.form_number || matched?.form_no || matched?.code || defaultFormNo || 'Form Configuration';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      borderTop: '1px solid var(--border-color)',
      paddingTop: '12px',
      marginTop: '16px',
      fontSize: '11px',
      color: 'var(--text-muted)',
      fontWeight: '600',
      gap: '6px'
    }}>
      <span>Island Chill - Form no.</span>
      <span style={{ fontWeight: '700', color: 'var(--accent)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
        {formNo}
      </span>
      {formTitle && <span style={{ fontStyle: 'italic', opacity: 0.85 }}>({formTitle})</span>}
    </div>
  );
}


export function LabForm1Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    analyst: '',
    manager: '',
    preform_lot_no: '',
    closures_lot_no: '',
    bib_inner_bag: ''
  });

  // Dynamic state for child table fields (fieldname -> array of row objects)
  const [tableData, setTableData] = useState({
    raw_materials_details: [
      { description: 'PET Preforms (Raw)', tcc: 'Absent', ecoli: 'Absent', analyst: '', in_date: new Date().toISOString().slice(0, 10), in_time: '10:00', out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), out_time: '10:00' },
      { description: 'HDPE Closures (Raw)', tcc: 'Absent', ecoli: 'Absent', analyst: '', in_date: new Date().toISOString().slice(0, 10), in_time: '10:00', out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), out_time: '10:00' },
      { description: 'BIB Inner Bag / Film (Raw)', tcc: 'Absent', ecoli: 'Absent', analyst: '', in_date: new Date().toISOString().slice(0, 10), in_time: '10:00', out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), out_time: '10:00' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Microbiological Analysis of Primary Raw Materials"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm1Modal] Fetching DocType meta for "Microbiological Analysis of Primary Raw Materials"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Microbiological Analysis of Primary Raw Materials');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date of Analysis', fieldtype: 'Date' },
            { idx: 2, fieldname: 'analyst', label: 'Analyst Name', fieldtype: 'Link', options: 'Employee' },
            { idx: 3, fieldname: 'manager', label: 'Operations Manager', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'preform_lot_no', label: 'Preform Lot No.', fieldtype: 'Data' },
            { idx: 5, fieldname: 'closures_lot_no', label: 'Closures Lot No.', fieldtype: 'Data' },
            { idx: 6, fieldname: 'raw_materials_details', label: 'Analysis and Incubation Results', fieldtype: 'Table', options: 'Microbiological Analysis Detail' },
            { idx: 7, fieldname: 'signature', label: 'Signature', fieldtype: 'Signature' }
          ];
        }

        // Clean label formatting (remove bracketed descriptors & resolve missing labels)
        fields = fields.map(f => {
          let lbl = f.label;
          if (!lbl || lbl === f.fieldname) {
            lbl = f.options || f.fieldname;
          }
          lbl = lbl.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
          return {
            ...f,
            label: lbl
          };
        });

        if (isMounted) {
          console.log('=============================================================');
          console.log('📋 MICROBIOLOGICAL ANALYSIS OF PRIMARY RAW MATERIALS DYNAMIC META:', doctypeMeta);
          console.log('📋 DYNAMIC FIELDS COUNT:', fields.length);
          console.table(fields.map(f => ({
            idx: f.idx,
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            options: f.options,
            reqd: f.reqd
          })));
          console.log('=============================================================');
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};
        const newTableDataInit = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Microbiological Analysis Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              console.log(`📋 CHILD DOCTYPE META FOR (${tf.options}):`, childMeta);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'description', label: 'Sample Description', fieldtype: 'Data' },
              { idx: 2, fieldname: 'tcc', label: 'TCC Status', fieldtype: 'Select', options: 'Absent\nPresent' },
              { idx: 3, fieldname: 'ecoli', label: 'E-Coli Status', fieldtype: 'Select', options: 'Absent\nPresent' },
              { idx: 4, fieldname: 'analyst', label: 'Row Analyst', fieldtype: 'Link', options: 'Employee' },
              { idx: 5, fieldname: 'in_date', label: 'Incubation In Date', fieldtype: 'Date' },
              { idx: 6, fieldname: 'in_time', label: 'Incubation In Time', fieldtype: 'Time' },
              { idx: 7, fieldname: 'out_date', label: 'Incubation Out Date', fieldtype: 'Date' },
              { idx: 8, fieldname: 'out_time', label: 'Incubation Out Time', fieldtype: 'Time' }
            ];
          }

          // Clean child field labels too (remove brackets)
          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          // Default initial rows for this table field if not already present
          newTableDataInit[tf.fieldname] = [
            { description: 'PET Preforms (Raw)', tcc: 'Absent', ecoli: 'Absent', analyst: '', in_date: new Date().toISOString().slice(0, 10), in_time: '10:00', out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), out_time: '10:00' },
            { description: 'HDPE Closures (Raw)', tcc: 'Absent', ecoli: 'Absent', analyst: '', in_date: new Date().toISOString().slice(0, 10), in_time: '10:00', out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), out_time: '10:00' },
            { description: 'BIB Inner Bag / Film (Raw)', tcc: 'Absent', ecoli: 'Absent', analyst: '', in_date: new Date().toISOString().slice(0, 10), in_time: '10:00', out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), out_time: '10:00' }
          ];
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
          setTableData(prev => ({
            ...newTableDataInit,
            ...prev
          }));
        }
      } catch (err) {
        console.error('[LabForm1Modal] Error fetching meta fields for "Microbiological Analysis of Primary Raw Materials":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
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
    newRow.description = newRow.description || 'Raw Material Sample';
    newRow.tcc = newRow.tcc || 'Absent';
    newRow.ecoli = newRow.ecoli || 'Absent';
    newRow.in_date = newRow.in_date || new Date().toISOString().slice(0, 10);
    newRow.in_time = newRow.in_time || '10:00';
    newRow.out_date = newRow.out_date || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    newRow.out_time = newRow.out_time || '10:00';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const firstTable = Object.values(tableData)[0] || [];
    onSubmit({
      doctype: 'Microbiological Analysis of Primary Raw Materials',
      ...formData,
      ...tableData,
      date: formData.date || new Date().toISOString().slice(0, 10),
      analyst: formData.analyst || 'Analyst',
      manager: formData.manager || 'Manager',
      sampleRows: firstTable
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              required={field.reqd === 1}
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${field.label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '940px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 1: Microbiological Analysis of Primary Raw Materials
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Microbiological Analysis of Primary Raw Materials"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `form1_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Microbiological Analysis Detail';
              const childFields = (childMetas[childDoctype] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      ➕ Add Row
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ width: '30px', textAlign: 'center' }}>#</th>
                          {childFields.map(cf => (
                            <th key={cf.fieldname}>{cf.label}</th>
                          ))}
                          <th style={{ width: '40px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={childFields.length + 2} style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                              No rows added yet. Click "➕ Add Row" to add entries.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ textAlign: 'center', fontWeight: '700' }}>{rIdx + 1}</td>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px' }}>
                                  {renderControlInput(
                                    cf,
                                    row[cf.fieldname],
                                    (v) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, v),
                                    `form1_tbl_${tf.fieldname}_${rIdx}_${cf.fieldname}`
                                  )}
                                </td>
                              ))}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                  onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                  title="Remove row"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Signature Fields (Rendered at the END of the form) */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '12px', fontSize: '13px' }}>
                  ✍️ Signatures & Approvals
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(f => (
                    <div key={f.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `form1_sig_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FormFootnote doctype="Microbiological Analysis of Primary Raw Materials" defaultFormNo="Form 1" formTitle="Microbiological Analysis of Primary Raw Materials" />
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Micro Raw Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function LabForm9Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    type_of_water: 'PET',
    analyst: '',
    verified_by: '',
    raw_ph: '7.0',
    raw_ph_time: '08:00',
    raw_tds: '100',
    raw_tds_time: '08:00',
    cip_ph: '7.0',
    cip_time: '09:00',
    alcohol_check: '0.0',
    brix_check: '0.0',
    buffer4: '4.00',
    buffer7: '7.00',
    buffer10: '10.00',
    cond1413: '1413',
    check_standard: '1413',
    comments: ''
  });

  // Dynamic state for child table fields (fieldname -> array of row objects)
  const [tableData, setTableData] = useState({
    product_water_details: [
      { row_type: 'Row 1 (PET)', ph_level: '7.2', ph_time: '10:00', tds_level: '120', tds_time: '10:00', taste_check: 'Pass', taste_time: '10:00', particle_check: 'Pass', particle_time: '10:00' },
      { row_type: 'Row 2 (BIB)', ph_level: '7.2', ph_time: '14:00', tds_level: '120', tds_time: '14:00', taste_check: 'Pass', taste_time: '14:00', particle_check: 'Pass', particle_time: '14:00' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Chemical Test"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm9Modal] Fetching DocType meta for "Chemical Test"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Chemical Test');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'type_of_water', label: 'Type of Water', fieldtype: 'Select', options: 'PET\nBIB' },
            { idx: 3, fieldname: 'analyst', label: 'Analyst', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'verified_by', label: 'Verified By', fieldtype: 'Link', options: 'Employee' },
            { idx: 5, fieldname: 'raw_ph', label: 'Raw Water pH', fieldtype: 'Float' },
            { idx: 6, fieldname: 'raw_tds', label: 'Raw Water TDS', fieldtype: 'Float' },
            { idx: 7, fieldname: 'cip_ph', label: 'pH After CIP', fieldtype: 'Float' },
            { idx: 8, fieldname: 'alcohol_check', label: 'RTD to CSD Alcohol%', fieldtype: 'Float' },
            { idx: 9, fieldname: 'brix_check', label: 'RTD to Water Brix', fieldtype: 'Float' },
            { idx: 10, fieldname: 'product_water_details', label: 'Product Water PET / BIB Details', fieldtype: 'Table', options: 'Product Water Test Detail' },
            { idx: 11, fieldname: 'comments', label: 'Comments / Observations', fieldtype: 'Small Text' },
            { idx: 12, fieldname: 'signature', label: 'Signature', fieldtype: 'Signature' }
          ];
        }

        // Clean label formatting (remove bracketed descriptors & resolve missing labels)
        fields = fields.map(f => {
          let lbl = f.label;
          if (!lbl || lbl === f.fieldname) {
            lbl = f.options || f.fieldname;
          }
          lbl = lbl.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
          return {
            ...f,
            label: lbl
          };
        });

        if (isMounted) {
          console.log('=============================================================');
          console.log('📋 CHEMICAL TEST DYNAMIC META:', doctypeMeta);
          console.log('📋 DYNAMIC FIELDS COUNT:', fields.length);
          console.table(fields.map(f => ({
            idx: f.idx,
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            options: f.options,
            reqd: f.reqd
          })));
          console.log('=============================================================');
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};
        const newTableDataInit = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Product Water Test Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              console.log(`📋 CHILD DOCTYPE META FOR (${tf.options}):`, childMeta);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'row_type', label: 'Line / Row', fieldtype: 'Data' },
              { idx: 2, fieldname: 'ph_level', label: 'pH Level', fieldtype: 'Float' },
              { idx: 3, fieldname: 'ph_time', label: 'pH Time', fieldtype: 'Time' },
              { idx: 4, fieldname: 'tds_level', label: 'TDS Level (ppm)', fieldtype: 'Float' },
              { idx: 5, fieldname: 'tds_time', label: 'TDS Time', fieldtype: 'Time' },
              { idx: 6, fieldname: 'taste_check', label: 'Taste & Odour Check', fieldtype: 'Select', options: 'Pass\nFail' },
              { idx: 7, fieldname: 'particle_check', label: 'Visual Particle Check', fieldtype: 'Select', options: 'Pass\nFail' }
            ];
          }

          // Clean child field labels too (remove brackets)
          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          // Default initial rows for this table field if not already present
          newTableDataInit[tf.fieldname] = [
            { row_type: 'Row 1 (PET)', ph_level: '7.2', ph_time: '10:00', tds_level: '120', tds_time: '10:00', taste_check: 'Pass', taste_time: '10:00', particle_check: 'Pass', particle_time: '10:00' },
            { row_type: 'Row 2 (BIB)', ph_level: '7.2', ph_time: '14:00', tds_level: '120', tds_time: '14:00', taste_check: 'Pass', taste_time: '14:00', particle_check: 'Pass', particle_time: '14:00' }
          ];
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
          setTableData(prev => ({
            ...newTableDataInit,
            ...prev
          }));
        }
      } catch (err) {
        console.error('[LabForm9Modal] Error fetching meta fields for "Chemical Test":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
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
    newRow.row_type = newRow.row_type || `Row ${(tableData[tableFieldName] || []).length + 1}`;
    newRow.ph_level = newRow.ph_level || '7.2';
    newRow.ph_time = newRow.ph_time || new Date().toTimeString().slice(0, 5);
    newRow.tds_level = newRow.tds_level || '120';
    newRow.tds_time = newRow.tds_time || new Date().toTimeString().slice(0, 5);
    newRow.taste_check = newRow.taste_check || 'Pass';
    newRow.particle_check = newRow.particle_check || 'Pass';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Chemical Test',
      ...formData,
      ...tableData,
      analyst: formData.analyst || 'Analyst',
      verifiedBy: formData.verified_by || 'Supervisor',
      date: formData.date
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              required={field.reqd === 1}
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${field.label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '940px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 9: Chemical Test Log Sheet
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Chemical Test"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `chem_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Product Water Test Detail';
              const childFields = (childMetas[childDoctype] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      ➕ Add Row
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ width: '30px', textAlign: 'center' }}>#</th>
                          {childFields.map(cf => (
                            <th key={cf.fieldname}>{cf.label}</th>
                          ))}
                          <th style={{ width: '40px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={childFields.length + 2} style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                              No rows added yet. Click "➕ Add Row" to add entries.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ textAlign: 'center', fontWeight: '700' }}>{rIdx + 1}</td>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px' }}>
                                  {renderControlInput(
                                    cf,
                                    row[cf.fieldname],
                                    (v) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, v),
                                    `chem_tbl_${tf.fieldname}_${rIdx}_${cf.fieldname}`
                                  )}
                                </td>
                              ))}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                  onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                  title="Remove row"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Signature Fields (Rendered at the END of the form) */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '12px', fontSize: '13px' }}>
                  ✍️ Signatures & Approvals
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(f => (
                    <div key={f.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `chem_sig_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Chemical Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function LabForm11Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date_of_analysis: new Date().toISOString().slice(0, 10),
    date_of_product: new Date().toISOString().slice(0, 10),
    analyst: '',
    approved_by: '',
    market_area: 'Local',
    product_size: '1.5L PET',
    vessel_number: 'Vessel A',
    compact_dry_ec_batch: 'CD-EC-901',
    pipette_lot_no: 'PL-9988',
    spc_agar_prep_date: new Date().toISOString().slice(0, 10),
    incubator_no: '1',
    incubator_test_type: 'TCC',
    tcc_incubation_in: new Date().toISOString().slice(0, 16),
    tcc_incubation_out: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    hpc_incubation_in: new Date().toISOString().slice(0, 16),
    hpc_incubation_out: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
    general_observations: '',
    signature: ''
  });

  // Dynamic state for child table fields (fieldname -> array of row objects)
  const [tableData, setTableData] = useState({
    water_micro_details: [
      { sample: 'Silver Ion', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' },
      { sample: 'BH', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' },
      { sample: '0.45um Filter', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Microbiologiocal Analysis Raw and Product Water"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm11Modal] Fetching DocType meta for "Microbiologiocal Analysis Raw and Product Water"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Microbiologiocal Analysis Raw and Product Water');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date_of_analysis', label: 'Date of Analysis', fieldtype: 'Date' },
            { idx: 2, fieldname: 'date_of_product', label: 'Date of Product', fieldtype: 'Date' },
            { idx: 3, fieldname: 'analyst', label: 'Analyst Name', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'approved_by', label: 'Approved By', fieldtype: 'Link', options: 'Employee' },
            { idx: 5, fieldname: 'market_area', label: 'Market Area', fieldtype: 'Select', options: 'Local\nExport' },
            { idx: 6, fieldname: 'product_size', label: 'Product Size', fieldtype: 'Data' },
            { idx: 7, fieldname: 'vessel_number', label: 'Vessel / Lot Number', fieldtype: 'Data' },
            { idx: 8, fieldname: 'compact_dry_ec_batch', label: 'Compact Dry EC Batch', fieldtype: 'Data' },
            { idx: 9, fieldname: 'pipette_lot_no', label: 'Pipette Lot No.', fieldtype: 'Data' },
            { idx: 10, fieldname: 'spc_agar_prep_date', label: 'SPC Agar Prep Date', fieldtype: 'Date' },
            { idx: 11, fieldname: 'incubator_no', label: 'Incubator No.', fieldtype: 'Select', options: '1\n2\n3' },
            { idx: 12, fieldname: 'incubator_test_type', label: 'Incubator Test Type', fieldtype: 'Select', options: 'TCC\nHPC' },
            { idx: 13, fieldname: 'tcc_incubation_in', label: 'TCC Incubation In', fieldtype: 'Datetime' },
            { idx: 14, fieldname: 'tcc_incubation_out', label: 'TCC Incubation Out', fieldtype: 'Datetime' },
            { idx: 15, fieldname: 'hpc_incubation_in', label: 'HPC Incubation In', fieldtype: 'Datetime' },
            { idx: 16, fieldname: 'hpc_incubation_out', label: 'HPC Incubation Out', fieldtype: 'Datetime' },
            { idx: 17, fieldname: 'water_micro_details', label: 'Microbiological Cultivation Results', fieldtype: 'Table', options: 'Microbiological Analysis Detail' },
            { idx: 18, fieldname: 'general_observations', label: 'General Observations', fieldtype: 'Small Text' },
            { idx: 19, fieldname: 'signature', label: 'Analyst Signature', fieldtype: 'Signature' }
          ];
        }

        // Clean label formatting (remove bracketed descriptors & resolve missing labels)
        fields = fields.map(f => {
          let lbl = f.label;
          if (!lbl || lbl === f.fieldname) {
            lbl = f.options || f.fieldname;
          }
          lbl = lbl.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
          return {
            ...f,
            label: lbl
          };
        });

        if (isMounted) {
          console.log('=============================================================');
          console.log('📋 MICROBIOLOGICAL ANALYSIS RAW AND PRODUCT WATER DYNAMIC META:', doctypeMeta);
          console.log('📋 DYNAMIC FIELDS COUNT:', fields.length);
          console.table(fields.map(f => ({
            idx: f.idx,
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            options: f.options,
            reqd: f.reqd
          })));
          console.log('=============================================================');
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};
        const newTableDataInit = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Microbiological Analysis Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              console.log(`📋 CHILD DOCTYPE META FOR (${tf.options}):`, childMeta);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'sample', label: 'Sample Source', fieldtype: 'Data' },
              { idx: 2, fieldname: 'tcc', label: 'TCC (Absent/100ml)', fieldtype: 'Select', options: 'Absent\nPresent' },
              { idx: 3, fieldname: 'ecoli', label: 'E-Coli', fieldtype: 'Select', options: 'Absent\nPresent' },
              { idx: 4, fieldname: 'hpc1', label: 'HPC (Count 1)', fieldtype: 'Float' },
              { idx: 5, fieldname: 'hpc2', label: 'HPC (Count 2)', fieldtype: 'Float' },
              { idx: 6, fieldname: 'analyst', label: 'Row Analyst', fieldtype: 'Data' }
            ];
          }

          // Clean child field labels too (remove brackets)
          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          // Initial default rows if not populated
          newTableDataInit[tf.fieldname] = [
            { sample: 'Silver Ion', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' },
            { sample: 'BH', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' },
            { sample: '0.45um Filter', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' }
          ];
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
          setTableData(prev => ({
            ...newTableDataInit,
            ...prev
          }));
        }
      } catch (err) {
        console.error('[LabForm11Modal] Error fetching meta fields for Water Micro:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
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
      if (f.fieldtype === 'Select') {
        const opts = parseSelectOptions(f.options);
        newRow[f.fieldname] = opts[0] || '';
      } else {
        newRow[f.fieldname] = '';
      }
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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const primaryTableKey = Object.keys(tableData)[0] || 'water_micro_details';
    const sampleRows = tableData[primaryTableKey] || [];

    onSubmit({
      ...formData,
      ...tableData,
      // Backward-compatible properties
      analyst: formData.analyst || formData.analyst_name || '',
      approvedBy: formData.approved_by || formData.manager || formData.approvedBy || '',
      date: formData.date_of_analysis || formData.date || new Date().toISOString().slice(0, 10),
      dateOfProduct: formData.date_of_product || new Date().toISOString().slice(0, 10),
      market: formData.market_area || formData.market || 'Local',
      productSize: formData.product_size || '1.5L PET',
      vessel: formData.vessel_number || formData.vessel || 'Vessel A',
      compactDryEC: formData.compact_dry_ec_batch || formData.compact_dry_ec || 'CD-EC-901',
      pipetteLot: formData.pipette_lot_no || formData.pipette_lot || 'PL-9988',
      spcAgarDate: formData.spc_agar_prep_date || formData.spc_agar_date || new Date().toISOString().slice(0, 10),
      incubatorNo: formData.incubator_no || '1',
      incubatorTestType: formData.incubator_test_type || 'TCC',
      tccIncubationIn: formData.tcc_incubation_in || '',
      tccIncubationOut: formData.tcc_incubation_out || '',
      hpcIncubationIn: formData.hpc_incubation_in || '',
      hpcIncubationOut: formData.hpc_incubation_out || '',
      sampleRows,
      comments: formData.general_observations || formData.comments || ''
    });
  };

  const renderControlInput = (field, value, onChange, searchFieldKey = '') => {
    const { fieldtype, fieldname, options, label, reqd } = field;

    // Filter hidden fields
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('verified by');

    if (fieldtype === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={Boolean(reqd)}
            value={value || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fieldtype === 'Date') {
      return (
        <input
          type="date"
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Time') {
      return (
        <input
          type="time"
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Datetime' || fieldtype === 'Date Time') {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={Boolean(reqd)}
          value={value || localDT}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Select') {
      const selectOpts = parseSelectOptions(options);
      return (
        <select
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">-- Select {label || 'Option'} --</option>
          {selectOpts.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (fieldtype === 'Check') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(e.target.checked ? 1 : 0)}
          />
          <span style={{ fontSize: '12px' }}>{label}</span>
        </div>
      );
    }

    if (fieldtype === 'Small Text' || fieldtype === 'Text' || fieldtype === 'Long Text') {
      return (
        <textarea
          className="form-input"
          style={{ minHeight: searchFieldKey?.includes('tbl') ? '32px' : '50px', padding: '6px' }}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${label}...`}
        />
      );
    }

    if (fieldtype === 'Float' || fieldtype === 'Int' || fieldtype === 'Currency' || fieldtype === 'Percent') {
      return (
        <input
          type="number"
          step={fieldtype === 'Int' ? '1' : 'any'}
          className="form-input"
          required={Boolean(reqd)}
          value={value !== undefined ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
        />
      );
    }

    if (fieldtype === 'Signature') {
      return (
        <div style={{ border: '1px dashed var(--border-color)', padding: '12px', borderRadius: '8px', background: 'var(--bg-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>✍️ Digital Signature Input</span>
            {value && (
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                onClick={() => onChange('')}
              >
                Clear Signature
              </button>
            )}
          </div>
          <input
            type="text"
            className="form-input"
            style={{
              fontFamily: '"Caveat", "Brush Script MT", cursive',
              fontSize: '22px',
              color: '#1e3a8a',
              letterSpacing: '1px',
              padding: '8px 12px',
              background: '#fff'
            }}
            placeholder="Type your full name to sign dynamically..."
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
          {value && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ Digitally Signed by: {value}
            </div>
          )}
        </div>
      );
    }

    // Default Fallback (Data, Read Only, etc.)
    return (
      <input
        type="text"
        className="form-input"
        required={Boolean(reqd)}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={`Enter ${label}...`}
      />
    );
  };

  const fieldsList = meta?.fields || [];
  const normalFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldtype !== 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    !f.fieldname?.includes('signature') &&
    f.hidden !== 1
  );

  const tableFields = fieldsList.filter(f => f.fieldtype === 'Table' && f.hidden !== 1);
  const signatureFields = fieldsList.filter(f => (f.fieldtype === 'Signature' || f.fieldname?.includes('signature')) && f.hidden !== 1);

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 11: Microbiological Analysis of Raw and Product Water</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Microbiologiocal Analysis Raw and Product Water"...
              </div>
            ) : (
              <>
                {/* Dynamic Top-Level Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {normalFields.map(field => (
                    <div key={field.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {field.label} {field.reqd ? '*' : ''}
                      </label>
                      {renderControlInput(
                        field,
                        formData[field.fieldname],
                        (val) => handleFieldChange(field.fieldname, val),
                        `form11_${field.fieldname}`
                      )}
                    </div>
                  ))}
                </div>

                {/* Dynamic Child Tables */}
                {tableFields.map(tf => {
                  const childDoctype = tf.options || 'Microbiological Analysis Detail';
                  const childFields = childMetas[childDoctype] || [];
                  const rows = tableData[tf.fieldname] || [];

                  return (
                    <div key={tf.fieldname} style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                        <h4 style={{ fontSize: '13px', color: 'var(--accent)', margin: 0 }}>{tf.label}</h4>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => addTableRow(tf.fieldname, childDoctype)}
                        >
                          ➕ Add Row
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              {childFields.filter(cf => cf.fieldname !== 'amended_from' && cf.hidden !== 1).map(cf => (
                                <th key={cf.fieldname} style={{ padding: '6px', textAlign: 'left' }}>
                                  {cf.label} {cf.reqd ? '*' : ''}
                                </th>
                              ))}
                              <th style={{ width: '50px', padding: '6px', textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rIdx) => (
                              <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {childFields.filter(cf => cf.fieldname !== 'amended_from' && cf.hidden !== 1).map(cf => (
                                  <td key={cf.fieldname} style={{ padding: '4px' }}>
                                    {renderControlInput(
                                      cf,
                                      row[cf.fieldname],
                                      (val) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, val),
                                      `form11_tbl_${tf.fieldname}_${cf.fieldname}_${rIdx}`
                                    )}
                                  </td>
                                ))}
                                <td style={{ padding: '4px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                    title="Remove Row"
                                    onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* SIGNATURE FIELDS - ALWAYS AT THE VERY END OF THE FORM */}
                {signatureFields.map(sigField => (
                  <div key={sigField.fieldname} style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      {sigField.label} {sigField.reqd ? '*' : ''}
                    </label>
                    {renderControlInput(
                      sigField,
                      formData[sigField.fieldname],
                      (val) => handleFieldChange(sigField.fieldname, val),
                      `form11_${sigField.fieldname}`
                    )}
                  </div>
                ))}
              </>
            )}

            <FormFootnote doctype="Microbiologiocal Analysis Raw and Product Water" defaultFormNo="Form 11" formTitle="Raw and Product Water Analysis" />
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Water Micro Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function LabForm21Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    form_date: new Date().toISOString().slice(0, 10),
    revision_no: '01',
    revision_date: new Date().toISOString().slice(0, 10),
    approved_by: ''
  });

  // Dynamic state for child table fields (fieldname -> array of row objects)
  const [tableData, setTableData] = useState({
    taste_test_details: [
      { sample_date: new Date().toISOString().slice(0, 10), sample_size: '600ml PET', h4_taste: 'Normal', h4_done_by: '', h36_taste: 'Normal', h36_done_by: '', h72_taste: 'Normal', h72_done_by: '', verified_by: '' }
    ],
    particle_count_details: [
      { sample_date: new Date().toISOString().slice(0, 10), sample_size: '600ml PET', d5_particle: 'Nil', d5_done_by: '', d10_particle: 'Nil', d10_done_by: '', d30_particle: 'Nil', d30_done_by: '', verified_by: '' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Taste Test and Visual Inspection"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm21Modal] Fetching DocType meta for "Taste Test and Visual Inspection"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Taste Test and Visual Inspection');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'form_date', label: 'Form Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'taste_test_details', label: 'Taste Test Details', fieldtype: 'Table', options: 'Taste Test Detail' },
            { idx: 3, fieldname: 'particle_count_details', label: 'Particle Count Details', fieldtype: 'Table', options: 'Particle Count Detail' },
            { idx: 4, fieldname: 'revision_no', label: 'Revision No.', fieldtype: 'Data' },
            { idx: 5, fieldname: 'revision_date', label: 'Revision Date', fieldtype: 'Date' },
            { idx: 6, fieldname: 'approved_by', label: 'Approved By', fieldtype: 'Link', options: 'Employee' }
          ];
        }

        // Clean label formatting (remove bracketed descriptors & resolve missing labels)
        fields = fields.map(f => {
          let lbl = f.label;
          if (!lbl || lbl === f.fieldname) {
            lbl = f.options || f.fieldname;
          }
          lbl = lbl.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
          return {
            ...f,
            label: lbl
          };
        });

        if (isMounted) {
          console.log('=============================================================');
          console.log('📋 TASTE TEST AND VISUAL INSPECTION DYNAMIC META:', doctypeMeta);
          console.log('📋 DYNAMIC FIELDS COUNT:', fields.length);
          console.table(fields.map(f => ({
            idx: f.idx,
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            options: f.options,
            reqd: f.reqd
          })));
          console.log('=============================================================');
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};
        const newTableDataInit = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Taste Test Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              console.log(`📋 CHILD DOCTYPE META FOR (${tf.options}):`, childMeta);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            if (tf.fieldname === 'taste_test_details' || tf.options === 'Taste Test Detail' || tf.options === 'Taste Result') {
              childFields = [
                { idx: 1, fieldname: 'sample_date', label: 'Sample Date', fieldtype: 'Date' },
                { idx: 2, fieldname: 'sample_size', label: 'Sample Size', fieldtype: 'Data' },
                { idx: 3, fieldname: 'h4_taste', label: '4H Taste', fieldtype: 'Data' },
                { idx: 4, fieldname: 'h4_done_by', label: '4H Done By', fieldtype: 'Link', options: 'Employee' },
                { idx: 5, fieldname: 'h36_taste', label: '36H Taste', fieldtype: 'Data' },
                { idx: 6, fieldname: 'h36_done_by', label: '36H Done By', fieldtype: 'Link', options: 'Employee' },
                { idx: 7, fieldname: 'h72_taste', label: '72H Taste', fieldtype: 'Data' },
                { idx: 8, fieldname: 'h72_done_by', label: '72H Done By', fieldtype: 'Link', options: 'Employee' },
                { idx: 9, fieldname: 'verified_by', label: 'Verified By', fieldtype: 'Link', options: 'Employee' }
              ];
            } else {
              childFields = [
                { idx: 1, fieldname: 'sample_date', label: 'Sample Date', fieldtype: 'Date' },
                { idx: 2, fieldname: 'sample_size', label: 'Sample Size', fieldtype: 'Data' },
                { idx: 3, fieldname: 'd5_particle', label: '5D Particles', fieldtype: 'Data' },
                { idx: 4, fieldname: 'd5_done_by', label: '5D Done By', fieldtype: 'Link', options: 'Employee' },
                { idx: 5, fieldname: 'd10_particle', label: '10D Particles', fieldtype: 'Data' },
                { idx: 6, fieldname: 'd10_done_by', label: '10D Done By', fieldtype: 'Link', options: 'Employee' },
                { idx: 7, fieldname: 'd30_particle', label: '30D Particles', fieldtype: 'Data' },
                { idx: 8, fieldname: 'd30_done_by', label: '30D Done By', fieldtype: 'Link', options: 'Employee' },
                { idx: 9, fieldname: 'verified_by', label: 'Verified By', fieldtype: 'Link', options: 'Employee' }
              ];
            }
          }

          // Clean child field labels too
          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          // Default initial rows for this table field if not already present
          if (tf.fieldname === 'taste_test_details' || tf.options === 'Taste Test Detail' || tf.options === 'Taste Result') {
            newTableDataInit[tf.fieldname] = [
              { sample_date: new Date().toISOString().slice(0, 10), sample_size: '600ml PET', h4_taste: 'Normal', h4_done_by: '', h36_taste: 'Normal', h36_done_by: '', h72_taste: 'Normal', h72_done_by: '', verified_by: '' }
            ];
          } else {
            newTableDataInit[tf.fieldname] = [
              { sample_date: new Date().toISOString().slice(0, 10), sample_size: '600ml PET', d5_particle: 'Nil', d5_done_by: '', d10_particle: 'Nil', d10_done_by: '', d30_particle: 'Nil', d30_done_by: '', verified_by: '' }
            ];
          }
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
          setTableData(prev => ({
            ...newTableDataInit,
            ...prev
          }));
        }
      } catch (err) {
        console.error('[LabForm21Modal] Error fetching meta fields for "Taste Test and Visual Inspection":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
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
    newRow.sample_date = newRow.sample_date || new Date().toISOString().slice(0, 10);
    newRow.sample_size = newRow.sample_size || '600ml PET';
    if ('h4_taste' in newRow || childFields.some(cf => cf.fieldname === 'h4_taste')) newRow.h4_taste = 'Normal';
    if ('h36_taste' in newRow || childFields.some(cf => cf.fieldname === 'h36_taste')) newRow.h36_taste = 'Normal';
    if ('h72_taste' in newRow || childFields.some(cf => cf.fieldname === 'h72_taste')) newRow.h72_taste = 'Normal';
    if ('d5_particle' in newRow || childFields.some(cf => cf.fieldname === 'd5_particle')) newRow.d5_particle = 'Nil';
    if ('d10_particle' in newRow || childFields.some(cf => cf.fieldname === 'd10_particle')) newRow.d10_particle = 'Nil';
    if ('d30_particle' in newRow || childFields.some(cf => cf.fieldname === 'd30_particle')) newRow.d30_particle = 'Nil';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Taste Test and Visual Inspection',
      ...formData,
      ...tableData,
      date: formData.form_date || formData.date,
      verifiedBy: formData.approved_by || 'Supervisor'
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              required={field.reqd === 1}
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${field.label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 21: Taste Test & Visual Inspection Shelf Life Log
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Taste Test and Visual Inspection"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `taste_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Taste Test Detail';
              const childFields = (childMetas[childDoctype] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      ➕ Add Row
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ width: '30px', textAlign: 'center' }}>#</th>
                          {childFields.map(cf => (
                            <th key={cf.fieldname}>{cf.label}</th>
                          ))}
                          <th style={{ width: '40px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={childFields.length + 2} style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                              No rows added yet. Click "➕ Add Row" to add entries.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ textAlign: 'center', fontWeight: '700' }}>{rIdx + 1}</td>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px' }}>
                                  {renderControlInput(
                                    cf,
                                    row[cf.fieldname],
                                    (v) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, v),
                                    `taste_tbl_${tf.fieldname}_${rIdx}_${cf.fieldname}`
                                  )}
                                </td>
                              ))}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                  onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                  title="Remove row"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Signature Fields (Rendered at the END of the form) */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '12px', fontSize: '13px' }}>
                  ✍️ Signatures & Approval
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(f => (
                    <div key={f.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `taste_sig_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FormFootnote doctype="Taste Test and Visual Inspection" defaultFormNo="Form 21" formTitle="Taste & Visual Inspection Log" />
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Taste & Visual Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function LabReportViewerModal({ record, onClose, setEmailModal }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [fullDoc, setFullDoc] = useState(null);

  // Map record type / doctype to Frappe DocType name
  const getDocTypeName = (rec) => {
    if (!rec) return '';
    const idStr = String(rec.id || rec.name || '').trim();

    // 1. Check ID Prefix first for 100% accurate DocType matching
    if (idStr.startsWith('MARPW')) return 'Microbiologiocal Analysis Raw and Product Water';
    if (idStr.startsWith('MARPM') || idStr.startsWith('MAPRM')) return 'Microbiological Analysis of Primary Raw Materials';
    if (idStr.startsWith('CHEM') || idStr.startsWith('CT-')) return 'Chemical Test';
    if (idStr.startsWith('TV-') || idStr.startsWith('TTVI')) return 'Taste Test and Visual Inspection';
    if (idStr.startsWith('BOUR') || idStr.startsWith('BWCP')) return 'Bourbon Whiskey And Cola Product Tank Record';
    if (idStr.startsWith('RUM') || idStr.startsWith('GSRC')) return 'Gold Stone Rum and Cola Tank Record';
    if (idStr.startsWith('MA-') || idStr.startsWith('F83')) return 'Microbiological Analysis';
    if (idStr.startsWith('SAN-') || idStr.startsWith('SR-')) return 'Sanitation Record';
    if (idStr.startsWith('INC-') || idStr.startsWith('ITR')) return 'Incubator Temperature Record';
    if (idStr.startsWith('WCC-') || idStr.startsWith('WC-')) return 'Weight Check Checklist';
    if (idStr.startsWith('SILV-') || idStr.startsWith('SPL-')) return 'Silver Photometer Log';
    if (idStr.startsWith('SEAM-') || idStr.startsWith('SCF-')) return 'Seam Checklist Form';
    if (idStr.startsWith('SYR-') || idStr.startsWith('SPR-')) return 'Syrup Preparation Record';
    if (idStr.startsWith('RSIL-')) return 'Retain Sample Inspection Log';
    if (idStr.startsWith('CCL-')) return 'Customer Complaint Log';
    if (idStr.startsWith('RR-')) return 'Recall Review';
    if (idStr.startsWith('LSR-') || idStr.startsWith('LIB-') || idStr.startsWith('F72')) return 'Library Sample Record';
    if (idStr.startsWith('ROT-') || idStr.startsWith('ROTRM-') || idStr.startsWith('F64')) return 'Rinse-Off Test for Raw Materials';
    if (idStr.startsWith('MPR-') || idStr.startsWith('F13')) return 'Media Preparation Record';
    if (idStr.startsWith('AUTO-') || idStr.startsWith('AR-') || idStr.startsWith('F12') || idStr.startsWith('F85')) return 'Autoclave Record';
    if (idStr.startsWith('TOP-') || idStr.startsWith('TRAC-') || idStr.startsWith('F47')) return 'Traceability of products';
    if (idStr.startsWith('IND-') || idStr.startsWith('INDUT-') || idStr.startsWith('F39')) return 'Induction';

    // 2. Check explicit doctype property
    if (rec.doctype) return rec.doctype;

    // 3. Fallback to type string with exact word boundaries
    const typeStr = String(rec.type || rec.reportType || '');

    if (/\bForm 11\b/i.test(typeStr) || /Raw and Product Water/i.test(typeStr) || /Micro Water/i.test(typeStr)) {
      return 'Microbiologiocal Analysis Raw and Product Water';
    }
    if (/\bForm 104\b/i.test(typeStr) || /Seam Checklist/i.test(typeStr)) {
      return 'Seam Checklist Form';
    }
    if (/\bForm 103\b/i.test(typeStr) || /Silver Photometer/i.test(typeStr) || /Silver Log/i.test(typeStr)) {
      return 'Silver Photometer Log';
    }
    if (/\bForm 100\b/i.test(typeStr) || /Retain Sample/i.test(typeStr) || /Production Record/i.test(typeStr)) {
      return 'Retain Sample Inspection Log';
    }
    if (/\bForm 1\b/i.test(typeStr) || /Primary Raw/i.test(typeStr) || /Micro raw/i.test(typeStr)) {
      return 'Microbiological Analysis of Primary Raw Materials';
    }
    if (/\bForm 9\b/i.test(typeStr) || /Chemical Test/i.test(typeStr) || /Chemical/i.test(typeStr)) {
      return 'Chemical Test';
    }
    if (/\bForm 21\b/i.test(typeStr) || /Taste Test/i.test(typeStr) || /Taste\/Visual/i.test(typeStr)) {
      return 'Taste Test and Visual Inspection';
    }
    if (/\bForm 35\b/i.test(typeStr) || /Gold Stone/i.test(typeStr)) {
      return 'Gold Stone Rum and Cola Tank Record';
    }
    if (/\bForm 36\b/i.test(typeStr) || /Bourbon/i.test(typeStr)) {
      return 'Bourbon Whiskey And Cola Product Tank Record';
    }
    if (/\bForm 83\b/i.test(typeStr) || /Microbiological Analysis/i.test(typeStr)) {
      return 'Microbiological Analysis';
    }
    if (/\bForm 84\b/i.test(typeStr) || /Sanitation Record/i.test(typeStr)) {
      return 'Sanitation Record';
    }
    if (/\bForm 86\b/i.test(typeStr) || /Incubator Temperature/i.test(typeStr)) {
      return 'Incubator Temperature Record';
    }
    if (/\bForm 88\b/i.test(typeStr) || /Weight Check/i.test(typeStr)) {
      return 'Weight Check Checklist';
    }
    if (/\bForm 34\b/i.test(typeStr) || /Syrup Preparation/i.test(typeStr)) {
      return 'Syrup Preparation Record';
    }
    if (/\bForm 69\b/i.test(typeStr) || /Customer Complaint/i.test(typeStr)) {
      return 'Customer Complaint Log';
    }
    if (/\bForm 70\b/i.test(typeStr) || /Recall Review/i.test(typeStr)) {
      return 'Recall Review';
    }
    if (/\bForm 72\b/i.test(typeStr) || /Library Sample/i.test(typeStr)) {
      return 'Library Sample Record';
    }
    if (/\bForm 64\b/i.test(typeStr) || /Rinse-Off Test/i.test(typeStr) || /Rinse Off/i.test(typeStr)) {
      return 'Rinse-Off Test for Raw Materials';
    }
    if (/\bForm 13\b/i.test(typeStr) || /Media Preparation/i.test(typeStr)) {
      return 'Media Preparation Record';
    }
    if (/\bForm 12\b/i.test(typeStr) || /\bForm 85\b/i.test(typeStr) || /Autoclave/i.test(typeStr)) {
      return 'Autoclave Record';
    }
    if (/\bForm 47\b/i.test(typeStr) || /Traceability/i.test(typeStr)) {
      return 'Traceability of products';
    }
    if (/\bForm 39\b/i.test(typeStr) || /Induction/i.test(typeStr)) {
      return 'Induction';
    }

    return typeStr;
  };

  const targetDocType = getDocTypeName(record);

  useEffect(() => {
    let isMounted = true;
    async function loadMetaAndDoc() {
      if (!targetDocType) {
        setLoadingMeta(false);
        return;
      }
      try {
        setLoadingMeta(true);

        const docId = record?.id || record?.name;
        let fetchedDoc = null;
        if (docId) {
          try {
            const docRes = await frappe.makeRequest('GET', targetDocType, docId);
            if (docRes?.data) fetchedDoc = docRes.data;
          } catch (e) {
            console.warn(`Could not fetch live doc ${docId} for ${targetDocType}:`, e);
          }
        }
        if (isMounted) {
          setFullDoc(fetchedDoc || record);
        }

        const doctypeMeta = await frappe.getDocTypeMeta(targetDocType);
        if (isMounted && doctypeMeta) {
          setMeta(doctypeMeta);

          const tableFields = (doctypeMeta?.fields || []).filter(f => f.fieldtype === 'Table' && f.options);
          const childMap = {};
          for (const tf of tableFields) {
            try {
              const cm = await frappe.getDocTypeMeta(tf.options);
              if (cm) childMap[tf.options] = cm.fields || [];
            } catch (err) {
              console.warn(`Could not load child meta for ${tf.options}:`, err);
            }
          }
          if (isMounted) {
            setChildMetas(childMap);
          }
        }
      } catch (err) {
        console.error(`Error loading meta/doc for viewer ${targetDocType}:`, err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    loadMetaAndDoc();
  }, [targetDocType, record?.id, record?.name]);

  const activeDoc = fullDoc || record || {};

  // Helper to format field value
  const getFieldValue = (field) => {
    if (!activeDoc) return '-';
    const fn = field.fieldname;
    if (activeDoc[fn] !== undefined && activeDoc[fn] !== null && activeDoc[fn] !== '') {
      return activeDoc[fn];
    }
    // Aliases
    if (fn === 'date' || fn === 'posting_date' || fn === 'date_of_analysis' || fn === 'sanitation_date' || fn === 'form_date' || fn === 'date_of_product') {
      return activeDoc.date || activeDoc.posting_date || activeDoc.date_of_analysis || activeDoc.sanitation_date || activeDoc.form_date || activeDoc.date_of_product || '-';
    }
    if (fn === 'analyst' || fn === 'recorded_by' || fn === 'operator' || fn === 'analyst_name') {
      return activeDoc.analyst || activeDoc.analyst_name || activeDoc.recordedBy || activeDoc.operator || activeDoc.cleaner || activeDoc.checked_by || '-';
    }
    if (fn === 'verified_by' || fn === 'approved_by' || fn === 'supervisor' || fn === 'manager') {
      return activeDoc.verified_by || activeDoc.verifiedBy || activeDoc.approved_by || activeDoc.approvedBy || activeDoc.supervisor || activeDoc.manager || '-';
    }
    if (fn === 'comments' || fn === 'remarks' || fn === 'general_observations') {
      return activeDoc.comments || activeDoc.remarks || activeDoc.general_observations || activeDoc.overallComments || '-';
    }
    if (fn === 'market_area' || fn === 'market') {
      return activeDoc.market_area || activeDoc.market || '-';
    }
    if (fn === 'product_size' || fn === 'product_size_l') {
      return activeDoc.product_size || activeDoc.productSize || '-';
    }
    if (fn === 'compact_dry_ec_batch' || fn === 'compact_dry_ec') {
      return activeDoc.compact_dry_ec_batch || activeDoc.compact_dry_ec || activeDoc.compactDryEC || '-';
    }
    if (fn === 'pipette_lot_no' || fn === 'pipette_lot') {
      return activeDoc.pipette_lot_no || activeDoc.pipette_lot || activeDoc.pipetteLot || '-';
    }
    if (fn === 'vessel_number' || fn === 'vessel_lot_no' || fn === 'vessel') {
      return activeDoc.vessel_number || activeDoc.vessel_lot_no || activeDoc.vessel || '-';
    }
    if (fn === 'spc_agar_prep_date' || fn === 'spc_agar_date') {
      return activeDoc.spc_agar_prep_date || activeDoc.spc_agar_date || activeDoc.spcAgarDate || '-';
    }
    if (fn === 'incubator_no' || fn === 'incubator_no_tcc_and_hpc') {
      return activeDoc.incubator_no || activeDoc.incubator_no_tcc_and_hpc || activeDoc.incubatorNo || '-';
    }

    // Convert snake_case to camelCase check
    const camelKey = fn.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (activeDoc[camelKey] !== undefined && activeDoc[camelKey] !== null && activeDoc[camelKey] !== '') {
      return activeDoc[camelKey];
    }

    return '-';
  };

  // Helper to get rows for table fields
  const getTableRows = (tf) => {
    if (!activeDoc) return [];
    const fn = tf.fieldname;
    if (Array.isArray(activeDoc[fn]) && activeDoc[fn].length > 0) return activeDoc[fn];

    // Alias map for table fields
    if (fn === 'raw_materials_details' || fn === 'water_micro_details' || fn === 'microbiological_analysis_details' || fn === 'sanitation_details') {
      return activeDoc.water_micro_details || activeDoc.raw_materials_details || activeDoc.microbiological_analysis_details || activeDoc.sanitation_details || activeDoc.sampleRows || activeDoc.rows || [];
    }
    if (fn === 'taste_test_details') return activeDoc.taste_test_details || activeDoc.tasteRows || [];
    if (fn === 'particle_count_details') return activeDoc.particle_count_details || activeDoc.particleRows || [];
    if (fn === 'seam_checks') return activeDoc.seam_checks || activeDoc.seam_rows || [];
    if (fn === 'table_wahj' || fn === 'incubator_checks') return activeDoc.table_wahj || activeDoc.incubator_checks || activeDoc.rows || [];

    if (Array.isArray(activeDoc.rows)) return activeDoc.rows;
    if (Array.isArray(activeDoc.sampleRows)) return activeDoc.sampleRows;
    if (Array.isArray(activeDoc.ingredients)) return activeDoc.ingredients;

    return [];
  };

  // Group fields by Section Break
  const buildSections = () => {
    const fields = meta?.fields || [];
    const sections = [];
    let currentSection = {
      title: 'General Information',
      description: '',
      standardFields: [],
      tableFields: []
    };

    fields.forEach(f => {
      if (f.hidden === 1 || f.fieldname === 'amended_from' || f.fieldname === 'docstatus' || f.fieldname === 'idx') return;

      if (f.fieldtype === 'Section Break') {
        if (currentSection.standardFields.length > 0 || currentSection.tableFields.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: f.label || 'Section Details',
          description: f.description || '',
          standardFields: [],
          tableFields: []
        };
      } else if (f.fieldtype === 'Column Break' || f.fieldtype === 'Fold') {
        // Layout divider inside section
      } else if (f.fieldtype === 'Table') {
        currentSection.tableFields.push(f);
      } else {
        currentSection.standardFields.push(f);
      }
    });

    if (currentSection.standardFields.length > 0 || currentSection.tableFields.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  };

  const sections = meta ? buildSections() : [];
  const sig = activeDoc?.signature || activeDoc?.analyst_signature || activeDoc?.operator_signature;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel print-report-container" style={{ width: '900px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Water (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Archived QC Laboratory Document ({targetDocType || activeDoc?.type}) - ID: {activeDoc?.id || activeDoc?.name}
            </span>
          </div>
          <button className="no-print" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Summary Card */}
          <div style={{ padding: '12px 16px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>QC REPORT TYPE / DOCTYPE</span>
              <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>{targetDocType || activeDoc?.type}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textAlign: 'right' }}>LOGGED TIMESTAMP</span>
              <strong>{activeDoc?.timestamp || activeDoc?.creation || activeDoc?.modified || new Date().toISOString().substring(0, 10)}</strong>
            </div>
          </div>

          {loadingMeta ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              ⏳ Fetching DocType meta and section structure from ERPNext...
            </div>
          ) : sections.length > 0 ? (
            sections.map((sec, sIdx) => (
              <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', backgroundColor: '#ffffff' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--accent)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  📌 {sec.title}
                </h4>
                {sec.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sec.description}</div>}

                {/* Standard Fields Grid */}
                {sec.standardFields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                    {sec.standardFields.map(field => {
                      const val = getFieldValue(field);
                      return (
                        <div key={field.fieldname} style={{ padding: '6px 10px', borderRadius: '4px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                            {field.label || field.fieldname}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', wordBreak: 'break-word' }}>
                            {field.fieldtype === 'Check' ? (val ? 'Yes (✓)' : 'No (✗)') : String(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Table Fields */}
                {sec.tableFields.map(tf => {
                  const rows = getTableRows(tf);
                  const childDoctype = tf.options;
                  const childFields = (childMetas[childDoctype] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'docstatus' && cf.hidden !== 1);

                  // Headers
                  let headers = [];
                  if (childFields.length > 0) {
                    headers = childFields.map(cf => ({ key: cf.fieldname, label: cf.label }));
                  } else if (rows.length > 0) {
                    headers = Object.keys(rows[0]).filter(k => k !== 'name' && k !== 'owner' && k !== 'parent' && k !== 'parentfield' && k !== 'parenttype' && k !== 'docstatus' && k !== 'idx').map(k => ({ key: k, label: k.replace(/_/g, ' ').toUpperCase() }));
                  }

                  return (
                    <div key={tf.fieldname} style={{ marginTop: '8px' }}>
                      <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                        📋 {tf.label || tf.fieldname}
                      </h5>
                      {rows.length === 0 ? (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '4px' }}>
                          No table rows recorded.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <th style={{ padding: '6px', textAlign: 'center', width: '35px' }}>#</th>
                                {headers.map(h => (
                                  <th key={h.key} style={{ padding: '6px' }}>{h.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, rIdx) => (
                                <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>{rIdx + 1}</td>
                                  {headers.map(h => {
                                    const cellVal = row[h.key];
                                    const strVal = cellVal !== undefined && cellVal !== null ? String(cellVal) : '-';
                                    const isPass = strVal.toLowerCase().includes('pass') || strVal.toLowerCase().includes('absent') || strVal.toLowerCase().includes('satisfactory');
                                    const isFail = strVal.toLowerCase().includes('fail') || strVal.toLowerCase().includes('present') || strVal.toLowerCase().includes('unsatisfactory');

                                    return (
                                      <td key={h.key} style={{ padding: '6px' }}>
                                        {isPass ? (
                                          <span style={{ color: 'var(--success)', fontWeight: '600' }}>{strVal}</span>
                                        ) : isFail ? (
                                          <span style={{ color: 'var(--danger)', fontWeight: '600' }}>{strVal}</span>
                                        ) : (
                                          strVal
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            /* Fallback generic view if meta fetch yielded no fields */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {Object.entries(record || {})
                  .filter(([k, v]) => typeof v !== 'object' && k !== 'id' && k !== 'type' && k !== 'timestamp')
                  .map(([k, v]) => (
                    <div key={k} style={{ padding: '6px 10px', borderRadius: '4px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                        {k.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{String(v)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Overall Comments Card */}
          {(record?.overallComments || record?.comments || record?.remarks || record?.general_observations) && (
            <div style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
              <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OVERALL COMMENTS / OBSERVATIONS</strong>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-heading)' }}>
                {record?.overallComments || record?.comments || record?.remarks || record?.general_observations}
              </div>
            </div>
          )}

          {/* Signature Verification */}
          {sig && (
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>✍️ Signature Verification:</span>
              <div style={{ fontFamily: '"Caveat", cursive', fontSize: '20px', color: '#1e3a8a', marginTop: '2px' }}>
                {sig}
              </div>
            </div>
          )}
          <FormFootnote doctype={targetDocType || record?.type} defaultFormNo="Form Report" formTitle={targetDocType || record?.type} />
        </div>

        <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="primary-btn" onClick={() => setEmailModal && setEmailModal({ reportId: record?.id || record?.name, reportType: targetDocType || record?.type || 'QC Report' })} style={{ backgroundColor: '#a27b5c', borderColor: '#a27b5c' }}>📧 Send Email</button>
          <button type="button" className="primary-btn" onClick={() => window.print()} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>🖨️ Print Report</button>
          <button type="button" className="secondary-btn" onClick={onClose}>Close Report</button>
        </div>
      </div>
    </div>
  );
}


export function LabForm36Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    tank_no: 'Tank 1',
    volume: '2000L',
    prepared_by: '',
    verified_by: '',
    analysed_by: '',
    lab_alc: '5.0',
    tank_ph: '3.8',
    finished_ph: '3.8',
    brix_mixer: '11.2',
    brix_mixer_by: '',
    brix_product: '11.4',
    brix_product_by: '',
    comments: ''
  });

  const [tableData, setTableData] = useState({
    recipe_checklist: [
      { ingredient: 'Bourbon', standard_qty: '42Kg (46L)', lot_batch_no: '', status: '✓ Confirmed Added' },
      { ingredient: 'Ethanol', standard_qty: '125Kg (158.5L)', lot_batch_no: '', status: '✓ Confirmed Added' },
      { ingredient: 'Aged Cola Flavour', standard_qty: '2.0Kg', lot_batch_no: '', status: '✓ Confirmed Added' },
      { ingredient: 'Cola Flavour', standard_qty: '3.6Kg', lot_batch_no: '', status: '✓ Confirmed Added' },
      { ingredient: 'Cola Acidulant', standard_qty: '1.0Kg', lot_batch_no: '', status: '✓ Confirmed Added' },
      { ingredient: 'Sodium Benzoate', standard_qty: '0.4Kg', lot_batch_no: '', status: '✓ Confirmed Added' },
      { ingredient: 'Sugar', standard_qty: '150Kg', lot_batch_no: '', status: '✓ Confirmed Added' }
    ],
    gas_level: [
      { gas_level: '2.8', checked_by: '' }
    ]
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm36Modal] Fetching DocType meta for "Bourbon Whiskey And Cola Product Tank Record"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Bourbon Whiskey And Cola Product Tank Record');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date of Batch', fieldtype: 'Date' },
            { idx: 2, fieldname: 'tank_no', label: 'Tank Number', fieldtype: 'Select', options: 'Tank 1\nTank 2\nTank 3\nTank 4\nTank 5\nTank 6\nTank 7\nTank 8\nTank 9\nTank 10' },
            { idx: 3, fieldname: 'volume', label: 'Volume', fieldtype: 'Data' },
            { idx: 4, fieldname: 'prepared_by', label: 'Prepared By', fieldtype: 'Link', options: 'Employee' },
            { idx: 5, fieldname: 'verified_by', label: 'Verified By', fieldtype: 'Link', options: 'Employee' },
            { idx: 6, fieldname: 'analysed_by', label: 'Lab Report Analysed By', fieldtype: 'Link', options: 'Employee' },
            { idx: 7, fieldname: 'lab_alc', label: 'Lab Report Alcohol %', fieldtype: 'Float' },
            { idx: 8, fieldname: 'tank_ph', label: 'Tank pH', fieldtype: 'Float' },
            { idx: 9, fieldname: 'finished_ph', label: 'Finished Product pH', fieldtype: 'Float' },
            { idx: 10, fieldname: 'recipe_checklist', label: 'Batch Recipe Checklist', fieldtype: 'Table', options: 'Bourbon Whiskey and Cola Recipe Item' },
            { idx: 11, fieldname: 'brix_mixer', label: 'Brix Mixer %', fieldtype: 'Float' },
            { idx: 12, fieldname: 'brix_mixer_by', label: 'Brix Mixer By', fieldtype: 'Data' },
            { idx: 13, fieldname: 'brix_product', label: 'Brix Finished Product %', fieldtype: 'Float' },
            { idx: 14, fieldname: 'brix_product_by', label: 'Brix Finished Product By', fieldtype: 'Data' },
            { idx: 15, fieldname: 'gas_level', label: 'Gas Level', fieldtype: 'Table', options: 'Gas Level Reading' },
            { idx: 16, fieldname: 'comments', label: 'Comments', fieldtype: 'Text' }
          ];
        }

        fields = fields.map(f => {
          let lbl = f.label;
          if (!lbl || lbl === f.fieldname) {
            lbl = f.options || f.fieldname;
          }
          lbl = lbl.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
          return {
            ...f,
            label: lbl
          };
        });

        if (isMounted) {
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Bourbon Whiskey and Cola Recipe Item';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            if (tf.fieldname === 'recipe_checklist') {
              childFields = [
                { idx: 1, fieldname: 'ingredient', label: 'Ingredient Description', fieldtype: 'Data' },
                { idx: 2, fieldname: 'standard_qty', label: 'Standard Qty (2000L)', fieldtype: 'Data' },
                { idx: 3, fieldname: 'lot_batch_no', label: 'Lot / Batch No.', fieldtype: 'Data' },
                { idx: 4, fieldname: 'status', label: 'Added Status', fieldtype: 'Data' }
              ];
            } else {
              childFields = [
                { idx: 1, fieldname: 'gas_level', label: 'Gas Level', fieldtype: 'Float' },
                { idx: 2, fieldname: 'checked_by', label: 'Checked By', fieldtype: 'Link', options: 'Employee' }
              ];
            }
          }

          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
        }
      } catch (err) {
        console.error('[LabForm36Modal] Error fetching meta fields for Bourbon Whiskey & Cola:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, rIdx) =>
        rIdx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = childMetas[childDoctype] || [];
    const newRow = {};
    childFields.forEach(f => {
      if (f.fieldtype === 'Select') {
        const opts = parseSelectOptions(f.options);
        newRow[f.fieldname] = opts[0] || '';
      } else {
        newRow[f.fieldname] = '';
      }
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

  const handleSubmitForm = (e) => {
    e.preventDefault();

    const preparedByVal = resolveLinkValue(formData.prepared_by, 'Employee', linkOptionsMap);
    const verifiedByVal = resolveLinkValue(formData.verified_by, 'Employee', linkOptionsMap);
    const analysedByVal = resolveLinkValue(formData.analysed_by, 'Employee', linkOptionsMap);

    const submissionData = {
      doctype: 'Bourbon Whiskey And Cola Product Tank Record',
      ...formData,
      prepared_by: preparedByVal,
      verified_by: verifiedByVal,
      analysed_by: analysedByVal,
      preparedBy: preparedByVal,
      verifiedBy: verifiedByVal,
      analysedBy: analysedByVal,
      date: formData.date || new Date().toISOString().slice(0, 10),
      tankNo: formData.tank_no || 'Tank 1',
      volume: formData.volume || '2000L',
      labAlc: formData.lab_alc || '5.0',
      tankPh: formData.tank_ph || '3.8',
      finishedPh: formData.finished_ph || '3.8',
      bourbonLot: tableData.recipe_checklist?.[0]?.lot_batch_no || '',
      ethanolLot: tableData.recipe_checklist?.[1]?.lot_batch_no || '',
      agedColaLot: tableData.recipe_checklist?.[2]?.lot_batch_no || '',
      colaFlavourLot: tableData.recipe_checklist?.[3]?.lot_batch_no || '',
      acidulantLot: tableData.recipe_checklist?.[4]?.lot_batch_no || '',
      benzoateLot: tableData.recipe_checklist?.[5]?.lot_batch_no || '',
      sugarLot: tableData.recipe_checklist?.[6]?.lot_batch_no || '',
      brixMixer: formData.brix_mixer || '11.2',
      brixMixerBy: formData.brix_mixer_by || '',
      brixProduct: formData.brix_product || '11.4',
      brixProductBy: formData.brix_product_by || '',
      gasLevel: formData.gas_level?.[0]?.gas_level || formData.gas_level || '2.8',
      comments: formData.comments || '',
      analyst: preparedByVal,
      ...tableData
    };

    onSubmit(submissionData);
  };

  const renderControlInput = (field, value, onChange, searchFieldKey = '') => {
    const { fieldtype, fieldname, options, label, reqd } = field;

    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    if (fieldtype === 'Link') {
      const targetDoctype = options || 'Employee';
      const isEmpTarget = targetDoctype === 'Employee' || targetDoctype === 'User';
      const sKey = searchFieldKey || fieldname;

      if (isEmpTarget) {
        return (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              required={Boolean(reqd)}
              value={value || ''}
              onFocus={(e) => {
                if (handleSearchEmployees) {
                  handleSearchEmployees(e.target.value || '', sKey);
                  if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
                }
              }}
              onChange={(e) => {
                onChange(e.target.value);
                if (handleSearchEmployees) {
                  handleSearchEmployees(e.target.value, sKey);
                  if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
                }
              }}
              placeholder={`Select / Search ${label || targetDoctype}...`}
            />
            {showEmployeeDropdown && activeSearchField === sKey && employeeList && (
              <div className="autocomplete-dropdown">
                {employeeList.map(emp => (
                  <div key={emp.name} className="dropdown-item" onMouseDown={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); if (setShowEmployeeDropdown) setShowEmployeeDropdown(false); }}>
                    👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const datalistId = `dl_${sKey}`;

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            required={Boolean(reqd)}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            list={datalistId}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          <datalist id={datalistId}>
            {fetchedOpts.map((opt, i) => (
              <option key={i} value={opt} />
            ))}
          </datalist>
        </div>
      );
    }

    if (isDatetimeField(fieldtype, fieldname, label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={Boolean(reqd)}
          value={value || localDT}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Date') {
      return (
        <input
          type="date"
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Time') {
      return (
        <input
          type="time"
          className="form-input"
          required={Boolean(reqd)}
          value={value || new Date().toTimeString().slice(0, 5)}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Select') {
      const selectOpts = parseSelectOptions(options);
      return (
        <select
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">-- Select {label || 'Option'} --</option>
          {selectOpts.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (fieldtype === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(e.target.checked ? 1 : 0)}
          />
          <span>{label}</span>
        </label>
      );
    }

    if (['Small Text', 'Text', 'Long Text'].includes(fieldtype)) {
      return (
        <textarea
          className="form-input"
          rows="2"
          style={{ resize: 'vertical' }}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${label}...`}
        />
      );
    }

    if (['Float', 'Int', 'Currency', 'Percent'].includes(fieldtype)) {
      return (
        <input
          type="number"
          step="any"
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${label}...`}
        />
      );
    }

    if (fieldtype === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>✍️ Digital Signature Input</span>
            {value && (
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                onClick={() => onChange('')}
              >
                Clear Signature
              </button>
            )}
          </div>
          <input
            type="text"
            className="form-input"
            style={{
              fontFamily: '"Caveat", "Brush Script MT", cursive',
              fontSize: '22px',
              color: '#1e3a8a',
              letterSpacing: '1px',
              padding: '8px 12px',
              background: '#fff'
            }}
            placeholder="Type your full name to sign dynamically..."
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
          {value && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ Digitally Signed by: {value}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type="text"
        className="form-input"
        required={Boolean(reqd)}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={`Enter ${label}...`}
      />
    );
  };

  const fieldsList = meta?.fields || [];
  const normalFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldtype !== 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    !f.fieldname?.includes('signature') &&
    f.hidden !== 1
  );

  const tableFields = fieldsList.filter(f => f.fieldtype === 'Table' && f.hidden !== 1);
  const signatureFields = fieldsList.filter(f => (f.fieldtype === 'Signature' || f.fieldname?.includes('signature')) && f.hidden !== 1);

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 36: Bourbon Whiskey & Cola Product Tank Record</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Bourbon Whiskey And Cola Product Tank Record"...
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {normalFields.map(field => (
                    <div key={field.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {field.label} {field.reqd ? '*' : ''}
                      </label>
                      {renderControlInput(
                        field,
                        formData[field.fieldname],
                        (val) => handleFieldChange(field.fieldname, val),
                        `form36_${field.fieldname}`
                      )}
                    </div>
                  ))}
                </div>

                {tableFields.map(tf => {
                  const childDoctype = tf.options || 'Bourbon Whiskey and Cola Recipe Item';
                  const childFields = childMetas[childDoctype] || [];
                  const rows = tableData[tf.fieldname] || [];

                  return (
                    <div key={tf.fieldname} style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                        <h4 style={{ fontSize: '13px', color: 'var(--accent)', margin: 0 }}>{tf.label}</h4>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => addTableRow(tf.fieldname, childDoctype)}
                        >
                          ➕ Add Row
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              {childFields.filter(cf => cf.fieldname !== 'amended_from' && cf.hidden !== 1).map(cf => (
                                <th key={cf.fieldname} style={{ padding: '6px', textAlign: 'left' }}>
                                  {cf.label} {cf.reqd ? '*' : ''}
                                </th>
                              ))}
                              <th style={{ width: '50px', padding: '6px', textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rIdx) => (
                              <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {childFields.filter(cf => cf.fieldname !== 'amended_from' && cf.hidden !== 1).map(cf => (
                                  <td key={cf.fieldname} style={{ padding: '4px' }}>
                                    {renderControlInput(
                                      cf,
                                      row[cf.fieldname],
                                      (val) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, val),
                                      `form36_tbl_${tf.fieldname}_${cf.fieldname}_${rIdx}`
                                    )}
                                  </td>
                                ))}
                                <td style={{ padding: '4px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                    title="Remove Row"
                                    onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {signatureFields.map(sf => (
                  <div key={sf.fieldname} style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      {sf.label}
                    </label>
                    {renderControlInput(
                      sf,
                      formData[sf.fieldname],
                      (val) => handleFieldChange(sf.fieldname, val),
                      `form36_${sf.fieldname}`
                    )}
                  </div>
                ))}
              </>
            )}

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Save Batch Record</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm35Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [tankNo, setTankNo] = useState('Tank 1');
  const [volume, setVolume] = useState('2000L');
  const [preparedBy, setPreparedBy] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [analysedBy, setAnalysedBy] = useState('');
  const [labAlc, setLabAlc] = useState('5.0');
  const [tankPh, setTankPh] = useState('3.8');
  const [finishedPh, setFinishedPh] = useState('3.8');

  const [ingredients, setIngredients] = useState([
    { item: 'ETHANOL', standardQty: '0.00000000', uom: 'L', lotBatchNo: '', addedQty: '0.00000000' },
    { item: 'RUM FLAVOUR', standardQty: '0.00000000', uom: 'Kg', lotBatchNo: '', addedQty: '0.00000000' },
    { item: 'LEMON FLAVOUR', standardQty: '0.00000000', uom: 'Kg', lotBatchNo: '', addedQty: '0.00000000' },
    { item: 'COLA FLAVOUR', standardQty: '0.00000000', uom: 'Kg', lotBatchNo: '', addedQty: '0.00000000' },
    { item: 'COLA ACIDULANT', standardQty: '0.00000000', uom: 'Kg', lotBatchNo: '', addedQty: '0.00000000' },
    { item: 'AGED FLAVOUR', standardQty: '0.00000000', uom: 'Kg', lotBatchNo: '', addedQty: '0.00000000' },
    { item: 'SODIUM BENZOATE', standardQty: '0.00000000', uom: 'Kg', lotBatchNo: '', addedQty: '0.00000000' }
  ]);

  const [sugarRequired, setSugarRequired] = useState('150.00');
  const [sugarAdded, setSugarAdded] = useState('150.00');
  const [brixMixer, setBrixMixer] = useState('11.2');
  const [brixMixerBy, setBrixMixerBy] = useState('');
  const [brixProduct, setBrixProduct] = useState('11.4');
  const [gasLevel, setGasLevel] = useState('2.8');
  const [brixProductBy, setBrixProductBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [comments, setComments] = useState('');

  const handleIngredientChange = (index, field, value) => {
    setIngredients(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddIngredientRow = () => {
    setIngredients(prev => [
      ...prev,
      { item: '', standardQty: '0.00000000', uom: 'Kg', lotBatchNo: '', addedQty: '0.00000000' }
    ]);
  };

  const handleRemoveIngredientRow = (index) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      date, tankNo, volume, preparedBy, verifiedBy, analysedBy, labAlc, tankPh, finishedPh,
      ingredients, sugarRequired, sugarAdded, brixMixer, brixMixerBy, brixProduct, gasLevel, brixProductBy, approvedBy, comments,
      analyst: preparedBy
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 35: Gold Stone Rum and Cola Batch Record</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Date *</label>
                <input type="date" className="form-input" required value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Tank No</label>
                <select className="form-input" value={tankNo} onChange={e => setTankNo(e.target.value)}>
                  {Array.from({ length: 10 }, (_, i) => `Tank ${i + 1}`).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Volume</label>
                <input type="text" className="form-input" value={volume} onChange={e => setVolume(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Prepared By *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={preparedBy}
                  onFocus={(e) => handleSearchEmployees(e.target.value, 'labPreparedBy')}
                  onChange={(e) => { setPreparedBy(e.target.value); handleSearchEmployees(e.target.value, 'labPreparedBy'); }}
                  placeholder="Search Employee..."
                />
                {showEmployeeDropdown && activeSearchField === 'labPreparedBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div
                        key={emp.name}
                        className="dropdown-item employee-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setPreparedBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                        onClick={() => {
                          setPreparedBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        👤 {emp.employee_name || emp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Verified By *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={verifiedBy}
                  onFocus={(e) => handleSearchEmployees(e.target.value, 'labVerifiedBy')}
                  onChange={(e) => { setVerifiedBy(e.target.value); handleSearchEmployees(e.target.value, 'labVerifiedBy'); }}
                  placeholder="Search Verifier..."
                />
                {showEmployeeDropdown && activeSearchField === 'labVerifiedBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div
                        key={emp.name}
                        className="dropdown-item employee-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setVerifiedBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                        onClick={() => {
                          setVerifiedBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        👤 {emp.employee_name || emp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Analysed By *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={analysedBy}
                  onFocus={(e) => handleSearchEmployees(e.target.value, 'labAnalyst')}
                  onChange={(e) => { setAnalysedBy(e.target.value); handleSearchEmployees(e.target.value, 'labAnalyst'); }}
                  placeholder="Search Analyst..."
                />
                {showEmployeeDropdown && activeSearchField === 'labAnalyst' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div
                        key={emp.name}
                        className="dropdown-item employee-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setAnalysedBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                        onClick={() => {
                          setAnalysedBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        👤 {emp.employee_name || emp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Lab Report Alcohol %</label>
                <input type="number" step="0.01" className="form-input" value={labAlc} onChange={e => setLabAlc(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Tank PH</label>
                <input type="number" step="0.1" className="form-input" value={tankPh} onChange={e => setTankPh(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Finished Product PH</label>
                <input type="number" step="0.1" className="form-input" value={finishedPh} onChange={e => setFinishedPh(e.target.value)} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                <h4 style={{ color: 'var(--accent)', margin: 0, fontWeight: '700' }}>Ingredients</h4>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  onClick={handleAddIngredientRow}
                >
                  + Add row
                </button>
              </div>
              <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ width: '40px' }}>No.</th>
                    <th>Item</th>
                    <th>Standard Qty</th>
                    <th>UOM</th>
                    <th>Lot/Batch No</th>
                    <th>Added Qty</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ height: '28px' }}
                          value={ing.item}
                          onChange={e => handleIngredientChange(idx, 'item', e.target.value)}
                          placeholder="Item Name"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ height: '28px' }}
                          value={ing.standardQty}
                          onChange={e => handleIngredientChange(idx, 'standardQty', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ height: '28px', width: '60px' }}
                          value={ing.uom}
                          onChange={e => handleIngredientChange(idx, 'uom', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ height: '28px' }}
                          value={ing.lotBatchNo}
                          onChange={e => handleIngredientChange(idx, 'lotBatchNo', e.target.value)}
                          placeholder="Lot/Batch No"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ height: '28px' }}
                          value={ing.addedQty}
                          onChange={e => handleIngredientChange(idx, 'addedQty', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {ingredients.length > 1 && (
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                            onClick={() => handleRemoveIngredientRow(idx)}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sugar & Brix Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Sugar Required (Kg)</label>
                <input type="number" step="0.01" className="form-input" value={sugarRequired} onChange={e => setSugarRequired(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Sugar Added (Kg)</label>
                <input type="number" step="0.01" className="form-input" value={sugarAdded} onChange={e => setSugarAdded(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Brix Mixer (%)</label>
                <input type="number" step="0.1" className="form-input" value={brixMixer} onChange={e => setBrixMixer(e.target.value)} />
              </div>
            </div>

            {/* Mixer Taken By, Brix Product (%), Gas Level Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Mixer Taken By</label>
                <input
                  type="text"
                  className="form-input"
                  value={brixMixerBy}
                  onFocus={(e) => handleSearchEmployees(e.target.value, 'labMixerTakenBy')}
                  onChange={(e) => { setBrixMixerBy(e.target.value); handleSearchEmployees(e.target.value, 'labMixerTakenBy'); }}
                  placeholder="Search Employee..."
                />
                {showEmployeeDropdown && activeSearchField === 'labMixerTakenBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div
                        key={emp.name}
                        className="dropdown-item employee-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setBrixMixerBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                        onClick={() => {
                          setBrixMixerBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        👤 {emp.employee_name || emp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Brix Product (%)</label>
                <input type="number" step="0.1" className="form-input" value={brixProduct} onChange={e => setBrixProduct(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Gas Level</label>
                <input type="number" step="0.1" className="form-input" value={gasLevel} onChange={e => setGasLevel(e.target.value)} />
              </div>
            </div>

            {/* Product Taken By & Approved by Row 3 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Product Taken By</label>
                <input
                  type="text"
                  className="form-input"
                  value={brixProductBy}
                  onFocus={(e) => handleSearchEmployees(e.target.value, 'labProductTakenBy')}
                  onChange={(e) => { setBrixProductBy(e.target.value); handleSearchEmployees(e.target.value, 'labProductTakenBy'); }}
                  placeholder="Search Employee..."
                />
                {showEmployeeDropdown && activeSearchField === 'labProductTakenBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div
                        key={emp.name}
                        className="dropdown-item employee-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setBrixProductBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                        onClick={() => {
                          setBrixProductBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        👤 {emp.employee_name || emp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Approved by</label>
                <input
                  type="text"
                  className="form-input"
                  value={approvedBy}
                  onFocus={(e) => handleSearchEmployees(e.target.value, 'labApprovedBy')}
                  onChange={(e) => { setApprovedBy(e.target.value); handleSearchEmployees(e.target.value, 'labApprovedBy'); }}
                  placeholder="Search Approver..."
                />
                {showEmployeeDropdown && activeSearchField === 'labApprovedBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div
                        key={emp.name}
                        className="dropdown-item employee-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setApprovedBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                        onClick={() => {
                          setApprovedBy(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        👤 {emp.employee_name || emp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div></div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600' }}>Comments / Remarks</label>
              <textarea className="form-input" style={{ minHeight: '50px', padding: '6px' }} value={comments} onChange={e => setComments(e.target.value)} placeholder="Remarks..." />
            </div>

          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Island Chill - Form no. 35</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-btn">Submit Gold Stone Rum & Cola Record</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm86Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    checked_by: '',
    verified_by: '',
    revision_no: '01',
    form_revision_date: new Date().toISOString().slice(0, 10),
    comments: '',
    approved_by: ''
  });

  // Dynamic state for child table fields (fieldname -> array of row objects)
  const [tableData, setTableData] = useState({
    table_wahj: [
      { check_no: 1, incubator_no: 1, time: '08:00', thermometer_reading: 37.0, unit: '°C' },
      { check_no: 2, incubator_no: 2, time: '08:00', thermometer_reading: 37.0, unit: '°C' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Incubator Temperature Record"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm86Modal] Fetching DocType meta for "Incubator Temperature Record"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Incubator Temperature Record');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'checked_by', label: 'Checked by', fieldtype: 'Link', options: 'Employee' },
            { idx: 3, fieldname: 'verified_by', label: 'Verified by', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'table_wahj', label: 'Incubator Temperature Check', fieldtype: 'Table', options: 'Incubator Temperature Check' },
            { idx: 5, fieldname: 'revision_no', label: 'Revision No.', fieldtype: 'Data' },
            { idx: 6, fieldname: 'form_revision_date', label: 'Form Revision Date', fieldtype: 'Date' },
            { idx: 7, fieldname: 'comments', label: 'Comments', fieldtype: 'Small Text' },
            { idx: 8, fieldname: 'approved_by', label: 'Approved By', fieldtype: 'Link', options: 'Employee' }
          ];
        }

        // Clean label formatting (remove bracketed descriptors and resolve auto-generated fieldnames like table_wahj)
        fields = fields.map(f => {
          let lbl = f.label;
          if (!lbl || lbl === f.fieldname) {
            lbl = f.options || f.fieldname;
          }
          lbl = lbl.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
          return {
            ...f,
            label: lbl
          };
        });

        if (isMounted) {
          console.log('=============================================================');
          console.log('📋 INCUBATOR TEMPERATURE RECORD DYNAMIC META:', doctypeMeta);
          console.log('📋 DYNAMIC FIELDS COUNT:', fields.length);
          console.table(fields.map(f => ({
            idx: f.idx,
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            options: f.options,
            reqd: f.reqd
          })));
          console.log('=============================================================');
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};
        const newTableDataInit = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Incubator Temperature Check';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              console.log(`📋 CHILD DOCTYPE META FOR (${tf.options}):`, childMeta);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'check_no', label: 'Check No.', fieldtype: 'Int' },
              { idx: 2, fieldname: 'incubator_no', label: 'Incubator No.', fieldtype: 'Int' },
              { idx: 3, fieldname: 'time', label: 'Time', fieldtype: 'Time' },
              { idx: 4, fieldname: 'thermometer_reading', label: 'Thermometer Reading', fieldtype: 'Float' },
              { idx: 5, fieldname: 'unit', label: 'Unit', fieldtype: 'Select', options: '°C\n°F' }
            ];
          }

          // Clean child field labels too (remove brackets)
          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          // Default initial rows for this table field if not already present
          newTableDataInit[tf.fieldname] = [
            { check_no: 1, incubator_no: 1, time: '08:00', thermometer_reading: 37.0, unit: '°C' },
            { check_no: 2, incubator_no: 2, time: '08:00', thermometer_reading: 37.0, unit: '°C' }
          ];
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
          setTableData(prev => ({
            ...newTableDataInit,
            ...prev
          }));
        }
      } catch (err) {
        console.error('[LabForm86Modal] Error fetching meta fields for "Incubator Temperature Record":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, rIdx) =>
        rIdx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = (childMetas[childDoctype] || childMetas['Incubator Temperature Check'] || []);
    const currentRows = tableData[tableFieldName] || [];
    const newRow = {};
    childFields.forEach(f => {
      newRow[f.fieldname] = f.fieldtype === 'Select' ? (parseSelectOptions(f.options)[0] || '') : '';
    });
    if (!newRow.time) newRow.time = new Date().toTimeString().slice(0, 5);
    newRow.check_no = newRow.check_no || (currentRows.length + 1);
    newRow.incubator_no = newRow.incubator_no || 1;
    newRow.thermometer_reading = newRow.thermometer_reading || 37.0;
    newRow.unit = newRow.unit || '°C';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Incubator Temperature Record',
      ...formData,
      ...tableData,
      recordedBy: formData.checked_by || 'Analyst',
      verifiedBy: formData.verified_by || 'Supervisor',
      date: formData.date
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              required={field.reqd === 1}
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${field.label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '900px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 86: Incubator Temperature Record
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Incubator Temperature Record"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `inc_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Incubator Temperature Check';
              const childFields = (childMetas[childDoctype] || childMetas['Incubator Temperature Check'] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      ➕ Add Row
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ width: '30px', textAlign: 'center' }}>#</th>
                          {childFields.map(cf => (
                            <th key={cf.fieldname}>{cf.label}</th>
                          ))}
                          <th style={{ width: '40px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={childFields.length + 2} style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                              No reading rows added yet. Click "➕ Add Row" to add entries.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ textAlign: 'center', fontWeight: '700' }}>{rIdx + 1}</td>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px' }}>
                                  {renderControlInput(
                                    cf,
                                    row[cf.fieldname],
                                    (v) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, v),
                                    `inc_tbl_${tf.fieldname}_${rIdx}_${cf.fieldname}`
                                  )}
                                </td>
                              ))}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                  onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                  title="Remove row"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Signature Fields (Rendered at the END of the form) */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '12px', fontSize: '13px' }}>
                  ✍️ Signatures & Approvals
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(f => (
                    <div key={f.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `inc_sig_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Island Chill - Form no. 86</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Submit Incubator Record'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm88Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
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
      checkedBy: rows[0]?.checkedBy || 'Chemist',
      verifiedBy: rows[0]?.verifiedBy || 'QC SV',
      overallComments,
      date: rows[0]?.date || new Date().toISOString().slice(0, 10)
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
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
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Island Chill - Form no. 88</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Submit Weight Checks'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export { LabForm88Modal as MaintWeightCheckModal };




export function LabForm103Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    date1: new Date().toISOString().slice(0, 10),
    technician: '',
    tech1: '',
    verified_by: '',
    verifier1: '',
    calibration_notes: 'Photometer zero calibrated using blank sample.',
    calibration1: 'Photometer zero calibrated using blank sample.'
  });

  // Dynamic state for child table fields (fieldname -> array of row objects)
  const [tableData, setTableData] = useState({
    photometer_readings: [
      { sample: 'Filtration Output', sample_point: 'Filtration Output', time: '08:00', readings_ppb: '12', photometer_reading: '12', status: 'Pass', calibration_status: 'Pass' },
      { sample: 'Clean Room Buffer Tank', sample_point: 'Clean Room Buffer Tank', time: '08:00', readings_ppb: '11', photometer_reading: '11', status: 'Pass', calibration_status: 'Pass' },
      { sample: 'Filtration Output', sample_point: 'Filtration Output', time: '12:00', readings_ppb: '14', photometer_reading: '14', status: 'Pass', calibration_status: 'Pass' },
      { sample: 'Clean Room Buffer Tank', sample_point: 'Clean Room Buffer Tank', time: '12:00', readings_ppb: '13', photometer_reading: '13', status: 'Pass', calibration_status: 'Pass' }
    ],
    rows1: [
      { sample: 'Filtration Output', sample_point: 'Filtration Output', time: '08:00', readings_ppb: '12', photometer_reading: '12', status: 'Pass', calibration_status: 'Pass' },
      { sample: 'Clean Room Buffer Tank', sample_point: 'Clean Room Buffer Tank', time: '08:00', readings_ppb: '11', photometer_reading: '11', status: 'Pass', calibration_status: 'Pass' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Silver Photometer Log" / "Silver Photometer Log and Calibration"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm103Modal] Fetching DocType meta for "Silver Photometer Log"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Silver Photometer Log');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Log Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'technician', label: 'Technician', fieldtype: 'Link', options: 'Employee' },
            { idx: 3, fieldname: 'verified_by', label: 'Verified By', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'calibration_notes', label: 'Calibration Notes', fieldtype: 'Small Text' },
            { idx: 5, fieldname: 'photometer_readings', label: 'Photometer Readings', fieldtype: 'Table', options: 'Silver Photometer Readings' }
          ];
        }

        // Clean label formatting and ensure technician/analyst/verifier fields are treated as Employee Link fields
        const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
        fields = fields.map(f => {
          const fn = (f.fieldname || '').toLowerCase();
          const lbl = (f.label || '').toLowerCase();
          const isEmp = EMP_NAMES.includes(fn) || lbl.includes('technician') || lbl.includes('analyst') || lbl.includes('verified by') || lbl.includes('checked by');
          return {
            ...f,
            fieldtype: isEmp ? 'Link' : f.fieldtype,
            options: isEmp ? 'Employee' : f.options,
            label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          };
        });

        if (isMounted) {
          console.log('=============================================================');
          console.log('📋 SILVER PHOTOMETER LOG DYNAMIC META:', doctypeMeta);
          console.log('📋 DYNAMIC FIELDS COUNT:', fields.length);
          console.table(fields.map(f => ({
            idx: f.idx,
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            options: f.options,
            reqd: f.reqd
          })));
          console.log('=============================================================');
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};
        const newTableDataInit = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Silver Photometer Readings';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              console.log(`📋 CHILD DOCTYPE META FOR (${tf.options}):`, childMeta);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'sample', label: 'Sample Point', fieldtype: 'Data' },
              { idx: 2, fieldname: 'time', label: 'Time', fieldtype: 'Time' },
              { idx: 3, fieldname: 'readings_ppb', label: 'Photometer Reading (ppb)', fieldtype: 'Float' },
              { idx: 4, fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Pass\nFail\nCalibrated' }
            ];
          }

          // Clean child field labels too (remove brackets)
          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          // Default initial rows for this table field if not already present
          newTableDataInit[tf.fieldname] = [
            { sample: 'Filtration Output', sample_point: 'Filtration Output', time: '08:00', readings_ppb: '12', photometer_reading: '12', status: 'Pass', calibration_status: 'Pass' },
            { sample: 'Clean Room Buffer Tank', sample_point: 'Clean Room Buffer Tank', time: '08:00', readings_ppb: '11', photometer_reading: '11', status: 'Pass', calibration_status: 'Pass' }
          ];
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
          setTableData(prev => ({
            ...newTableDataInit,
            ...prev
          }));
        }
      } catch (err) {
        console.error('[LabForm103Modal] Error fetching meta fields for "Silver Photometer Log":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, rIdx) =>
        rIdx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = (childMetas[childDoctype] || childMetas['Silver Photometer Readings'] || childMetas['Photometer Reading Detail'] || []);
    const newRow = {};
    childFields.forEach(f => {
      newRow[f.fieldname] = f.fieldtype === 'Select' ? (parseSelectOptions(f.options)[0] || '') : '';
    });
    if (!newRow.time) newRow.time = new Date().toTimeString().slice(0, 5);
    newRow.sample = newRow.sample || 'Filtration Output';
    newRow.sample_point = newRow.sample_point || 'Filtration Output';
    newRow.readings_ppb = newRow.readings_ppb || '12';
    newRow.photometer_reading = newRow.photometer_reading || '12';
    newRow.status = newRow.status || 'Pass';
    newRow.calibration_status = newRow.calibration_status || 'Pass';

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

  const checkSpecFailure = () => {
    const allTableRows = Object.values(tableData).flat();
    return allTableRows.some(r => {
      const val = r.readings_ppb || r.photometer_reading || r.reading;
      return val && Number(val) < 10;
    });
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Silver Photometer Log',
      ...formData,
      ...tableData,
      analyst: formData.technician || formData.tech1 || 'QC Tech',
      verifiedBy: formData.verified_by || formData.verifier1 || 'Manager',
      date: formData.date || formData.date1
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              required={field.reqd === 1}
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${field.label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 103: Silver Photometer Log & Calibration Sheet
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Silver Photometer Log"...
              </div>
            )}

            <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderLeft: '4px solid var(--accent)', color: 'var(--text-heading)' }}>
              <strong>Acceptance specification bounds:</strong> Reading of Silver Ion should be **above 10ppb**.
            </div>

            {checkSpecFailure() && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                ⚠️ Warning: One or more readings are below the minimum required 10ppb silver concentration!
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `photo_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Silver Photometer Readings';
              const childFields = (childMetas[childDoctype] || childMetas['Silver Photometer Readings'] || childMetas['Photometer Reading Detail'] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      ➕ Add Row
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ width: '30px', textAlign: 'center' }}>#</th>
                          {childFields.map(cf => (
                            <th key={cf.fieldname}>{cf.label}</th>
                          ))}
                          <th style={{ width: '40px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={childFields.length + 2} style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                              No reading rows added yet. Click "➕ Add Row" to add entries.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ textAlign: 'center', fontWeight: '700' }}>{rIdx + 1}</td>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px' }}>
                                  {renderControlInput(
                                    cf,
                                    row[cf.fieldname],
                                    (v) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, v),
                                    `photo_tbl_${tf.fieldname}_${rIdx}_${cf.fieldname}`
                                  )}
                                </td>
                              ))}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                  onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                  title="Remove row"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Photometer Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm104Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    linemachine: 'Line 1 / Seamer 1',
    product: '355ml Island Chill',
    shift: 'Day Shift (Shift A)',
    operatorsupervisor: '',
    comments: '',
    verified_by: '',
    approved_by: '',
    revision_no: 'Rev 1.0'
  });

  // Dynamic state for child table fields (e.g. seam_checks -> Seam Check Detail)
  const [tableData, setTableData] = useState({
    seam_checks: [
      { time: '08:00', can_size: '355ml', head_no: '1', countersink: '2.85', seam_thickness: '1.20', seam_length: '3.10', body_hook: '1.40', cover_hook: '1.45', overlap: '1.10', overlap_pct: '85', tightness_pct: '90', status: 'Pass' },
      { time: '12:00', can_size: '355ml', head_no: '2', countersink: '2.86', seam_thickness: '1.21', seam_length: '3.12', body_hook: '1.42', cover_hook: '1.46', overlap: '1.12', overlap_pct: '86', tightness_pct: '92', status: 'Pass' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Seam Checklist Form" & Child DocType
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm104Modal] Fetching DocType meta for "Seam Checklist Form"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Seam Checklist Form');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          // Schema matching exact response from ERPNext API
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'linemachine', label: 'Line/Machine', fieldtype: 'Data' },
            { idx: 3, fieldname: 'product', label: 'Product', fieldtype: 'Data' },
            { idx: 4, fieldname: 'shift', label: 'Shift', fieldtype: 'Data' },
            { idx: 5, fieldname: 'operatorsupervisor', label: 'Operator/Supervisor', fieldtype: 'Link', options: 'Employee' },
            { idx: 6, fieldname: 'seam_checks', label: 'Seam Checks', fieldtype: 'Table', options: 'Seam Check Detail' },
            { idx: 7, fieldname: 'comments', label: 'Comments', fieldtype: 'Small Text' },
            { idx: 8, fieldname: 'verified_by', label: 'Verified By', fieldtype: 'Link', options: 'Employee' },
            { idx: 9, fieldname: 'approved_by', label: 'Approved By', fieldtype: 'Link', options: 'Employee' },
            { idx: 10, fieldname: 'revision_no', label: 'Revision No.', fieldtype: 'Data' }
          ];
        }

        if (isMounted) {
          console.log('=============================================================');
          console.log('📋 SEAM CHECKLIST FORM DYNAMIC META:', doctypeMeta);
          console.log('📋 DYNAMIC FIELDS COUNT:', fields.length);
          console.table(fields.map(f => ({
            idx: f.idx,
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            options: f.options,
            reqd: f.reqd
          })));
          console.log('=============================================================');
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table' && f.options);
        const childMetasObj = {};
        for (const tf of tableFieldsList) {
          try {
            const childMeta = await frappe.getDocTypeMeta(tf.options);
            console.log(`📋 CHILD DOCTYPE META FOR (${tf.options}):`, childMeta);
            let childFields = childMeta?.fields;
            if (!childFields || childFields.length === 0) {
              childFields = [
                { idx: 1, fieldname: 'time', label: 'Time', fieldtype: 'Time' },
                { idx: 2, fieldname: 'can_size', label: 'Can Size', fieldtype: 'Data' },
                { idx: 3, fieldname: 'head_no', label: 'Head No.', fieldtype: 'Data' },
                { idx: 4, fieldname: 'countersink', label: 'Countersink (mm)', fieldtype: 'Float' },
                { idx: 5, fieldname: 'seam_thickness', label: 'Seam Thickness (mm)', fieldtype: 'Float' },
                { idx: 6, fieldname: 'seam_length', label: 'Seam Length (mm)', fieldtype: 'Float' },
                { idx: 7, fieldname: 'body_hook', label: 'Body Hook (mm)', fieldtype: 'Float' },
                { idx: 8, fieldname: 'cover_hook', label: 'Cover Hook (mm)', fieldtype: 'Float' },
                { idx: 9, fieldname: 'overlap', label: 'Overlap (mm)', fieldtype: 'Float' },
                { idx: 10, fieldname: 'overlap_pct', label: 'Overlap %', fieldtype: 'Float' },
                { idx: 11, fieldname: 'tightness_pct', label: 'Tightness %', fieldtype: 'Float' },
                { idx: 12, fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Pass\nFail\nAdjust' }
              ];
            }
            childMetasObj[tf.options] = childFields;
          } catch (err) {
            console.error(`Error fetching child meta for ${tf.options}:`, err);
          }
        }
        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
        }
      } catch (err) {
        console.error('[LabForm104Modal] Error fetching meta fields:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, rIdx) =>
        rIdx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = childMetas[childDoctype] || [];
    const newRow = {};
    childFields.forEach(f => {
      newRow[f.fieldname] = f.fieldtype === 'Select' ? (parseSelectOptions(f.options)[0] || '') : '';
    });
    if (!newRow.time) newRow.time = new Date().toTimeString().slice(0, 5);
    if (!newRow.can_size) newRow.can_size = '355ml';
    if (!newRow.head_no) newRow.head_no = String((tableData[tableFieldName] || []).length + 1);
    if (!newRow.status) newRow.status = 'Pass';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Seam Checklist Form',
      ...formData,
      ...tableData,
      seam_rows: tableData.seam_checks || [],
      analyst: formData.operatorsupervisor || formData.verified_by || 'QC Inspector'
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  // Helper renderer for dynamic control inputs
  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              required={field.reqd === 1}
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${field.label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    // Default Data / Link / Read Only
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '980px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 104: Seam Checklist Form
              {/* {meta ? '• Dynamically Loaded from API' : ''} */}
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Seam Checklist Form"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {nonTableFields.map(f => (
                  <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `seam_${f.fieldname}`)}
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Table Fields (e.g. seam_checks -> Seam Check Detail) */}
            {tableFields.map(tf => {
              const childDoctype = tf.options;
              const childFields = (childMetas[childDoctype] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      ➕ Add Row
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ width: '30px', textAlign: 'center' }}>#</th>
                          {childFields.map(cf => (
                            <th key={cf.fieldname}>{cf.label}</th>
                          ))}
                          <th style={{ width: '40px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{rIdx + 1}</td>
                            {childFields.map(cf => (
                              <td key={cf.fieldname} style={{ padding: '4px' }}>
                                {renderControlInput(
                                  cf,
                                  row[cf.fieldname],
                                  (v) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, v),
                                  `seam_tbl_${tf.fieldname}_${rIdx}_${cf.fieldname}`
                                )}
                              </td>
                            ))}
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                title="Remove row"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Signature Fields (Rendered at the END of the form) */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '12px', fontSize: '13px' }}>
                  ✍️ Signatures & Approvals
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(f => (
                    <div key={f.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `seam_sig_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Seam Checklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm83Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [formData, setFormData] = useState({
    date_of_analysis: new Date().toISOString().slice(0, 10),
    analyst: '',
    approved_by: '',
    sample_type: 'Product Water',
    batch_no: '',
    remarks: '',
    signature: ''
  });

  const [tableData, setTableData] = useState({
    microbiological_analysis_details: [
      { sample_name: 'Product Water Bottle (500ml)', tcc: 'Absent', ecoli: 'Absent', hpc_count: '0', result: 'Pass', analyst: '' }
    ]
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm83Modal] Fetching DocType meta for "Microbiological Analysis"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Microbiological Analysis');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date_of_analysis', label: 'Date of Analysis', fieldtype: 'Date' },
            { idx: 2, fieldname: 'analyst', label: 'Analyst Name', fieldtype: 'Link', options: 'Employee' },
            { idx: 3, fieldname: 'approved_by', label: 'Approved By', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'sample_type', label: 'Sample Type / Source', fieldtype: 'Select', options: 'Product Water\nRaw Water\nPreform\nClosure' },
            { idx: 5, fieldname: 'batch_no', label: 'Batch / Lot Number', fieldtype: 'Data' },
            { idx: 6, fieldname: 'microbiological_analysis_details', label: 'Microbiological Analysis Details', fieldtype: 'Table', options: 'Microbiological Analysis Detail' },
            { idx: 7, fieldname: 'remarks', label: 'General Remarks / Observations', fieldtype: 'Small Text' },
            { idx: 8, fieldname: 'signature', label: 'Analyst Signature', fieldtype: 'Signature' }
          ];
        }

        fields = fields.map(f => ({
          ...f,
          label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
        }));

        if (isMounted) {
          console.log('=============================================================');
          console.log('📋 MICROBIOLOGICAL ANALYSIS (FORM 83) DYNAMIC META:', doctypeMeta);
          console.log('📋 DYNAMIC FIELDS COUNT:', fields.length);
          console.table(fields.map(f => ({ idx: f.idx, fieldname: f.fieldname, label: f.label, fieldtype: f.fieldtype, options: f.options })));
          console.log('=============================================================');
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};
        const newTableDataInit = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Microbiological Analysis Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'sample_name', label: 'Sample Description', fieldtype: 'Data' },
              { idx: 2, fieldname: 'tcc', label: 'TCC (Absent/100ml)', fieldtype: 'Select', options: 'Absent\nPresent' },
              { idx: 3, fieldname: 'ecoli', label: 'E-Coli Status', fieldtype: 'Select', options: 'Absent\nPresent' },
              { idx: 4, fieldname: 'hpc_count', label: 'HPC Count (cfu/ml)', fieldtype: 'Float' },
              { idx: 5, fieldname: 'result', label: 'Status / Compliance', fieldtype: 'Select', options: 'Pass\nFail\nPending' },
              { idx: 6, fieldname: 'analyst', label: 'Tested By', fieldtype: 'Data' }
            ];
          }

          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          newTableDataInit[tf.fieldname] = [
            { sample_name: 'Product Water Sample 1', tcc: 'Absent', ecoli: 'Absent', hpc_count: '0', result: 'Pass', analyst: '' },
            { sample_name: 'Product Water Sample 2', tcc: 'Absent', ecoli: 'Absent', hpc_count: '0', result: 'Pass', analyst: '' }
          ];
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
          setTableData(prev => ({ ...newTableDataInit, ...prev }));
        }
      } catch (err) {
        console.error('[LabForm83Modal] Error fetching meta fields for Microbiological Analysis:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
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
      if (f.fieldtype === 'Select') {
        const opts = parseSelectOptions(f.options);
        newRow[f.fieldname] = opts[0] || '';
      } else {
        newRow[f.fieldname] = '';
      }
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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const primaryTableKey = Object.keys(tableData)[0] || 'microbiological_analysis_details';
    const sampleRows = tableData[primaryTableKey] || [];

    onSubmit({
      doctype: 'Microbiological Analysis',
      ...formData,
      ...tableData,
      analyst: formData.analyst || formData.analyst_name || '',
      approvedBy: formData.approved_by || formData.manager || formData.approvedBy || '',
      date: formData.date_of_analysis || formData.date || new Date().toISOString().slice(0, 10),
      sampleRows,
      comments: formData.remarks || formData.general_observations || ''
    });
  };

  const renderControlInput = (field, value, onChange, searchFieldKey = '') => {
    const { fieldtype, fieldname, options, label, reqd } = field;

    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('verified by');

    if (fieldtype === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={Boolean(reqd)}
            value={value || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div key={emp.name} className="dropdown-item" onMouseDown={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); if (setShowEmployeeDropdown) setShowEmployeeDropdown(false); }}>
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (isDatetimeField(fieldtype, fieldname, label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={Boolean(reqd)}
          value={value || localDT}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Date') {
      return (
        <input
          type="date"
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Time') {
      return (
        <input
          type="time"
          className="form-input"
          required={Boolean(reqd)}
          value={value || new Date().toTimeString().slice(0, 5)}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Datetime' || fieldtype === 'Date Time') {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={Boolean(reqd)}
          value={value || localDT}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Select') {
      const selectOpts = parseSelectOptions(options);
      return (
        <select
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">-- Select {label || 'Option'} --</option>
          {selectOpts.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (fieldtype === 'Check') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(e.target.checked ? 1 : 0)}
          />
          <span style={{ fontSize: '12px' }}>{label}</span>
        </div>
      );
    }

    if (fieldtype === 'Small Text' || fieldtype === 'Text' || fieldtype === 'Long Text') {
      return (
        <textarea
          className="form-input"
          style={{ minHeight: searchFieldKey?.includes('tbl') ? '32px' : '50px', padding: '6px' }}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${label}...`}
        />
      );
    }

    if (fieldtype === 'Float' || fieldtype === 'Int' || fieldtype === 'Currency' || fieldtype === 'Percent') {
      return (
        <input
          type="number"
          step={fieldtype === 'Int' ? '1' : 'any'}
          className="form-input"
          required={Boolean(reqd)}
          value={value !== undefined ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
        />
      );
    }

    if (fieldtype === 'Signature') {
      return (
        <div style={{ border: '1px dashed var(--border-color)', padding: '12px', borderRadius: '8px', background: 'var(--bg-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>✍️ Digital Signature Input</span>
            {value && (
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                onClick={() => onChange('')}
              >
                Clear Signature
              </button>
            )}
          </div>
          <input
            type="text"
            className="form-input"
            style={{
              fontFamily: '"Caveat", "Brush Script MT", cursive',
              fontSize: '22px',
              color: '#1e3a8a',
              letterSpacing: '1px',
              padding: '8px 12px',
              background: '#fff'
            }}
            placeholder="Type your full name to sign dynamically..."
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
          {value && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ Digitally Signed by: {value}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type="text"
        className="form-input"
        required={Boolean(reqd)}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={`Enter ${label}...`}
      />
    );
  };

  const fieldsList = meta?.fields || [];
  const normalFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldtype !== 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    !f.fieldname?.includes('signature') &&
    f.hidden !== 1
  );

  const tableFields = fieldsList.filter(f => f.fieldtype === 'Table' && f.hidden !== 1);
  const signatureFields = fieldsList.filter(f => (f.fieldtype === 'Signature' || f.fieldname?.includes('signature')) && f.hidden !== 1);

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 83: Microbiological Analysis Log Sheet</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Microbiological Analysis"...
              </div>
            ) : (
              <>
                {/* Dynamic Top-Level Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {normalFields.map(field => (
                    <div key={field.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {field.label} {field.reqd ? '*' : ''}
                      </label>
                      {renderControlInput(
                        field,
                        formData[field.fieldname],
                        (val) => handleFieldChange(field.fieldname, val),
                        `form83_${field.fieldname}`
                      )}
                    </div>
                  ))}
                </div>

                {/* Dynamic Child Tables */}
                {tableFields.map(tf => {
                  const childDoctype = tf.options || 'Microbiological Analysis Detail';
                  const childFields = childMetas[childDoctype] || [];
                  const rows = tableData[tf.fieldname] || [];

                  return (
                    <div key={tf.fieldname} style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                        <h4 style={{ fontSize: '13px', color: 'var(--accent)', margin: 0 }}>{tf.label}</h4>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => addTableRow(tf.fieldname, childDoctype)}
                        >
                          ➕ Add Row
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              {childFields.filter(cf => cf.fieldname !== 'amended_from' && cf.hidden !== 1).map(cf => (
                                <th key={cf.fieldname} style={{ padding: '6px', textAlign: 'left' }}>
                                  {cf.label} {cf.reqd ? '*' : ''}
                                </th>
                              ))}
                              <th style={{ width: '50px', padding: '6px', textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rIdx) => (
                              <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {childFields.filter(cf => cf.fieldname !== 'amended_from' && cf.hidden !== 1).map(cf => (
                                  <td key={cf.fieldname} style={{ padding: '4px' }}>
                                    {renderControlInput(
                                      cf,
                                      row[cf.fieldname],
                                      (val) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, val),
                                      `form83_tbl_${tf.fieldname}_${cf.fieldname}_${rIdx}`
                                    )}
                                  </td>
                                ))}
                                <td style={{ padding: '4px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                    title="Remove Row"
                                    onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* SIGNATURE FIELDS - ALWAYS AT THE VERY END OF THE FORM */}
                {signatureFields.map(sigField => (
                  <div key={sigField.fieldname} style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      {sigField.label} {sigField.reqd ? '*' : ''}
                    </label>
                    {renderControlInput(
                      sigField,
                      formData[sigField.fieldname],
                      (val) => handleFieldChange(sigField.fieldname, val),
                      `form83_${sigField.fieldname}`
                    )}
                  </div>
                ))}
              </>
            )}

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Microbiological Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm84Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [formData, setFormData] = useState({
    sanitation_date: new Date().toISOString().slice(0, 10),
    sanitation_type: 'Equipment CIP',
    operator: '',
    supervisor: '',
    line_number: 'Filling Line 1',
    chemical_used: 'Peracetic Acid 0.2%',
    contact_time_mins: '15',
    remarks: '',
    signature: ''
  });

  const [tableData, setTableData] = useState({
    sanitation_details: [
      { area_equipment: 'Filler Valves & Heads', method: 'CIP Chemical Wash', temp_c: '65', status: 'Satisfactory', verified_by: '' },
      { area_equipment: 'Capper Heads & Chute', method: 'Sanitizer Spray', temp_c: 'Ambient', status: 'Satisfactory', verified_by: '' }
    ]
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm84Modal] Fetching DocType meta for "Sanitation Record"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Sanitation Record');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'sanitation_date', label: 'Date of Sanitation', fieldtype: 'Date' },
            { idx: 2, fieldname: 'sanitation_type', label: 'Sanitation Type / Area', fieldtype: 'Select', options: 'Equipment CIP\nFilling Line Sanitation\nFactory Floor Sanitation\nWater System CIP' },
            { idx: 3, fieldname: 'operator', label: 'Operator / Performed By', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'supervisor', label: 'Supervisor / Verified By', fieldtype: 'Link', options: 'Employee' },
            { idx: 5, fieldname: 'line_number', label: 'Line / Section Number', fieldtype: 'Data' },
            { idx: 6, fieldname: 'chemical_used', label: 'Sanitizing Chemical & Conc.', fieldtype: 'Data' },
            { idx: 7, fieldname: 'contact_time_mins', label: 'Chemical Contact Time (mins)', fieldtype: 'Int' },
            { idx: 8, fieldname: 'sanitation_details', label: 'Sanitation Checklist & Items', fieldtype: 'Table', options: 'Sanitation Detail' },
            { idx: 9, fieldname: 'remarks', label: 'Observations / Remarks', fieldtype: 'Small Text' },
            { idx: 10, fieldname: 'signature', label: 'Operator Signature', fieldtype: 'Signature' }
          ];
        }

        fields = fields.map(f => ({
          ...f,
          label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
        }));

        if (isMounted) {
          console.log('=============================================================');
          console.log('📋 SANITATION RECORD (FORM 84) DYNAMIC META:', doctypeMeta);
          console.log('📋 DYNAMIC FIELDS COUNT:', fields.length);
          console.table(fields.map(f => ({ idx: f.idx, fieldname: f.fieldname, label: f.label, fieldtype: f.fieldtype, options: f.options })));
          console.log('=============================================================');
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};
        const newTableDataInit = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Sanitation Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'area_equipment', label: 'Area / Equipment Name', fieldtype: 'Data' },
              { idx: 2, fieldname: 'method', label: 'Cleaning / CIP Method', fieldtype: 'Data' },
              { idx: 3, fieldname: 'temp_c', label: 'Solution Temp (°C)', fieldtype: 'Data' },
              { idx: 4, fieldname: 'status', label: 'Sanitation Result', fieldtype: 'Select', options: 'Satisfactory\nUnsatisfactory\nN/A' },
              { idx: 5, fieldname: 'verified_by', label: 'Verified By', fieldtype: 'Data' }
            ];
          }

          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          newTableDataInit[tf.fieldname] = [
            { area_equipment: 'Filler Valves & Heads', method: 'CIP Chemical Wash', temp_c: '65', status: 'Satisfactory', verified_by: '' },
            { area_equipment: 'Capper Heads & Chute', method: 'Sanitizer Spray', temp_c: 'Ambient', status: 'Satisfactory', verified_by: '' }
          ];
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
          fetchLinkOptionsMap(fields, childMetasObj).then(map => {
            if (isMounted) setLinkOptionsMap(map);
          });
          setTableData(prev => ({ ...newTableDataInit, ...prev }));
        }
      } catch (err) {
        console.error('[LabForm84Modal] Error fetching meta fields for Sanitation Record:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableRowChange = (tableFieldName, rowIdx, fieldname, val) => {
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
      if (f.fieldtype === 'Select') {
        const opts = parseSelectOptions(f.options);
        newRow[f.fieldname] = opts[0] || '';
      } else {
        newRow[f.fieldname] = '';
      }
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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const primaryTableKey = Object.keys(tableData)[0] || 'sanitation_details';
    const sampleRows = tableData[primaryTableKey] || [];

    onSubmit({
      doctype: 'Sanitation Record',
      ...formData,
      ...tableData,
      analyst: formData.operator || formData.performed_by || formData.analyst || '',
      approvedBy: formData.supervisor || formData.verified_by || formData.approved_by || '',
      date: formData.sanitation_date || formData.date || new Date().toISOString().slice(0, 10),
      sampleRows,
      comments: formData.remarks || formData.general_observations || ''
    });
  };

  const renderControlInput = (field, value, onChange, searchFieldKey = '') => {
    const { fieldtype, fieldname, options, label, reqd } = field;

    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    if (fieldtype === 'Link') {
      const targetDoctype = options || 'Employee';
      const isEmpTarget = targetDoctype === 'Employee' || targetDoctype === 'User';
      const sKey = searchFieldKey || fieldname;

      if (isEmpTarget) {
        return (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              required={Boolean(reqd)}
              value={value || ''}
              onFocus={(e) => {
                if (handleSearchEmployees) {
                  handleSearchEmployees(e.target.value || '', sKey);
                  if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
                }
              }}
              onChange={(e) => {
                onChange(e.target.value);
                if (handleSearchEmployees) {
                  handleSearchEmployees(e.target.value, sKey);
                  if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
                }
              }}
              placeholder={`Select / Search ${label || targetDoctype}...`}
            />
            {showEmployeeDropdown && activeSearchField === sKey && employeeList && (
              <div className="autocomplete-dropdown">
                {employeeList.map(emp => (
                  <div key={emp.name} className="dropdown-item" onMouseDown={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); if (setShowEmployeeDropdown) setShowEmployeeDropdown(false); }}>
                    👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const datalistId = `dl_${sKey}`;

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={datalistId}
            className="form-input"
            required={Boolean(reqd)}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          <datalist id={datalistId}>
            {fetchedOpts.map((opt, i) => (
              <option key={i} value={opt} />
            ))}
          </datalist>
        </div>
      );
    }

    if (isDatetimeField(fieldtype, fieldname, label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={Boolean(reqd)}
          value={value || localDT}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Date') {
      return (
        <input
          type="date"
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Time') {
      return (
        <input
          type="time"
          className="form-input"
          required={Boolean(reqd)}
          value={value || new Date().toTimeString().slice(0, 5)}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Datetime' || fieldtype === 'Date Time') {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={Boolean(reqd)}
          value={value || localDT}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Select') {
      const selectOpts = parseSelectOptions(options);
      return (
        <select
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">-- Select {label || 'Option'} --</option>
          {selectOpts.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (fieldtype === 'Check') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(e.target.checked ? 1 : 0)}
          />
          <span style={{ fontSize: '12px' }}>{label}</span>
        </div>
      );
    }

    if (fieldtype === 'Small Text' || fieldtype === 'Text' || fieldtype === 'Long Text') {
      return (
        <textarea
          className="form-input"
          style={{ minHeight: searchFieldKey?.includes('tbl') ? '32px' : '50px', padding: '6px' }}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${label}...`}
        />
      );
    }

    if (fieldtype === 'Float' || fieldtype === 'Int' || fieldtype === 'Currency' || fieldtype === 'Percent') {
      return (
        <input
          type="number"
          step={fieldtype === 'Int' ? '1' : 'any'}
          className="form-input"
          required={Boolean(reqd)}
          value={value !== undefined ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
        />
      );
    }

    if (fieldtype === 'Signature') {
      return (
        <div style={{ border: '1px dashed var(--border-color)', padding: '12px', borderRadius: '8px', background: 'var(--bg-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>✍️ Digital Signature Input</span>
            {value && (
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                onClick={() => onChange('')}
              >
                Clear Signature
              </button>
            )}
          </div>
          <input
            type="text"
            className="form-input"
            style={{
              fontFamily: '"Caveat", "Brush Script MT", cursive',
              fontSize: '22px',
              color: '#1e3a8a',
              letterSpacing: '1px',
              padding: '8px 12px',
              background: '#fff'
            }}
            placeholder="Type your full name to sign dynamically..."
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
          {value && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ Digitally Signed by: {value}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type="text"
        className="form-input"
        required={Boolean(reqd)}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={`Enter ${label}...`}
      />
    );
  };

  const fieldsList = meta?.fields || [];
  const normalFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldtype !== 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    !f.fieldname?.includes('signature') &&
    f.hidden !== 1
  );

  const tableFields = fieldsList.filter(f => f.fieldtype === 'Table' && f.hidden !== 1);
  const signatureFields = fieldsList.filter(f => (f.fieldtype === 'Signature' || f.fieldname?.includes('signature')) && f.hidden !== 1);

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 84: Sanitation Log Sheet</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Sanitation Record"...
              </div>
            ) : (
              <>
                {/* Dynamic Top-Level Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {normalFields.map(field => (
                    <div key={field.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {field.label} {field.reqd ? '*' : ''}
                      </label>
                      {renderControlInput(
                        field,
                        formData[field.fieldname],
                        (val) => handleFieldChange(field.fieldname, val),
                        `form84_${field.fieldname}`
                      )}
                    </div>
                  ))}
                </div>

                {/* Dynamic Child Tables */}
                {tableFields.map(tf => {
                  const childDoctype = tf.options || 'Sanitation Detail';
                  const childFields = childMetas[childDoctype] || [];
                  const rows = tableData[tf.fieldname] || [];

                  return (
                    <div key={tf.fieldname} style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                        <h4 style={{ fontSize: '13px', color: 'var(--accent)', margin: 0 }}>{tf.label}</h4>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => addTableRow(tf.fieldname, childDoctype)}
                        >
                          ➕ Add Row
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              {childFields.filter(cf => cf.fieldname !== 'amended_from' && cf.hidden !== 1).map(cf => (
                                <th key={cf.fieldname} style={{ padding: '6px', textAlign: 'left' }}>
                                  {cf.label} {cf.reqd ? '*' : ''}
                                </th>
                              ))}
                              <th style={{ width: '50px', padding: '6px', textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rIdx) => (
                              <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {childFields.filter(cf => cf.fieldname !== 'amended_from' && cf.hidden !== 1).map(cf => (
                                  <td key={cf.fieldname} style={{ padding: '4px' }}>
                                    {renderControlInput(
                                      cf,
                                      row[cf.fieldname],
                                      (val) => handleTableRowChange(tf.fieldname, rIdx, cf.fieldname, val),
                                      `form84_tbl_${tf.fieldname}_${cf.fieldname}_${rIdx}`
                                    )}
                                  </td>
                                ))}
                                <td style={{ padding: '4px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}
                                    title="Remove Row"
                                    onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* SIGNATURE FIELDS - ALWAYS AT THE VERY END OF THE FORM */}
                {signatureFields.map(sigField => (
                  <div key={sigField.fieldname} style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      {sigField.label} {sigField.reqd ? '*' : ''}
                    </label>
                    {renderControlInput(
                      sigField,
                      formData[sigField.fieldname],
                      (val) => handleFieldChange(sigField.fieldname, val),
                      `form84_${sigField.fieldname}`
                    )}
                  </div>
                ))}
              </>
            )}

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Sanitation Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm34Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5)
  });
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [tableData, setTableData] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm34Modal] Fetching DocType meta for "Monitoring"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Monitoring');
        let fields = doctypeMeta?.fields;

        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Monitoring Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'time', label: 'Monitoring Time', fieldtype: 'Time' },
            { idx: 3, fieldname: 'monitoring_type', label: 'Monitoring Type', fieldtype: 'Select', options: 'Quality Check\nProcess Control\nEnvironmental Monitoring\nEquipment Check' },
            { idx: 4, fieldname: 'parameter_monitored', label: 'Parameter Monitored', fieldtype: 'Data' },
            { idx: 5, fieldname: 'reading_result', label: 'Reading / Result', fieldtype: 'Data' },
            { idx: 6, fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Pass\nFail\nWithin Specs\nOut of Specs' },
            { idx: 7, fieldname: 'analyst', label: 'Monitored By (Analyst)', fieldtype: 'Link', options: 'Employee' },
            { idx: 8, fieldname: 'verified_by', label: 'Verified By (Supervisor)', fieldtype: 'Link', options: 'Employee' },
            { idx: 9, fieldname: 'comments', label: 'Observations / Comments', fieldtype: 'Small Text' }
          ];
        }

        if (isMounted) {
          console.log('📋 MONITORING DYNAMIC META:', doctypeMeta);
          setMeta({ ...(doctypeMeta || {}), fields });
          const tableFieldsList = fields.filter(f => f.fieldtype === 'Table' && f.options);
          const childMetasObj = {};
          for (const tf of tableFieldsList) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta && childMeta.fields) {
                childMetasObj[tf.options] = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }
          setChildMetas(childMetasObj);

          fetchLinkOptionsMap(fields, childMetasObj).then(optsMap => {
            if (isMounted) setLinkOptionsMap(optsMap);
          });
        }
      } catch (err) {
        console.error('[LabForm34Modal] Error fetching meta fields for Monitoring:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Monitoring',
      ...formData,
      ...tableData
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f => f.fieldtype === 'Table');

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setShowEmployeeDropdown(false)}>
      <div className="modal-panel" style={{ width: '680px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>📊 Form 34: Monitoring</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Monitoring quality checks & parameter records
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', fontSize: '12px' }}>
            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Monitoring"...
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {nonTableFields.map(field => {
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            id={`m34_${field.fieldname}`}
                            checked={!!formData[field.fieldname]}
                            onChange={e => handleFieldChange(field.fieldname, e.target.checked ? 1 : 0)}
                          />
                          <label htmlFor={`m34_${field.fieldname}`} className="input-label" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>
                            {field.label}
                          </label>
                        </div>
                      );
                    }

                    if (field.fieldtype === 'Small Text' || field.fieldtype === 'Text') {
                      return (
                        <div key={field.fieldname} className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <textarea
                            className="text-input"
                            style={{ minHeight: '60px' }}
                            value={formData[field.fieldname] || ''}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            value={formData[field.fieldname] || new Date().toISOString().slice(0, 10)}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            value={formData[field.fieldname] || new Date().toTimeString().slice(0, 5)}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                          />
                        </div>
                      );
                    }

                    if (field.fieldtype === 'Link') {
                      const targetDoctype = field.options || 'Employee';
                      const isEmpTarget = targetDoctype === 'Employee' || targetDoctype === 'User';
                      const sKey = field.fieldname;

                      if (isEmpTarget) {
                        return (
                          <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <input
                              type="text"
                              className="text-input"
                              placeholder={`Select or type ${field.label}...`}
                              value={formData[field.fieldname] || ''}
                              onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                              onFocus={() => {
                                handleSearchEmployees(formData[field.fieldname] || '', sKey);
                                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
                              }}
                            />
                            {showEmployeeDropdown && activeSearchField === sKey && employeeList?.length > 0 && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 1200, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                {employeeList.map(emp => {
                                  const empVal = `${emp.employee_name || emp.name} (${emp.name})`;
                                  return (
                                    <div
                                      key={emp.name}
                                      style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                      onMouseDown={() => {
                                        handleFieldChange(field.fieldname, empVal);
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

                      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
                      const datalistId = `dl_m34_${sKey}`;

                      return (
                        <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <input
                            type="text"
                            list={datalistId}
                            className="text-input"
                            placeholder={`Select or type ${field.label}...`}
                            value={formData[field.fieldname] || ''}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                          />
                          <datalist id={datalistId}>
                            {fetchedOpts.map((opt, idx) => (
                              <option key={idx} value={opt} />
                            ))}
                          </datalist>
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
                          onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Table Fields (Child Tables) */}
                {tableFields.map(tf => {
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
                                            list={`dl_m34_tbl_${cf.fieldname}_${rIdx}`}
                                            className="text-input"
                                            style={{ padding: '4px', fontSize: '11px' }}
                                            value={row[cf.fieldname] || ''}
                                            onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                          />
                                          <datalist id={`dl_m34_tbl_${cf.fieldname}_${rIdx}`}>
                                            {(linkOptionsMap[cf.options || 'Employee'] || []).map(opt => (
                                              <option key={opt} value={opt} />
                                            ))}
                                          </datalist>
                                        </>
                                      ) : (
                                        <input
                                          type={cf.fieldtype === 'Date' ? 'date' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Float' || cf.fieldtype === 'Int' ? 'number' : 'text'}
                                          className="text-input"
                                          style={{ padding: '4px', fontSize: '11px' }}
                                          value={row[cf.fieldname] || ''}
                                          onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                        />
                                      )}
                                    </td>
                                  ))}
                                  <td style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                    <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => removeTableRow(tf.fieldname, rIdx)}>
                                      🗑️
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
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Monitoring Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm100Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    shift: 'Morning Shift',
    line_machine: 'Production Line 1',
    operator: '',
    supervisor: ''
  });
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [tableData, setTableData] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm100Modal] Fetching DocType meta for "Production Record"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Production Record');
        let fields = doctypeMeta?.fields;

        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Production Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'shift', label: 'Shift', fieldtype: 'Select', options: 'Morning Shift\nAfternoon Shift\nNight Shift' },
            { idx: 3, fieldname: 'work_order', label: 'Work Order', fieldtype: 'Link', options: 'Work Order' },
            { idx: 4, fieldname: 'line_machine', label: 'Production Line / Machine', fieldtype: 'Data' },
            { idx: 5, fieldname: 'product_name', label: 'Product Name', fieldtype: 'Data' },
            { idx: 6, fieldname: 'target_qty', label: 'Target Quantity', fieldtype: 'Int' },
            { idx: 7, fieldname: 'produced_qty', label: 'Produced Quantity', fieldtype: 'Int' },
            { idx: 8, fieldname: 'rejected_qty', label: 'Rejected Quantity', fieldtype: 'Int' },
            { idx: 9, fieldname: 'operator', label: 'Operator Name', fieldtype: 'Link', options: 'Employee' },
            { idx: 10, fieldname: 'supervisor', label: 'Supervisor Name', fieldtype: 'Link', options: 'Employee' },
            { idx: 11, fieldname: 'comments', label: 'Production Notes / Comments', fieldtype: 'Small Text' }
          ];
        }

        if (isMounted) {
          console.log('📋 PRODUCTION RECORD DYNAMIC META:', doctypeMeta);
          setMeta({ ...(doctypeMeta || {}), fields });
          const tableFieldsList = fields.filter(f => f.fieldtype === 'Table' && f.options);
          const childMetasObj = {};
          for (const tf of tableFieldsList) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta && childMeta.fields) {
                childMetasObj[tf.options] = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }
          setChildMetas(childMetasObj);

          fetchLinkOptionsMap(fields, childMetasObj).then(optsMap => {
            if (isMounted) setLinkOptionsMap(optsMap);
          });
        }
      } catch (err) {
        console.error('[LabForm100Modal] Error fetching meta fields for Production Record:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Production Record',
      ...formData,
      ...tableData
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f => f.fieldtype === 'Table');

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setShowEmployeeDropdown && setShowEmployeeDropdown(false)}>
      <div className="modal-panel" style={{ width: '680px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>🏭 Form 100: Production Record Form</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Log daily production batch details, machine speeds, output & shift records
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', fontSize: '12px' }}>
            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Production Record"...
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {nonTableFields.map(field => {
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            id={`p100_${field.fieldname}`}
                            checked={!!formData[field.fieldname]}
                            onChange={e => handleFieldChange(field.fieldname, e.target.checked ? 1 : 0)}
                          />
                          <label htmlFor={`p100_${field.fieldname}`} className="input-label" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>
                            {field.label}
                          </label>
                        </div>
                      );
                    }

                    if (field.fieldtype === 'Small Text' || field.fieldtype === 'Text') {
                      return (
                        <div key={field.fieldname} className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <textarea
                            className="text-input"
                            style={{ minHeight: '60px' }}
                            value={formData[field.fieldname] || ''}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            value={formData[field.fieldname] || new Date().toISOString().slice(0, 10)}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            value={formData[field.fieldname] || new Date().toTimeString().slice(0, 5)}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                          />
                        </div>
                      );
                    }

                    if (field.fieldtype === 'Link') {
                      const targetDoctype = field.options || 'Employee';
                      const isEmpTarget = targetDoctype === 'Employee' || targetDoctype === 'User';
                      const sKey = field.fieldname;

                      if (isEmpTarget) {
                        return (
                          <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <input
                              type="text"
                              className="text-input"
                              placeholder={`Select or type ${field.label}...`}
                              value={formData[field.fieldname] || ''}
                              onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                              onFocus={() => {
                                handleSearchEmployees(formData[field.fieldname] || '', sKey);
                                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
                              }}
                            />
                            {showEmployeeDropdown && activeSearchField === sKey && employeeList?.length > 0 && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 1200, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                {employeeList.map(emp => {
                                  const empVal = `${emp.employee_name || emp.name} (${emp.name})`;
                                  return (
                                    <div
                                      key={emp.name}
                                      style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                      onMouseDown={() => {
                                        handleFieldChange(field.fieldname, empVal);
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

                      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
                      const datalistId = `dl_m100_${sKey}`;

                      return (
                        <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <input
                            type="text"
                            list={datalistId}
                            className="text-input"
                            placeholder={`Select or type ${field.label}...`}
                            value={formData[field.fieldname] || ''}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                          />
                          <datalist id={datalistId}>
                            {fetchedOpts.map((opt, idx) => (
                              <option key={idx} value={opt} />
                            ))}
                          </datalist>
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
                          onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>

                {tableFields.map(tf => {
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
                                      ) : (
                                        <input
                                          type={cf.fieldtype === 'Date' ? 'date' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Float' || cf.fieldtype === 'Int' ? 'number' : 'text'}
                                          className="text-input"
                                          style={{ padding: '4px', fontSize: '11px' }}
                                          value={row[cf.fieldname] || ''}
                                          onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                        />
                                      )}
                                    </td>
                                  ))}
                                  <td style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                    <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => removeTableRow(tf.fieldname, rIdx)}>
                                      🗑️
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
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Production Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm69Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    recall_incident_no: `RECALL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    product_name: 'Island Chill Mineral Water',
    batch_lot_no: '',
    performed_by: '',
    approved_by: ''
  });
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [tableData, setTableData] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm69Modal] Fetching DocType meta for "Mock Product Recall"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Mock Product Recall');
        let fields = doctypeMeta?.fields;

        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Recall Exercise Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'recall_incident_no', label: 'Recall Incident Ref No.', fieldtype: 'Data' },
            { idx: 3, fieldname: 'product_name', label: 'Product Name', fieldtype: 'Data' },
            { idx: 4, fieldname: 'batch_lot_no', label: 'Batch / Lot No.', fieldtype: 'Data' },
            { idx: 5, fieldname: 'reason_for_recall', label: 'Reason for Mock Recall', fieldtype: 'Small Text' },
            { idx: 6, fieldname: 'total_produced_cases', label: 'Total Produced Cases', fieldtype: 'Int' },
            { idx: 7, fieldname: 'total_recovered_cases', label: 'Total Recovered Cases', fieldtype: 'Int' },
            { idx: 8, fieldname: 'recovery_percentage', label: 'Recovery Percentage (%)', fieldtype: 'Float' },
            { idx: 9, fieldname: 'performed_by', label: 'Performed By (QC / QA)', fieldtype: 'Link', options: 'Employee' },
            { idx: 10, fieldname: 'approved_by', label: 'Approved By (Manager)', fieldtype: 'Link', options: 'Employee' },
            { idx: 11, fieldname: 'comments', label: 'Exercise Findings & Corrective Action', fieldtype: 'Small Text' }
          ];
        }

        if (isMounted) {
          console.log('📋 MOCK PRODUCT RECALL DYNAMIC META:', doctypeMeta);
          setMeta({ ...(doctypeMeta || {}), fields });
          const tableFieldsList = fields.filter(f => f.fieldtype === 'Table' && f.options);
          const childMetasObj = {};
          for (const tf of tableFieldsList) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta && childMeta.fields) {
                childMetasObj[tf.options] = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }
          setChildMetas(childMetasObj);

          fetchLinkOptionsMap(fields, childMetasObj).then(optsMap => {
            if (isMounted) setLinkOptionsMap(optsMap);
          });
        }
      } catch (err) {
        console.error('[LabForm69Modal] Error fetching meta fields for Mock Product Recall:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Mock Product Recall',
      ...formData,
      ...tableData
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f => f.fieldtype === 'Table');

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setShowEmployeeDropdown && setShowEmployeeDropdown(false)}>
      <div className="modal-panel" style={{ width: '680px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>📢 Form 69: Mock Product Recall</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Log mock product recall exercise, traceability, quantity recovery & findings
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', fontSize: '12px' }}>
            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Mock Product Recall"...
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {nonTableFields.map(field => {
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            id={`r69_${field.fieldname}`}
                            checked={!!formData[field.fieldname]}
                            onChange={e => handleFieldChange(field.fieldname, e.target.checked ? 1 : 0)}
                          />
                          <label htmlFor={`r69_${field.fieldname}`} className="input-label" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>
                            {field.label}
                          </label>
                        </div>
                      );
                    }

                    if (field.fieldtype === 'Small Text' || field.fieldtype === 'Text') {
                      return (
                        <div key={field.fieldname} className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <textarea
                            className="text-input"
                            style={{ minHeight: '60px' }}
                            value={formData[field.fieldname] || ''}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            value={formData[field.fieldname] || new Date().toISOString().slice(0, 10)}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            value={formData[field.fieldname] || new Date().toTimeString().slice(0, 5)}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                          />
                        </div>
                      );
                    }

                    if (field.fieldtype === 'Link') {
                      const targetDoctype = field.options || 'Employee';
                      const isEmpTarget = targetDoctype === 'Employee' || targetDoctype === 'User';
                      const sKey = field.fieldname;

                      if (isEmpTarget) {
                        return (
                          <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <input
                              type="text"
                              className="text-input"
                              placeholder={`Select or type ${field.label}...`}
                              value={formData[field.fieldname] || ''}
                              onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                              onFocus={() => {
                                handleSearchEmployees(formData[field.fieldname] || '', sKey);
                                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
                              }}
                            />
                            {showEmployeeDropdown && activeSearchField === sKey && employeeList?.length > 0 && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 1200, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                {employeeList.map(emp => {
                                  const empVal = `${emp.employee_name || emp.name} (${emp.name})`;
                                  return (
                                    <div
                                      key={emp.name}
                                      style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                      onMouseDown={() => {
                                        handleFieldChange(field.fieldname, empVal);
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

                      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
                      const datalistId = `dl_m69_${sKey}`;

                      return (
                        <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <input
                            type="text"
                            list={datalistId}
                            className="text-input"
                            placeholder={`Select or type ${field.label}...`}
                            value={formData[field.fieldname] || ''}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                          />
                          <datalist id={datalistId}>
                            {fetchedOpts.map((opt, idx) => (
                              <option key={idx} value={opt} />
                            ))}
                          </datalist>
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
                          onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>

                {tableFields.map(tf => {
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
                                      ) : (
                                        <input
                                          type={cf.fieldtype === 'Date' ? 'date' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Float' || cf.fieldtype === 'Int' ? 'number' : 'text'}
                                          className="text-input"
                                          style={{ padding: '4px', fontSize: '11px' }}
                                          value={row[cf.fieldname] || ''}
                                          onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                        />
                                      )}
                                    </td>
                                  ))}
                                  <td style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                    <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => removeTableRow(tf.fieldname, rIdx)}>
                                      🗑️
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
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Mock Recall Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm70Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [formData, setFormData] = useState({
    why_was_there_a_recall: '',
    what_course_of_action_was_taken_to_resolve_the_issue: '',
    what_actions_were_taken_to_ensure_this_issue_does_not_reoccur: '',
    total_length_of_time_for_recall: '',
    how_can_we_improve_next_time_and_be_quickaccurate: '',
    total_cost_of_recall: ''
  });
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [tableData, setTableData] = useState({
    attendees: [],
    who_were_responsible_for_verifying_and_monitoring: []
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm70Modal] Fetching DocType meta for "Recall Review"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Recall Review');
        let fields = doctypeMeta?.fields;

        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'attendees', label: 'Attendees', fieldtype: 'Table MultiSelect', options: 'employee table' },
            { idx: 2, fieldname: 'why_was_there_a_recall', label: 'Why was there a recall?', fieldtype: 'Small Text' },
            { idx: 3, fieldname: 'what_course_of_action_was_taken_to_resolve_the_issue', label: 'What course of action was taken to resolve the issue?', fieldtype: 'Small Text' },
            { idx: 4, fieldname: 'what_actions_were_taken_to_ensure_this_issue_does_not_reoccur', label: 'What actions were taken to ensure this issue does not reoccur?', fieldtype: 'Small Text' },
            { idx: 5, fieldname: 'who_were_responsible_for_verifying_and_monitoring', label: 'Who were responsible for verifying and monitoring?', fieldtype: 'Table MultiSelect', options: 'employee table' },
            { idx: 6, fieldname: 'total_length_of_time_for_recall', label: 'Total length of time for recall?', fieldtype: 'Data' },
            { idx: 7, fieldname: 'how_can_we_improve_next_time_and_be_quickaccurate', label: 'How can we improve next time and be quick/accurate?', fieldtype: 'Small Text' },
            { idx: 8, fieldname: 'total_cost_of_recall', label: 'Total cost of recall', fieldtype: 'Data' }
          ];
        }

        if (isMounted) {
          console.log('📋 RECALL REVIEW DYNAMIC META:', doctypeMeta);
          setMeta({ ...(doctypeMeta || {}), fields });
          const tableFieldsList = fields.filter(f => (f.fieldtype === 'Table' || f.fieldtype === 'Table MultiSelect') && f.options);
          const childMetasObj = {};
          for (const tf of tableFieldsList) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta && childMeta.fields) {
                childMetasObj[tf.options] = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }
          setChildMetas(childMetasObj);

          fetchLinkOptionsMap(fields, childMetasObj).then(optsMap => {
            if (isMounted) setLinkOptionsMap(optsMap);
          });
        }
      } catch (err) {
        console.error('[LabForm70Modal] Error fetching meta fields for Recall Review:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

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
    if (childFields.length > 0) {
      childFields.forEach(f => {
        newRow[f.fieldname] = f.fieldtype === 'Select' ? (parseSelectOptions(f.options)[0] || '') : '';
      });
    } else {
      newRow.employee = '';
      newRow.employee_name = '';
    }
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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Recall Review',
      ...formData,
      ...tableData
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Table MultiSelect' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f => f.fieldtype === 'Table' || f.fieldtype === 'Table MultiSelect');

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setShowEmployeeDropdown && setShowEmployeeDropdown(false)}>
      <div className="modal-panel" style={{ width: '680px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>📝 Form 70: Recall Review</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Log post-recall review findings, root cause analysis, action items & costs
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', fontSize: '12px' }}>
            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Recall Review"...
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {nonTableFields.map(field => {
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            id={`rr70_${field.fieldname}`}
                            checked={!!formData[field.fieldname]}
                            onChange={e => handleFieldChange(field.fieldname, e.target.checked ? 1 : 0)}
                          />
                          <label htmlFor={`rr70_${field.fieldname}`} className="input-label" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>
                            {field.label}
                          </label>
                        </div>
                      );
                    }

                    if (field.fieldtype === 'Small Text' || field.fieldtype === 'Text') {
                      return (
                        <div key={field.fieldname} className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <textarea
                            className="text-input"
                            style={{ minHeight: '60px' }}
                            value={formData[field.fieldname] || ''}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            value={formData[field.fieldname] || new Date().toISOString().slice(0, 10)}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            value={formData[field.fieldname] || new Date().toTimeString().slice(0, 5)}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                          />
                        </div>
                      );
                    }

                    if (field.fieldtype === 'Link') {
                      const targetDoctype = field.options || 'Employee';
                      const isEmpTarget = targetDoctype === 'Employee' || targetDoctype === 'User';
                      const sKey = field.fieldname;

                      if (isEmpTarget) {
                        return (
                          <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                            <label className="input-label" style={{ fontWeight: '600' }}>
                              {field.label} {field.reqd ? '*' : ''}
                            </label>
                            <input
                              type="text"
                              className="text-input"
                              placeholder={`Select or type ${field.label}...`}
                              value={formData[field.fieldname] || ''}
                              onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                              onFocus={() => {
                                handleSearchEmployees(formData[field.fieldname] || '', sKey);
                                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
                              }}
                            />
                            {showEmployeeDropdown && activeSearchField === sKey && employeeList?.length > 0 && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 1200, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                {employeeList.map(emp => {
                                  const empVal = `${emp.employee_name || emp.name} (${emp.name})`;
                                  return (
                                    <div
                                      key={emp.name}
                                      style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                      onMouseDown={() => {
                                        handleFieldChange(field.fieldname, empVal);
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

                      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
                      const datalistId = `dl_m70_${sKey}`;

                      return (
                        <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <input
                            type="text"
                            list={datalistId}
                            className="text-input"
                            placeholder={`Select or type ${field.label}...`}
                            value={formData[field.fieldname] || ''}
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                          />
                          <datalist id={datalistId}>
                            {fetchedOpts.map((opt, idx) => (
                              <option key={idx} value={opt} />
                            ))}
                          </datalist>
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
                          onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>

                {tableFields.map(tf => {
                  const childDoctype = tf.options;
                  let childFields = (childMetas[childDoctype] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.hidden !== 1);
                  if (childFields.length === 0) {
                    childFields = [
                      { fieldname: 'employee', label: 'Employee ID / Name', fieldtype: 'Link', options: 'Employee' }
                    ];
                  }
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
                          No entries added yet. Click "+ Add Row" above.
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
                                            list={`dl_m70_tbl_${cf.fieldname}_${rIdx}`}
                                            className="text-input"
                                            style={{ padding: '4px', fontSize: '11px' }}
                                            placeholder={`Enter ${cf.label}...`}
                                            value={row[cf.fieldname] || ''}
                                            onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                          />
                                          <datalist id={`dl_m70_tbl_${cf.fieldname}_${rIdx}`}>
                                            {(linkOptionsMap[cf.options || 'Employee'] || []).map(opt => (
                                              <option key={opt} value={opt} />
                                            ))}
                                          </datalist>
                                        </>
                                      ) : (
                                        <input
                                          type={cf.fieldtype === 'Date' ? 'date' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Float' || cf.fieldtype === 'Int' ? 'number' : 'text'}
                                          className="text-input"
                                          style={{ padding: '4px', fontSize: '11px' }}
                                          placeholder={`Enter ${cf.label}...`}
                                          value={row[cf.fieldname] || ''}
                                          onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                        />
                                      )}
                                    </td>
                                  ))}
                                  <td style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                    <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => removeTableRow(tf.fieldname, rIdx)}>
                                      🗑️
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
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Recall Review Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm12Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    operator: '',
    verified_by: '',
    autoclave_no: 'Autoclave #1',
    cycle_number: '1',
    sterilization_temp: 121.0,
    pressure_psi: 15.0,
    exposure_time_mins: 15,
    chemical_indicator: 'Pass',
    biological_indicator: 'Pass',
    remarks: 'Standard sterilization cycle completed at 121°C.'
  });

  // Dynamic state for child table fields
  const [tableData, setTableData] = useState({
    table_autoclave: [
      { sample_description: 'Media Bottles & Pipettes', start_time: '09:00', end_time: '09:30', temperature: 121.0, pressure: 15.0, status: 'Pass' },
      { sample_description: 'Sample Containers', start_time: '10:00', end_time: '10:30', temperature: 121.0, pressure: 15.0, status: 'Pass' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Autoclave Record"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm12Modal] Fetching DocType meta for "Autoclave Record"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Autoclave Record');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'operator', label: 'Operator / Technician', fieldtype: 'Link', options: 'Employee' },
            { idx: 3, fieldname: 'verified_by', label: 'Verified By', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'autoclave_no', label: 'Autoclave No.', fieldtype: 'Data' },
            { idx: 5, fieldname: 'cycle_number', label: 'Cycle Number', fieldtype: 'Int' },
            { idx: 6, fieldname: 'sterilization_temp', label: 'Sterilization Temp (°C)', fieldtype: 'Float' },
            { idx: 7, fieldname: 'pressure_psi', label: 'Pressure (PSI)', fieldtype: 'Float' },
            { idx: 8, fieldname: 'exposure_time_mins', label: 'Exposure Time (Mins)', fieldtype: 'Int' },
            { idx: 9, fieldname: 'chemical_indicator', label: 'Chemical Indicator Result', fieldtype: 'Select', options: 'Pass\nFail' },
            { idx: 10, fieldname: 'biological_indicator', label: 'Biological Indicator Result', fieldtype: 'Select', options: 'Pass\nFail\nN/A' },
            { idx: 11, fieldname: 'table_autoclave', label: 'Autoclave Items & Readings', fieldtype: 'Table', options: 'Autoclave Log Detail' },
            { idx: 12, fieldname: 'remarks', label: 'Remarks / Notes', fieldtype: 'Small Text' }
          ];
        }

        const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
        fields = fields.map(f => {
          const fn = (f.fieldname || '').toLowerCase();
          const lbl = (f.label || '').toLowerCase();
          const isEmp = EMP_NAMES.includes(fn) || lbl.includes('technician') || lbl.includes('analyst') || lbl.includes('operator') || lbl.includes('verified by') || lbl.includes('checked by');
          return {
            ...f,
            fieldtype: isEmp ? 'Link' : f.fieldtype,
            options: isEmp ? 'Employee' : f.options,
            label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          };
        });

        if (isMounted) {
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Autoclave Log Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'sample_description', label: 'Item / Sample Description', fieldtype: 'Data' },
              { idx: 2, fieldname: 'start_time', label: 'Start Time', fieldtype: 'Time' },
              { idx: 3, fieldname: 'end_time', label: 'End Time', fieldtype: 'Time' },
              { idx: 4, fieldname: 'temperature', label: 'Temperature (°C)', fieldtype: 'Float' },
              { idx: 5, fieldname: 'pressure', label: 'Pressure (PSI)', fieldtype: 'Float' },
              { idx: 6, fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Pass\nFail' }
            ];
          }

          childMetasObj[childOption] = childFields;
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
        }
      } catch (err) {
        console.error('[LabForm12Modal] Error fetching meta fields for "Autoclave Record":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }

    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableInputChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, rIdx) =>
        rIdx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = (childMetas[childDoctype] || childMetas['Autoclave Log Detail'] || []);
    const newRow = {};
    childFields.forEach(f => {
      newRow[f.fieldname] = f.fieldtype === 'Select' ? (parseSelectOptions(f.options)[0] || '') : '';
    });
    if (!newRow.start_time) newRow.start_time = new Date().toTimeString().slice(0, 5);
    if (!newRow.end_time) newRow.end_time = new Date(Date.now() + 1800000).toTimeString().slice(0, 5);
    newRow.sample_description = newRow.sample_description || 'Autoclave Batch Item';
    newRow.temperature = newRow.temperature || 121.0;
    newRow.pressure = newRow.pressure || 15.0;
    newRow.status = newRow.status || 'Pass';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Autoclave Record',
      ...formData,
      ...tableData,
      analyst: formData.operator || formData.technician || 'QC Tech',
      verifiedBy: formData.verified_by || 'Manager',
      date: formData.date
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('operator') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 12: Autoclave Sterilization Record Sheet
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Autoclave Record"...
              </div>
            )}



            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `auto_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Autoclave Log Detail';
              const childFields = (childMetas[childDoctype] || childMetas['Autoclave Log Detail'] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      + Add Row
                    </button>
                  </div>

                  {rows.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                      No items added to autoclave log yet. Click "+ Add Row" above to record sterilization items.
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
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>
                                  {cf.fieldtype === 'Select' ? (
                                    <select
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    >
                                      <option value="">-- Select --</option>
                                      {parseSelectOptions(cf.options).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : cf.fieldtype === 'Check' ? (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(row[cf.fieldname])}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.checked)}
                                    />
                                  ) : (
                                    <input
                                      type={['Int', 'Float', 'Currency', 'Percent'].includes(cf.fieldtype) ? 'number' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Date' ? 'date' : 'text'}
                                      step="any"
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    />
                                  )}
                                </td>
                              ))}
                              <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                  onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                >
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

            {/* Signature Fields Section */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', margin: '0 0 10px 0', fontSize: '13px' }}>✍️ Digital Signatures</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(sf => (
                    <div key={sf.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>{sf.label}</label>
                      {renderControlInput(sf, formData[sf.fieldname], (v) => handleFieldChange(sf.fieldname, v), `auto_meta_sig_${sf.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FormFootnote doctype="Autoclave Record" defaultFormNo="Form 12" formTitle="Autoclave Sterilization Record Sheet" />
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Autoclave Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm13Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    prepared_by: '',
    verified_by: '',
    media_type: 'PCA (Plate Count Agar)',
    batch_no: 'MP-2026-001',
    autoclave_batch: 'AC-001',
    sterilization_temp: 121.0,
    autoclave_time_mins: 15,
    ph_before: 7.0,
    ph_after: 7.0,
    appearance: 'Clear Straw / Yellow',
    sterility_check: 'Pass',
    remarks: 'Media prepared, autoclaved at 121°C for 15 mins, pH verified within spec.'
  });

  // Dynamic state for child table fields
  const [tableData, setTableData] = useState({
    media_preparation_details: [
      { media_name: 'Plate Count Agar (PCA)', brand_manufacturer: 'Oxoid', lot_number: 'LOT-99812', qty_prepared: '23.5g / 1L', expiry_date: new Date(Date.now() + 30*86400000).toISOString().slice(0, 10), ph_check: 7.0, status: 'Pass' },
      { media_name: 'Violet Red Bile Agar (VRBA)', brand_manufacturer: 'Difco', lot_number: 'LOT-88231', qty_prepared: '41.5g / 1L', expiry_date: new Date(Date.now() + 30*86400000).toISOString().slice(0, 10), ph_check: 7.4, status: 'Pass' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Media Preparation Record"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm13Modal] Fetching DocType meta for "Media Preparation Record"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Media Preparation Record');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date of Preparation', fieldtype: 'Date' },
            { idx: 2, fieldname: 'prepared_by', label: 'Prepared By / Analyst', fieldtype: 'Link', options: 'Employee' },
            { idx: 3, fieldname: 'verified_by', label: 'Verified By / Supervisor', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'media_type', label: 'Media / Agar Type', fieldtype: 'Data' },
            { idx: 5, fieldname: 'batch_no', label: 'Media Batch / Lot No.', fieldtype: 'Data' },
            { idx: 6, fieldname: 'autoclave_batch', label: 'Autoclave Batch No.', fieldtype: 'Data' },
            { idx: 7, fieldname: 'sterilization_temp', label: 'Sterilization Temp (°C)', fieldtype: 'Float' },
            { idx: 8, fieldname: 'autoclave_time_mins', label: 'Sterilization Time (Mins)', fieldtype: 'Int' },
            { idx: 9, fieldname: 'ph_before', label: 'pH Before Sterilization', fieldtype: 'Float' },
            { idx: 10, fieldname: 'ph_after', label: 'pH After Sterilization', fieldtype: 'Float' },
            { idx: 11, fieldname: 'appearance', label: 'Appearance / Color', fieldtype: 'Data' },
            { idx: 12, fieldname: 'sterility_check', label: 'Sterility Check Status', fieldtype: 'Select', options: 'Pass\nFail\nPending' },
            { idx: 13, fieldname: 'media_preparation_details', label: 'Prepared Media Batches & Reagents', fieldtype: 'Table', options: 'Media Preparation Detail' },
            { idx: 14, fieldname: 'remarks', label: 'Remarks / Observations', fieldtype: 'Small Text' }
          ];
        }

        const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
        fields = fields.map(f => {
          const fn = (f.fieldname || '').toLowerCase();
          const lbl = (f.label || '').toLowerCase();
          const isEmp = EMP_NAMES.includes(fn) || lbl.includes('technician') || lbl.includes('analyst') || lbl.includes('operator') || lbl.includes('verified by') || lbl.includes('prepared by') || lbl.includes('checked by');
          return {
            ...f,
            fieldtype: isEmp ? 'Link' : f.fieldtype,
            options: isEmp ? 'Employee' : f.options,
            label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          };
        });

        if (isMounted) {
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Media Preparation Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'media_name', label: 'Media / Reagent Name', fieldtype: 'Data' },
              { idx: 2, fieldname: 'brand_manufacturer', label: 'Brand / Manufacturer', fieldtype: 'Data' },
              { idx: 3, fieldname: 'lot_number', label: 'Lot / Serial No.', fieldtype: 'Data' },
              { idx: 4, fieldname: 'qty_prepared', label: 'Qty Prepared (g/L)', fieldtype: 'Data' },
              { idx: 5, fieldname: 'expiry_date', label: 'Expiry Date', fieldtype: 'Date' },
              { idx: 6, fieldname: 'ph_check', label: 'Measured pH', fieldtype: 'Float' },
              { idx: 7, fieldname: 'status', label: 'Quality Status', fieldtype: 'Select', options: 'Pass\nFail' }
            ];
          }

          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          if (!tableData[tf.fieldname]) {
            tableData[tf.fieldname] = [
              { media_name: 'Plate Count Agar (PCA)', brand_manufacturer: 'Oxoid', lot_number: 'LOT-99812', qty_prepared: '23.5g / 1L', expiry_date: new Date(Date.now() + 30*86400000).toISOString().slice(0, 10), ph_check: 7.0, status: 'Pass' }
            ];
          }
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
        }
      } catch (err) {
        console.error('[LabForm13Modal] Error fetching meta fields for "Media Preparation Record":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }

    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableInputChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, idx) =>
        idx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = (childMetas[childDoctype] || childMetas['Media Preparation Detail'] || []);
    const newRow = {};
    childFields.forEach(cf => {
      if (cf.fieldtype === 'Select') {
        const opts = parseSelectOptions(cf.options);
        newRow[cf.fieldname] = opts[0] || '';
      } else if (cf.fieldtype === 'Date') {
        newRow[cf.fieldname] = new Date().toISOString().slice(0, 10);
      } else {
        newRow[cf.fieldname] = '';
      }
    });
    newRow.media_name = newRow.media_name || 'Standard Culture Agar';
    newRow.status = newRow.status || 'Pass';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Media Preparation Record',
      ...formData,
      ...tableData,
      analyst: formData.prepared_by || formData.operator || formData.technician || 'QC Analyst',
      verifiedBy: formData.verified_by || 'Manager',
      date: formData.date
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('prepared by') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 13: Media Preparation Record Sheet
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Media Preparation Record"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `mpr_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Media Preparation Detail';
              const childFields = (childMetas[childDoctype] || childMetas['Media Preparation Detail'] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      + Add Row
                    </button>
                  </div>

                  {rows.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                      No media batches added yet. Click "+ Add Row" above to record prepared media items.
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
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>
                                  {cf.fieldtype === 'Select' ? (
                                    <select
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    >
                                      <option value="">-- Select --</option>
                                      {parseSelectOptions(cf.options).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : cf.fieldtype === 'Check' ? (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(row[cf.fieldname])}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.checked)}
                                    />
                                  ) : (
                                    <input
                                      type={['Int', 'Float', 'Currency', 'Percent'].includes(cf.fieldtype) ? 'number' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Date' ? 'date' : 'text'}
                                      step="any"
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    />
                                  )}
                                </td>
                              ))}
                              <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                  onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                >
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

            {/* Signature Fields Section */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', margin: '0 0 10px 0', fontSize: '13px' }}>✍️ Digital Signatures</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(sf => (
                    <div key={sf.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>{sf.label}</label>
                      {renderControlInput(sf, formData[sf.fieldname], (v) => handleFieldChange(sf.fieldname, v), `mpr_meta_sig_${sf.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FormFootnote doctype="Media Preparation Record" defaultFormNo="Form 13" formTitle="Media Preparation Record Sheet" />
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Media Preparation Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm64Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    tested_by: '',
    verified_by: '',
    material_type: 'Preform 28mm PCO',
    batch_lot_no: 'PF-2026-9901',
    sample_size: '10 Units',
    rinse_solution: 'Sterile Buffered Peptone Water (100mL)',
    incubation_temp: 35.0,
    incubation_hours: 24,
    tcc_result: 'Absent / 0 cfu',
    ecoli_result: 'Absent / 0 cfu',
    spc_hpc_result: '< 10 cfu/mL',
    overall_status: 'Pass',
    remarks: 'Rinse-off swab test completed for raw materials. Microbiological counts within spec.'
  });

  // Dynamic state for child table fields
  const [tableData, setTableData] = useState({
    rinse_off_details: [
      { sample_id: 'SAMPLE-01', item_description: '28mm Preform Inner Surface', tcc_count: '0', ecoli_count: '0', spc_count: '2', status: 'Pass' },
      { sample_id: 'SAMPLE-02', item_description: 'Closure/Cap Contact Surface', tcc_count: '0', ecoli_count: '0', spc_count: '0', status: 'Pass' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Rinse-Off Test for Raw Materials"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm64Modal] Fetching DocType meta for "Rinse-Off Test for Raw Materials"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Rinse-Off Test for Raw Materials');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date of Test', fieldtype: 'Date' },
            { idx: 2, fieldname: 'tested_by', label: 'Tested By / Analyst', fieldtype: 'Link', options: 'Employee' },
            { idx: 3, fieldname: 'verified_by', label: 'Verified By / Supervisor', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'material_type', label: 'Raw Material / Item', fieldtype: 'Data' },
            { idx: 5, fieldname: 'batch_lot_no', label: 'Supplier Batch / Lot No.', fieldtype: 'Data' },
            { idx: 6, fieldname: 'sample_size', label: 'Sample Size', fieldtype: 'Data' },
            { idx: 7, fieldname: 'rinse_solution', label: 'Rinse Solution Used', fieldtype: 'Data' },
            { idx: 8, fieldname: 'incubation_temp', label: 'Incubation Temp (°C)', fieldtype: 'Float' },
            { idx: 9, fieldname: 'incubation_hours', label: 'Incubation Hours', fieldtype: 'Int' },
            { idx: 10, fieldname: 'tcc_result', label: 'Total Coliform Count (TCC)', fieldtype: 'Data' },
            { idx: 11, fieldname: 'ecoli_result', label: 'E. Coli Result', fieldtype: 'Data' },
            { idx: 12, fieldname: 'spc_hpc_result', label: 'SPC / HPC Count', fieldtype: 'Data' },
            { idx: 13, fieldname: 'overall_status', label: 'Overall Test Result', fieldtype: 'Select', options: 'Pass\nFail\nPending' },
            { idx: 14, fieldname: 'rinse_off_details', label: 'Rinse-Off Test Readings & Detail', fieldtype: 'Table', options: 'Rinse Off Test Detail' },
            { idx: 15, fieldname: 'remarks', label: 'Remarks / Observations', fieldtype: 'Small Text' }
          ];
        }

        const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by', 'tested_by'];
        fields = fields.map(f => {
          const fn = (f.fieldname || '').toLowerCase();
          const lbl = (f.label || '').toLowerCase();
          const isEmp = EMP_NAMES.includes(fn) || lbl.includes('technician') || lbl.includes('analyst') || lbl.includes('operator') || lbl.includes('verified by') || lbl.includes('tested by') || lbl.includes('checked by');
          return {
            ...f,
            fieldtype: isEmp ? 'Link' : f.fieldtype,
            options: isEmp ? 'Employee' : f.options,
            label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          };
        });

        if (isMounted) {
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Rinse Off Test Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'sample_id', label: 'Sample ID / Unit No.', fieldtype: 'Data' },
              { idx: 2, fieldname: 'item_description', label: 'Material Description', fieldtype: 'Data' },
              { idx: 3, fieldname: 'tcc_count', label: 'TCC Count (cfu/mL)', fieldtype: 'Data' },
              { idx: 4, fieldname: 'ecoli_count', label: 'E.Coli Count (cfu/mL)', fieldtype: 'Data' },
              { idx: 5, fieldname: 'spc_count', label: 'SPC / HPC Count', fieldtype: 'Data' },
              { idx: 6, fieldname: 'status', label: 'Quality Status', fieldtype: 'Select', options: 'Pass\nFail' }
            ];
          }

          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          if (!tableData[tf.fieldname]) {
            tableData[tf.fieldname] = [
              { sample_id: 'SAMPLE-01', item_description: '28mm Preform Inner Surface', tcc_count: '0', ecoli_count: '0', spc_count: '2', status: 'Pass' }
            ];
          }
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
        }
      } catch (err) {
        console.error('[LabForm64Modal] Error fetching meta fields for "Rinse-Off Test for Raw Materials":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }

    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableInputChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, idx) =>
        idx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = (childMetas[childDoctype] || childMetas['Rinse Off Test Detail'] || []);
    const newRow = {};
    childFields.forEach(cf => {
      if (cf.fieldtype === 'Select') {
        const opts = parseSelectOptions(cf.options);
        newRow[cf.fieldname] = opts[0] || '';
      } else if (cf.fieldtype === 'Date') {
        newRow[cf.fieldname] = new Date().toISOString().slice(0, 10);
      } else {
        newRow[cf.fieldname] = '';
      }
    });
    newRow.sample_id = newRow.sample_id || `SAMPLE-0${(tableData[tableFieldName] || []).length + 1}`;
    newRow.status = newRow.status || 'Pass';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Rinse-Off Test for Raw Materials',
      ...formData,
      ...tableData,
      analyst: formData.tested_by || formData.operator || formData.technician || 'QC Analyst',
      verifiedBy: formData.verified_by || 'Manager',
      date: formData.date
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by', 'tested_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('tested by') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 64: Rinse-Off Test for Raw Materials
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Rinse-Off Test for Raw Materials"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `rot_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Rinse Off Test Detail';
              const childFields = (childMetas[childDoctype] || childMetas['Rinse Off Test Detail'] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      + Add Row
                    </button>
                  </div>

                  {rows.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                      No rinse-off test readings added yet. Click "+ Add Row" above to record sample items.
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
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>
                                  {cf.fieldtype === 'Select' ? (
                                    <select
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    >
                                      <option value="">-- Select --</option>
                                      {parseSelectOptions(cf.options).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : cf.fieldtype === 'Check' ? (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(row[cf.fieldname])}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.checked)}
                                    />
                                  ) : (
                                    <input
                                      type={['Int', 'Float', 'Currency', 'Percent'].includes(cf.fieldtype) ? 'number' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Date' ? 'date' : 'text'}
                                      step="any"
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    />
                                  )}
                                </td>
                              ))}
                              <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                  onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                >
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

            {/* Signature Fields Section */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', margin: '0 0 10px 0', fontSize: '13px' }}>✍️ Digital Signatures</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(sf => (
                    <div key={sf.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>{sf.label}</label>
                      {renderControlInput(sf, formData[sf.fieldname], (v) => handleFieldChange(sf.fieldname, v), `rot_meta_sig_${sf.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FormFootnote doctype="Rinse-Off Test for Raw Materials" defaultFormNo="Form 64" formTitle="Rinse-Off Test for Raw Materials" />
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Rinse-Off Test Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm72Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    verified_by: '',
    bottle_size: '1.5L PET',
    product_name: 'Island Chill Natural Mineral Water',
    batch_code: 'BC-2026-0922',
    production_date: new Date().toISOString().slice(0, 10),
    sample_qty: 6,
    storage_location: 'Library Storage Rack A2',
    retention_period_months: 24,
    evaluation_status: 'Pass',
    remarks: 'Library retention samples logged and stored in QA sample room.'
  });

  // Dynamic state for child table fields
  const [tableData, setTableData] = useState({
    library_sample_details: [
      { sample_code: 'LS-01', bottle_size: '1.5L PET', inspection_date: new Date().toISOString().slice(0, 10), visual_check: 'Clear', taste_check: 'Normal', status: 'Pass' },
      { sample_code: 'LS-02', bottle_size: '1.5L PET', inspection_date: new Date().toISOString().slice(0, 10), visual_check: 'Clear', taste_check: 'Normal', status: 'Pass' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Library Sample Record"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm72Modal] Fetching DocType meta for "Library Sample Record"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Library Sample Record');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date Logged', fieldtype: 'Date' },
            { idx: 2, fieldname: 'recorded_by', label: 'Recorded By / Technician', fieldtype: 'Link', options: 'Employee' },
            { idx: 3, fieldname: 'verified_by', label: 'Verified By / Supervisor', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'product_name', label: 'Product Name', fieldtype: 'Data' },
            { idx: 5, fieldname: 'bottle_size', label: 'Bottle Size / SKU', fieldtype: 'Data' },
            { idx: 6, fieldname: 'batch_code', label: 'Production Batch Code', fieldtype: 'Data' },
            { idx: 7, fieldname: 'production_date', label: 'Production Date', fieldtype: 'Date' },
            { idx: 8, fieldname: 'sample_qty', label: 'Sample Quantity', fieldtype: 'Int' },
            { idx: 9, fieldname: 'storage_location', label: 'Storage Rack / Shelf Location', fieldtype: 'Data' },
            { idx: 10, fieldname: 'retention_period_months', label: 'Retention Period (Months)', fieldtype: 'Int' },
            { idx: 11, fieldname: 'evaluation_status', label: 'Periodic Evaluation Status', fieldtype: 'Select', options: 'Pass\nFail\nPending' },
            { idx: 12, fieldname: 'library_sample_details', label: 'Library Samples & Inspection Logs', fieldtype: 'Table', options: 'Library Sample Detail' },
            { idx: 13, fieldname: 'remarks', label: 'Remarks / Storage Notes', fieldtype: 'Small Text' }
          ];
        }

        const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by', 'tested_by'];
        fields = fields.map(f => {
          const fn = (f.fieldname || '').toLowerCase();
          const lbl = (f.label || '').toLowerCase();
          const isEmp = EMP_NAMES.includes(fn) || lbl.includes('technician') || lbl.includes('analyst') || lbl.includes('operator') || lbl.includes('verified by') || lbl.includes('recorded by') || lbl.includes('checked by');
          return {
            ...f,
            fieldtype: isEmp ? 'Link' : f.fieldtype,
            options: isEmp ? 'Employee' : f.options,
            label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          };
        });

        if (isMounted) {
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Library Sample Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'sample_code', label: 'Sample Code', fieldtype: 'Data' },
              { idx: 2, fieldname: 'bottle_size', label: 'Bottle Size', fieldtype: 'Data' },
              { idx: 3, fieldname: 'inspection_date', label: 'Inspection Date', fieldtype: 'Date' },
              { idx: 4, fieldname: 'visual_check', label: 'Visual Check', fieldtype: 'Data' },
              { idx: 5, fieldname: 'taste_check', label: 'Taste Check', fieldtype: 'Data' },
              { idx: 6, fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Pass\nFail' }
            ];
          }

          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          if (!tableData[tf.fieldname]) {
            tableData[tf.fieldname] = [
              { sample_code: 'LS-01', bottle_size: '1.5L PET', inspection_date: new Date().toISOString().slice(0, 10), visual_check: 'Clear', taste_check: 'Normal', status: 'Pass' }
            ];
          }
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
        }
      } catch (err) {
        console.error('[LabForm72Modal] Error fetching meta fields for "Library Sample Record":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }

    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableInputChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, idx) =>
        idx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = (childMetas[childDoctype] || childMetas['Library Sample Detail'] || []);
    const newRow = {};
    childFields.forEach(cf => {
      if (cf.fieldtype === 'Select') {
        const opts = parseSelectOptions(cf.options);
        newRow[cf.fieldname] = opts[0] || '';
      } else if (cf.fieldtype === 'Date') {
        newRow[cf.fieldname] = new Date().toISOString().slice(0, 10);
      } else {
        newRow[cf.fieldname] = '';
      }
    });
    newRow.sample_code = newRow.sample_code || `LS-0${(tableData[tableFieldName] || []).length + 1}`;
    newRow.status = newRow.status || 'Pass';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Library Sample Record',
      ...formData,
      ...tableData,
      analyst: formData.recorded_by || formData.operator || formData.technician || 'QC Technician',
      verifiedBy: formData.verified_by || 'Manager',
      date: formData.date
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by', 'tested_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('recorded by') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onMouseDown={() => {
                    onChange(`${emp.employee_name || emp.name} (${emp.name})`);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (fType === 'Signature') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              value={val || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={`Digital signature (${label})...`}
              style={{ fontFamily: 'cursive, sans-serif', fontSize: '13px', fontStyle: 'italic', flex: 1 }}
            />
            {val && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                onClick={() => onChange('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 72: Library Sample Record
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Library Sample Record"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `lsr_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Library Sample Detail';
              const childFields = (childMetas[childDoctype] || childMetas['Library Sample Detail'] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      + Add Row
                    </button>
                  </div>

                  {rows.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                      No library samples added yet. Click "+ Add Row" above to record sample items.
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
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>
                                  {cf.fieldtype === 'Select' ? (
                                    <select
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    >
                                      <option value="">-- Select --</option>
                                      {parseSelectOptions(cf.options).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : cf.fieldtype === 'Check' ? (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(row[cf.fieldname])}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.checked)}
                                    />
                                  ) : (
                                    <input
                                      type={['Int', 'Float', 'Currency', 'Percent'].includes(cf.fieldtype) ? 'number' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Date' ? 'date' : 'text'}
                                      step="any"
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    />
                                  )}
                                </td>
                              ))}
                              <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                  onClick={() => removeTableRow(tf.fieldname, rIdx)}
                                >
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

            {/* Signature Fields Section */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', margin: '0 0 10px 0', fontSize: '13px' }}>✍️ Digital Signatures</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(sf => (
                    <div key={sf.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>{sf.label}</label>
                      {renderControlInput(sf, formData[sf.fieldname], (v) => handleFieldChange(sf.fieldname, v), `lsr_meta_sig_${sf.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FormFootnote doctype="Library Sample Record" defaultFormNo="Form 72" formTitle="Library Sample Record" />
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Library Sample Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm47Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    product_name: 'Island Chill Natural Mineral Water',
    batch_code: 'BC-2026-0922',
    production_date: new Date().toISOString().slice(0, 10),
    expiry_date: new Date(Date.now() + 365*24*60*60*1000).toISOString().slice(0, 10),
    shift: 'Shift A',
    line_no: 'Line 1',
    water_batch_no: 'WB-2026-0922',
    preform_batch_no: 'PF-8842',
    closure_batch_no: 'CL-9912',
    label_batch_no: 'LB-4410',
    carton_batch_no: 'CT-3310',
    quantity_produced: 5000,
    customer_destination: 'Main Distribution Center',
    recorded_by: '',
    verified_by: '',
    remarks: 'Full product traceability logged successfully.'
  });

  // Dynamic state for child table fields
  const [tableData, setTableData] = useState({
    traceability_details: [
      { raw_material: 'PET Preforms (28g)', supplier_lot: 'LOT-PF-1002', batch_no: 'PF-8842', qty_used: '5200 pcs', status: 'Pass' },
      { raw_material: 'Blue Closures 28mm', supplier_lot: 'LOT-CL-5041', batch_no: 'CL-9912', qty_used: '5200 pcs', status: 'Pass' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Traceability of products"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm47Modal] Fetching DocType meta for "Traceability of products"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Traceability of products');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date Logged', fieldtype: 'Date' },
            { idx: 2, fieldname: 'time', label: 'Time', fieldtype: 'Time' },
            { idx: 3, fieldname: 'product_name', label: 'Product Name', fieldtype: 'Data' },
            { idx: 4, fieldname: 'batch_code', label: 'Product Batch Code', fieldtype: 'Data' },
            { idx: 5, fieldname: 'production_date', label: 'Production Date', fieldtype: 'Date' },
            { idx: 6, fieldname: 'expiry_date', label: 'Expiry / Best Before Date', fieldtype: 'Date' },
            { idx: 7, fieldname: 'shift', label: 'Shift', fieldtype: 'Select', options: 'Shift A\nShift B\nShift C' },
            { idx: 8, fieldname: 'line_no', label: 'Line / Machine No', fieldtype: 'Data' },
            { idx: 9, fieldname: 'water_batch_no', label: 'Raw / Product Water Batch No', fieldtype: 'Data' },
            { idx: 10, fieldname: 'preform_batch_no', label: 'Preform Lot / Batch No', fieldtype: 'Data' },
            { idx: 11, fieldname: 'closure_batch_no', label: 'Closure Lot / Batch No', fieldtype: 'Data' },
            { idx: 12, fieldname: 'label_batch_no', label: 'Label Lot / Batch No', fieldtype: 'Data' },
            { idx: 13, fieldname: 'carton_batch_no', label: 'Carton / Shrink Lot No', fieldtype: 'Data' },
            { idx: 14, fieldname: 'quantity_produced', label: 'Quantity Produced (Cases / Bottles)', fieldtype: 'Int' },
            { idx: 15, fieldname: 'customer_destination', label: 'Customer / Warehouse Destination', fieldtype: 'Data' },
            { idx: 16, fieldname: 'recorded_by', label: 'Recorded By / QA Officer', fieldtype: 'Link', options: 'Employee' },
            { idx: 17, fieldname: 'verified_by', label: 'Verified By / Supervisor', fieldtype: 'Link', options: 'Employee' },
            { idx: 18, fieldname: 'traceability_details', label: 'Raw Material Traceability Details', fieldtype: 'Table', options: 'Traceability Detail' },
            { idx: 19, fieldname: 'remarks', label: 'Remarks / Comments', fieldtype: 'Small Text' }
          ];
        }

        const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by', 'tested_by'];
        fields = fields.map(f => {
          const fn = (f.fieldname || '').toLowerCase();
          const lbl = (f.label || '').toLowerCase();
          const isEmp = EMP_NAMES.includes(fn) || lbl.includes('technician') || lbl.includes('analyst') || lbl.includes('operator') || lbl.includes('verified by') || lbl.includes('recorded by') || lbl.includes('checked by');
          return {
            ...f,
            fieldtype: isEmp ? 'Link' : f.fieldtype,
            options: isEmp ? 'Employee' : f.options,
            label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          };
        });

        if (isMounted) {
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Traceability Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'raw_material', label: 'Raw Material Component', fieldtype: 'Data' },
              { idx: 2, fieldname: 'supplier_lot', label: 'Supplier Lot No', fieldtype: 'Data' },
              { idx: 3, fieldname: 'batch_no', label: 'Internal Batch No', fieldtype: 'Data' },
              { idx: 4, fieldname: 'qty_used', label: 'Quantity Used', fieldtype: 'Data' },
              { idx: 5, fieldname: 'status', label: 'Verification Status', fieldtype: 'Select', options: 'Pass\nFail\nPending' }
            ];
          }

          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          if (!tableData[tf.fieldname]) {
            tableData[tf.fieldname] = [
              { raw_material: 'PET Preforms (28g)', supplier_lot: 'LOT-PF-1002', batch_no: 'PF-8842', qty_used: '5200 pcs', status: 'Pass' }
            ];
          }
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
        }
      } catch (err) {
        console.error('[LabForm47Modal] Error fetching meta fields for "Traceability of products":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }

    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableInputChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, idx) =>
        idx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = (childMetas[childDoctype] || childMetas['Traceability Detail'] || []);
    const newRow = {};
    childFields.forEach(cf => {
      if (cf.fieldtype === 'Select') {
        const opts = parseSelectOptions(cf.options);
        newRow[cf.fieldname] = opts[0] || '';
      } else if (cf.fieldtype === 'Date') {
        newRow[cf.fieldname] = new Date().toISOString().slice(0, 10);
      } else {
        newRow[cf.fieldname] = '';
      }
    });
    newRow.status = newRow.status || 'Pass';

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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Traceability of products',
      ...formData,
      ...tableData,
      analyst: formData.recorded_by || formData.operator || formData.technician || 'QA Officer',
      verifiedBy: formData.verified_by || 'Manager',
      date: formData.date
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'recorded_by', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by', 'tested_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('recorded by') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="autocomplete-item"
                  onClick={() => {
                    onChange(emp.employee_name ? `${emp.employee_name} (${emp.name})` : emp.name);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{emp.employee_name || emp.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.designation || emp.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 47: Traceability of products
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Traceability of products"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `top_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Traceability Detail';
              const childFields = (childMetas[childDoctype] || childMetas['Traceability Detail'] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      + Add Row
                    </button>
                  </div>

                  {rows.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                      No traceability details added yet. Click "+ Add Row" above to record item details.
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
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>
                                  {cf.fieldtype === 'Select' ? (
                                    <select
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    >
                                      <option value="">-- Select --</option>
                                      {parseSelectOptions(cf.options).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : cf.fieldtype === 'Check' ? (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(row[cf.fieldname])}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.checked)}
                                    />
                                  ) : (
                                    <input
                                      type={['Int', 'Float', 'Currency', 'Percent'].includes(cf.fieldtype) ? 'number' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Date' ? 'date' : 'text'}
                                      step="any"
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    />
                                  )}
                                </td>
                              ))}
                              <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                  onClick={() => removeTableRow(tf.fieldname, rowIdx)}
                                >
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

            {/* Signature Fields Section */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', margin: '0 0 10px 0', fontSize: '13px' }}>✍️ Digital Signatures</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(sf => (
                    <div key={sf.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>{sf.label}</label>
                      {renderControlInput(sf, formData[sf.fieldname], (v) => handleFieldChange(sf.fieldname, v), `top_meta_sig_${sf.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FormFootnote doctype="Traceability of products" defaultFormNo="Form 47" formTitle="Traceability of products" />
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Traceability of products'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LabForm39Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Dynamic state for top-level fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    induction_type: 'Employee Site Induction',
    attendee_name: 'John Doe',
    company_organization: 'Carpenters Waters (Fiji) Ltd',
    contact_number: '+679 999 1234',
    designation: 'QC Analyst',
    department: 'Quality Assurance',
    conducted_by: '',
    verified_by: '',
    safety_rules_acknowledged: true,
    hygiene_rules_acknowledged: true,
    ppe_provided: true,
    emergency_procedures_explained: true,
    status: 'Completed',
    remarks: 'Site safety and quality induction completed successfully.'
  });

  // Dynamic state for child table fields
  const [tableData, setTableData] = useState({
    induction_items: [
      { topic: 'Personal Protective Equipment (PPE)', completed: true, notes: 'Safety boots, hairnet, lab coat verified.' },
      { topic: 'Personal Hygiene & Hand Sanitization', completed: true, notes: 'Hand washing guidelines demonstrated.' }
    ]
  });

  // Fetch Meta Fields from ERPNext DocType "Induction"
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        console.log('[LabForm39Modal] Fetching DocType meta for "Induction"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Induction');

        let fields = doctypeMeta?.fields;
        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Induction Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'induction_type', label: 'Induction Type', fieldtype: 'Select', options: 'Employee Site Induction\nVisitor Induction\nContractor Safety Induction' },
            { idx: 3, fieldname: 'attendee_name', label: 'Attendee Full Name', fieldtype: 'Data' },
            { idx: 4, fieldname: 'company_organization', label: 'Company / Organization', fieldtype: 'Data' },
            { idx: 5, fieldname: 'contact_number', label: 'Contact Number', fieldtype: 'Data' },
            { idx: 6, fieldname: 'designation', label: 'Designation / Role', fieldtype: 'Data' },
            { idx: 7, fieldname: 'department', label: 'Department', fieldtype: 'Data' },
            { idx: 8, fieldname: 'conducted_by', label: 'Conducted By / Trainer', fieldtype: 'Link', options: 'Employee' },
            { idx: 9, fieldname: 'verified_by', label: 'Verified By / Supervisor', fieldtype: 'Link', options: 'Employee' },
            { idx: 10, fieldname: 'safety_rules_acknowledged', label: 'Safety & Emergency Rules Acknowledged', fieldtype: 'Check' },
            { idx: 11, fieldname: 'hygiene_rules_acknowledged', label: 'GMP & Plant Hygiene Acknowledged', fieldtype: 'Check' },
            { idx: 12, fieldname: 'ppe_provided', label: 'PPE Issued & Verified', fieldtype: 'Check' },
            { idx: 13, fieldname: 'emergency_procedures_explained', label: 'Emergency Evacuation Explained', fieldtype: 'Check' },
            { idx: 14, fieldname: 'status', label: 'Induction Status', fieldtype: 'Select', options: 'Completed\nPending\nFailed' },
            { idx: 15, fieldname: 'induction_items', label: 'Induction Checklist Items', fieldtype: 'Table', options: 'Induction Item Detail' },
            { idx: 16, fieldname: 'remarks', label: 'Remarks / Notes', fieldtype: 'Small Text' }
          ];
        }

        const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'conducted_by', 'trainer', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by', 'tested_by'];
        fields = fields.map(f => {
          const fn = (f.fieldname || '').toLowerCase();
          const lbl = (f.label || '').toLowerCase();
          const isEmp = EMP_NAMES.includes(fn) || lbl.includes('technician') || lbl.includes('analyst') || lbl.includes('trainer') || lbl.includes('conducted by') || lbl.includes('verified by') || lbl.includes('checked by');
          return {
            ...f,
            fieldtype: isEmp ? 'Link' : f.fieldtype,
            options: isEmp ? 'Employee' : f.options,
            label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          };
        });

        if (isMounted) {
          setMeta({ ...(doctypeMeta || {}), fields });
        }

        // Fetch child table metas for any Table fields
        const tableFieldsList = fields.filter(f => f.fieldtype === 'Table');
        const childMetasObj = {};

        for (const tf of tableFieldsList) {
          const childOption = tf.options || 'Induction Item Detail';
          let childFields = [];
          if (tf.options) {
            try {
              const childMeta = await frappe.getDocTypeMeta(tf.options);
              if (childMeta?.fields && childMeta.fields.length > 0) {
                childFields = childMeta.fields;
              }
            } catch (err) {
              console.error(`Error fetching child meta for ${tf.options}:`, err);
            }
          }

          if (!childFields || childFields.length === 0) {
            childFields = [
              { idx: 1, fieldname: 'topic', label: 'Induction Topic / Module', fieldtype: 'Data' },
              { idx: 2, fieldname: 'completed', label: 'Completed / Passed', fieldtype: 'Check' },
              { idx: 3, fieldname: 'notes', label: 'Notes / Observation', fieldtype: 'Data' }
            ];
          }

          childFields = childFields.map(cf => ({
            ...cf,
            label: (cf.label || cf.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
          }));

          childMetasObj[childOption] = childFields;

          if (!tableData[tf.fieldname]) {
            tableData[tf.fieldname] = [
              { topic: 'Personal Protective Equipment (PPE)', completed: true, notes: 'Safety boots, hairnet, lab coat verified.' }
            ];
          }
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
        }
      } catch (err) {
        console.error('[LabForm39Modal] Error fetching meta fields for "Induction":', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }

    fetchMeta();
    return () => { isMounted = false; };
  }, []);

  const handleFieldChange = (fieldname, val) => {
    setFormData(prev => ({ ...prev, [fieldname]: val }));
  };

  const handleTableInputChange = (tableFieldName, rowIdx, fieldname, val) => {
    setTableData(prev => ({
      ...prev,
      [tableFieldName]: (prev[tableFieldName] || []).map((row, idx) =>
        idx === rowIdx ? { ...row, [fieldname]: val } : row
      )
    }));
  };

  const addTableRow = (tableFieldName, childDoctype) => {
    const childFields = (childMetas[childDoctype] || childMetas['Induction Item Detail'] || []);
    const newRow = {};
    childFields.forEach(cf => {
      if (cf.fieldtype === 'Select') {
        const opts = parseSelectOptions(cf.options);
        newRow[cf.fieldname] = opts[0] || '';
      } else if (cf.fieldtype === 'Date') {
        newRow[cf.fieldname] = new Date().toISOString().slice(0, 10);
      } else if (cf.fieldtype === 'Check') {
        newRow[cf.fieldname] = true;
      } else {
        newRow[cf.fieldname] = '';
      }
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

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      doctype: 'Induction',
      ...formData,
      ...tableData,
      analyst: formData.conducted_by || formData.operator || formData.technician || 'Safety Officer',
      verifiedBy: formData.verified_by || 'Manager',
      date: formData.date
    });
  };

  const fieldsList = meta?.fields || [];
  const nonTableFields = fieldsList.filter(f =>
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const tableFields = fieldsList.filter(f =>
    f.fieldtype === 'Table' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );
  const signatureFields = fieldsList.filter(f =>
    f.fieldtype === 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  const renderControlInput = (field, val, onChange, searchFieldKey) => {
    const { fieldtype: fType, fieldname, options, label, reqd } = field;
    if (fieldname === 'amended_from' || fieldname === 'work_order' || field.hidden === 1) return null;

    const EMP_NAMES = ['technician', 'tech1', 'analyst', 'analyst_name', 'conducted_by', 'trainer', 'operator', 'verified_by', 'verifier1', 'performed_by', 'checked_by', 'approved_by', 'received_by', 'endorsed_by', 'prepared_by', 'tested_by'];
    const isEmpTarget = (options === 'Employee' || options === 'User') ||
      EMP_NAMES.includes((fieldname || '').toLowerCase()) ||
      (label || '').toLowerCase().includes('technician') ||
      (label || '').toLowerCase().includes('analyst') ||
      (label || '').toLowerCase().includes('trainer') ||
      (label || '').toLowerCase().includes('conducted by') ||
      (label || '').toLowerCase().includes('verified by');

    if (fType === 'Link' || isEmpTarget) {
      const targetDoctype = options || 'Employee';
      const sKey = searchFieldKey || fieldname;
      const datalistId = `dl_${sKey}`;

      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const empOpts = (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`);
      const combinedOpts = Array.from(new Set([
        ...empOpts,
        ...fetchedOpts
      ])).filter(Boolean);

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={isEmpTarget ? undefined : datalistId}
            className="form-input"
            required={reqd === 1}
            value={val || ''}
            onFocus={(e) => {
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value || '', sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            onChange={(e) => {
              onChange(e.target.value);
              if (isEmpTarget && handleSearchEmployees) {
                handleSearchEmployees(e.target.value, sKey);
                if (setShowEmployeeDropdown) setShowEmployeeDropdown(true);
              }
            }}
            placeholder={`Select / Search ${label || targetDoctype}...`}
          />
          {!isEmpTarget && (
            <datalist id={datalistId}>
              {combinedOpts.map((opt, i) => (
                <option key={i} value={opt} />
              ))}
            </datalist>
          )}

          {isEmpTarget && showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="autocomplete-item"
                  onClick={() => {
                    onChange(emp.employee_name ? `${emp.employee_name} (${emp.name})` : emp.name);
                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{emp.employee_name || emp.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.designation || emp.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (isDatetimeField(fType, field.fieldname, field.label)) {
      const now = new Date();
      const localDT = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return <input type="datetime-local" className="form-input" required={field.reqd === 1} value={val || localDT} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Date') {
      return <input type="date" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Time') {
      return <input type="time" className="form-input" required={field.reqd === 1} value={val || new Date().toTimeString().slice(0, 5)} onChange={e => onChange(e.target.value)} />;
    }
    if (fType === 'Select') {
      const opts = parseSelectOptions(field.options);
      return (
        <select className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select {field.label || 'Option'} --</option>
          {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
        </select>
      );
    }
    if (fType === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (['Small Text', 'Text', 'Long Text'].includes(fType)) {
      return <textarea className="form-input" rows="2" style={{ resize: 'vertical' }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fType)) {
      return <input type="number" step="any" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
    }
    return <input type="text" className="form-input" required={field.reqd === 1} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard Form 39: Induction
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            {loadingMeta && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-muted, #f3f4f6)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Induction"...
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid */}
            {nonTableFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {nonTableFields.map(f => (
                    <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        {f.label} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {renderControlInput(f, formData[f.fieldname], (v) => handleFieldChange(f.fieldname, v), `ind_meta_${f.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Child Table Fields */}
            {tableFields.map(tf => {
              const childDoctype = tf.options || 'Induction Item Detail';
              const childFields = (childMetas[childDoctype] || childMetas['Induction Item Detail'] || []).filter(cf => cf.fieldtype !== 'Section Break' && cf.fieldtype !== 'Column Break' && cf.fieldtype !== 'Fold' && cf.fieldname !== 'amended_from' && cf.fieldname !== 'work_order' && cf.hidden !== 1);
              const rows = tableData[tf.fieldname] || [];

              return (
                <div key={tf.fieldname} style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: 0, fontSize: '13px' }}>
                      📊 {tf.label}
                    </h4>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => addTableRow(tf.fieldname, childDoctype)}
                    >
                      + Add Row
                    </button>
                  </div>

                  {rows.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                      No induction topics added yet. Click "+ Add Row" above to add checklist items.
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
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {childFields.map(cf => (
                                <td key={cf.fieldname} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>
                                  {cf.fieldtype === 'Select' ? (
                                    <select
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    >
                                      <option value="">-- Select --</option>
                                      {parseSelectOptions(cf.options).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : cf.fieldtype === 'Check' ? (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(row[cf.fieldname])}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.checked)}
                                    />
                                  ) : (
                                    <input
                                      type={['Int', 'Float', 'Currency', 'Percent'].includes(cf.fieldtype) ? 'number' : cf.fieldtype === 'Time' ? 'time' : cf.fieldtype === 'Date' ? 'date' : 'text'}
                                      step="any"
                                      className="form-input"
                                      style={{ padding: '4px', fontSize: '11px' }}
                                      value={row[cf.fieldname] || ''}
                                      onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                    />
                                  )}
                                </td>
                              ))}
                              <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                  onClick={() => removeTableRow(tf.fieldname, rowIdx)}
                                >
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

            {/* Signature Fields Section */}
            {signatureFields.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', margin: '0 0 10px 0', fontSize: '13px' }}>✍️ Digital Signatures</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {signatureFields.map(sf => (
                    <div key={sf.fieldname}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>{sf.label}</label>
                      {renderControlInput(sf, formData[sf.fieldname], (v) => handleFieldChange(sf.fieldname, v), `ind_meta_sig_${sf.fieldname}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FormFootnote doctype="Induction" defaultFormNo="Form 39" formTitle="Induction" />
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Induction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const LabForm85Modal = LabForm12Modal;

export default function LaboratoryTab({
  laboratoryRecords,
  labSearchQuery,
  setLabSearchQuery,
  labFilterType,
  setLabFilterType,
  filteredLabRecords,
  labPage,
  setLabPage,
  labViewMode,
  setLabViewMode,
  setActiveLabForm,
  setViewingLabRecord
}) {
  const getLabTotalTests = () => laboratoryRecords.length;

  const getLabMicroCompliance = () => {
    const microRecords = laboratoryRecords.filter(r => r.type.includes('Micro'));
    if (microRecords.length === 0) return 100;
    let passed = 0;
    microRecords.forEach(r => {
      if (r.type === 'Form 1 (Micro raw)') {
        const allAbsent = r.sampleRows?.every(row =>
          String(row.tcc).toLowerCase().includes('absent') || String(row.tcc).toLowerCase().includes('neg') ||
          String(row.ecoli).toLowerCase().includes('absent') || String(row.ecoli).toLowerCase().includes('neg')
        );
        if (allAbsent) passed++;
      } else if (r.type === 'Form 11 (Micro water)') {
        const allAbsent = r.sampleRows?.every(row => {
          const tccPassed = !row.tcc || String(row.tcc).toLowerCase().includes('absent') || String(row.tcc).toLowerCase().includes('neg') || String(row.tcc) === '';
          const ecoliPassed = !row.ecoli || String(row.ecoli).toLowerCase().includes('absent') || String(row.ecoli).toLowerCase().includes('neg') || String(row.ecoli) === '';
          const hpcPassed = Number(row.hpc1 || 0) < 100 && Number(row.hpc2 || 0) < 100;
          return tccPassed && ecoliPassed && hpcPassed;
        });
        if (allAbsent) passed++;
      }
    });
    return Math.round((passed / microRecords.length) * 100);
  };

  const getLabChemCompliance = () => {
    const chemRecords = laboratoryRecords.filter(r => r.type === 'Form 9 (Chemical)');
    if (chemRecords.length === 0) return 100;
    let passed = 0;
    chemRecords.forEach(r => {
      const rawPhVal = Number(r.rawPh || 7.0);
      const rawTdsVal = Number(r.rawTds || 100);
      const prodPhVal = Number(r.prodPh || 7.2);
      const prodTdsVal = Number(r.prodTds || 120);

      const rawPassed = rawPhVal >= 6.5 && rawPhVal <= 8.5 && rawTdsVal >= 50 && rawTdsVal <= 500;
      const prodPassed = prodPhVal >= 6.5 && prodPhVal <= 8.5 && prodTdsVal >= 50 && prodTdsVal <= 500;
      if (rawPassed && prodPassed) passed++;
    });
    return Math.round((passed / chemRecords.length) * 100);
  };

  const microCompliance = getLabMicroCompliance();
  const chemCompliance = getLabChemCompliance();

  return (
    <div className="maintenance-tab-container">
      <div className="tab-title-desc">
        <h2>Laboratory & Quality Control</h2>
        <p>Log and review raw materials microbiological status, chemical properties, water micro-compliance, and visual taste inspections.</p>
      </div>

      {/* Lab Dashboard metrics */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="metric-card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL QUALITY TESTS</span>
            <span style={{ fontSize: '20px' }}>🧪</span>
          </div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>{getLabTotalTests()}</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Logged across all parameters</span>
        </div>

        <div className="metric-card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>MICRO COMPLIANCE</span>
            <span style={{ fontSize: '20px' }}>🧫</span>
          </div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: microCompliance < 90 ? 'var(--danger)' : 'var(--success)' }}>
            {microCompliance}%
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target: 100% Absent E-Coli</span>
        </div>

        <div className="metric-card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>CHEMICAL COMPLIANCE</span>
            <span style={{ fontSize: '20px' }}>📉</span>
          </div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: chemCompliance < 90 ? 'var(--danger)' : 'var(--success)' }}>
            {chemCompliance}%
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>pH (6.5-8.5) & TDS spec</span>
        </div>

        <div className="metric-card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>LAST TEST LOGGED</span>
            <span style={{ fontSize: '20px' }}>🔬</span>
          </div>
          <div className="metric-value" style={{ fontSize: '13px', fontWeight: '800', margin: '14px 0 10px 0', color: 'var(--accent)' }}>
            {laboratoryRecords[0] ? laboratoryRecords[0].timestamp.split(' ')[1] || laboratoryRecords[0].timestamp : 'No entries'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Date: {laboratoryRecords[0] ? laboratoryRecords[0].timestamp.split(' ')[0] : 'N/A'}</span>
        </div>
      </div>

      {/* Lab Forms action sheets grid */}
      <div>
        {(() => {
          const LAB_TEMPLATES = [
            { id: 'form1', icon: '📄', name: 'Form 1: Raw Materials Micro', desc: 'Microbiological analysis of primary packaging raw materials (Preforms, Closures, BIB bags).' },
            { id: 'form9', icon: '📊', name: 'Form 9: Chemical Test', desc: 'pH, TDS levels check for Raw/Product Water, post-CIP levels, and conductivity calibration.' },
            { id: 'form11', icon: '🧫', name: 'Form 11: Water Micro', desc: 'Cultivate SPC Agar incubation, TCC and E-Coli counts for Silver Ion, BH, and 0.45um Filter.' },
            { id: 'form21', icon: '👁️', name: 'Form 21: Taste & Visual', desc: 'Log 4h/36h/72h taste properties and 5d/10d/30d visual particle shelf-life checks.' },
            { id: 'form35', icon: '🍹', name: 'Form 35: Gold Stone Rum & Cola', desc: 'Tank batch records, ingredients checklist (Ethanol, Rum/Lemon/Cola flavours), Brix mixer %, alcohol test, and pH levels.' },
            { id: 'form36', icon: '🥃', name: 'Form 36: Bourbon Whiskey & Cola', desc: 'Tank batch records, ingredients checklist, Brix % checks, alcohol test, and gas pressure.' },
            { id: 'form83', icon: '🧫', name: 'Form 83: Microbiological Analysis', desc: 'Microbiological analysis log sheet for raw materials, water, and finished products.' },
            { id: 'form84', icon: '🧽', name: 'Form 84: Sanitation', desc: 'Sanitation check log sheet for equipment, line CIP, and plant cleanliness.' },
            { id: 'form12', icon: '♨️', name: 'Form 12: Autoclave Record', desc: 'Autoclave sterilization log, pressure, temperature, cycle duration, and indicator checks.' },
            { id: 'form13', icon: '🧫', name: 'Form 13: Media Preparation Record', desc: 'Media and culture agar preparation log, lot/batch numbers, sterilization temp, pH checks, and sterility verification.' },
            { id: 'form64', icon: '🧪', name: 'Form 64: Rinse-Off Test for Raw Materials', desc: 'Rinse-off microbiological testing log for preforms, closures, bottles, and raw material contact surfaces.' },
            { id: 'form72', icon: '📦', name: 'Form 72: Library Sample Record', desc: 'Retention library sample log, bottle size, batch codes, storage location, shelf life, and periodic evaluation.' },
            { id: 'form47', icon: '🔍', name: 'Form 47: Traceability of products', desc: 'Product batch traceability log, raw material lot numbers, water source batch, line assignment, and dispatch tracking.' },
            { id: 'form39', icon: '📝', name: 'Form 39: Induction', desc: 'Employee, visitor, and contractor site safety & hygiene induction log and verification.' },
            { id: 'form86', icon: '🌡️', name: 'Form 86: Incubator Temperature Record', desc: 'Record incubator daily temp & check times for Incubator No. 1 and Incubator No. 2.' },
            { id: 'form88', icon: '⚖️', name: 'Form 88: Weight Check Checklist', desc: 'Execute and log weight checks for finished products (twice daily frequency).' },
            { id: 'form103', icon: '📡', name: 'Form 103: Silver Photometer Log', desc: 'Daily photometer readings for Silver Ion (spec >10ppb) and standard calibration tests.' },
            { id: 'form104', icon: '🥫', name: 'Form 104: Seam Checklist Form', desc: 'Can seam inspection checklist, cover/body thickness, countersink, overlap %, seam height and visual check.' },
            { id: 'form34', icon: '📈', name: 'Form 34: Monitoring', desc: 'Monitoring log sheet for quality checks, parameters, and process control points.' },
            { id: 'form100', icon: '🏭', name: 'Form 100: Production Record Form', desc: 'Daily production batch logs, line speeds, shift metrics, and output counts.' },
            { id: 'form69', icon: '📢', name: 'Form 69: Mock Product Recall', desc: 'Mock product recall exercise details, traceability, recovery %, and incident log.' },
            { id: 'form70', icon: '📝', name: 'Form 70: Recall Review', desc: 'Post-recall review meeting findings, root cause, resolution actions, and cost analysis.' }
          ];

          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Available Daily Quality Checklists</h3>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}
                  onClick={() => setLabViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                >
                  {labViewMode === 'grid' ? '📋 List View' : '🎚️ Grid View'}
                </button>
              </div>

              {labViewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {LAB_TEMPLATES.map(tpl => (
                    <div key={tpl.id} className="template-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>{tpl.icon}</span>
                        <strong style={{ fontSize: '13px' }}>{tpl.name}</strong>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>{tpl.desc}</p>
                      <button className="primary-btn" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => setActiveLabForm(tpl.id)}>📝 Fill Form</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                        <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>Icon</th>
                        <th style={{ padding: '8px', textAlign: 'left', width: '240px' }}>Form Title / Template</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '120px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {LAB_TEMPLATES.map(tpl => (
                        <tr key={tpl.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px', fontSize: '20px', textAlign: 'center' }}>{tpl.icon}</td>
                          <td style={{ padding: '8px', fontWeight: '700' }}>{tpl.name}</td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{tpl.desc}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button className="primary-btn" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setActiveLabForm(tpl.id)}>📝 Fill Form</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Lab Logs register list */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Laboratory Quality Control Register</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              style={{ width: '220px', height: '32px', fontSize: '12px' }}
              placeholder="🔍 Search log by Analyst/ID..."
              value={labSearchQuery}
              onChange={(e) => setLabSearchQuery(e.target.value)}
            />
            <select
              className="form-input"
              style={{ width: '180px', height: '32px', fontSize: '12px' }}
              value={labFilterType}
              onChange={(e) => setLabFilterType(e.target.value)}
            >
              <option value="All">All Form Types</option>
              <option value="Form 1 (Micro raw)">Form 1 (Micro raw)</option>
              <option value="Form 9 (Chemical)">Form 9 (Chemical)</option>
              <option value="Form 11 (Micro water)">Form 11 (Micro water)</option>
              <option value="Form 21 (Taste/Visual)">Form 21 (Taste/Visual)</option>
              <option value="Form 104 (Seam Checklist Form)">Form 104 (Seam Checklist Form)</option>
            </select>
          </div>
        </div>

        {filteredLabRecords.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            No quality control checks found. Select a form card above to submit a new test log.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Log ID</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Form Template</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Analyst</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Verification Status</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Submitted</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLabRecords.slice((labPage - 1) * 20, labPage * 20).map((rec) => {
                    let compliancePass = true;
                    if (rec.type === 'Form 1 (Micro raw)') {
                      compliancePass = rec.sampleRows?.every(row =>
                        String(row.tcc).toLowerCase().includes('absent') && String(row.ecoli).toLowerCase().includes('absent')
                      );
                    } else if (rec.type === 'Form 11 (Micro water)') {
                      compliancePass = rec.sampleRows?.every(row =>
                        (!row.tcc || String(row.tcc).toLowerCase().includes('absent')) &&
                        (!row.ecoli || String(row.ecoli).toLowerCase().includes('absent')) &&
                        Number(row.hpc1 || 0) < 100
                      );
                    } else if (rec.type === 'Form 9 (Chemical)') {
                      const rPh = Number(rec.rawPh || 7.0);
                      const pPh = Number(rec.prodPh || 7.2);
                      compliancePass = rPh >= 6.5 && rPh <= 8.5 && pPh >= 6.5 && pPh <= 8.5;
                    }

                    return (
                      <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ fontWeight: '700', padding: '10px' }}>{rec.id}</td>
                        <td style={{ padding: '10px' }}>
                          <strong>{rec.type}</strong>
                        </td>
                        <td style={{ padding: '10px' }}>👤 {rec.analyst}</td>
                        <td style={{ padding: '10px' }}>
                          <span className={`badge ${compliancePass ? 'badge-completed' : 'badge-failed'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {compliancePass ? '✓ Within Specification' : '⚠️ Action Required'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{rec.timestamp}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => setViewingLabRecord(rec)}
                          >
                            👁️ View Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
              <button
                type="button"
                className="secondary-btn"
                disabled={labPage === 1}
                onClick={() => setLabPage(prev => Math.max(1, prev - 1))}
              >
                ◀ Previous
              </button>
              <span style={{ fontSize: '12px', fontWeight: '600' }}>
                Page {labPage} of {Math.max(1, Math.ceil(filteredLabRecords.length / 20))}
              </span>
              <button
                type="button"
                className="secondary-btn"
                disabled={labPage === Math.max(1, Math.ceil(filteredLabRecords.length / 20))}
                onClick={() => setLabPage(prev => Math.min(Math.max(1, Math.ceil(filteredLabRecords.length / 20)), prev + 1))}
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