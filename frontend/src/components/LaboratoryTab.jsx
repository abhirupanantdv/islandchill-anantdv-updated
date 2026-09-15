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

export function LabForm1Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [meta, setMeta] = useState(null);
  const [childMetas, setChildMetas] = useState({});
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
    const fType = field.fieldtype;
    const isEmployeeLink = fType === 'Link' && (
      field.options === 'Employee' ||
      field.options === 'User' ||
      !field.options ||
      ['analyst', 'manager', 'verified_by', 'approved_by', 'prepared_by', 'analyst_name', 'approved_by_name'].includes(field.fieldname) ||
      field.fieldname?.toLowerCase().includes('analyst') ||
      field.fieldname?.toLowerCase().includes('approved') ||
      field.fieldname?.toLowerCase().includes('manager') ||
      field.fieldname?.toLowerCase().includes('verified') ||
      field.fieldname?.toLowerCase().includes('by') ||
      field.label?.toLowerCase().includes('analyst') ||
      field.label?.toLowerCase().includes('approved') ||
      field.label?.toLowerCase().includes('manager') ||
      field.label?.toLowerCase().includes('verified') ||
      field.label?.toLowerCase().includes('by')
    );

    if (isEmployeeLink) {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            required={field.reqd === 1}
            value={val || ''}
            onFocus={(e) => handleSearchEmployees(e.target.value, searchFieldKey)}
            onChange={(e) => { onChange(e.target.value); handleSearchEmployees(e.target.value, searchFieldKey); }}
            placeholder={`Search ${field.label}...`}
          />
          {showEmployeeDropdown && activeSearchField === searchFieldKey && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onClick={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Employee'})
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
    const fType = field.fieldtype;
    const isEmployeeLink = fType === 'Link' && (
      field.options === 'Employee' ||
      field.options === 'User' ||
      !field.options ||
      ['analyst', 'verified_by', 'approved_by', 'prepared_by', 'analyst_name', 'approved_by_name'].includes(field.fieldname) ||
      field.fieldname?.toLowerCase().includes('analyst') ||
      field.fieldname?.toLowerCase().includes('approved') ||
      field.fieldname?.toLowerCase().includes('manager') ||
      field.fieldname?.toLowerCase().includes('verified') ||
      field.fieldname?.toLowerCase().includes('by') ||
      field.label?.toLowerCase().includes('analyst') ||
      field.label?.toLowerCase().includes('approved') ||
      field.label?.toLowerCase().includes('manager') ||
      field.label?.toLowerCase().includes('verified') ||
      field.label?.toLowerCase().includes('by')
    );

    if (isEmployeeLink) {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            required={field.reqd === 1}
            value={val || ''}
            onFocus={(e) => handleSearchEmployees(e.target.value, searchFieldKey)}
            onChange={(e) => { onChange(e.target.value); handleSearchEmployees(e.target.value, searchFieldKey); }}
            placeholder={`Search ${field.label}...`}
          />
          {showEmployeeDropdown && activeSearchField === searchFieldKey && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onClick={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Employee'})
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
      { sample: 'Silver Ion Water', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' },
      { sample: 'BH (Bore Hole) Water', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' },
      { sample: '0.45um Filter Water', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' }
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
            { sample: 'Silver Ion Water', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' },
            { sample: 'BH (Bore Hole) Water', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' },
            { sample: '0.45um Filter Water', tcc: 'Absent', ecoli: 'Absent', hpc1: '0', hpc2: '0', analyst: '' }
          ];
        }

        if (isMounted) {
          setChildMetas(childMetasObj);
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

    if (fieldtype === 'Link') {
      const isEmployeeField =
        options === 'Employee' ||
        options === 'User' ||
        !options ||
        ['analyst', 'approved_by', 'manager', 'verified_by', 'prepared_by', 'analyst_name', 'approved_by_name'].includes(fieldname) ||
        fieldname?.toLowerCase().includes('analyst') ||
        fieldname?.toLowerCase().includes('approved') ||
        fieldname?.toLowerCase().includes('manager') ||
        fieldname?.toLowerCase().includes('verified') ||
        fieldname?.toLowerCase().includes('by') ||
        label?.toLowerCase().includes('analyst') ||
        label?.toLowerCase().includes('approved') ||
        label?.toLowerCase().includes('manager') ||
        label?.toLowerCase().includes('verified') ||
        label?.toLowerCase().includes('by');

      const sKey = searchFieldKey || fieldname;

      if (isEmployeeField) {
        return (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              required={Boolean(reqd)}
              value={value || ''}
              onFocus={(e) => {
                if (handleSearchEmployees) handleSearchEmployees(e.target.value || '', sKey);
              }}
              onChange={(e) => {
                onChange(e.target.value);
                if (handleSearchEmployees) handleSearchEmployees(e.target.value, sKey);
              }}
              placeholder={`Search ${label || options}...`}
            />
            {showEmployeeDropdown && activeSearchField === sKey && employeeList && (
              <div className="autocomplete-dropdown">
                {employeeList.map(emp => (
                  <div key={emp.name} className="dropdown-item" onClick={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); if (setShowEmployeeDropdown) setShowEmployeeDropdown(false); }}>
                    👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                  </div>
                ))}
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
          placeholder={`Select ${options || label}...`}
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
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    if (fieldtype === 'Datetime') {
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
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
    const fType = field.fieldtype;
    const isEmployeeLink = fType === 'Link' && (field.options === 'Employee' || ['approved_by', 'verified_by', 'analyst', 'h4_done_by', 'h36_done_by', 'h72_done_by', 'd5_done_by', 'd10_done_by', 'd30_done_by'].includes(field.fieldname));

    if (isEmployeeLink) {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            required={field.reqd === 1}
            value={val || ''}
            onFocus={(e) => handleSearchEmployees(e.target.value, searchFieldKey)}
            onChange={(e) => { onChange(e.target.value); handleSearchEmployees(e.target.value, searchFieldKey); }}
            placeholder={`Search ${field.label}...`}
          />
          {showEmployeeDropdown && activeSearchField === searchFieldKey && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onClick={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Employee'})
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
  return (
    <div className="modal-backdrop">
      <div className="modal-panel print-report-container" style={{ width: '880px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Water (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Archived QC Laboratory Document Details ({record.id})</span>
          </div>
          <button className="no-print" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ padding: '12px 16px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>QC REPORT TYPE</span>
              <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>{record.type}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textAlign: 'right' }}>LOGGED TIMESTAMP</span>
              <strong>{record.timestamp}</strong>
            </div>
          </div>

          {/* Form 1 raw Micro */}
          {(record.type === 'Form 1 (Micro raw)' || record.doctype === 'Microbiological Analysis of Primary Raw Materials' || record.type?.includes('Form 1')) && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div><strong>Analysis Date:</strong> {record.date}</div>
                <div><strong>Analyst Name:</strong> {record.analyst}</div>
                <div><strong>Operations Manager:</strong> {record.manager || record.verified_by || '-'}</div>
                <div><strong>Preform Lot:</strong> {record.preformLotNo || record.preform_lot_no || '-'}</div>
                <div><strong>Closures Lot:</strong> {record.closuresLotNo || record.closures_lot_no || '-'}</div>
                <div><strong>BIB Inner Bag:</strong> {record.bibInnerBag || record.bib_inner_bag || '-'}</div>
              </div>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Microbiological Cultivation Log</h4>
              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '6px' }}>Sample Description</th>
                    <th style={{ padding: '6px' }}>TCC Status</th>
                    <th style={{ padding: '6px' }}>E-Coli Status</th>
                    <th style={{ padding: '6px' }}>Row Analyst</th>
                    <th style={{ padding: '6px' }}>Incubation In</th>
                    <th style={{ padding: '6px' }}>Incubation Out</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.sampleRows || record.raw_materials_details || []).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px', fontWeight: '700' }}>{row.description}</td>
                      <td style={{ padding: '6px', color: row.tcc === 'Absent' ? 'var(--success)' : 'var(--danger)' }}>{row.tcc}</td>
                      <td style={{ padding: '6px', color: row.ecoli === 'Absent' ? 'var(--success)' : 'var(--danger)' }}>{row.ecoli}</td>
                      <td style={{ padding: '6px' }}>{row.analyst || '-'}</td>
                      <td style={{ padding: '6px' }}>{row.inDate || row.in_date} {row.inTime || row.in_time}</td>
                      <td style={{ padding: '6px' }}>{row.outDate || row.out_date} {row.outTime || row.out_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Form 9 Chemical */}
          {(record.type === 'Form 9 (Chemical)' || record.doctype === 'Chemical Test' || record.type?.includes('Chemical')) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div><strong>Date Logged:</strong> {record.date}</div>
                <div><strong>Analyst:</strong> {record.analyst}</div>
                <div><strong>Verified By:</strong> {record.verifiedBy}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Raw Water Levels</h4>
                  <div><strong>pH level:</strong> {record.rawPh} (at {record.rawPhTime})</div>
                  <div><strong>TDS level:</strong> {record.rawTds} ppm (at {record.rawTdsTime})</div>
                  <div style={{ marginTop: '8px' }}><strong>pH After CIP:</strong> {record.cipPh} (at {record.cipTime})</div>
                </div>
                <div>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Changeover Tests</h4>
                  <div><strong>RTD to CSD Alcohol %:</strong> {record.alcoholCheck}%</div>
                  <div><strong>RTD to Water Brix:</strong> {record.brixCheck}</div>
                </div>
              </div>

              <div>
                <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>3. Product Water PET / BIB</h4>
                <table className="custom-table" style={{ width: '100%', fontSize: '11px', marginBottom: '8px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th>Line / Row</th>
                      <th>pH Level / Time</th>
                      <th>TDS Level (ppm) / Time</th>
                      <th>Taste & Odour Check</th>
                      <th>Visual Particle Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td><strong>Row 1 (PET)</strong></td>
                      <td>{record.prodPh1 || record.prodPh} (at {record.prodPhTime1 || record.prodPhTime})</td>
                      <td>{record.prodTds1 || record.prodTds} ppm (at {record.prodTdsTime1 || record.prodTdsTime})</td>
                      <td>{record.tasteCheck1 || record.tasteCheck} (at {record.tasteTime1 || record.tasteTime})</td>
                      <td>{record.particleCheck1 || record.particleCheck} (at {record.particleTime1 || record.particleTime})</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td><strong>Row 2 (BIB)</strong></td>
                      <td>{record.prodPh2 || record.prodPh || '-'} (at {record.prodPhTime2 || record.prodPhTime || '-'})</td>
                      <td>{record.prodTds2 || record.prodTds || '-'} ppm (at {record.prodTdsTime2 || record.prodTdsTime || '-'})</td>
                      <td>{record.tasteCheck2 || record.tasteCheck || '-'} (at {record.tasteTime2 || record.tasteTime || '-'})</td>
                      <td>{record.particleCheck2 || record.particleCheck || '-'} (at {record.particleTime2 || record.particleTime || '-'})</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Reagent & Instrument Checks</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  <div><strong>pH 4.0:</strong> {record.buffer4}</div>
                  <div><strong>pH 7.0:</strong> {record.buffer7}</div>
                  <div><strong>pH 10.0:</strong> {record.buffer10}</div>
                  <div><strong>Cond. 1413:</strong> {record.cond1413}</div>
                  <div><strong>Standard:</strong> {record.checkStandard}</div>
                </div>
              </div>

              {record.comments && (
                <div>
                  <strong>Comments:</strong> {record.comments}
                </div>
              )}
            </div>
          )}

          {/* Form 11 Water Micro */}
          {(record.type === 'Form 11 (Micro water)' || record.doctype?.includes('Water') || record.type?.includes('11')) && (() => {
            const rows = record.sampleRows || record.water_micro_details || record.raw_materials_details || (Array.isArray(record.sampleRows) ? record.sampleRows : []);
            const sig = record.signature || record.analyst_signature;
            return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div><strong>Analysis Date:</strong> {record.date_of_analysis || record.date}</div>
                  <div><strong>Analyst Name:</strong> {record.analyst}</div>
                  <div><strong>Approved By:</strong> {record.approved_by || record.approvedBy || '-'}</div>
                  <div><strong>Market Area:</strong> {record.market_area || record.market}</div>
                  <div><strong>Product Size:</strong> {record.product_size || record.productSize}</div>
                  <div><strong>Vessel / Lot:</strong> {record.vessel_number || record.vessel}</div>
                  <div><strong>Compact Dry EC Batch:</strong> {record.compact_dry_ec_batch || record.compactDryEC}</div>
                  <div><strong>Pipette Lot:</strong> {record.pipette_lot_no || record.pipetteLot}</div>
                  <div><strong>SPC Agar Date:</strong> {record.spc_agar_prep_date || record.spcAgarDate}</div>
                  <div><strong>Incubator ID:</strong> {record.incubator_no || record.incubatorNo}</div>
                  <div><strong>Incubator Test Type:</strong> {record.incubator_test_type || record.incubatorTestType}</div>
                </div>
                <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Microbiological Cultivation Results</h4>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '6px' }}>Sample Source</th>
                      <th style={{ padding: '6px' }}>TCC</th>
                      <th style={{ padding: '6px' }}>E-Coli</th>
                      <th style={{ padding: '6px' }}>HPC (Count 1)</th>
                      <th style={{ padding: '6px' }}>HPC (Count 2)</th>
                      <th style={{ padding: '6px' }}>Row Analyst</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '6px', fontWeight: '700' }}>{row.sample || row.sample_source || row.description}</td>
                        <td style={{ padding: '6px' }}>{row.tcc}</td>
                        <td style={{ padding: '6px' }}>{row.ecoli}</td>
                        <td style={{ padding: '6px', color: Number(row.hpc1) > 100 ? 'var(--danger)' : '' }}>{row.hpc1} cfu</td>
                        <td style={{ padding: '6px', color: Number(row.hpc2) > 100 ? 'var(--danger)' : '' }}>{row.hpc2} cfu</td>
                        <td style={{ padding: '6px' }}>{row.analyst || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(record.general_observations || record.comments) && (
                  <div style={{ marginTop: '12px' }}>
                    <strong>General Observations:</strong> {record.general_observations || record.comments}
                  </div>
                )}
                {sig && (
                  <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>✍️ Signature Verification:</span>
                    <div style={{ fontFamily: '"Caveat", cursive', fontSize: '20px', color: '#1e3a8a', marginTop: '2px' }}>
                      {sig}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Form 83 Microbiological Analysis */}
          {(record.type?.includes('83') || record.doctype === 'Microbiological Analysis' || record.type === 'Form 83 (Microbiological Analysis)') && (() => {
            const rows = record.microbiological_analysis_details || record.sampleRows || [];
            const sig = record.signature || record.analyst_signature;
            return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div><strong>Date of Analysis:</strong> {record.date_of_analysis || record.date}</div>
                  <div><strong>Analyst Name:</strong> {record.analyst || '-'}</div>
                  <div><strong>Approved By:</strong> {record.approved_by || record.approvedBy || '-'}</div>
                  <div><strong>Sample Type:</strong> {record.sample_type || '-'}</div>
                  <div><strong>Batch / Lot No:</strong> {record.batch_no || '-'}</div>
                </div>
                {rows.length > 0 && (
                  <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Microbiological Analysis Details</h4>
                    <table className="custom-table" style={{ width: '100%' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ padding: '6px' }}>Sample Description</th>
                          <th style={{ padding: '6px' }}>TCC</th>
                          <th style={{ padding: '6px' }}>E-Coli</th>
                          <th style={{ padding: '6px' }}>HPC Count</th>
                          <th style={{ padding: '6px' }}>Result</th>
                          <th style={{ padding: '6px' }}>Tested By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '6px', fontWeight: '700' }}>{row.sample_name || row.sample || '-'}</td>
                            <td style={{ padding: '6px' }}>{row.tcc || '-'}</td>
                            <td style={{ padding: '6px' }}>{row.ecoli || '-'}</td>
                            <td style={{ padding: '6px' }}>{row.hpc_count || '-'}</td>
                            <td style={{ padding: '6px' }}>
                              <span className={`badge ${String(row.result).toLowerCase().includes('pass') ? 'badge-completed' : 'badge-failed'}`} style={{ fontSize: '10px' }}>
                                {row.result || 'Pass'}
                              </span>
                            </td>
                            <td style={{ padding: '6px' }}>{row.analyst || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {(record.remarks || record.comments) && (
                  <div style={{ marginTop: '12px' }}>
                    <strong>General Remarks:</strong> {record.remarks || record.comments}
                  </div>
                )}
                {sig && (
                  <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>✍️ Signature Verification:</span>
                    <div style={{ fontFamily: '"Caveat", cursive', fontSize: '20px', color: '#1e3a8a', marginTop: '2px' }}>
                      {sig}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Form 84 Sanitation */}
          {(record.type?.includes('84') || record.doctype === 'Sanitation Record' || record.type === 'Form 84 (Sanitation)') && (() => {
            const rows = record.sanitation_details || record.sampleRows || [];
            const sig = record.signature || record.operator_signature;
            return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div><strong>Sanitation Date:</strong> {record.sanitation_date || record.date}</div>
                  <div><strong>Operator / Performed By:</strong> {record.operator || record.analyst || '-'}</div>
                  <div><strong>Supervisor / Verified By:</strong> {record.supervisor || record.approvedBy || '-'}</div>
                  <div><strong>Sanitation Type:</strong> {record.sanitation_type || '-'}</div>
                  <div><strong>Line / Section:</strong> {record.line_number || '-'}</div>
                  <div><strong>Chemical Used:</strong> {record.chemical_used || '-'}</div>
                  <div><strong>Contact Time:</strong> {record.contact_time_mins ? `${record.contact_time_mins} mins` : '-'}</div>
                </div>
                {rows.length > 0 && (
                  <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Sanitation Checklist & Items</h4>
                    <table className="custom-table" style={{ width: '100%' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ padding: '6px' }}>Area / Equipment</th>
                          <th style={{ padding: '6px' }}>Cleaning Method</th>
                          <th style={{ padding: '6px' }}>Solution Temp (°C)</th>
                          <th style={{ padding: '6px' }}>Status</th>
                          <th style={{ padding: '6px' }}>Verified By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '6px', fontWeight: '700' }}>{row.area_equipment || '-'}</td>
                            <td style={{ padding: '6px' }}>{row.method || '-'}</td>
                            <td style={{ padding: '6px' }}>{row.temp_c || '-'}</td>
                            <td style={{ padding: '6px' }}>
                              <span className={`badge ${String(row.status).toLowerCase().includes('sat') ? 'badge-completed' : 'badge-failed'}`} style={{ fontSize: '10px' }}>
                                {row.status || 'Satisfactory'}
                              </span>
                            </td>
                            <td style={{ padding: '6px' }}>{row.verified_by || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {(record.remarks || record.comments) && (
                  <div style={{ marginTop: '12px' }}>
                    <strong>Observations / Remarks:</strong> {record.remarks || record.comments}
                  </div>
                )}
                {sig && (
                  <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>✍️ Signature Verification:</span>
                    <div style={{ fontFamily: '"Caveat", cursive', fontSize: '20px', color: '#1e3a8a', marginTop: '2px' }}>
                      {sig}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Form 21 Taste / Visual */}
          {(record.type === 'Form 21 (Taste/Visual)' || record.type === 'Taste Test and Visual Inspection' || record.type?.includes('21')) && (() => {
            const tasteRows = record.taste_test_details || record.tasteRows || [];
            const particleRows = record.particle_count_details || record.particleRows || [];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div><strong>Logged Date:</strong> {record.form_date || record.date}</div>
                  <div><strong>Approved / Verified By:</strong> {record.approved_by || record.verifiedBy || '-'}</div>
                  <div><strong>Revision No:</strong> {record.revision_no || '01'}</div>
                </div>

                {tasteRows.length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Part A: Taste Test Details (4h, 36h, 72h)</h4>
                    <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ padding: '6px' }}>Sample Date</th>
                          <th style={{ padding: '6px' }}>Size</th>
                          <th style={{ padding: '6px' }}>4H Taste</th>
                          <th style={{ padding: '6px' }}>4H Done By</th>
                          <th style={{ padding: '6px' }}>36H Taste</th>
                          <th style={{ padding: '6px' }}>36H Done By</th>
                          <th style={{ padding: '6px' }}>72H Taste</th>
                          <th style={{ padding: '6px' }}>72H Done By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasteRows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '6px' }}>{row.sample_date || row.sampleDate}</td>
                            <td style={{ padding: '6px' }}>{row.sample_size || row.sampleSize}</td>
                            <td style={{ padding: '6px' }}>{row.h4_taste}</td>
                            <td style={{ padding: '6px' }}>{row.h4_done_by || row.h4_doneBy}</td>
                            <td style={{ padding: '6px' }}>{row.h36_taste}</td>
                            <td style={{ padding: '6px' }}>{row.h36_done_by || row.h36_doneBy}</td>
                            <td style={{ padding: '6px' }}>{row.h72_taste}</td>
                            <td style={{ padding: '6px' }}>{row.h72_done_by || row.h72_doneBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {particleRows.length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Part B: Particle Count Details (5d, 10d, 30d)</h4>
                    <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ padding: '6px' }}>Sample Date</th>
                          <th style={{ padding: '6px' }}>Size</th>
                          <th style={{ padding: '6px' }}>5D Particles</th>
                          <th style={{ padding: '6px' }}>5D Done By</th>
                          <th style={{ padding: '6px' }}>10D Particles</th>
                          <th style={{ padding: '6px' }}>10D Done By</th>
                          <th style={{ padding: '6px' }}>30D Particles</th>
                          <th style={{ padding: '6px' }}>30D Done By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {particleRows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '6px' }}>{row.sample_date || row.sampleDate}</td>
                            <td style={{ padding: '6px' }}>{row.sample_size || row.sampleSize}</td>
                            <td style={{ padding: '6px' }}>{row.d5_particle}</td>
                            <td style={{ padding: '6px' }}>{row.d5_done_by || row.d5_doneBy}</td>
                            <td style={{ padding: '6px' }}>{row.d10_particle}</td>
                            <td style={{ padding: '6px' }}>{row.d10_done_by || row.d10_doneBy}</td>
                            <td style={{ padding: '6px' }}>{row.d30_particle}</td>
                            <td style={{ padding: '6px' }}>{row.d30_done_by || row.d30_doneBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Form 36 Bourbon Whiskey & Cola */}
          {record.type === 'Form 36 (Bourbon/Cola)' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div><strong>Log Date:</strong> {record.date}</div>
                <div><strong>Tank No:</strong> {record.tankNo}</div>
                <div><strong>Volume:</strong> {record.volume}</div>
                <div><strong>Prepared By:</strong> {record.preparedBy}</div>
                <div><strong>Verified By:</strong> {record.verifiedBy}</div>
                <div><strong>Lab Alc %:</strong> {record.labAlc}% (Analysed: {record.analysedBy})</div>
                <div><strong>Tank pH:</strong> {record.tankPh}</div>
                <div><strong>Finished pH:</strong> {record.finishedPh}</div>
              </div>

              <h4 style={{ color: 'var(--accent)', marginBottom: '4px' }}>Batch Recipe Checklist</h4>
              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th>Ingredient Description</th>
                    <th>Standard Qty (2000L)</th>
                    <th>Lot / Batch No.</th>
                    <th>Added Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td>Bourbon</td>
                    <td>42Kg (46L)</td>
                    <td>{record.bourbonLot}</td>
                    <td>✅ Added</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td>Ethanol</td>
                    <td>125Kg (158.5L)</td>
                    <td>{record.ethanolLot}</td>
                    <td>✅ Added</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td>Aged Cola Flavour</td>
                    <td>2.0Kg</td>
                    <td>{record.agedColaLot}</td>
                    <td>✅ Added</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td>Cola Flavour</td>
                    <td>3.6Kg</td>
                    <td>{record.colaFlavourLot}</td>
                    <td>✅ Added</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td>Cola Acidulant</td>
                    <td>1.0Kg</td>
                    <td>{record.acidulantLot}</td>
                    <td>✅ Added</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td>Sodium Benzoate</td>
                    <td>0.4Kg</td>
                    <td>{record.benzoateLot}</td>
                    <td>✅ Added</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td>Sugar</td>
                    <td>150Kg</td>
                    <td>{record.sugarLot}</td>
                    <td>✅ Added</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div><strong>Brix % Mixer:</strong> {record.brixMixer}% (Taken by: {record.brixMixerBy})</div>
                <div><strong>Brix % Product:</strong> {record.brixProduct}% (Taken by: {record.brixProductBy})</div>
                <div><strong>Gas Level:</strong> {record.gasLevel}</div>
              </div>

              {record.comments && (
                <div><strong>Comments:</strong> {record.comments}</div>
              )}
            </div>
          )}

          {/* Form 35 Gold Stone Rum & Cola */}
          {(record.type === 'Form 35: Gold Stone Rum & Cola' || record.type === 'Gold Stone Rum and Cola' || record.type?.includes('35')) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div><strong>Log Date:</strong> {record.date}</div>
                <div><strong>Tank No:</strong> {record.tankNo}</div>
                <div><strong>Volume:</strong> {record.volume}</div>
                <div><strong>Prepared By:</strong> {record.preparedBy}</div>
                <div><strong>Verified By:</strong> {record.verifiedBy}</div>
                <div><strong>Lab Alc %:</strong> {record.labAlc}% (Analysed: {record.analysedBy})</div>
                <div><strong>Tank pH:</strong> {record.tankPh}</div>
                <div><strong>Finished pH:</strong> {record.finishedPh}</div>
              </div>

              <h4 style={{ color: 'var(--accent)', marginBottom: '4px' }}>Ingredients Checklist</h4>
              <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ width: '40px' }}>No.</th>
                    <th>Item</th>
                    <th>Standard Qty</th>
                    <th>UOM</th>
                    <th>Lot/Batch No</th>
                    <th>Added Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.ingredients || []).map((ing, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{idx + 1}</td>
                      <td><strong>{ing.item}</strong></td>
                      <td>{ing.standardQty}</td>
                      <td>{ing.uom}</td>
                      <td>{ing.lotBatchNo || '-'}</td>
                      <td>{ing.addedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div><strong>Sugar Required (Kg):</strong> {record.sugarRequired}</div>
                <div><strong>Sugar Added (Kg):</strong> {record.sugarAdded}</div>
                <div><strong>Brix % Mixer:</strong> {record.brixMixer}%</div>
              </div>

              {record.comments && (
                <div><strong>Comments:</strong> {record.comments}</div>
              )}
            </div>
          )}

          {/* Form 104 Seam Checklist Form */}
          {(record.type === 'Form 104 (Seam Checklist Form)' || record.type === 'Form 104: Seam Checklist Form' || record.doctype === 'Seam Checklist Form' || record.type?.includes('104')) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div><strong>Date:</strong> {record.date || record.posting_date}</div>
                <div><strong>Line / Machine:</strong> {record.linemachine || record.line_no || 'Line 1'}</div>
                <div><strong>Product:</strong> {record.product || '-'}</div>
                <div><strong>Shift:</strong> {record.shift || '-'}</div>
                <div><strong>Operator / Supervisor:</strong> {record.operatorsupervisor || record.inspector || '-'}</div>
                <div><strong>Verified By:</strong> {record.verified_by || record.supervisor || '-'}</div>
                <div><strong>Approved By:</strong> {record.approved_by || '-'}</div>
                <div><strong>Revision No:</strong> {record.revision_no || '-'}</div>
              </div>

              {record.comments && <div><strong>Comments:</strong> {record.comments}</div>}

              {(record.seam_checks || record.seam_rows) && (record.seam_checks || record.seam_rows).length > 0 && (
                <>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '4px' }}>Seam Inspection Details (Seam Checks Table)</h4>
                  <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th>Time</th>
                        <th>Can Size</th>
                        <th>Head #</th>
                        <th>Countersink</th>
                        <th>Seam Thickness</th>
                        <th>Seam Length</th>
                        <th>Body Hook</th>
                        <th>Cover Hook</th>
                        <th>Overlap</th>
                        <th>Overlap %</th>
                        <th>Tightness %</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(record.seam_checks || record.seam_rows).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td>{row.time || '-'}</td>
                          <td>{row.can_size || '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>{row.head_no || idx + 1}</td>
                          <td>{row.countersink || row.countersink_mm}</td>
                          <td>{row.seam_thickness || row.seam_thickness_mm}</td>
                          <td>{row.seam_length || row.seam_height_length_mm}</td>
                          <td>{row.body_hook || row.body_hook_mm}</td>
                          <td>{row.cover_hook || row.cover_hook_mm}</td>
                          <td>{row.overlap || row.overlap_mm}</td>
                          <td>{row.overlap_pct || row.overlap_percentage}%</td>
                          <td>{row.tightness_pct || row.tightness_wrinkle_pct}%</td>
                          <td>
                            <span style={{ color: (row.status || 'Pass') === 'Pass' ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                              {row.status || 'Pass'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* Form 86 Incubator Temperature Record */}
          {(record.type === 'Form 86: Incubator Temperature Record' || record.type === 'Incubator Temperature Record' || record.type?.includes('86')) && (() => {
            const tableRows = record.table_wahj || record.rows || record.incubator_checks || [];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div><strong>Log Date:</strong> {record.posting_date || record.date}</div>
                  <div><strong>Checked By:</strong> {record.checked_by || record.recordedBy || record.cleaner || 'Analyst'}</div>
                  <div><strong>Verified By:</strong> {record.verified_by || record.verifiedBy || record.supervisor || '-'}</div>
                </div>

                {tableRows.length > 0 ? (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--accent)' }}>📊 Incubator Temperature Check</h4>
                    <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ padding: '6px', textAlign: 'center' }}>#</th>
                        <th style={{ padding: '6px' }}>Check No.</th>
                        <th style={{ padding: '6px' }}>Incubator No.</th>
                        <th style={{ padding: '6px', textAlign: 'center' }}>Check Time</th>
                        <th style={{ padding: '6px', textAlign: 'center' }}>Thermometer Reading</th>
                        <th style={{ padding: '6px', textAlign: 'center' }}>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700' }}>{idx + 1}</td>
                          <td style={{ padding: '6px' }}>{row.check_no || row.checkNo || idx + 1}</td>
                          <td style={{ padding: '6px' }}>{row.incubator_no || row.incubatorNo || `Incubator ${idx + 1}`}</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{row.time || '-'}</td>
                          <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700' }}>{row.thermometer_reading || row.reading || '-'}</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{row.unit || '°C'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '14px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-heading)' }}>🌡️ Incubator No. 1</h4>
                      <div><strong>Check Time:</strong> {record.time || '12:00'}</div>
                      <div><strong>Thermometer Reading:</strong> {record.incubator_1 || '-'} °C</div>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-heading)' }}>🌡️ Incubator No. 2</h4>
                      <div><strong>Check Time:</strong> {record.time_2 || '12:00'}</div>
                      <div><strong>Thermometer Reading:</strong> {record.incubator_2 || '-'} °C</div>
                    </div>
                  </div>
                )}

                {(record.comments || record.remarks) && (
                  <div><strong>Observations / Remarks:</strong> {record.comments || record.remarks}</div>
                )}
              </div>
            );
          })()}

          {/* Form 88 Weight Check Checklist */}
          {(record.type === 'Form 88: Weight Check Checklist' || record.type === 'Standard Form 88: Weight Check' || record.type?.includes('88') || record.type?.includes('Weight Check')) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderLeft: '4px solid var(--accent)', color: 'var(--text-heading)' }}>
                <strong>Weight Check frequency:</strong> Weight Check frequency is twice per Day.
              </div>

              <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ width: '50px' }}>Slot</th>
                    <th style={{ width: '110px' }}>Date</th>
                    <th>Checked By</th>
                    <th>Verified By</th>
                    <th>Product Description</th>
                    <th style={{ width: '80px' }}>Weight 1</th>
                    <th style={{ width: '80px' }}>Weight 2</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.rows || []).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>#{idx + 1}</td>
                      <td>{row.date}</td>
                      <td>{row.checkedBy || '-'}</td>
                      <td>{row.verifiedBy || '-'}</td>
                      <td><strong>{row.productDesc}</strong></td>
                      <td>{row.weight1}</td>
                      <td>{row.weight2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {record.overallComments && (
                <div><strong>Overall Comments / Remarks:</strong> {record.overallComments}</div>
              )}
            </div>
          )}

          {/* Form 103 Silver Photometer Log */}
          {record.type === 'Form 103 (Silver Log)' && (() => {
            const hasFailure = record.sets?.some(s => s.rows?.some(r => Number(r.reading) < 10));
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {hasFailure && (
                  <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '11px', fontWeight: '700', borderRadius: '6px' }}>
                    ⚠️ Warning: One or more Silver Ion photometer readings are below acceptance spec level (minimum 10ppb).
                  </div>
                )}

                {record.sets?.map((set, sIdx) => (
                  <div key={sIdx} style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '8px' }}>
                      <div><strong>Date Set {sIdx + 1}:</strong> {set.date}</div>
                      <div><strong>Technician:</strong> {set.technician}</div>
                      <div><strong>Verified By:</strong> {set.verifiedBy}</div>
                    </div>
                    <table className="custom-table" style={{ width: '100%', marginBottom: '8px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ padding: '6px' }}>Sample Point</th>
                          <th style={{ padding: '6px', textAlign: 'center' }}>Time</th>
                          <th style={{ padding: '6px', textAlign: 'center' }}>Silver Ion Reading (ppb)</th>
                          <th style={{ padding: '6px', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {set.rows?.map((row, rIdx) => {
                          const isFailed = Number(row.reading) < 10;
                          return (
                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '6px', fontWeight: '600' }}>{row.sample}</td>
                              <td style={{ padding: '6px', textAlign: 'center' }}>{row.time}</td>
                              <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', color: isFailed ? 'var(--danger)' : '' }}>{row.reading} ppb</td>
                              <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', color: isFailed ? 'var(--danger)' : 'var(--success)' }}>
                                {isFailed ? '⚠️ Fail (<10ppb)' : 'Pass'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div><strong>Calibration record notes:</strong> {set.calibration || '-'}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {record.overallComments && (
            <div style={{ marginTop: '16px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', marginBottom: '16px' }}>
              <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OVERALL COMMENTS / REMARKS</strong>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-heading)' }}>{record.overallComments}</div>
            </div>
          )}

        </div>
        <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="primary-btn" onClick={() => setEmailModal({ reportId: record.id, reportType: record.type || 'QC Report' })} style={{ backgroundColor: '#a27b5c', borderColor: '#a27b5c' }}>📧 Send Email</button>
          <button type="button" className="primary-btn" onClick={() => window.print()} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>🖨️ Print Report</button>
          <button type="button" className="secondary-btn" onClick={onClose}>Close Report</button>
        </div>
      </div>
    </div>
  );
}


export function LabForm36Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [tankNo, setTankNo] = useState('Tank 1');
  const [volume, setVolume] = useState('2000L');
  const [preparedBy, setPreparedBy] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [labAlc, setLabAlc] = useState('5.0');
  const [analysedBy, setAnalysedBy] = useState('');
  const [tankPh, setTankPh] = useState('3.8');
  const [finishedPh, setFinishedPh] = useState('3.8');

  const [bourbonLot, setBourbonLot] = useState('');
  const [ethanolLot, setEthanolLot] = useState('');
  const [agedColaLot, setAgedColaLot] = useState('');
  const [colaFlavourLot, setColaFlavourLot] = useState('');
  const [acidulantLot, setAcidulantLot] = useState('');
  const [benzoateLot, setBenzoateLot] = useState('');
  const [sugarLot, setSugarLot] = useState('');

  const [brixMixer, setBrixMixer] = useState('11.2');
  const [brixMixerBy, setBrixMixerBy] = useState('');
  const [brixProduct, setBrixProduct] = useState('11.4');
  const [brixProductBy, setBrixProductBy] = useState('');
  const [gasLevel, setGasLevel] = useState('2.8');
  const [comments, setComments] = useState('');

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      date, tankNo, volume, preparedBy, verifiedBy, labAlc, analysedBy, tankPh, finishedPh,
      bourbonLot, ethanolLot, agedColaLot, colaFlavourLot, acidulantLot, benzoateLot, sugarLot,
      brixMixer, brixMixerBy, brixProduct, brixProductBy, gasLevel, comments,
      analyst: preparedBy
    });
  };

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Date of Batch</label>
                <input type="date" className="form-input" required min={new Date().toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Tank Number</label>
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
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Lab Report Analysed By *</label>
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
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Tank pH</label>
                <input type="number" step="0.1" className="form-input" value={tankPh} onChange={e => setTankPh(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Finished Product pH</label>
                <input type="number" step="0.1" className="form-input" value={finishedPh} onChange={e => setFinishedPh(e.target.value)} />
              </div>
            </div>

            <div>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Batch Recipe Checklist</h4>
              <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th>Ingredient Description</th>
                    <th>Standard Qty (2000L)</th>
                    <th>Lot / Batch No. *</th>
                    <th>Added Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Bourbon</td>
                    <td>42Kg (46L)</td>
                    <td><input type="text" className="form-input" style={{ height: '28px' }} required value={bourbonLot} onChange={e => setBourbonLot(e.target.value)} placeholder="Bourbon batch lot" /></td>
                    <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>✓ Confirmed Added</span></td>
                  </tr>
                  <tr>
                    <td>Ethanol</td>
                    <td>125Kg (158.5L)</td>
                    <td><input type="text" className="form-input" style={{ height: '28px' }} required value={ethanolLot} onChange={e => setEthanolLot(e.target.value)} placeholder="Ethanol batch lot" /></td>
                    <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>✓ Confirmed Added</span></td>
                  </tr>
                  <tr>
                    <td>Aged Cola Flavour</td>
                    <td>2.0Kg</td>
                    <td><input type="text" className="form-input" style={{ height: '28px' }} required value={agedColaLot} onChange={e => setAgedColaLot(e.target.value)} placeholder="Aged Cola batch lot" /></td>
                    <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>✓ Confirmed Added</span></td>
                  </tr>
                  <tr>
                    <td>Cola Flavour</td>
                    <td>3.6Kg</td>
                    <td><input type="text" className="form-input" style={{ height: '28px' }} required value={colaFlavourLot} onChange={e => setColaFlavourLot(e.target.value)} placeholder="Cola Flavour lot" /></td>
                    <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>✓ Confirmed Added</span></td>
                  </tr>
                  <tr>
                    <td>Cola Acidulant</td>
                    <td>1.0Kg</td>
                    <td><input type="text" className="form-input" style={{ height: '28px' }} required value={acidulantLot} onChange={e => setAcidulantLot(e.target.value)} placeholder="Acidulant lot" /></td>
                    <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>✓ Confirmed Added</span></td>
                  </tr>
                  <tr>
                    <td>Sodium Benzoate</td>
                    <td>0.4Kg</td>
                    <td><input type="text" className="form-input" style={{ height: '28px' }} required value={benzoateLot} onChange={e => setBenzoateLot(e.target.value)} placeholder="Benzoate lot" /></td>
                    <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>✓ Confirmed Added</span></td>
                  </tr>
                  <tr>
                    <td>Sugar</td>
                    <td>150Kg</td>
                    <td><input type="text" className="form-input" style={{ height: '28px' }} required value={sugarLot} onChange={e => setSugarLot(e.target.value)} placeholder="Sugar lot" /></td>
                    <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>✓ Confirmed Added</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px' }}>Brix Mixer %</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="number" step="0.1" className="form-input" value={brixMixer} onChange={e => setBrixMixer(e.target.value)} />
                  <input type="text" className="form-input" placeholder="By" value={brixMixerBy} onChange={e => setBrixMixerBy(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px' }}>Brix Finished Product %</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="number" step="0.1" className="form-input" value={brixProduct} onChange={e => setBrixProduct(e.target.value)} />
                  <input type="text" className="form-input" placeholder="By" value={brixProductBy} onChange={e => setBrixProductBy(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px' }}>Gas Level</label>
                <input type="number" step="0.1" className="form-input" value={gasLevel} onChange={e => setGasLevel(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px' }}>Comments</label>
              <textarea className="form-input" style={{ minHeight: '50px', padding: '6px' }} value={comments} onChange={e => setComments(e.target.value)} placeholder="Remarks..." />
            </div>

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
    const fType = field.fieldtype;
    const isEmployeeLink = fType === 'Link' && (field.options === 'Employee' || ['checked_by', 'verified_by', 'approved_by', 'recorded_by', 'analyst', 'supervisor'].includes(field.fieldname));

    if (isEmployeeLink) {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            required={field.reqd === 1}
            value={val || ''}
            onFocus={(e) => handleSearchEmployees(e.target.value, searchFieldKey)}
            onChange={(e) => { onChange(e.target.value); handleSearchEmployees(e.target.value, searchFieldKey); }}
            placeholder={`Search ${field.label}...`}
          />
          {showEmployeeDropdown && activeSearchField === searchFieldKey && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onClick={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Employee'})
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

        // Clean label formatting (remove bracketed descriptors e.g. "(ppb)")
        fields = fields.map(f => ({
          ...f,
          label: (f.label || f.fieldname).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
        }));

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
    const fType = field.fieldtype;
    const isEmployeeLink = fType === 'Link' && (field.options === 'Employee' || ['technician', 'tech1', 'verified_by', 'verifier1', 'analyst', 'manager'].includes(field.fieldname));

    if (isEmployeeLink) {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            required={field.reqd === 1}
            value={val || ''}
            onFocus={(e) => handleSearchEmployees(e.target.value, searchFieldKey)}
            onChange={(e) => { onChange(e.target.value); handleSearchEmployees(e.target.value, searchFieldKey); }}
            placeholder={`Search ${field.label}...`}
          />
          {showEmployeeDropdown && activeSearchField === searchFieldKey && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onClick={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Employee'})
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
        if (isMounted) setChildMetas(childMetasObj);
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
    const fType = field.fieldtype;
    const isEmployeeLink = fType === 'Link' && (field.options === 'Employee' || ['operatorsupervisor', 'verified_by', 'approved_by'].includes(field.fieldname));

    if (isEmployeeLink) {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            required={field.reqd === 1}
            value={val || ''}
            onFocus={(e) => handleSearchEmployees(e.target.value, searchFieldKey)}
            onChange={(e) => { onChange(e.target.value); handleSearchEmployees(e.target.value, searchFieldKey); }}
            placeholder={`Search ${field.label}...`}
          />
          {showEmployeeDropdown && activeSearchField === searchFieldKey && (
            <div className="autocomplete-dropdown">
              {employeeList.map(emp => (
                <div
                  key={emp.name}
                  className="dropdown-item"
                  onClick={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}
                >
                  👤 {emp.employee_name || emp.name} ({emp.designation || 'Employee'})
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

    if (fieldtype === 'Link') {
      const isEmployeeField =
        options === 'Employee' ||
        options === 'User' ||
        !options ||
        ['analyst', 'approved_by', 'manager', 'verified_by', 'prepared_by', 'analyst_name', 'approved_by_name'].includes(fieldname) ||
        fieldname?.toLowerCase().includes('analyst') ||
        fieldname?.toLowerCase().includes('approved') ||
        fieldname?.toLowerCase().includes('manager') ||
        fieldname?.toLowerCase().includes('verified') ||
        fieldname?.toLowerCase().includes('by') ||
        label?.toLowerCase().includes('analyst') ||
        label?.toLowerCase().includes('approved') ||
        label?.toLowerCase().includes('manager') ||
        label?.toLowerCase().includes('verified') ||
        label?.toLowerCase().includes('by');

      const sKey = searchFieldKey || fieldname;

      if (isEmployeeField) {
        return (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              required={Boolean(reqd)}
              value={value || ''}
              onFocus={(e) => {
                if (handleSearchEmployees) handleSearchEmployees(e.target.value || '', sKey);
              }}
              onChange={(e) => {
                onChange(e.target.value);
                if (handleSearchEmployees) handleSearchEmployees(e.target.value, sKey);
              }}
              placeholder={`Search ${label || options}...`}
            />
            {showEmployeeDropdown && activeSearchField === sKey && employeeList && (
              <div className="autocomplete-dropdown">
                {employeeList.map(emp => (
                  <div key={emp.name} className="dropdown-item" onClick={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); if (setShowEmployeeDropdown) setShowEmployeeDropdown(false); }}>
                    👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                  </div>
                ))}
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
          placeholder={`Select ${options || label}...`}
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

    if (fieldtype === 'Datetime') {
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
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
      const isEmployeeField =
        options === 'Employee' ||
        options === 'User' ||
        !options ||
        ['analyst', 'approved_by', 'manager', 'verified_by', 'prepared_by', 'operator', 'supervisor'].includes(fieldname) ||
        fieldname?.toLowerCase().includes('analyst') ||
        fieldname?.toLowerCase().includes('approved') ||
        fieldname?.toLowerCase().includes('manager') ||
        fieldname?.toLowerCase().includes('verified') ||
        fieldname?.toLowerCase().includes('by') ||
        label?.toLowerCase().includes('analyst') ||
        label?.toLowerCase().includes('approved') ||
        label?.toLowerCase().includes('manager') ||
        label?.toLowerCase().includes('verified') ||
        label?.toLowerCase().includes('by');

      const sKey = searchFieldKey || fieldname;

      if (isEmployeeField) {
        return (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              required={Boolean(reqd)}
              value={value || ''}
              onFocus={(e) => {
                if (handleSearchEmployees) handleSearchEmployees(e.target.value || '', sKey);
              }}
              onChange={(e) => {
                onChange(e.target.value);
                if (handleSearchEmployees) handleSearchEmployees(e.target.value, sKey);
              }}
              placeholder={`Search ${label || options}...`}
            />
            {showEmployeeDropdown && activeSearchField === sKey && employeeList && (
              <div className="autocomplete-dropdown">
                {employeeList.map(emp => (
                  <div key={emp.name} className="dropdown-item" onClick={() => { onChange(`${emp.employee_name || emp.name} (${emp.name})`); if (setShowEmployeeDropdown) setShowEmployeeDropdown(false); }}>
                    👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                  </div>
                ))}
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
          placeholder={`Select ${options || label}...`}
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

    if (fieldtype === 'Datetime') {
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={Boolean(reqd)}
          value={value || ''}
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

                    if (field.fieldtype === 'Link' && field.options === 'Employee') {
                      const sKey = `lab_${field.fieldname}`;
                      return (
                        <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <input
                            type="text"
                            className="text-input"
                            placeholder="Type to search employee..."
                            value={formData[field.fieldname] || ''}
                            onFocus={(e) => {
                              if (handleSearchEmployees) handleSearchEmployees(e.target.value || '', sKey);
                            }}
                            onChange={(e) => {
                              handleFieldChange(field.fieldname, e.target.value);
                              if (handleSearchEmployees) handleSearchEmployees(e.target.value, sKey);
                            }}
                          />
                          {showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
                            <ul className="dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxH: '150px', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                              {employeeList.map(emp => (
                                <li
                                  key={emp.name}
                                  style={{ padding: '6px 10px', cursor: 'pointer' }}
                                  onClick={() => {
                                    handleFieldChange(field.fieldname, `${emp.employee_name} (${emp.name})`);
                                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                                  }}
                                >
                                  {emp.employee_name} ({emp.name})
                                </li>
                              ))}
                            </ul>
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

                    if (field.fieldtype === 'Link' && field.options === 'Employee') {
                      const sKey = `lab_${field.fieldname}`;
                      return (
                        <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <input
                            type="text"
                            className="text-input"
                            placeholder="Type to search employee..."
                            value={formData[field.fieldname] || ''}
                            onFocus={(e) => {
                              if (handleSearchEmployees) handleSearchEmployees(e.target.value || '', sKey);
                            }}
                            onChange={(e) => {
                              handleFieldChange(field.fieldname, e.target.value);
                              if (handleSearchEmployees) handleSearchEmployees(e.target.value, sKey);
                            }}
                          />
                          {showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
                            <ul className="dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxH: '150px', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                              {employeeList.map(emp => (
                                <li
                                  key={emp.name}
                                  style={{ padding: '6px 10px', cursor: 'pointer' }}
                                  onClick={() => {
                                    handleFieldChange(field.fieldname, `${emp.employee_name} (${emp.name})`);
                                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                                  }}
                                >
                                  {emp.employee_name} ({emp.name})
                                </li>
                              ))}
                            </ul>
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

                    if (field.fieldtype === 'Link' && field.options === 'Employee') {
                      const sKey = `lab_${field.fieldname}`;
                      return (
                        <div key={field.fieldname} className="form-group" style={{ position: 'relative' }}>
                          <label className="input-label" style={{ fontWeight: '600' }}>
                            {field.label} {field.reqd ? '*' : ''}
                          </label>
                          <input
                            type="text"
                            className="text-input"
                            placeholder="Type to search employee..."
                            value={formData[field.fieldname] || ''}
                            onFocus={(e) => {
                              if (handleSearchEmployees) handleSearchEmployees(e.target.value || '', sKey);
                            }}
                            onChange={(e) => {
                              handleFieldChange(field.fieldname, e.target.value);
                              if (handleSearchEmployees) handleSearchEmployees(e.target.value, sKey);
                            }}
                          />
                          {showEmployeeDropdown && activeSearchField === sKey && employeeList && employeeList.length > 0 && (
                            <ul className="dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxH: '150px', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                              {employeeList.map(emp => (
                                <li
                                  key={emp.name}
                                  style={{ padding: '6px 10px', cursor: 'pointer' }}
                                  onClick={() => {
                                    handleFieldChange(field.fieldname, `${emp.employee_name} (${emp.name})`);
                                    if (setShowEmployeeDropdown) setShowEmployeeDropdown(false);
                                  }}
                                >
                                  {emp.employee_name} ({emp.name})
                                </li>
                              ))}
                            </ul>
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
            { id: 'form21', icon: '👅', name: 'Form 21: Taste & Visual', desc: 'Log 4h/36h/72h taste properties and 5d/10d/30d visual particle shelf-life checks.' },
            { id: 'form35', icon: '🍹', name: 'Form 35: Gold Stone Rum & Cola', desc: 'Tank batch records, ingredients checklist (Ethanol, Rum/Lemon/Cola flavours), Brix mixer %, alcohol test, and pH levels.' },
            { id: 'form36', icon: '🥃', name: 'Form 36: Bourbon Whiskey & Cola', desc: 'Tank batch records, ingredients checklist, Brix % checks, alcohol test, and gas pressure.' },
            { id: 'form83', icon: '🧫', name: 'Form 83: Microbiological Analysis', desc: 'Microbiological analysis log sheet for raw materials, water, and finished products.' },
            { id: 'form84', icon: '🧽', name: 'Form 84: Sanitation', desc: 'Sanitation check log sheet for equipment, line CIP, and plant cleanliness.' },
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