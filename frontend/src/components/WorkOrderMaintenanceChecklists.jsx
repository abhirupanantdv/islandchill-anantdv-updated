export default function WorkOrderMaintenanceChecklists({ validation, onFillChecklist }) {
  return (
            <div className="modal-body" style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: '20px', backgroundColor: 'var(--card-bg)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Daily Preventive Maintenance Progress</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: validation.allCompleted ? 'var(--success)' : 'var(--warning)' }}>
                    {validation.completedCount} / {validation.totalCount} Checklists Submitted
                  </span>
                </div>
                <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(validation.totalCount ? validation.completedCount / validation.totalCount : 0) * 100}%`,
                    backgroundColor: validation.allCompleted ? 'var(--success)' : 'var(--warning)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                {!validation.allCompleted && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--warning)', fontStyle: 'italic' }}>
                    ⚠️ All {validation.totalCount || 'required'} Daily Preventive Checklists must be submitted before starting this Work Order.
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {validation.checklists.map((chk, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${chk.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                    backgroundColor: chk.completed ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-secondary)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13px' }}>{chk.equipment}</strong>
                        <span className="badge" style={{ fontSize: '10px', padding: '2px 6px' }}>{chk.area}</span>
                      </div>
                      {chk.completed ? (
                        <span style={{ fontSize: '11px', color: 'var(--success)', display: 'block', marginTop: '2px' }}>
                          ✓ Submitted ID: {chk.schedule_name}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--warning)', display: 'block', marginTop: '2px' }}>
                          ⏳ Unsubmitted / Pending Check
                        </span>
                      )}
                    </div>

                    <div>
                      {chk.completed ? (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                          Completed
                        </span>
                      ) : (
                        <button
                          className="primary-btn"
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                          onClick={() => {
                            onFillChecklist(chk.equipment, chk.area, validation.woId);
                          }}
                        >
                          Fill Checklist
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

  );
}
