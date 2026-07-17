import React, { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';

export function SafetyIncidentFormModal({ onClose, onSubmit, saving, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [injuredName, setInjuredName] = useState('');
  const [sex, setSex] = useState('Male');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [experienceMonths, setExperienceMonths] = useState('');
  const [experienceDays, setExperienceDays] = useState('');
  const [relationship, setRelationship] = useState('Employee');
  const [incidentTime, setIncidentTime] = useState('');
  const [incidentType, setIncidentType] = useState('Accident');
  const [incidentAgency, setIncidentAgency] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [damageDescription, setDamageDescription] = useState('');
  const [medicalTreatment, setMedicalTreatment] = useState('');
  const [practitionerName, setPractitionerName] = useState('');
  const [dateNotified, setDateNotified] = useState('');
  const [incapacityPeriod, setIncapacityPeriod] = useState('');
  const [daysLost, setDaysLost] = useState('');
  const [dateResumption, setDateResumption] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [dateActionTaken, setDateActionTaken] = useState('');

  const [operator, setOperator] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [overallComments, setOverallComments] = useState('');

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      injuredPerson: injuredName,
      sex,
      address,
      dob,
      jobTitle,
      experienceYears,
      experienceMonths,
      experienceDays,
      experience: `${experienceYears || 0}y ${experienceMonths || 0}m ${experienceDays || 0}d`,
      relationship,
      incidentTime,
      incidentType,
      incidentAgency,
      incidentLocation,
      details: damageDescription,
      medicalTreatment,
      practitionerName,
      dateNotified,
      incapacityPeriod,
      daysLost: Number(daysLost || 0),
      dateResumption,
      correctiveAction,
      dateActionTaken,
      operator,
      supervisor,
      overallComments
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Water Fiji PTE Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>OHSF 1 & 2: Accident and Disease Notification Report</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Section 1: Personal Data */}
            <div>
              <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', color: 'var(--accent)', fontSize: '13px' }}>1. Personal Data of Injured Person</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Name of Injured Person *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={injuredName}
                    onChange={(e) => {
                      setInjuredName(e.target.value);
                      handleSearchEmployees(e.target.value, 'safetyInjured');
                    }}
                    placeholder="Search employee (min 3 chars)"
                  />
                  {showEmployeeDropdown && activeSearchField === 'safetyInjured' && (
                    <div className="autocomplete-dropdown" style={{ top: '100%', zIndex: 10 }}>
                      {employeeList.map(emp => (
                        <div
                          key={emp.name}
                          className="dropdown-item"
                          onClick={() => {
                            setInjuredName(`${emp.employee_name || emp.name} (${emp.name})`);
                            if (emp.gender) setSex(emp.gender);
                            if (emp.date_of_birth) setDob(emp.date_of_birth);
                            if (emp.designation) setJobTitle(emp.designation);
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Sex</label>
                  <select className="form-input" value={sex} onChange={e => setSex(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date of Birth</label>
                  <input type="date" className="form-input" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Residential Address</label>
                  <input type="text" className="form-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Job Title</label>
                  <input type="text" className="form-input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Packer" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Relationship Status</label>
                  <select className="form-input" value={relationship} onChange={e => setRelationship(e.target.value)}>
                    <option value="Employee">Employee</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Trainee">Trainee</option>
                    <option value="Apprentice">Apprentice</option>
                    <option value="Visitor">Visitor</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Experience (Years)</label>
                  <input type="number" min="0" className="form-input" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} placeholder="Years" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Experience (Months)</label>
                  <input type="number" min="0" max="11" className="form-input" value={experienceMonths} onChange={e => setExperienceMonths(e.target.value)} placeholder="Months" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Experience (Days)</label>
                  <input type="number" min="0" max="30" className="form-input" value={experienceDays} onChange={e => setExperienceDays(e.target.value)} placeholder="Days" />
                </div>
              </div>
            </div>

            {/* Section 2: Details of Incident */}
            <div>
              <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', color: 'var(--accent)', fontSize: '13px' }}>2. Incident / Disease Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date and Time of Occurrence *</label>
                  <input type="datetime-local" className="form-input" required value={incidentTime} onChange={e => setIncidentTime(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Type of Incident</label>
                  <select className="form-input" value={incidentType} onChange={e => setIncidentType(e.target.value)}>
                    <option value="Accident">Accident</option>
                    <option value="Disease">Occupational Disease</option>
                    <option value="Near Miss">Near Miss</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Agency involved</label>
                  <input type="text" className="form-input" value={incidentAgency} onChange={e => setIncidentAgency(e.target.value)} placeholder="e.g. Forklift, Wet Floor" />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>How/Where did incident happen? Location & Description *</label>
                <textarea className="form-input" required style={{ height: '70px', padding: '8px' }} value={incidentLocation} onChange={e => setIncidentLocation(e.target.value)} placeholder="Describe the scene, physical location, and sequence of events." />
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Description of Personal Damage/Injuries *</label>
                <textarea className="form-input" required style={{ height: '70px', padding: '8px' }} value={damageDescription} onChange={e => setDamageDescription(e.target.value)} placeholder="Specify injuries (e.g. cut to left hand index finger)." />
              </div>
            </div>

            {/* Section 3: Medical Treatment & Incapacity */}
            <div>
              <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', color: 'var(--accent)', fontSize: '13px' }}>3. Treatment & Incapacity details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Medical Treatment Given</label>
                  <input type="text" className="form-input" value={medicalTreatment} onChange={e => setMedicalTreatment(e.target.value)} placeholder="e.g. Bandaged at clinic" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Name of Medical Practitioner</label>
                  <input type="text" className="form-input" value={practitionerName} onChange={e => setPractitionerName(e.target.value)} placeholder="Practitioner / Hospital Name" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date Notified to Chief Inspector</label>
                  <input type="date" className="form-input" value={dateNotified} onChange={e => setDateNotified(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Period of Incapacity</label>
                  <input type="text" className="form-input" value={incapacityPeriod} onChange={e => setIncapacityPeriod(e.target.value)} placeholder="e.g. 5 days off" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Total Working Days Lost</label>
                  <input type="number" min="0" className="form-input" value={daysLost} onChange={e => setDaysLost(e.target.value)} placeholder="Working Days" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date of Resumption of Work</label>
                  <input type="date" className="form-input" value={dateResumption} onChange={e => setDateResumption(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Section 4: Corrective Actions */}
            <div>
              <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', color: 'var(--accent)', fontSize: '13px' }}>4. Corrective Action & Validation</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Corrective Action Identified</label>
                  <input type="text" className="form-input" value={correctiveAction} onChange={e => setCorrectiveAction(e.target.value)} placeholder="Describe actions to prevent recurrence." />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date Action Taken</label>
                  <input type="date" className="form-input" value={dateActionTaken} onChange={e => setDateActionTaken(e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '12px', marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600' }}>Overall Comments / Remarks</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '50px', padding: '6px' }}
                  value={overallComments}
                  onChange={e => setOverallComments(e.target.value)}
                  placeholder="Enter overall comments or observations about this incident notification..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Sign of Operator / Logger *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={operator}
                    onChange={(e) => {
                      setOperator(e.target.value);
                      handleSearchEmployees(e.target.value, 'safetyOperator');
                    }}
                    placeholder="Search employee (min 3 chars)"
                  />
                  {showEmployeeDropdown && activeSearchField === 'safetyOperator' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div
                          key={emp.name}
                          className="dropdown-item"
                          onClick={() => {
                            setOperator(`${emp.employee_name || emp.name} (${emp.name})`);
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Sign of Supervisor / Approver *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={supervisor}
                    onChange={(e) => {
                      setSupervisor(e.target.value);
                      handleSearchEmployees(e.target.value, 'safetySupervisor');
                    }}
                    placeholder="Search supervisor (min 3 chars)"
                  />
                  {showEmployeeDropdown && activeSearchField === 'safetySupervisor' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div
                          key={emp.name}
                          className="dropdown-item"
                          onClick={() => {
                            setSupervisor(`${emp.employee_name || emp.name} (${emp.name})`);
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          👤 {emp.employee_name || emp.name} ({emp.designation || 'Supervisor'})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving} style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}>
              {saving ? 'Saving...' : 'Save Incident Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function SafetyFirstAidFormModal({ onClose, onSubmit, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField, saving }) {
  const [injuredName, setInjuredName] = useState('');
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [injuryType, setInjuryType] = useState('Minor');
  const [cause, setCause] = useState('');
  const [treatment, setTreatment] = useState('');
  const [administeredBy, setAdministeredBy] = useState('');
  const [supervisor, setSupervisor] = useState('');

  const [overallComments, setOverallComments] = useState('');

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      injuredPerson: injuredName,
      date,
      time,
      injuryType,
      incidentNature: injuryType,
      cause,
      treatmentGiven: treatment,
      verifiedBy: administeredBy,
      operator: administeredBy,
      supervisor,
      overallComments
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '720px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Water (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 17: First Aid Registry Log</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" className="form-input" required value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Time</label>
                <input type="time" className="form-input" required value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Employee / Person Injured *</label>
              <input
                type="text"
                className="form-input"
                required
                value={injuredName}
                onChange={(e) => {
                  setInjuredName(e.target.value);
                  handleSearchEmployees(e.target.value, 'firstAidEmployee');
                }}
                placeholder="Search injured person name (min 3 chars)"
              />
              {showEmployeeDropdown && activeSearchField === 'firstAidEmployee' && (
                <div className="autocomplete-dropdown">
                  {employeeList.map(emp => (
                    <div
                      key={emp.name}
                      className="dropdown-item"
                      onClick={() => {
                        setInjuredName(`${emp.employee_name || emp.name} (${emp.name})`);
                        setShowEmployeeDropdown(false);
                      }}
                    >
                      👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Type of Injury</label>
              <select className="form-input" value={injuryType} onChange={e => setInjuryType(e.target.value)}>
                <option value="Minor">Minor (small cuts, bruises, etc.)</option>
                <option value="Serious">Serious (major injury such as fracture)</option>
                <option value="Critical">Need Immediate Medical Attention</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Cause(s) of Injury *</label>
              <textarea className="form-input" required style={{ height: '60px', padding: '8px' }} value={cause} onChange={e => setCause(e.target.value)} placeholder="Describe the physical cause." />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>First Aid Treatment Given *</label>
              <textarea className="form-input" required style={{ height: '60px', padding: '8px' }} value={treatment} onChange={e => setTreatment(e.target.value)} placeholder="Describe first aid treatment." />
            </div>

            <div className="form-group" style={{ marginTop: '12px', marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600' }}>Overall Comments / Remarks</label>
              <textarea
                className="form-input"
                style={{ minHeight: '50px', padding: '6px' }}
                value={overallComments}
                onChange={e => setOverallComments(e.target.value)}
                placeholder="Enter overall comments or observations about this first aid administration..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>First Aid Given By (Sign) *</label>
                <input type="text" className="form-input" required value={administeredBy} onChange={e => setAdministeredBy(e.target.value)} placeholder="Attendant Name" />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Approved By Supervisor *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={supervisor}
                  onChange={(e) => {
                    setSupervisor(e.target.value);
                    handleSearchEmployees(e.target.value, 'firstAidSupervisor');
                  }}
                  placeholder="Search supervisor name (min 3 chars)"
                />
                {showEmployeeDropdown && activeSearchField === 'firstAidSupervisor' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div
                        key={emp.name}
                        className="dropdown-item"
                        onClick={() => {
                          setSupervisor(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Supervisor'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save First Aid Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function SafetySwabFormModal({ onClose, onSubmit, saving, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [analyst, setAnalyst] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [swabData, setSwabData] = useState({
    filtration: { yeast: '', mould: '', hpc: '' },
    infeed: { yeast: '', mould: '', hpc: '' },
    cleanRoom: { yeast: '', mould: '', hpc: '' },
    labelling: { yeast: '', mould: '', hpc: '' },
    warehouse: { yeast: '', mould: '', hpc: '' },
    blowing: { yeast: '', mould: '', hpc: '' }
  });

  const locations = [
    { key: 'filtration', name: 'Filtration Area' },
    { key: 'infeed', name: 'Infeed' },
    { key: 'cleanRoom', name: 'Clean Room' },
    { key: 'labelling', name: 'Labelling' },
    { key: 'warehouse', name: 'Ware-House' },
    { key: 'blowing', name: 'Blowing' }
  ];

  const [overallComments, setOverallComments] = useState('');

  const handleInputChange = (loc, key, val) => {
    setSwabData(prev => ({
      ...prev,
      [loc]: {
        ...prev[loc],
        [key]: val
      }
    }));
  };

  const checkContamination = () => {
    // exceeds 15cfu except for Warehouse
    return locations.some(loc => {
      if (loc.key === 'warehouse') return false;
      const data = swabData[loc.key];
      return Number(data.yeast || 0) > 15 || Number(data.mould || 0) > 15 || Number(data.hpc || 0) > 15;
    });
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit({
      analyst,
      date,
      swabData,
      operator: analyst,
      supervisor: 'Operations Manager',
      overallComments
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '840px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 14: Environmental Swab Test microbiology Register</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmitForm}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Analyst *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={analyst}
                  onChange={e => {
                    setAnalyst(e.target.value);
                    handleSearchEmployees(e.target.value, 'swabAnalyst');
                  }}
                  placeholder="Search analyst name (min 3 chars)"
                />
                {showEmployeeDropdown && activeSearchField === 'swabAnalyst' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div
                        key={emp.name}
                        className="dropdown-item"
                        onClick={() => {
                          setAnalyst(`${emp.employee_name || emp.name} (${emp.name})`);
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        👤 {emp.employee_name || emp.name} ({emp.designation || 'Staff'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Date of Swab *</label>
                <input type="date" className="form-input" required value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            {checkContamination() && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                ⚠️ Contamination Warning: One or more zones exceed safety threshold =&lt; 15cfu (excluding Warehouse).
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Location</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Yeast Count (CFU)</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Mould Count (CFU)</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>HPC Count (CFU)</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map(loc => {
                    const rowWarning = loc.key !== 'warehouse' && (
                      Number(swabData[loc.key].yeast || 0) > 15 ||
                      Number(swabData[loc.key].mould || 0) > 15 ||
                      Number(swabData[loc.key].hpc || 0) > 15
                    );
                    return (
                      <tr key={loc.key} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: rowWarning ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '8px', fontWeight: '600' }}>
                          {loc.name} {loc.key === 'warehouse' && <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>(Exempt)</span>}
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ height: '30px', textAlign: 'center', borderColor: rowWarning && Number(swabData[loc.key].yeast || 0) > 15 ? 'var(--danger)' : '' }}
                            value={swabData[loc.key].yeast}
                            onChange={e => handleInputChange(loc.key, 'yeast', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ height: '30px', textAlign: 'center', borderColor: rowWarning && Number(swabData[loc.key].mould || 0) > 15 ? 'var(--danger)' : '' }}
                            value={swabData[loc.key].mould}
                            onChange={e => handleInputChange(loc.key, 'mould', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ height: '30px', textAlign: 'center', borderColor: rowWarning && Number(swabData[loc.key].hpc || 0) > 15 ? 'var(--danger)' : '' }}
                            value={swabData[loc.key].hpc}
                            onChange={e => handleInputChange(loc.key, 'hpc', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="form-group" style={{ marginTop: '12px', marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600' }}>Overall Comments / Remarks</label>
              <textarea
                className="form-input"
                style={{ minHeight: '50px', padding: '6px' }}
                value={overallComments}
                onChange={e => setOverallComments(e.target.value)}
                placeholder="Enter overall comments or observations about this microbiology swab run..."
              />
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              * Acceptance threshold is =&lt; 15cfu. Warehouse counts are recorded but excluded from compliance limits.
            </div>

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving} style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
              {saving ? 'Saving...' : 'Save Swab Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function SafetyReportViewerModal({ record, onClose, setEmailModal }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel print-report-container" style={{ width: '840px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Water Fiji PTE Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Archived Safety Document Details ({record.id})</span>
          </div>
          <button className="no-print" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', fontSize: '12px' }}>

          <div style={{ padding: '12px 16px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>DOCUMENT TYPE</span>
              <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>{record.type}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textAlign: 'right' }}>LOGGED TIMESTAMP</span>
              <strong>{record.timestamp}</strong>
            </div>
          </div>

          {/* OHSF Incident Report Render */}
          {record.type === 'Incident Report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--accent)', marginBottom: '8px' }}>Personal Data of Injured Person</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div><strong>Name:</strong> {record.injuredPerson}</div>
                  <div><strong>Sex:</strong> {record.sex}</div>
                  <div><strong>DOB:</strong> {record.dob || '-'}</div>
                  <div><strong>Residential Address:</strong> {record.address || '-'}</div>
                  <div><strong>Job Title:</strong> {record.jobTitle || '-'}</div>
                  <div><strong>Employment Status:</strong> {record.relationship}</div>
                  <div><strong>Experience:</strong> {record.experience || '-'}</div>
                </div>
              </div>

              <div>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--accent)', marginBottom: '8px' }}>Incident / Disease Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div><strong>Occurrence Time:</strong> {record.incidentTime}</div>
                  <div><strong>Type:</strong> {record.incidentType}</div>
                  <div><strong>Agency involved:</strong> {record.incidentAgency || '-'}</div>
                </div>
                <div style={{ marginTop: '8px' }}><strong>How & Where Happened:</strong> {record.incidentLocation}</div>
                <div style={{ marginTop: '8px' }}><strong>Injuries & Damage Description:</strong> {record.details}</div>
              </div>

              <div>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--accent)', marginBottom: '8px' }}>Medical Treatment & lost Time</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div><strong>Treatment:</strong> {record.medicalTreatment || '-'}</div>
                  <div><strong>Practitioner:</strong> {record.practitionerName || '-'}</div>
                  <div><strong>Notified Chief Inspector:</strong> {record.dateNotified || '-'}</div>
                  <div><strong>Period of Incapacity:</strong> {record.incapacityPeriod || '-'}</div>
                  <div><strong>Working Days Lost:</strong> {record.daysLost || 0} days</div>
                  <div><strong>Resumption Date:</strong> {record.dateResumption || '-'}</div>
                </div>
              </div>

              <div>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--accent)', marginBottom: '8px' }}>Corrective Actions & Signatures</h4>
                <div><strong>Corrective Action Identified:</strong> {record.correctiveAction || '-'} (taken on {record.dateActionTaken || '-'})</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}><strong>Operator/Logger:</strong> {record.operator}</div>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}><strong>Supervisor/Approver:</strong> {record.supervisor}</div>
                </div>
              </div>
            </div>
          )}

          {/* First Aid Log Render */}
          {record.type === 'First Aid Log' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div><strong>Injured Employee:</strong> {record.injuredPerson}</div>
                <div><strong>Date:</strong> {record.date}</div>
                <div><strong>Time:</strong> {record.time}</div>
                <div><strong>Injury Classification:</strong> {record.injuryType}</div>
                <div><strong>Attendant / First Aider:</strong> {record.verifiedBy}</div>
                <div><strong>Approving Supervisor:</strong> {record.supervisor}</div>
              </div>
              <div><strong>Cause(s) of Injury:</strong> {record.cause}</div>
              <div><strong>First Aid Treatment Administered:</strong> {record.treatmentGiven}</div>
            </div>
          )}

          {/* Swab Test Log Render */}
          {record.type === 'Swab Test' && (() => {
            const locations = [
              { key: 'filtration', name: 'Filtration Area' },
              { key: 'infeed', name: 'Infeed' },
              { key: 'cleanRoom', name: 'Clean Room' },
              { key: 'labelling', name: 'Labelling' },
              { key: 'warehouse', name: 'Ware-House' },
              { key: 'blowing', name: 'Blowing' }
            ];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><strong>Analyst Name:</strong> {record.analyst}</div>
                  <div><strong>Swab Date:</strong> {record.date}</div>
                </div>
                <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '6px' }}>Zone Location</th>
                      <th style={{ padding: '6px', textAlign: 'center' }}>Yeast Count (CFU)</th>
                      <th style={{ padding: '6px', textAlign: 'center' }}>Mould Count (CFU)</th>
                      <th style={{ padding: '6px', textAlign: 'center' }}>HPC Count (CFU)</th>
                      <th style={{ padding: '6px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map(loc => {
                      const yeast = Number(record.swabData?.[loc.key]?.yeast || 0);
                      const mould = Number(record.swabData?.[loc.key]?.mould || 0);
                      const hpc = Number(record.swabData?.[loc.key]?.hpc || 0);
                      const warning = loc.key !== 'warehouse' && (yeast > 15 || mould > 15 || hpc > 15);

                      return (
                        <tr key={loc.key} style={{ backgroundColor: warning ? 'rgba(239, 68, 68, 0.05)' : '' }}>
                          <td style={{ padding: '6px', fontWeight: '600' }}>{loc.name}</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{yeast}</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{mould}</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{hpc}</td>
                          <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', color: warning ? 'var(--danger)' : 'var(--success)' }}>
                            {warning ? '⚠️ Fail (>15cfu)' : 'Pass'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Induction Log Render */}
          {record.type === 'Induction Log' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div><strong>Inductee Name:</strong> {record.name}</div>
                <div><strong>Reason for Visit:</strong> {record.reasonForVisit}</div>
                <div><strong>Visiting Areas:</strong> {record.visitingAreas}</div>
                <div><strong>Date Checklisted:</strong> {record.date} (Signature: {record.signature})</div>
                <div><strong>Inductor Name:</strong> {record.inductorName} (Signature: {record.inductorSignature})</div>
                <div><strong>Inductor Date:</strong> {record.inductorDate}</div>
                <div><strong>Approved By:</strong> {record.approvedByName} (Signature: {record.approvedBySign})</div>
              </div>

              <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--accent)', marginBottom: '8px', fontWeight: '700' }}>Induction Checklist Items Status</h4>
              <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Induction Area Description</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '100px' }}>Inducted (YES/NO)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'companyPolicy', label: 'Company Policy (ISO 9001:2015, HACCP, Harassment, Health & Safety )' },
                    { key: 'dressCode', label: 'Dress Code (jewelry policy, sanitizing hands, hair nets/face masks, safety shoes)' },
                    { key: 'noMobile', label: 'No use of Mobile Phones in Production area' },
                    { key: 'earPlugs', label: 'No use of ear plugs or ear muffs in following section' },
                    { key: 'toilets', label: 'Toilets/ Change Rooms' },
                    { key: 'smoking', label: 'Smoking/Non Smoking Areas' },
                    { key: 'authorizedAreas', label: 'Authorized/Unauthorized Areas' },
                    { key: 'hazardReporting', label: 'Hazard Reporting Procedures (Damaged Bait Stations, incomplete structures, etc.)' },
                    { key: 'accidentReporting', label: 'Accident/Incident Reporting Procedures' },
                    { key: 'evacuationProcedure', label: 'Evacuation Procedures' },
                    { key: 'nearestExit', label: 'Nearest Exit in the Case of Emergency' },
                    { key: 'fireEquipment', label: 'Location of Nearest Fire Fighting Equipment' },
                    { key: 'firstAidKit', label: 'Location of First Aid Kit/Certified first aiders' },
                    { key: 'healthIssues', label: 'Any health issues or food poisoning has occurred at least 2 weeks prior to factory visit' },
                    { key: 'msdsLocation', label: 'Location of MSDS' }
                  ].map(item => (
                    <tr key={item.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px' }}>{item.label}</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', color: record.checklist?.[item.key] === 'YES' ? 'var(--success)' : 'var(--danger)' }}>
                        {record.checklist?.[item.key] || 'NO'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {record.comments && (
                <div><strong>Comments / Remarks:</strong> {record.comments}</div>
              )}
            </div>
          )}
          {record.overallComments && (
            <div style={{ marginTop: '16px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', marginBottom: '16px' }}>
              <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OVERALL COMMENTS / REMARKS</strong>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-heading)' }}>{record.overallComments}</div>
            </div>
          )}

        </div>
        <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="primary-btn" onClick={() => setEmailModal({ reportId: record.id, reportType: record.type || 'Safety Report' })} style={{ backgroundColor: '#a27b5c', borderColor: '#a27b5c' }}>📧 Send Email</button>
          <button type="button" className="primary-btn" onClick={() => window.print()} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>🖨️ Print Report</button>
          <button type="button" className="secondary-btn" onClick={onClose}>Close Report</button>
        </div>
      </div>
    </div>
  );
}

// Sub-components for Laboratory & QC Tab


export function SafetyForm37Modal({ onClose, onSubmit, saving, employeeList, handleSearchEmployees, showEmployeeDropdown, setShowEmployeeDropdown, activeSearchField }) {
  const [name, setName] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('Audit');
  const [visitingAreas, setVisitingAreas] = useState('');
  const [comments, setComments] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [signature, setSignature] = useState(false);
  const [inductorName, setInductorName] = useState('');
  const [inductorSignature, setInductorSignature] = useState(false);
  const [inductorDate, setInductorDate] = useState(new Date().toISOString().slice(0, 10));
  const [approvedByName, setApprovedByName] = useState('');
  const [approvedBySign, setApprovedBySign] = useState(false);

  const [checklist, setChecklist] = useState({
    companyPolicy: 'YES',
    dressCode: 'YES',
    noMobile: 'YES',
    earPlugs: 'YES',
    toilets: 'YES',
    smoking: 'YES',
    authorizedAreas: 'YES',
    hazardReporting: 'YES',
    accidentReporting: 'YES',
    evacuationProcedure: 'YES',
    nearestExit: 'YES',
    fireEquipment: 'YES',
    firstAidKit: 'YES',
    healthIssues: 'YES',
    msdsLocation: 'YES'
  });

  const areas = [
    { key: 'companyPolicy', label: 'Company Policy (ISO 9001:2015, HACCP, Harassment, Health & Safety )' },
    { key: 'dressCode', label: 'Dress Code (jewelry policy, sanitizing hands, hair nets/face masks, safety shoes)' },
    { key: 'noMobile', label: 'No use of Mobile Phones in Production area' },
    { key: 'earPlugs', label: 'No use of ear plugs or ear muffs in following section' },
    { key: 'toilets', label: 'Toilets/ Change Rooms' },
    { key: 'smoking', label: 'Smoking/Non Smoking Areas' },
    { key: 'authorizedAreas', label: 'Authorized/Unauthorized Areas' },
    { key: 'hazardReporting', label: 'Hazard Reporting Procedures (Damaged Bait Stations, incomplete structures, etc.)' },
    { key: 'accidentReporting', label: 'Accident/Incident Reporting Procedures' },
    { key: 'evacuationProcedure', label: 'Evacuation Procedures' },
    { key: 'nearestExit', label: 'Nearest Exit in the Case of Emergency' },
    { key: 'fireEquipment', label: 'Location of Nearest Fire Fighting Equipment' },
    { key: 'firstAidKit', label: 'Location of First Aid Kit/Certified first aiders' },
    { key: 'healthIssues', label: 'Any health issues or food poisoning has occurred at least 2 weeks prior to factory visit' },
    { key: 'msdsLocation', label: 'Location of MSDS' }
  ];

  const handleChecklistChange = (key, val) => {
    setChecklist(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name, reasonForVisit, visitingAreas, comments, date, signature: signature ? 'Checked' : 'Unsigned',
      inductorName, inductorSignature: inductorSignature ? 'Checked' : 'Unsigned', inductorDate,
      approvedByName, approvedBySign: approvedBySign ? 'Checked' : 'Unsigned',
      checklist
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '850px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Island Chill - Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 37: OHS Induction Procedure Checklist</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <label>Name of Visitor/Employee/Contractor *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); handleSearchEmployees(e.target.value, 'inductionInductee'); }}
                />
                {showEmployeeDropdown && activeSearchField === 'inductionInductee' && (
                  <div className="autocomplete-dropdown">
                    {employeeList.map(emp => (
                      <div key={emp.name} className="dropdown-item" onClick={() => { setName(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                        👤 {emp.employee_name || emp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label>Reason for Visit (audit, tour, others)</label>
                <input type="text" className="form-input" value={reasonForVisit} onChange={e => setReasonForVisit(e.target.value)} />
              </div>
              <div>
                <label>Visiting Areas</label>
                <input type="text" className="form-input" value={visitingAreas} onChange={e => setVisitingAreas(e.target.value)} />
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table className="custom-table" style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Induction Areas Checklist</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>YES</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>NO</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map(item => (
                    <tr key={item.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px' }}>{item.label}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="radio"
                          name={item.key}
                          checked={checklist[item.key] === 'YES'}
                          onChange={() => handleChecklistChange(item.key, 'YES')}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="radio"
                          name={item.key}
                          checked={checklist[item.key] === 'NO'}
                          onChange={() => handleChecklistChange(item.key, 'NO')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <label>Comments / Remarks</label>
              <textarea className="form-input" style={{ minHeight: '60px', padding: '6px' }} value={comments} onChange={e => setComments(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px' }}>
                <h4 style={{ fontWeight: '700', fontSize: '11px', marginBottom: '8px', color: 'var(--accent)' }}>Inductee Certification</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <input type="checkbox" id="inductee-sig" checked={signature} onChange={e => setSignature(e.target.checked)} />
                  <label htmlFor="inductee-sig">I certify that I have undergone induction in the above areas.</label>
                </div>
                <div>
                  <label>Date</label>
                  <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px' }}>
                <h4 style={{ fontWeight: '700', fontSize: '11px', marginBottom: '8px', color: 'var(--accent)' }}>Inductor Details</h4>
                <div style={{ position: 'relative', marginBottom: '6px' }}>
                  <label>Inductor's Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={inductorName}
                    onChange={(e) => { setInductorName(e.target.value); handleSearchEmployees(e.target.value, 'inductionInductor'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'inductionInductor' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setInductorName(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <input type="checkbox" id="inductor-sig" checked={inductorSignature} onChange={e => setInductorSignature(e.target.checked)} />
                  <label htmlFor="inductor-sig">Signed as Inductor</label>
                </div>
                <div>
                  <label>Induction Date</label>
                  <input type="date" className="form-input" value={inductorDate} onChange={e => setInductorDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px' }}>
              <h4 style={{ fontWeight: '700', fontSize: '11px', marginBottom: '8px', color: 'var(--accent)' }}>Management Approval</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <label>Approved By Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={approvedByName}
                    onChange={(e) => { setApprovedByName(e.target.value); handleSearchEmployees(e.target.value, 'inductionApprovedBy'); }}
                  />
                  {showEmployeeDropdown && activeSearchField === 'inductionApprovedBy' && (
                    <div className="autocomplete-dropdown">
                      {employeeList.map(emp => (
                        <div key={emp.name} className="dropdown-item" onClick={() => { setApprovedByName(`${emp.employee_name || emp.name} (${emp.name})`); setShowEmployeeDropdown(false); }}>
                          👤 {emp.employee_name || emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '18px' }}>
                  <input type="checkbox" id="approved-sig" checked={approvedBySign} onChange={e => setApprovedBySign(e.target.checked)} />
                  <label htmlFor="approved-sig">Approved Signature</label>
                </div>
              </div>
            </div>

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


export default function SafetyTab({
  safetyRecords,
  safetySearchQuery,
  setSafetySearchQuery,
  safetyFilterType,
  setSafetyFilterType,
  filteredSafetyRecords,
  safetyPage,
  setSafetyPage,
  setActiveSafetyForm,
  setViewingSafetyRecord
}) {
  // Safety dashboard cards calculations
  const getDaysSinceLastIncident = () => {
    const incidentLogs = safetyRecords.filter(r => r.type === 'Incident Report');
    if (incidentLogs.length === 0) return 248;
    const latestIncident = incidentLogs[0];
    const incidentDate = new Date(latestIncident.timestamp.replace(' ', 'T'));
    const diffTime = Math.abs(new Date() - incidentDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays - 1);
  };

  const safetyIncidents = safetyRecords.filter(r => r.type === 'Incident Report').length;
  const firstAidLogs = safetyRecords.filter(r => r.type === 'First Aid Log').length;

  const getSwabComplianceRate = () => {
    const swabLogs = safetyRecords.filter(r => r.type === 'Swab Test');
    if (swabLogs.length === 0) return 100;
    const passedSwabs = swabLogs.filter(s => {
      const locations = ['filtration', 'infeed', 'cleanRoom', 'labelling', 'blowing'];
      return locations.every(loc => {
        const yeast = Number(s.swabData?.[loc]?.yeast || 0);
        const mould = Number(s.swabData?.[loc]?.mould || 0);
        const hpc = Number(s.swabData?.[loc]?.hpc || 0);
        return yeast <= 15 && mould <= 15 && hpc <= 15;
      });
    });
    return Math.round((passedSwabs.length / swabLogs.length) * 100);
  };

  return (
    <div className="maintenance-tab-container">
      <div className="tab-title-desc">
        <h2>Health & Safety Operations</h2>
        <p>Execute, log, and monitor plant safety statistics, First Aid logs, and Environmental Swab microbiology tests.</p>
      </div>

      {/* Dashboard metrics widgets */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Incident-Free Streak</span>
            <span className="metric-icon">💚</span>
          </div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: 'var(--success)' }}>
            {getDaysSinceLastIncident()} Days
          </div>
          <div className="metric-footer text-muted" style={{ fontSize: '11px' }}>Since last logged accident</div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Safety Incidents</span>
            <span className="metric-icon">🛡️</span>
          </div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: safetyIncidents > 0 ? 'var(--danger)' : 'var(--text)' }}>
            {safetyIncidents}
          </div>
          <div className="metric-footer text-muted" style={{ fontSize: '11px' }}>OHSF 1/2 notification reports</div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>First Aid Logs</span>
            <span className="metric-icon">🩹</span>
          </div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>{firstAidLogs}</div>
          <div className="metric-footer text-muted" style={{ fontSize: '11px' }}>Standard Form 17 entries</div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Swab Compliance</span>
            <span className="metric-icon">🧪</span>
          </div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: getSwabComplianceRate() >= 95 ? 'var(--success)' : 'var(--warning)' }}>
            {getSwabComplianceRate()}%
          </div>
          <div className="metric-footer text-muted" style={{ fontSize: '11px' }}>Swab counts =&lt; 15cfu</div>
        </div>
      </div>

      {/* Attached Safety Forms Templates Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Health & Safety Digital Forms</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {/* OHSF Form */}
        <div className="inv-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
          <div>
            <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
              REGULATORY
            </span>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>
              OHSF 1/2 Notification
            </h4>
            <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>
              Record details of workplace injuries, diseases, and lost-time incidents under 1996 Regulations.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Logs: {safetyRecords.filter(r => r.type === 'Incident Report').length}</span>
            <button
              type="button"
              className="primary-btn"
              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => setActiveSafetyForm('ohsf')}
            >
              📝 Log Accident
            </button>
          </div>
        </div>

        {/* First Aid Form */}
        <div className="inv-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
          <div>
            <span className="badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: 'var(--info)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
              STANDARD FORM 17
            </span>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>
              First Aid Register
            </h4>
            <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>
              Log minor cuts, bruises, serious injuries, and first aid treatments administered on-site.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Logs: {safetyRecords.filter(r => r.type === 'First Aid Log').length}</span>
            <button
              type="button"
              className="primary-btn"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setActiveSafetyForm('first-aid')}
            >
              📝 Fill First Aid
            </button>
          </div>
        </div>

        {/* Swab Test Form */}
        <div className="inv-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
          <div>
            <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
              STANDARD FORM 14
            </span>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>
              Environmental Swab Test
            </h4>
            <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>
              Record microbiology Yeast, Mould, and HPC counts across plant clean zones.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Logs: {safetyRecords.filter(r => r.type === 'Swab Test').length}</span>
            <button
              type="button"
              className="primary-btn"
              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
              onClick={() => setActiveSafetyForm('swab')}
            >
              📝 Log Swab Test
            </button>
          </div>
        </div>

        {/* Induction Form (Form 37) */}
        <div className="inv-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
          <div>
            <span className="badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
              OHS FORM 37
            </span>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>
              Induction Checklist
            </h4>
            <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>
              Log visitor, employee, or contractor OHS induction checklists before plant zone entries.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Logs: {safetyRecords.filter(r => r.type === 'Induction Log').length}</span>
            <button
              type="button"
              className="primary-btn"
              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}
              onClick={() => setActiveSafetyForm('induction')}
            >
              📝 Log Induction
            </button>
          </div>
        </div>
      </div>

      {/* Safety Logs Register Table */}
      <div className="dashboard-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Health & Safety Event Register</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search register logs..."
              className="form-input"
              style={{ width: '220px', height: '34px', padding: '6px 12px', fontSize: '12px' }}
              value={safetySearchQuery}
              onChange={(e) => setSafetySearchQuery(e.target.value)}
            />
            <select
              className="form-input"
              style={{ width: '180px', height: '34px', padding: '6px 12px', fontSize: '12px' }}
              value={safetyFilterType}
              onChange={(e) => setSafetyFilterType(e.target.value)}
            >
              <option value="All">All Form Types</option>
              <option value="Incident Report">Incident Reports</option>
              <option value="First Aid Log">First Aid Logs</option>
              <option value="Swab Test">Swab Tests</option>
              <option value="Induction Log">Induction Logs</option>
            </select>
          </div>
        </div>

        {filteredSafetyRecords.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>
            No safety events logged matching the search criteria.
          </p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Form Type</th>
                    <th>Target Person / Analyst</th>
                    <th>Event Summary / Area Status</th>
                    <th>Logged By / Witness</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSafetyRecords.slice((safetyPage - 1) * 20, safetyPage * 20).map((rec) => {
                    let summary = '';
                    let logger = rec.operator || 'Not Signed';
                    let target = rec.injuredPerson || rec.analyst || 'N/A';

                    if (rec.type === 'Incident Report') {
                      summary = `Lost Time: ${rec.daysLost || 0} days - ${rec.incidentNature || 'Injury'}`;
                    } else if (rec.type === 'First Aid Log') {
                      summary = `First Aid: ${rec.treatmentGiven || '-'}`;
                      logger = rec.verifiedBy || 'N/A';
                    } else if (rec.type === 'Swab Test') {
                      const passed = ['filtration', 'infeed', 'cleanRoom', 'labelling', 'blowing'].every(l => {
                        return Number(rec.swabData?.[l]?.yeast || 0) <= 15 && Number(rec.swabData?.[l]?.mould || 0) <= 15 && Number(rec.swabData?.[l]?.hpc || 0) <= 15;
                      });
                      summary = passed ? '✅ Compliance Pass' : '❌ Contamination Warning';
                    } else if (rec.type === 'Induction Log') {
                      summary = `Reason: ${rec.reasonForVisit || '-'} • Areas: ${rec.visitingAreas || '-'}`;
                      logger = rec.inductorName || 'N/A';
                      target = rec.name || 'N/A';
                    }

                    return (
                      <tr key={rec.id}>
                        <td style={{ fontWeight: '600' }}>{rec.id}</td>
                        <td>
                          <span className="badge" style={{
                            backgroundColor: rec.type === 'Incident Report' ? 'rgba(239, 68, 68, 0.1)' : rec.type === 'First Aid Log' ? 'rgba(14, 165, 233, 0.1)' : rec.type === 'Swab Test' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                            color: rec.type === 'Incident Report' ? 'var(--danger)' : rec.type === 'First Aid Log' ? 'var(--info)' : rec.type === 'Swab Test' ? 'var(--success)' : 'var(--accent)'
                          }}>
                            {rec.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600' }}>{target}</td>
                        <td style={{ fontStyle: 'italic' }}>{summary}</td>
                        <td>👤 {logger}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rec.timestamp}</td>
                        <td>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => setViewingSafetyRecord(rec)}
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
            {/* Safety Pagination */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
              <button
                type="button"
                className="secondary-btn"
                disabled={safetyPage === 1}
                onClick={() => setSafetyPage(prev => Math.max(1, prev - 1))}
              >
                ◀ Previous
              </button>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                Page {safetyPage} of {Math.max(1, Math.ceil(filteredSafetyRecords.length / 20))}
              </span>
              <button
                type="button"
                className="secondary-btn"
                disabled={safetyPage === Math.max(1, Math.ceil(filteredSafetyRecords.length / 20))}
                onClick={() => setSafetyPage(prev => Math.min(Math.max(1, Math.ceil(filteredSafetyRecords.length / 20)), prev + 1))}
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