import React, { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';

export function LabForm1Modal({ onClose, onSubmit, saving, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [analyst, setAnalyst] = useState('');
  const [manager, setManager] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [preformLotNo, setPreformLotNo] = useState('');
  const [closuresLotNo, setClosuresLotNo] = useState('');
  const [bibInnerBag, setBibInnerBag] = useState('');
  const [isCheckedSpec, setIsCheckedSpec] = useState(false);
  const [sampleRows, setSampleRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTestTypes() {
      try {
        const list = await frappe.getIncubatorTestTypes();
        if (list && list.length > 0) {
          const rows = list.map(item => ({
            description: item.test_type,
            tcc: 'Absent',
            ecoli: 'Absent',
            analyst: '',
            inDate: new Date().toISOString().slice(0, 10),
            inTime: '10:00',
            outDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            outTime: '10:00'
          }));
          setSampleRows(rows);
        } else {
          // Fallback to static defaults
          const defaultTypes = ['PET Preforms (Raw)', 'HDPE Closures (Raw)', 'BIB Inner Bag / Film (Raw)'];
          const rows = defaultTypes.map(type => ({
            description: type,
            tcc: 'Absent',
            ecoli: 'Absent',
            analyst: '',
            inDate: new Date().toISOString().slice(0, 10),
            inTime: '10:00',
            outDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            outTime: '10:00'
          }));
          setSampleRows(rows);
        }
      } catch (err) {
        console.error("Failed to load incubator test types:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTestTypes();
  }, []);

  const handleRowChange = (idx, key, val) => {
    setSampleRows(prev => prev.map((row, rIdx) => rIdx === idx ? { ...row, [key]: val } : row));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      analyst,
      manager,
      date,
      preformLotNo,
      closuresLotNo,
      bibInnerBag,
      sampleRows,
      specChecked: isCheckedSpec
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 1: Microbiological Analysis of Primary Raw Materials</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date of Analysis</label>
                <input type="date" className="form-input" required min={new Date().toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Analyst Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={analyst}
                  onChange={(e) => { setAnalyst(e.target.value); handleSearchEmployees(e.target.value, 'labAnalyst'); }}
                  placeholder="Search Analyst..."
                />
                {showEmployeeDropdown && activeSearchField === 'labAnalyst' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setAnalyst(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Analyst'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Operations Manager *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={manager}
                  onChange={(e) => { setManager(e.target.value); handleSearchEmployees(e.target.value, 'labManager'); }}
                  placeholder="Search Manager..."
                />
                {showEmployeeDropdown && activeSearchField === 'labManager' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setManager(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Manager'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Preform Lot No. *</label>
                <input type="text" className="form-input" required value={preformLotNo} onChange={e => setPreformLotNo(e.target.value)} placeholder="Lot number" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Closures Lot No. *</label>
                <input type="text" className="form-input" required value={closuresLotNo} onChange={e => setClosuresLotNo(e.target.value)} placeholder="Lot number" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>BIB Inner Bag *</label>
                <input type="text" className="form-input" required value={bibInnerBag} onChange={e => setBibInnerBag(e.target.value)} placeholder="Lot number" />
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Analysis and Incubation Results</h4>
              <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th>Sample Description</th>
                    <th style={{ width: '110px' }}>TCC (Absent/Coli)</th>
                    <th style={{ width: '110px' }}>E-Coli</th>
                    <th>Row Analyst</th>
                    <th>Incubation In (Date/Time)</th>
                    <th>Incubation Out (Date/Time)</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ fontWeight: '700', padding: '6px' }}>{row.description}</td>
                      <td style={{ padding: '4px' }}>
                        <select className="form-input" style={{ height: '30px' }} value={row.tcc} onChange={e => handleRowChange(idx, 'tcc', e.target.value)}>
                          <option value="Absent">Absent</option>
                          <option value="Present">Present (Fail)</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px' }}>
                        <select className="form-input" style={{ height: '30px' }} value={row.ecoli} onChange={e => handleRowChange(idx, 'ecoli', e.target.value)}>
                          <option value="Absent">Absent</option>
                          <option value="Present">Present (Fail)</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="text" className="form-input" style={{ height: '30px' }} value={row.analyst} onChange={e => handleRowChange(idx, 'analyst', e.target.value)} placeholder="Analyst initials" />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input type="date" className="form-input" style={{ height: '30px', fontSize: '10px' }} min={new Date().toISOString().split('T')[0]} value={row.inDate} onChange={e => handleRowChange(idx, 'inDate', e.target.value)} />
                          <input type="time" className="form-input" style={{ height: '30px', fontSize: '10px' }} value={row.inTime} onChange={e => handleRowChange(idx, 'inTime', e.target.value)} />
                        </div>
                      </td>
                      <td style={{ padding: '4px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input type="date" className="form-input" style={{ height: '30px', fontSize: '10px' }} min={row.inDate || new Date().toISOString().split('T')[0]} value={row.outDate} onChange={e => handleRowChange(idx, 'outDate', e.target.value)} />
                          <input type="time" className="form-input" style={{ height: '30px', fontSize: '10px' }} value={row.outTime} onChange={e => handleRowChange(idx, 'outTime', e.target.value)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" required checked={isCheckedSpec} onChange={e => setIsCheckedSpec(e.target.checked)} id="rm_spec_check" />
              <label htmlFor="rm_spec_check" style={{ fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                I certify that raw materials microbiological parameters are verified and conform to: **Negative or Absent for Coliform & E-Coli** specification bounds.
              </label>
            </div>

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
  const [analyst, setAnalyst] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [typeOfWater, setTypeOfWater] = useState('PET');

  const [rawPh, setRawPh] = useState('7.0');
  const [rawPhTime, setRawPhTime] = useState('08:00');
  const [rawTds, setRawTds] = useState('100');
  const [rawTdsTime, setRawTdsTime] = useState('08:00');

  const [cipPh, setCipPh] = useState('7.0');
  const [cipTime, setCipTime] = useState('09:00');

  const [alcoholCheck, setAlcoholCheck] = useState('0.0');
  const [brixCheck, setBrixCheck] = useState('0.0');

  const [prodPh, setProdPh] = useState('7.2');
  const [prodPhTime, setProdPhTime] = useState('10:00');
  const [prodTds, setProdTds] = useState('120');
  const [prodTdsTime, setProdTdsTime] = useState('10:00');

  const [tasteCheck, setTasteCheck] = useState('Pass');
  const [tasteTime, setTasteTime] = useState('10:00');
  const [particleCheck, setParticleCheck] = useState('Pass');
  const [particleTime, setParticleTime] = useState('10:00');

  const [buffer4, setBuffer4] = useState('4.00');
  const [buffer7, setBuffer7] = useState('7.00');
  const [buffer10, setBuffer10] = useState('10.00');
  const [cond1413, setCond1413] = useState('1413');
  const [checkStandard, setCheckStandard] = useState('1413');
  const [comments, setComments] = useState('');

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      analyst,
      verifiedBy,
      date,
      typeOfWater,
      rawPh, rawPhTime, rawTds, rawTdsTime,
      cipPh, cipTime,
      alcoholCheck, brixCheck,
      prodPh, prodPhTime, prodTds, prodTdsTime,
      tasteCheck, tasteTime, particleCheck, particleTime,
      buffer4, buffer7, buffer10, cond1413, checkStandard,
      comments
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 9: Chemical Test Log Sheet</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" className="form-input" required min={new Date().toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Type of Water</label>
                <select className="form-input" value={typeOfWater} onChange={e => setTypeOfWater(e.target.value)}>
                  <option value="PET">PET</option>
                  <option value="BIB">BIB</option>
                </select>
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Analyst *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={analyst}
                  onChange={(e) => { setAnalyst(e.target.value); handleSearchEmployees(e.target.value, 'labAnalyst'); }}
                  placeholder="Search Analyst..."
                />
                {showEmployeeDropdown && activeSearchField === 'labAnalyst' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setAnalyst(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Analyst'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Verified By *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={verifiedBy}
                  onChange={(e) => { setVerifiedBy(e.target.value); handleSearchEmployees(e.target.value, 'labVerifiedBy'); }}
                  placeholder="Search Verifier..."
                />
                {showEmployeeDropdown && activeSearchField === 'labVerifiedBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setVerifiedBy(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Supervisor'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 1: Raw Water & Post CIP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '8px' }}>1. Raw Water Parameters</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px' }}>pH Level / Time</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input type="number" step="0.01" className="form-input" style={{ height: '30px' }} value={rawPh} onChange={e => setRawPh(e.target.value)} />
                      <input type="time" className="form-input" style={{ height: '30px', padding: '2px' }} value={rawPhTime} onChange={e => setRawPhTime(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>TDS Level / Time</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input type="number" className="form-input" style={{ height: '30px' }} value={rawTds} onChange={e => setRawTds(e.target.value)} />
                      <input type="time" className="form-input" style={{ height: '30px', padding: '2px' }} value={rawTdsTime} onChange={e => setRawTdsTime(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '8px' }}>2. Sanitation & CIP Check</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px' }}>pH Level After CIP</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input type="number" step="0.01" className="form-input" style={{ height: '30px' }} value={cipPh} onChange={e => setCipPh(e.target.value)} />
                      <input type="time" className="form-input" style={{ height: '30px', padding: '2px' }} value={cipTime} onChange={e => setCipTime(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>Alcohol% (RTD to CSD)</label>
                    <input type="number" step="0.01" className="form-input" style={{ height: '30px' }} value={alcoholCheck} onChange={e => setAlcoholCheck(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>Brix (RTD to Water)</label>
                    <input type="number" step="0.01" className="form-input" style={{ height: '30px' }} value={brixCheck} onChange={e => setBrixCheck(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Product Water PET / BIB */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '8px' }}>3. Product Water PET / BIB (Spec Range: pH 6.5-8.5, TDS 50-500ppm)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '10px' }}>pH Level / Time</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="number" step="0.01" className="form-input" style={{ height: '30px', borderColor: (Number(prodPh) < 6.5 || Number(prodPh) > 8.5) ? 'var(--danger)' : '' }} value={prodPh} onChange={e => setProdPh(e.target.value)} />
                    <input type="time" className="form-input" style={{ height: '30px', padding: '2px' }} value={prodPhTime} onChange={e => setProdPhTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>TDS Level (ppm) / Time</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="number" className="form-input" style={{ height: '30px', borderColor: (Number(prodTds) < 50 || Number(prodTds) > 500) ? 'var(--danger)' : '' }} value={prodTds} onChange={e => setProdTds(e.target.value)} />
                    <input type="time" className="form-input" style={{ height: '30px', padding: '2px' }} value={prodTdsTime} onChange={e => setProdTdsTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>Taste & Odour Check</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select className="form-input" style={{ height: '30px' }} value={tasteCheck} onChange={e => setTasteCheck(e.target.value)}>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                    <input type="time" className="form-input" style={{ height: '30px', padding: '2px' }} value={tasteTime} onChange={e => setTasteTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>Visual Particle Check</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select className="form-input" style={{ height: '30px' }} value={particleCheck} onChange={e => setParticleCheck(e.target.value)}>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                    <input type="time" className="form-input" style={{ height: '30px', padding: '2px' }} value={particleTime} onChange={e => setParticleTime(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Reagents Check Buffer */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '8px' }}>4. Reagents & Instruments Calibration Check</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px' }}>pH 4.0 Buffer</label>
                  <input type="number" step="0.01" className="form-input" style={{ height: '30px' }} value={buffer4} onChange={e => setBuffer4(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>pH 7.0 Buffer</label>
                  <input type="number" step="0.01" className="form-input" style={{ height: '30px' }} value={buffer7} onChange={e => setBuffer7(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>pH 10.0 Buffer</label>
                  <input type="number" step="0.01" className="form-input" style={{ height: '30px' }} value={buffer10} onChange={e => setBuffer10(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>1413 µS/cm Conductivity</label>
                  <input type="number" className="form-input" style={{ height: '30px' }} value={cond1413} onChange={e => setCond1413(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>Check Standard</label>
                  <input type="text" className="form-input" style={{ height: '30px' }} value={checkStandard} onChange={e => setCheckStandard(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Comments / Observations</label>
              <textarea className="form-input" style={{ minHeight: '50px', padding: '6px' }} value={comments} onChange={e => setComments(e.target.value)} placeholder="Type notes here..." />
            </div>

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
  const [analyst, setAnalyst] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dateOfProduct, setDateOfProduct] = useState(new Date().toISOString().slice(0, 10));
  const [market, setMarket] = useState('Local');
  const [productSize, setProductSize] = useState('1.5L PET');
  const [vessel, setVessel] = useState('Vessel A');
  const [compactDryEC, setCompactDryEC] = useState('CD-EC-901');
  const [pipetteLot, setPipetteLot] = useState('PL-9988');
  const [spcAgarDate, setSpcAgarDate] = useState(new Date().toISOString().slice(0, 10));
  const [incubatorNo, setIncubatorNo] = useState('INC-03');
  const [incubatorTestType, setIncubatorTestType] = useState('TCC');

  const [tccIncubationIn, setTccIncubationIn] = useState(new Date().toISOString().slice(0, 16));
  const [tccIncubationOut, setTccIncubationOut] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [hpcIncubationIn, setHpcIncubationIn] = useState(new Date().toISOString().slice(0, 16));
  const [hpcIncubationOut, setHpcIncubationOut] = useState(new Date(Date.now() + 172800000).toISOString().slice(0, 16));

  const [comments, setComments] = useState('');
  const [sampleRows, setSampleRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSamples() {
      try {
        const list = await frappe.getSampleList();
        if (list && list.length > 0) {
          const rows = list.map(item => ({
            sample: item.sample_name || item.name,
            tcc: 'Absent',
            ecoli: 'Absent',
            hpc1: '0',
            hpc2: '0',
            analyst: ''
          }));
          setSampleRows(rows);
        } else {
          // Fallback to static defaults
          const defaultSamples = ['Silver Ion Water', 'BH (Bore Hole) Water', '0.45um Filter Water'];
          const rows = defaultSamples.map(sample => ({
            sample,
            tcc: 'Absent',
            ecoli: 'Absent',
            hpc1: '0',
            hpc2: '0',
            analyst: ''
          }));
          setSampleRows(rows);
        }
      } catch (err) {
        console.error("Failed to load sample list:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSamples();
  }, []);

  const handleRowChange = (idx, key, val) => {
    setSampleRows(prev => prev.map((row, rIdx) => rIdx === idx ? { ...row, [key]: val } : row));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      analyst,
      approvedBy,
      date,
      dateOfProduct,
      market,
      productSize,
      vessel,
      compactDryEC,
      pipetteLot,
      spcAgarDate,
      incubatorNo,
      incubatorTestType,
      tccIncubationIn,
      tccIncubationOut,
      hpcIncubationIn,
      hpcIncubationOut,
      sampleRows,
      comments
    });
  };

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date of Analysis</label>
                <input type="date" className="form-input" required min={new Date().toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date of Product</label>
                <input type="date" className="form-input" required min={new Date().toISOString().split('T')[0]} value={dateOfProduct} onChange={e => setDateOfProduct(e.target.value)} />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Analyst Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={analyst}
                  onChange={(e) => { setAnalyst(e.target.value); handleSearchEmployees(e.target.value, 'labAnalyst'); }}
                  placeholder="Search Analyst..."
                />
                {showEmployeeDropdown && activeSearchField === 'labAnalyst' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setAnalyst(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Analyst'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Approved By *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={approvedBy}
                  onChange={(e) => { setApprovedBy(e.target.value); handleSearchEmployees(e.target.value, 'labApprovedBy'); }}
                  placeholder="Search Approver..."
                />
                {showEmployeeDropdown && activeSearchField === 'labApprovedBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setApprovedBy(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Supervisor'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Market Area</label>
                <input type="text" className="form-input" value={market} onChange={e => setMarket(e.target.value)} placeholder="e.g. Export / Local" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Product Size</label>
                <input type="text" className="form-input" value={productSize} onChange={e => setProductSize(e.target.value)} placeholder="e.g. 500mL / 1.5L" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Vessel / Silo</label>
                <input type="text" className="form-input" value={vessel} onChange={e => setVessel(e.target.value)} placeholder="Vessel Name" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Compact Dry EC Batch</label>
                <input type="text" className="form-input" value={compactDryEC} onChange={e => setCompactDryEC(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Pipette Lot No.</label>
                <input type="text" className="form-input" value={pipetteLot} onChange={e => setPipetteLot(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>SPC Agar Prep Date</label>
                <input type="date" className="form-input" min={new Date().toISOString().split('T')[0]} value={spcAgarDate} onChange={e => setSpcAgarDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Incubator ID / Room</label>
                <input type="text" className="form-input" value={incubatorNo} onChange={e => setIncubatorNo(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Incubator Test Type</label>
                <select className="form-input" value={incubatorTestType} onChange={e => setIncubatorTestType(e.target.value)}>
                  <option value="TCC">TCC</option>
                  <option value="HPC">HPC</option>
                </select>
              </div>
            </div>

            {incubatorTestType === 'TCC' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>TCC Incubation In *</label>
                  <input type="datetime-local" className="form-input" required min={new Date().toISOString().slice(0, 16)} value={tccIncubationIn} onChange={e => setTccIncubationIn(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>TCC Incubation Out *</label>
                  <input type="datetime-local" className="form-input" required min={tccIncubationIn || new Date().toISOString().slice(0, 16)} value={tccIncubationOut} onChange={e => setTccIncubationOut(e.target.value)} />
                </div>
              </div>
            )}

            {incubatorTestType === 'HPC' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>HPC Incubation In *</label>
                  <input type="datetime-local" className="form-input" required min={new Date().toISOString().slice(0, 16)} value={hpcIncubationIn} onChange={e => setHpcIncubationIn(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>HPC Incubation Out *</label>
                  <input type="datetime-local" className="form-input" required min={hpcIncubationIn || new Date().toISOString().slice(0, 16)} value={hpcIncubationOut} onChange={e => setHpcIncubationOut(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Microbiological Cultivation results</h4>
              <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th>Sample Source</th>
                    <th style={{ width: '120px' }}>TCC (Absent/100ml)</th>
                    <th style={{ width: '120px' }}>E-Coli</th>
                    <th style={{ width: '100px' }}>HPC (Count 1)</th>
                    <th style={{ width: '100px' }}>HPC (Count 2)</th>
                    <th>Row Analyst</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ fontWeight: '700', padding: '6px' }}>{row.sample}</td>
                      <td style={{ padding: '4px' }}>
                        <select className="form-input" style={{ height: '30px' }} value={row.tcc} onChange={e => handleRowChange(idx, 'tcc', e.target.value)}>
                          <option value="Absent">Absent</option>
                          <option value="Present">Present</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px' }}>
                        <select className="form-input" style={{ height: '30px' }} value={row.ecoli} onChange={e => handleRowChange(idx, 'ecoli', e.target.value)}>
                          <option value="Absent">Absent</option>
                          <option value="Present">Present</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="number" min="0" className="form-input" style={{ height: '30px', textAlign: 'center', borderColor: (Number(row.hpc1) > 100) ? 'var(--danger)' : '' }} value={row.hpc1} onChange={e => handleRowChange(idx, 'hpc1', e.target.value)} />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="number" min="0" className="form-input" style={{ height: '30px', textAlign: 'center', borderColor: (Number(row.hpc2) > 100) ? 'var(--danger)' : '' }} value={row.hpc2} onChange={e => handleRowChange(idx, 'hpc2', e.target.value)} />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="text" className="form-input" style={{ height: '30px' }} value={row.analyst} onChange={e => handleRowChange(idx, 'analyst', e.target.value)} placeholder="Initials" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              * Spec limits: Total Coliform Count (TCC) - Absent/100mL; HPC count must be &lt; 100cfu/mL. BH testing is scheduled weekly.
            </div>

            <div>
              <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>General Observations</label>
              <textarea className="form-input" style={{ minHeight: '50px', padding: '6px' }} value={comments} onChange={e => setComments(e.target.value)} placeholder="Observations..." />
            </div>

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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sampleSize, setSampleSize] = useState('600ml PET');
  const [analyst, setAnalyst] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [comments, setComments] = useState('');

  const [tasteRows, setTasteRows] = useState(() => [
    { sampleDate: new Date().toISOString().slice(0, 10), sampleSize: '600ml PET', h4_taste: 'Normal', h4_doneBy: '', h36_taste: 'Normal', h36_doneBy: '', h72_taste: 'Normal', h72_doneBy: '', verifiedBy: '' },
    { sampleDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10), sampleSize: '600ml PET', h4_taste: 'Normal', h4_doneBy: '', h36_taste: 'Normal', h36_doneBy: '', h72_taste: 'Normal', h72_doneBy: '', verifiedBy: '' }
  ]);

  const [particleRows, setParticleRows] = useState(() => [
    { sampleDate: new Date().toISOString().slice(0, 10), sampleSize: '600ml PET', d5_particle: 'Nil', d5_doneBy: '', d10_particle: 'Nil', d10_doneBy: '', d30_particle: 'Nil', d30_doneBy: '', verifiedBy: '' },
    { sampleDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10), sampleSize: '600ml PET', d5_particle: 'Nil', d5_doneBy: '', d10_particle: 'Nil', d10_doneBy: '', d30_particle: 'Nil', d30_doneBy: '', verifiedBy: '' }
  ]);

  const handleTasteRowChange = (idx, key, val) => {
    setTasteRows(prev => prev.map((row, rIdx) => rIdx === idx ? { ...row, [key]: val } : row));
  };

  const handleParticleRowChange = (idx, key, val) => {
    setParticleRows(prev => prev.map((row, rIdx) => rIdx === idx ? { ...row, [key]: val } : row));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      date,
      sampleSize,
      analyst,
      verifiedBy,
      tasteRows,
      particleRows,
      comments
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 21: Taste Test & Visual Inspection Shelf Life Log</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" className="form-input" required min={new Date().toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Default Sample Size</label>
                <input type="text" className="form-input" value={sampleSize} onChange={e => setSampleSize(e.target.value)} />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Analyst Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={analyst}
                  onChange={(e) => { setAnalyst(e.target.value); handleSearchEmployees(e.target.value, 'labAnalyst'); }}
                  placeholder="Search Analyst..."
                />
                {showEmployeeDropdown && activeSearchField === 'labAnalyst' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setAnalyst(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Analyst'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Verified By Supervisor *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={verifiedBy}
                  onChange={(e) => { setVerifiedBy(e.target.value); handleSearchEmployees(e.target.value, 'labVerifiedBy'); }}
                  placeholder="Search Supervisor..."
                />
                {showEmployeeDropdown && activeSearchField === 'labVerifiedBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setVerifiedBy(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Supervisor'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table 1: Taste Test */}
            <div>
              <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Part A: Taste Test Shelf-Life properties (4h, 36h, 72h)</h4>
              <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th>Sample Date</th>
                    <th>Size</th>
                    <th>4th Hour Taste</th>
                    <th>4h Done By</th>
                    <th>36th Hour Taste</th>
                    <th>36h Done By</th>
                    <th>72nd Hour Taste</th>
                    <th>72h Done By</th>
                  </tr>
                </thead>
                <tbody>
                  {tasteRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td><input type="date" className="form-input" style={{ height: '30px' }} min={new Date().toISOString().split('T')[0]} value={row.sampleDate} onChange={e => handleTasteRowChange(idx, 'sampleDate', e.target.value)} /></td>
                      <td><input type="text" className="form-input" style={{ height: '30px' }} value={row.sampleSize} onChange={e => handleTasteRowChange(idx, 'sampleSize', e.target.value)} /></td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.h4_taste} onChange={e => handleTasteRowChange(idx, 'h4_taste', e.target.value)}>
                          <option value="Normal">Normal</option>
                          <option value="Off-taste">Off-taste</option>
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.h4_doneBy} onChange={e => handleTasteRowChange(idx, 'h4_doneBy', e.target.value)}>
                          <option value="">Select...</option>
                          {(employeeList || []).map(emp => (
                            <option key={emp.name} value={emp.name}>
                              {emp.employee_name || emp.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.h36_taste} onChange={e => handleTasteRowChange(idx, 'h36_taste', e.target.value)}>
                          <option value="Normal">Normal</option>
                          <option value="Off-taste">Off-taste</option>
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.h36_doneBy} onChange={e => handleTasteRowChange(idx, 'h36_doneBy', e.target.value)}>
                          <option value="">Select...</option>
                          {(employeeList || []).map(emp => (
                            <option key={emp.name} value={emp.name}>
                              {emp.employee_name || emp.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.h72_taste} onChange={e => handleTasteRowChange(idx, 'h72_taste', e.target.value)}>
                          <option value="Normal">Normal</option>
                          <option value="Off-taste">Off-taste</option>
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.h72_doneBy} onChange={e => handleTasteRowChange(idx, 'h72_doneBy', e.target.value)}>
                          <option value="">Select...</option>
                          {(employeeList || []).map(emp => (
                            <option key={emp.name} value={emp.name}>
                              {emp.employee_name || emp.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table 2: Particle Count */}
            <div>
              <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Part B: Visual Particle Shelf-Life Count (5d, 10d, 30d)</h4>
              <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th>Sample Date</th>
                    <th>Size</th>
                    <th>5th Day Particles</th>
                    <th>5d Done By</th>
                    <th>10th Day Particles</th>
                    <th>10d Done By</th>
                    <th>30th Day Particles</th>
                    <th>30d Done By</th>
                  </tr>
                </thead>
                <tbody>
                  {particleRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td><input type="date" className="form-input" style={{ height: '30px' }} min={new Date().toISOString().split('T')[0]} value={row.sampleDate} onChange={e => handleParticleRowChange(idx, 'sampleDate', e.target.value)} /></td>
                      <td><input type="text" className="form-input" style={{ height: '30px' }} value={row.sampleSize} onChange={e => handleParticleRowChange(idx, 'sampleSize', e.target.value)} /></td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.d5_particle} onChange={e => handleParticleRowChange(idx, 'd5_particle', e.target.value)}>
                          <option value="Nil">Nil</option>
                          <option value="Present">Particles Present</option>
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.d5_doneBy} onChange={e => handleParticleRowChange(idx, 'd5_doneBy', e.target.value)}>
                          <option value="">Select...</option>
                          {(employeeList || []).map(emp => (
                            <option key={emp.name} value={emp.name}>
                              {emp.employee_name || emp.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.d10_particle} onChange={e => handleParticleRowChange(idx, 'd10_particle', e.target.value)}>
                          <option value="Nil">Nil</option>
                          <option value="Present">Particles Present</option>
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.d10_doneBy} onChange={e => handleParticleRowChange(idx, 'd10_doneBy', e.target.value)}>
                          <option value="">Select...</option>
                          {(employeeList || []).map(emp => (
                            <option key={emp.name} value={emp.name}>
                              {emp.employee_name || emp.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.d30_particle} onChange={e => handleParticleRowChange(idx, 'd30_particle', e.target.value)}>
                          <option value="Nil">Nil</option>
                          <option value="Present">Particles Present</option>
                        </select>
                      </td>
                      <td>
                        <select className="form-input" style={{ height: '30px' }} value={row.d30_doneBy} onChange={e => handleParticleRowChange(idx, 'd30_doneBy', e.target.value)}>
                          <option value="">Select...</option>
                          {(employeeList || []).map(emp => (
                            <option key={emp.name} value={emp.name}>
                              {emp.employee_name || emp.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Comments / Corrective Action</label>
              <textarea className="form-input" style={{ minHeight: '50px', padding: '6px' }} value={comments} onChange={e => setComments(e.target.value)} placeholder="Type notes here..." />
            </div>

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
          {record.type === 'Form 1 (Micro raw)' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div><strong>Analysis Date:</strong> {record.date}</div>
                <div><strong>Analyst Name:</strong> {record.analyst}</div>
                <div><strong>Operations Manager:</strong> {record.manager}</div>
                <div><strong>Preform Lot:</strong> {record.preformLotNo}</div>
                <div><strong>Closures Lot:</strong> {record.closuresLotNo}</div>
                <div><strong>BIB Inner Bag:</strong> {record.bibInnerBag}</div>
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
                  {record.sampleRows?.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px', fontWeight: '700' }}>{row.description}</td>
                      <td style={{ padding: '6px', color: row.tcc === 'Absent' ? 'var(--success)' : 'var(--danger)' }}>{row.tcc}</td>
                      <td style={{ padding: '6px', color: row.ecoli === 'Absent' ? 'var(--success)' : 'var(--danger)' }}>{row.ecoli}</td>
                      <td style={{ padding: '6px' }}>{row.analyst || '-'}</td>
                      <td style={{ padding: '6px' }}>{row.inDate} {row.inTime}</td>
                      <td style={{ padding: '6px' }}>{row.outDate} {row.outTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Form 9 Chemical */}
          {record.type === 'Form 9 (Chemical)' && (
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
                <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Product Water PET / BIB</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div><strong>pH Level:</strong> {record.prodPh} (at {record.prodPhTime})</div>
                  <div><strong>TDS Level:</strong> {record.prodTds} ppm (at {record.prodTdsTime})</div>
                  <div><strong>Taste Test:</strong> {record.tasteCheck} (at {record.tasteTime})</div>
                  <div><strong>Visual Particle:</strong> {record.particleCheck} (at {record.particleTime})</div>
                </div>
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
          {record.type === 'Form 11 (Micro water)' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div><strong>Analysis Date:</strong> {record.date}</div>
                <div><strong>Analyst Name:</strong> {record.analyst}</div>
                <div><strong>Market Area:</strong> {record.market}</div>
                <div><strong>Product Size:</strong> {record.productSize}</div>
                <div><strong>Vessel Name:</strong> {record.vessel}</div>
                <div><strong>Compact Dry EC Batch:</strong> {record.compactDryEC}</div>
                <div><strong>Pipette Lot:</strong> {record.pipetteLot}</div>
                <div><strong>SPC Agar Date:</strong> {record.spcAgarDate}</div>
                <div><strong>Incubator ID:</strong> {record.incubatorNo}</div>
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
                  {record.sampleRows?.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px', fontWeight: '700' }}>{row.sample}</td>
                      <td style={{ padding: '6px' }}>{row.tcc}</td>
                      <td style={{ padding: '6px' }}>{row.ecoli}</td>
                      <td style={{ padding: '6px', color: Number(row.hpc1) > 100 ? 'var(--danger)' : '' }}>{row.hpc1} cfu</td>
                      <td style={{ padding: '6px', color: Number(row.hpc2) > 100 ? 'var(--danger)' : '' }}>{row.hpc2} cfu</td>
                      <td style={{ padding: '6px' }}>{row.analyst || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {record.comments && (
                <div style={{ marginTop: '12px' }}>
                  <strong>Comments:</strong> {record.comments}
                </div>
              )}
            </div>
          )}

          {/* Form 21 Taste / Visual */}
          {record.type === 'Form 21 (Taste/Visual)' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div><strong>Logged Date:</strong> {record.date}</div>
                <div><strong>Default Sample Size:</strong> {record.sampleSize}</div>
                <div><strong>Verified By:</strong> {record.verifiedBy}</div>
              </div>

              <div>
                <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Part A: Taste Test Shelf Life Logs</h4>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '6px' }}>Sample Date</th>
                      <th style={{ padding: '6px' }}>Size</th>
                      <th style={{ padding: '6px' }}>4th Hour</th>
                      <th style={{ padding: '6px' }}>4h By</th>
                      <th style={{ padding: '6px' }}>36th Hour</th>
                      <th style={{ padding: '6px' }}>36h By</th>
                      <th style={{ padding: '6px' }}>72nd Hour</th>
                      <th style={{ padding: '6px' }}>72h By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.tasteRows?.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '6px' }}>{row.sampleDate}</td>
                        <td style={{ padding: '6px' }}>{row.sampleSize}</td>
                        <td style={{ padding: '6px' }}>{row.h4_taste}</td>
                        <td style={{ padding: '6px' }}>{row.h4_doneBy}</td>
                        <td style={{ padding: '6px' }}>{row.h36_taste}</td>
                        <td style={{ padding: '6px' }}>{row.h36_doneBy}</td>
                        <td style={{ padding: '6px' }}>{row.h72_taste}</td>
                        <td style={{ padding: '6px' }}>{row.h72_doneBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Part B: Visual Particle Shelf Life Logs</h4>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '6px' }}>Sample Date</th>
                      <th style={{ padding: '6px' }}>Size</th>
                      <th style={{ padding: '6px' }}>5th Day</th>
                      <th style={{ padding: '6px' }}>5d By</th>
                      <th style={{ padding: '6px' }}>10th Day</th>
                      <th style={{ padding: '6px' }}>10d By</th>
                      <th style={{ padding: '6px' }}>30th Day</th>
                      <th style={{ padding: '6px' }}>30d By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.particleRows?.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '6px' }}>{row.sampleDate}</td>
                        <td style={{ padding: '6px' }}>{row.sampleSize}</td>
                        <td style={{ padding: '6px' }}>{row.d5_particle}</td>
                        <td style={{ padding: '6px' }}>{row.d5_doneBy}</td>
                        <td style={{ padding: '6px' }}>{row.d10_particle}</td>
                        <td style={{ padding: '6px' }}>{row.d10_doneBy}</td>
                        <td style={{ padding: '6px' }}>{row.d30_particle}</td>
                        <td style={{ padding: '6px' }}>{row.d30_doneBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

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

          {/* Form 100 Production Record */}
          {record.type === 'Form 100 (Production Log)' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div><strong>Shift Date:</strong> {record.date}</div>
                <div><strong>Time Start:</strong> {record.timeStart}</div>
                <div><strong>Time Stop:</strong> {record.timeStop}</div>
                <div><strong>Market Area:</strong> {record.market}</div>
                <div><strong>Supervisor:</strong> {record.supervisor}</div>
                <div><strong>Product:</strong> {record.productDesc}</div>
                <div><strong>Size:</strong> {record.productSize}</div>
                <div><strong>Packaging:</strong> {record.packingType}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Warehouse Handover</h4>
                  <div><strong>Total Cases Handover:</strong> {record.warehouseCases}</div>
                  <div><strong>Endorsed By:</strong> {record.endorsedBy}</div>
                  <div><strong>Received By (Warehouse):</strong> {record.receivedBy}</div>
                  <div style={{ marginTop: '6px' }}><strong>Filler Counter:</strong> {record.fillerCounter}</div>
                  <div><strong>Labeller Counter:</strong> {record.labellerCounter}</div>
                </div>
                <div>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Utility Meter Readings</h4>
                  <div><strong>LPG Level (Start / Stop):</strong> {record.lpgStart} / {record.lpgStop}</div>
                  <div><strong>EFL Level (Start / Stop):</strong> {record.eflStart} / {record.eflStop}</div>
                  <div><strong>BOC Vessel level (Start / Stop):</strong> {record.bocStart} / {record.bocStop}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Production Crew</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>In-feed: {record.crewInfeed}</div>
                    <div>Filler Operator: {record.crewFiller}</div>
                    <div>Lab Chemist: {record.crewLab}</div>
                    <div>Water System: {record.crewWater}</div>
                    <div>Blowing Operator: {record.crewBlowing}</div>
                    <div>Labeller: {record.crewLabeller}</div>
                  </div>
                </div>
                <div>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Wastage Logs</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>Bottle/Cans: {record.wasteBottles}</div>
                    <div>Cap/Lid Wastage: {record.wasteCaps}</div>
                    <div>Preform waste: {record.wastePreform}</div>
                    <div>LDPE film waste: {record.wasteLdpe}</div>
                    <div>Cartons wasted: {record.wasteCartons}</div>
                    <div>Lab Samples taken: {record.wasteSamples}</div>
                  </div>
                </div>
              </div>

              {record.comments && (
                <div><strong>Downtimes / Comments:</strong> {record.comments}</div>
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
                <input type="text" className="form-input" value={tankNo} onChange={e => setTankNo(e.target.value)} />
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
                  onChange={(e) => { setPreparedBy(e.target.value); handleSearchEmployees(e.target.value, 'labPreparedBy'); }}
                  placeholder="Search Employee..."
                />
                {showEmployeeDropdown && activeSearchField === 'labPreparedBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setPreparedBy(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
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
                  onChange={(e) => { setVerifiedBy(e.target.value); handleSearchEmployees(e.target.value, 'labVerifiedBy'); }}
                  placeholder="Search Verifier..."
                />
                {showEmployeeDropdown && activeSearchField === 'labVerifiedBy' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setVerifiedBy(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
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
                  onChange={(e) => { setAnalysedBy(e.target.value); handleSearchEmployees(e.target.value, 'labAnalyst'); }}
                  placeholder="Search Analyst..."
                />
                {showEmployeeDropdown && activeSearchField === 'labAnalyst' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setAnalysedBy(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
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


export function LabForm100Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeStop, setTimeStop] = useState('16:30');
  const [market, setMarket] = useState('Local');
  const [supervisor, setSupervisor] = useState('');
  const [productDesc, setProductDesc] = useState('Island Chill Water');
  const [productSize, setProductSize] = useState('600ml PET');
  const [packingType, setPackingType] = useState('Cartons');

  const [warehouseCases, setWarehouseCases] = useState('1450');
  const [endorsedBy, setEndorsedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [fillerCounter, setFillerCounter] = useState('34890');
  const [labellerCounter, setLabellerCounter] = useState('34882');

  const [lpgStart, setLpgStart] = useState('45%');
  const [lpgStop, setLpgStop] = useState('40%');
  const [eflStart, setEflStart] = useState('10200');
  const [eflStop, setEflStop] = useState('10950');
  const [bocStart, setBocStart] = useState('80%');
  const [bocStop, setBocStop] = useState('75%');

  const [crewInfeed, setCrewInfeed] = useState('');
  const [crewFiller, setCrewFiller] = useState('');
  const [crewLab, setCrewLab] = useState('');
  const [crewWater, setCrewWater] = useState('');
  const [crewBlowing, setCrewBlowing] = useState('');
  const [crewLabeller, setCrewLabeller] = useState('');

  const [wasteBottles, setWasteBottles] = useState('12');
  const [wasteCaps, setWasteCaps] = useState('15');
  const [wastePreform, setWastePreform] = useState('8');
  const [wasteLdpe, setWasteLdpe] = useState('2kg');
  const [wasteCartons, setWasteCartons] = useState('3');
  const [wasteSamples, setWasteSamples] = useState('10');
  const [comments, setComments] = useState('');

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      date, timeStart, timeStop, market, supervisor, productDesc, productSize, packingType,
      warehouseCases, endorsedBy, receivedBy, fillerCounter, labellerCounter,
      lpgStart, lpgStop, eflStart, eflStop, bocStart, bocStop,
      crewInfeed, crewFiller, crewLab, crewWater, crewBlowing, crewLabeller,
      wasteBottles, wasteCaps, wastePreform, wasteLdpe, wasteCartons, wasteSamples,
      comments,
      analyst: supervisor
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 100: Daily Production & Handover Record</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Shift Date</label>
                <input type="date" className="form-input" required min={new Date().toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Time Start</label>
                <input type="time" className="form-input" value={timeStart} onChange={e => setTimeStart(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Time Stop</label>
                <input type="time" className="form-input" value={timeStop} onChange={e => setTimeStop(e.target.value)} />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Production Supervisor *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={supervisor}
                  onChange={(e) => { setSupervisor(e.target.value); handleSearchEmployees(e.target.value, 'labProdSupervisor'); }}
                  placeholder="Search Supervisor..."
                />
                {showEmployeeDropdown && activeSearchField === 'labProdSupervisor' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setSupervisor(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Product Description</label>
                <input type="text" className="form-input" value={productDesc} onChange={e => setProductDesc(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Size</label>
                <input type="text" className="form-input" value={productSize} onChange={e => setProductSize(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Market</label>
                <input type="text" className="form-input" value={market} onChange={e => setMarket(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Packing Type</label>
                <input type="text" className="form-input" value={packingType} onChange={e => setPackingType(e.target.value)} placeholder="Cartons / LDPE Wrap" />
              </div>
            </div>

            {/* Warehouse Handover */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '8px' }}>1. Warehouse Handover Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '10px' }}>Cases Handed Over</label>
                  <input type="text" className="form-input" value={warehouseCases} onChange={e => setWarehouseCases(e.target.value)} />
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '10px' }}>Endorsed By *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={endorsedBy}
                    onChange={(e) => { setEndorsedBy(e.target.value); handleSearchEmployees(e.target.value, 'labEndorsedBy'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'labEndorsedBy' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setEndorsedBy(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '10px' }}>Received By Warehouse *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={receivedBy}
                    onChange={(e) => { setReceivedBy(e.target.value); handleSearchEmployees(e.target.value, 'labReceivedBy'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'labReceivedBy' && (
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
                  <label style={{ fontSize: '10px' }}>Filler Counter</label>
                  <input type="number" className="form-input" value={fillerCounter} onChange={e => setFillerCounter(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>Labeller Counter</label>
                  <input type="number" className="form-input" value={labellerCounter} onChange={e => setLabellerCounter(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Meter readings & Crew */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '8px' }}>2. Utilities Meter readings</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px' }}>LPG (Start / Stop)</label>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <input type="text" className="form-input" style={{ height: '30px' }} value={lpgStart} onChange={e => setLpgStart(e.target.value)} />
                      <input type="text" className="form-input" style={{ height: '30px' }} value={lpgStop} onChange={e => setLpgStop(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>EFL (Start / Stop)</label>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <input type="text" className="form-input" style={{ height: '30px' }} value={eflStart} onChange={e => setEflStart(e.target.value)} />
                      <input type="text" className="form-input" style={{ height: '30px' }} value={eflStop} onChange={e => setEflStop(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>BOC Vessel (Start / Stop)</label>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <input type="text" className="form-input" style={{ height: '30px' }} value={bocStart} onChange={e => setBocStart(e.target.value)} />
                      <input type="text" className="form-input" style={{ height: '30px' }} value={bocStop} onChange={e => setBocStop(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '8px' }}>3. Production Crew List</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px' }}>Infeed / Palletizer</label>
                    <input type="text" className="form-input" style={{ height: '30px' }} value={crewInfeed} onChange={e => setCrewInfeed(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>Filler Operator</label>
                    <input type="text" className="form-input" style={{ height: '30px' }} value={crewFiller} onChange={e => setCrewFiller(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>Lab Chemist</label>
                    <input type="text" className="form-input" style={{ height: '30px' }} value={crewLab} onChange={e => setCrewLab(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>Water System</label>
                    <input type="text" className="form-input" style={{ height: '30px' }} value={crewWater} onChange={e => setCrewWater(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>Blowing Operator</label>
                    <input type="text" className="form-input" style={{ height: '30px' }} value={crewBlowing} onChange={e => setCrewBlowing(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px' }}>Labeller Operator</label>
                    <input type="text" className="form-input" style={{ height: '30px' }} value={crewLabeller} onChange={e => setCrewLabeller(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Wastage Logs */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', fontSize: '12px', marginBottom: '8px' }}>4. Caps & Material Wastage count</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px' }}>Bottle / Cans</label>
                  <input type="text" className="form-input" style={{ height: '30px' }} value={wasteBottles} onChange={e => setWasteBottles(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>Cap / Lid waste</label>
                  <input type="text" className="form-input" style={{ height: '30px' }} value={wasteCaps} onChange={e => setWasteCaps(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>Preform waste</label>
                  <input type="text" className="form-input" style={{ height: '30px' }} value={wastePreform} onChange={e => setWastePreform(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>LDPE Wrap waste</label>
                  <input type="text" className="form-input" style={{ height: '30px' }} value={wasteLdpe} onChange={e => setWasteLdpe(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>Cartons wasted</label>
                  <input type="text" className="form-input" style={{ height: '30px' }} value={wasteCartons} onChange={e => setWasteCartons(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '10px' }}>Lab Samples</label>
                  <input type="text" className="form-input" style={{ height: '30px' }} value={wasteSamples} onChange={e => setWasteSamples(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600' }}>Downtimes & Comments</label>
              <textarea className="form-input" style={{ minHeight: '60px', padding: '6px' }} value={comments} onChange={e => setComments(e.target.value)} placeholder="Log dountime reasons and duration..." />
            </div>

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Save Production Record</button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function LabForm103Modal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [date1, setDate1] = useState(new Date().toISOString().slice(0, 10));
  const [tech1, setTech1] = useState('');
  const [verifier1, setVerifier1] = useState('');
  const [calibration1, setCalibration1] = useState('Photometer zero calibrated using blank sample.');
  const [rows1, setRows1] = useState([
    { sample: 'Filtration Output', time: '08:00', reading: '12' },
    { sample: 'Clean Room Buffer Tank', time: '08:00', reading: '11' }
  ]);

  const [date2, setDate2] = useState(new Date().toISOString().slice(0, 10));
  const [tech2, setTech2] = useState('');
  const [verifier2, setVerifier2] = useState('');
  const [calibration2, setCalibration2] = useState('Photometer zero calibrated.');
  const [rows2, setRows2] = useState([
    { sample: 'Filtration Output', time: '12:00', reading: '14' },
    { sample: 'Clean Room Buffer Tank', time: '12:00', reading: '13' }
  ]);

  const [date3, setDate3] = useState(new Date().toISOString().slice(0, 10));
  const [tech3, setTech3] = useState('');
  const [verifier3, setVerifier3] = useState('');
  const [calibration3, setCalibration3] = useState('Photometer calibrated.');
  const [rows3, setRows3] = useState([
    { sample: 'Filtration Output', time: '16:00', reading: '13' },
    { sample: 'Clean Room Buffer Tank', time: '16:00', reading: '12' }
  ]);

  const handleRowChange = (setNum, rowIdx, key, val) => {
    if (setNum === 1) {
      setRows1(prev => prev.map((r, idx) => idx === rowIdx ? { ...r, [key]: val } : r));
    } else if (setNum === 2) {
      setRows2(prev => prev.map((r, idx) => idx === rowIdx ? { ...r, [key]: val } : r));
    } else {
      setRows3(prev => prev.map((r, idx) => idx === rowIdx ? { ...r, [key]: val } : r));
    }
  };

  const checkSpecFailure = () => {
    const allRows = [...rows1, ...rows2, ...rows3];
    return allRows.some(r => Number(r.reading) < 10);
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      sets: [
        { date: date1, technician: tech1, verifiedBy: verifier1, calibration: calibration1, rows: rows1 },
        { date: date2, technician: tech2, verifiedBy: verifier2, calibration: calibration2, rows: rows2 },
        { date: date3, technician: tech3, verifiedBy: verifier3, calibration: calibration3, rows: rows3 }
      ],
      analyst: tech1 || 'QC Tech',
      verifiedBy: verifier1 || 'Manager',
      date: date1
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '950px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 103: Silver Photometer Log & Calibration Sheet</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '12px' }}>

            <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderLeft: '4px solid var(--accent)', color: 'var(--text-heading)' }}>
              <strong>Acceptance specification bounds:</strong> Reading of Silver Ion should be **above 10ppb**.
            </div>

            {checkSpecFailure() && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                ⚠️ Warning: One or more readings are below the minimum required 10ppb silver concentration!
              </div>
            )}

            {/* Set 1 */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Set 1 readings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <label>Date</label>
                  <input type="date" className="form-input" style={{ height: '30px' }} min={new Date().toISOString().split('T')[0]} value={date1} onChange={e => setDate1(e.target.value)} />
                </div>
                <div style={{ position: 'relative' }}>
                  <label>Technician *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '30px' }}
                    required
                    value={tech1}
                    onChange={(e) => { setTech1(e.target.value); handleSearchEmployees(e.target.value, 'labTechnician'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'labTechnician' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setTech1(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <label>Verified By *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '30px' }}
                    required
                    value={verifier1}
                    onChange={(e) => { setVerifier1(e.target.value); handleSearchEmployees(e.target.value, 'labVerifiedBy'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'labVerifiedBy' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setVerifier1(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <table className="custom-table" style={{ width: '100%', marginBottom: '8px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th>Sample point</th>
                    <th>Time</th>
                    <th>Photometer Reading (ppb)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows1.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td><strong>{row.sample}</strong></td>
                      <td><input type="time" className="form-input" style={{ height: '28px' }} value={row.time} onChange={e => handleRowChange(1, rIdx, 'time', e.target.value)} /></td>
                      <td><input type="number" className="form-input" style={{ height: '28px', borderColor: Number(row.reading) < 10 ? 'var(--danger)' : '' }} value={row.reading} onChange={e => handleRowChange(1, rIdx, 'reading', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div>
                <label>Calibration Log Record notes</label>
                <input type="text" className="form-input" style={{ height: '30px' }} value={calibration1} onChange={e => setCalibration1(e.target.value)} />
              </div>
            </div>

            {/* Set 2 */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Set 2 readings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <label>Date</label>
                  <input type="date" className="form-input" style={{ height: '30px' }} min={new Date().toISOString().split('T')[0]} value={date2} onChange={e => setDate2(e.target.value)} />
                </div>
                <div style={{ position: 'relative' }}>
                  <label>Technician</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '30px' }}
                    value={tech2}
                    onChange={(e) => { setTech2(e.target.value); handleSearchEmployees(e.target.value, 'labTechnician2'); }}
                    placeholder="Technician Initials"
                  />
                  {showEmployeeDropdown && activeSearchField === 'labTechnician2' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setTech2(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <label>Verified By</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '30px' }}
                    value={verifier2}
                    onChange={(e) => { setVerifier2(e.target.value); handleSearchEmployees(e.target.value, 'labVerifiedBy2'); }}
                    placeholder="Verifier Initials"
                  />
                  {showEmployeeDropdown && activeSearchField === 'labVerifiedBy2' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setVerifier2(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <table className="custom-table" style={{ width: '100%', marginBottom: '8px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th>Sample point</th>
                    <th>Time</th>
                    <th>Photometer Reading (ppb)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows2.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td><strong>{row.sample}</strong></td>
                      <td><input type="time" className="form-input" style={{ height: '28px' }} value={row.time} onChange={e => handleRowChange(2, rIdx, 'time', e.target.value)} /></td>
                      <td><input type="number" className="form-input" style={{ height: '28px', borderColor: Number(row.reading) < 10 ? 'var(--danger)' : '' }} value={row.reading} onChange={e => handleRowChange(2, rIdx, 'reading', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div>
                <label>Calibration Log Record notes</label>
                <input type="text" className="form-input" style={{ height: '30px' }} value={calibration2} onChange={e => setCalibration2(e.target.value)} />
              </div>
            </div>

            {/* Set 3 */}
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Set 3 readings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <label>Date</label>
                  <input type="date" className="form-input" style={{ height: '30px' }} min={new Date().toISOString().split('T')[0]} value={date3} onChange={e => setDate3(e.target.value)} />
                </div>
                <div style={{ position: 'relative' }}>
                  <label>Technician</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '30px' }}
                    value={tech3}
                    onChange={(e) => { setTech3(e.target.value); handleSearchEmployees(e.target.value, 'labTechnician3'); }}
                    placeholder="Technician Initials"
                  />
                  {showEmployeeDropdown && activeSearchField === 'labTechnician3' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setTech3(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <label>Verified By</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '30px' }}
                    value={verifier3}
                    onChange={(e) => { setVerifier3(e.target.value); handleSearchEmployees(e.target.value, 'labVerifiedBy3'); }}
                    placeholder="Verifier Initials"
                  />
                  {showEmployeeDropdown && activeSearchField === 'labVerifiedBy3' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setVerifier3(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <table className="custom-table" style={{ width: '100%', marginBottom: '8px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th>Sample point</th>
                    <th>Time</th>
                    <th>Photometer Reading (ppb)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows3.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td><strong>{row.sample}</strong></td>
                      <td><input type="time" className="form-input" style={{ height: '28px' }} value={row.time} onChange={e => handleRowChange(3, rIdx, 'time', e.target.value)} /></td>
                      <td><input type="number" className="form-input" style={{ height: '28px', borderColor: Number(row.reading) < 10 ? 'var(--danger)' : '' }} value={row.reading} onChange={e => handleRowChange(3, rIdx, 'reading', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div>
                <label>Calibration Log Record notes</label>
                <input type="text" className="form-input" style={{ height: '30px' }} value={calibration3} onChange={e => setCalibration3(e.target.value)} />
              </div>
            </div>

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
                    { id: 'form36', icon: '🥃', name: 'Form 36: Bourbon Whiskey & Cola', desc: 'Tank batch records, ingredients checklist, Brix % checks, alcohol test, and gas pressure.' },
                    { id: 'form100', icon: '🏭', name: 'Form 100: Production Record', desc: 'Production shift logs, cases handover to warehouse, LPG/EFL meter, wastage log, and downtime remarks.' },
                    { id: 'form103', icon: '📡', name: 'Form 103: Silver Photometer Log', desc: 'Daily photometer readings for Silver Ion (spec >10ppb) and standard calibration tests.' }
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