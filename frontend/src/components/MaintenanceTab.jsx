import React, { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';

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

export function MaintForm88DynamicModal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    checked_by: '',
    verified_by: '',
    overall_comments: ''
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
        console.log('[MaintForm88DynamicModal] Fetching DocType meta for "Weight Check"...');
        let doctypeMeta = await frappe.getDocTypeMeta('Weight Check');
        if (!doctypeMeta || !doctypeMeta.fields) {
          doctypeMeta = await frappe.getDocTypeMeta('For Weight Check Checklist');
        }
        let fields = doctypeMeta?.fields;

        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'checked_by', label: 'Checked By (Chemist)', fieldtype: 'Link', options: 'Employee' },
            { idx: 3, fieldname: 'verified_by', label: 'Verified By (Supervisor)', fieldtype: 'Link', options: 'Employee' },
            { idx: 4, fieldname: 'product_desc', label: 'Product Description', fieldtype: 'Data' },
            { idx: 5, fieldname: 'weight_1', label: 'Weight Check 1 (g)', fieldtype: 'Float' },
            { idx: 6, fieldname: 'weight_2', label: 'Weight Check 2 (g)', fieldtype: 'Float' },
            { idx: 7, fieldname: 'overall_comments', label: 'Overall Comments / Remarks', fieldtype: 'Small Text' },
            { idx: 8, fieldname: 'weight_check_table', label: 'Weight Check Table', fieldtype: 'Table', options: 'Weight Check Table' }
          ];
        }

        if (isMounted) {
          console.log('📋 WEIGHT CHECK DYNAMIC META:', doctypeMeta);
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
        console.error('[MaintForm88DynamicModal] Error fetching meta fields for Weight Check:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

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
      return rawOptions.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

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
      doctype: 'Weight Check',
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
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>⚖️ Form 88: Weight Check</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Weight check log sheet for finished products and line checks
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', fontSize: '12px' }}>
            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Weight Check"...
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
                            id={`wc88_${field.fieldname}`}
                            checked={!!formData[field.fieldname]}
                            onChange={e => handleFieldChange(field.fieldname, e.target.checked ? 1 : 0)}
                          />
                          <label htmlFor={`wc88_${field.fieldname}`} className="input-label" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>
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

                      const empOpts = isEmpTarget ? (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`) : [];
                      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
                      const combinedOpts = Array.from(new Set([...empOpts, ...fetchedOpts]));
                      const datalistId = `dl_m88_${sKey}`;

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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                            onFocus={() => {
                              if (isEmpTarget) {
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
                                      ) : cf.fieldtype === 'Link' ? (
                                        <>
                                          <input
                                            type="text"
                                            list={`dl_m88_tbl_${cf.fieldname}_${rIdx}`}
                                            className="text-input"
                                            style={{ padding: '4px', fontSize: '11px' }}
                                            value={row[cf.fieldname] || ''}
                                            onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                          />
                                          <datalist id={`dl_m88_tbl_${cf.fieldname}_${rIdx}`}>
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
              {saving ? 'Saving...' : 'Save Weight Check'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MaintForm107Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    shift: 'Morning Shift',
    line_machine: 'Production Line 1',
    product_name: 'Island Chill Mineral Water',
    target_weight: '600',
    measured_weight: '601',
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
        console.log('[MaintForm107Modal] Fetching DocType meta for "Hourly Weight Check Form"...');
        const doctypeMeta = await frappe.getDocTypeMeta('Hourly Weight Check Form');
        let fields = doctypeMeta?.fields;

        if (!fields || fields.length === 0) {
          fields = [
            { idx: 1, fieldname: 'date', label: 'Inspection Date', fieldtype: 'Date' },
            { idx: 2, fieldname: 'time', label: 'Inspection Time', fieldtype: 'Time' },
            { idx: 3, fieldname: 'shift', label: 'Shift', fieldtype: 'Select', options: 'Morning Shift\nAfternoon Shift\nNight Shift' },
            { idx: 4, fieldname: 'work_order', label: 'Work Order', fieldtype: 'Link', options: 'Work Order' },
            { idx: 5, fieldname: 'line_machine', label: 'Production Line / Machine', fieldtype: 'Data' },
            { idx: 6, fieldname: 'product_name', label: 'Product Name', fieldtype: 'Data' },
            { idx: 7, fieldname: 'target_weight', label: 'Target Weight (g)', fieldtype: 'Float' },
            { idx: 8, fieldname: 'measured_weight', label: 'Measured Weight (g)', fieldtype: 'Float' },
            { idx: 9, fieldname: 'min_weight', label: 'Min Weight Limit (g)', fieldtype: 'Float' },
            { idx: 10, fieldname: 'max_weight', label: 'Max Weight Limit (g)', fieldtype: 'Float' },
            { idx: 11, fieldname: 'status', label: 'Weight Status', fieldtype: 'Select', options: 'Pass\nFail\nWithin Specs\nOut of Specs' },
            { idx: 12, fieldname: 'operator', label: 'Operator Name', fieldtype: 'Link', options: 'Employee' },
            { idx: 13, fieldname: 'supervisor', label: 'Supervisor Name', fieldtype: 'Link', options: 'Employee' },
            { idx: 14, fieldname: 'comments', label: 'Notes / Remarks', fieldtype: 'Small Text' }
          ];
        }

        if (isMounted) {
          console.log('📋 HOURLY WEIGHT CHECK FORM DYNAMIC META:', doctypeMeta);
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
        console.error('[MaintForm107Modal] Error fetching meta fields for Hourly Weight Check Form:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, []);

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
      return rawOptions.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

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
      doctype: 'Hourly Weight Check Form',
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
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>⚖️ Form 107: Hourly Weight Check Form</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Hourly container weight verification log, scale readings, and net weight specs
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', fontSize: '12px' }}>
            {loadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>
                ⏳ Syncing meta fields dynamically from ERPNext DocType "Hourly Weight Check Form"...
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
                            id={`hw107_${field.fieldname}`}
                            checked={!!formData[field.fieldname]}
                            onChange={e => handleFieldChange(field.fieldname, e.target.checked ? 1 : 0)}
                          />
                          <label htmlFor={`hw107_${field.fieldname}`} className="input-label" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>
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

                      const empOpts = isEmpTarget ? (employeeList || []).map(e => `${e.employee_name || e.name} (${e.name})`) : [];
                      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
                      const combinedOpts = Array.from(new Set([...empOpts, ...fetchedOpts]));
                      const datalistId = `dl_m107_${sKey}`;

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
                            onChange={e => handleFieldChange(field.fieldname, e.target.value)}
                            onFocus={() => {
                              if (isEmpTarget) {
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
                                      ) : cf.fieldtype === 'Link' ? (
                                        <>
                                          <input
                                            type="text"
                                            list={`dl_m107_tbl_${cf.fieldname}_${rIdx}`}
                                            className="text-input"
                                            style={{ padding: '4px', fontSize: '11px' }}
                                            value={row[cf.fieldname] || ''}
                                            onChange={e => handleTableInputChange(tf.fieldname, rIdx, cf.fieldname, e.target.value)}
                                          />
                                          <datalist id={`dl_m107_tbl_${cf.fieldname}_${rIdx}`}>
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
              {saving ? 'Saving...' : 'Save Hourly Weight Check'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

          {/* Option to clear selection / show all */}
          <div
            onClick={() => onSelect(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              marginBottom: '14px',
              borderRadius: '8px',
              border: '1px dashed var(--accent)',
              backgroundColor: 'rgba(251, 191, 36, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.14)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.06)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🌐</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-heading)' }}>Show All Checklists (No Work Order Filter)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Display all equipment forms across all production lines</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)' }}>View All ›</span>
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
                const lineName = wo.lineNo || wo.custom_production_line || wo.production_line || 'Filling Line 1';
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
                    {/* Production Line Badge */}
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--primary, #2563eb)',
                      whiteSpace: 'nowrap'
                    }}>
                      🏭 {lineName}
                    </span>
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
    if (setMaintWorkOrder) setMaintWorkOrder(wo ? wo.id : '');
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

  const LINE_1_EQUIPMENTS = [
    'air compressor',
    'boiler',
    'syrup and cip equipment',
    'glycol chilling plant & grasso refrigerator'
  ];

  const getTemplateLine = (t) => {
    if (t.production_line) return t.production_line;
    const eq = (t.equipment || t.name || '').toLowerCase().trim();
    const isLine1 = LINE_1_EQUIPMENTS.some(item => eq.includes(item) || item.includes(eq));
    return isLine1 ? 'Filling Line 1' : 'Filling Line 2';
  };

  // When no work order selected -> show all forms; when selected -> only those matching the WO filling line
  const activeTemplates = (MAINTENANCE_TEMPLATES || []).filter(t => {
    if (!globalMaintWO) return true;
    const rawWoLine = (globalMaintWO.lineNo || globalMaintWO.custom_production_line || globalMaintWO.production_line || '').toLowerCase().trim();
    if (!rawWoLine) return true;
    const tplLine = getTemplateLine(t).toLowerCase().trim();
    if (rawWoLine.includes('line 1')) {
      return tplLine.includes('line 1');
    }
    if (rawWoLine.includes('line 2')) {
      return tplLine.includes('line 2');
    }
    return tplLine === rawWoLine;
  });

  const activeWoRecords = globalMaintWO
    ? maintenanceRecords.filter(r => (r.workOrder && r.workOrder === globalMaintWO.id) || (r.work_order && r.work_order === globalMaintWO.id))
    : maintenanceRecords;

  const totalChecklists = activeWoRecords.length;

  const eqCount = activeTemplates.filter(tpl =>
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
  const filteredTemplates = activeTemplates.filter(t => {
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
                  <span style={{
                    display: 'inline-block',
                    marginLeft: '8px',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--primary, #2563eb)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    🏭 {globalMaintWO.lineNo || globalMaintWO.custom_production_line || 'Filling Line'} ({activeTemplates.length} Checklists)
                  </span>
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-heading)' }}>All Checklists View (No Work Order Selected)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Showing all {MAINTENANCE_TEMPLATES.length} equipment checklist forms across Filling Line 1 & Line 2. Select a Work Order to filter by its specific line.</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {globalMaintWO && (
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
              onClick={() => {
                setGlobalMaintWO(null);
                if (setMaintWorkOrder) setMaintWorkOrder('');
              }}
              title="Clear selected Work Order and show all 10 forms"
            >
              ✕ Show All Forms
            </button>
          )}
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600' }}
            onClick={() => setShowWOSelector(true)}
          >
            {globalMaintWO ? '⟳ Change Work Order' : '+ Select Work Order'}
          </button>
        </div>
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
            {`${eqCount} / ${activeTemplates.length}`}
          </div>
          <div className="metric-footer text-success" style={{ fontSize: '11px', color: (eqCount >= activeTemplates.length && activeTemplates.length > 0) ? 'var(--success)' : 'var(--warning)' }}>
            {(eqCount >= activeTemplates.length && activeTemplates.length > 0)
              ? '● All Operational'
              : `● ${Math.max(0, activeTemplates.length - eqCount)} Pending`}
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
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
              Available Daily Preventive Checklists
              {globalMaintWO && (
                <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  ({globalMaintWO.lineNo || globalMaintWO.custom_production_line || 'Selected Line'} • {filteredTemplates.length} Forms)
                </span>
              )}
            </h3>
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

                const originalIdx = MAINTENANCE_TEMPLATES.findIndex(t => t.id === tpl.id || (t.equipment && tpl.equipment && t.equipment.toLowerCase() === tpl.equipment.toLowerCase()));
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

                    const originalIdx = MAINTENANCE_TEMPLATES.findIndex(t => t.id === tpl.id || (t.equipment && tpl.equipment && t.equipment.toLowerCase() === tpl.equipment.toLowerCase()));
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
                              if (setMaintWorkOrder) setMaintWorkOrder(globalMaintWO ? globalMaintWO.id : '');
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

          {/* Form 107: Hourly Weight Check */}
          <div
            className="inv-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div>
              <span className="badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>QUALITY / WEIGHT</span>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>⚖️ Form 107: Hourly Weight Check</h4>
              <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>Log hourly container weight checks, scale readings, and net weight specifications.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button type="button" className="primary-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setActiveMaintForm('form107')}>📝 Fill Form 107</button>
            </div>
          </div>

          {/* Form 88: Weight Check */}
          <div
            className="inv-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div>
              <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>QUALITY / WEIGHT</span>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>⚖️ Form 88: Weight Check</h4>
              <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>Log finished product weight checks, slot samples, and verification logs.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button type="button" className="primary-btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => setActiveMaintForm('form88-dynamic')}>📝 Fill Form 88</button>
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