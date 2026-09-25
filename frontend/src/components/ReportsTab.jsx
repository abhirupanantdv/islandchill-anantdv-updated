import React, { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';

export default function ReportsTab({ isLoggedIn }) {
  const [reportType, setReportType] = useState('Microbiologiocal Analysis Raw and Product Water');
  const [filterMode, setFilterMode] = useState('Quarterly'); // 'Quarterly', 'Monthly', 'Weekly', 'Custom'
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedQuarter, setSelectedQuarter] = useState('Q3'); // Default to Q3 where live records exist
  const [selectedMonth, setSelectedMonth] = useState('8'); // 8 = September
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-09-30');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Safe Date parsing helper without UTC shift issues
  const parseRecordDate = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.slice(0, 10).split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Fetch Form 11 / DocType records from ERPNext
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const conn = frappe.getConnectionSettings();
      let liveRecords = [];
      if (conn.isLive) {
        try {
          console.log(`[ReportsTab] Fetching records for DocType: "${reportType}" from ERPNext...`);
          liveRecords = await frappe.getCleaningSanitationRecords(reportType);
          if (!liveRecords || liveRecords.length === 0) {
            liveRecords = await frappe.fetchERP(reportType, { fields: ['*'], limit: 500 });
          }

          // Fetch full doc details for each record if child table is needed
          if (liveRecords && liveRecords.length > 0) {
            const detailed = await Promise.all(
              liveRecords.map(async (rec) => {
                if (rec.name) {
                  try {
                    const fullDoc = await frappe.makeRequest('GET', reportType, rec.name);
                    return fullDoc || rec;
                  } catch (e) {
                    return rec;
                  }
                }
                return rec;
              })
            );
            liveRecords = detailed;
          }
        } catch (err) {
          console.warn('[ReportsTab] Error fetching live records:', err);
        }
      }

      // Check localStorage for locally created records
      let localRecords = [];
      try {
        const stored = localStorage.getItem('islandchill_lab_records');
        if (stored) {
          const parsed = JSON.parse(stored);
          localRecords = (parsed || []).filter(r =>
            (r.doctype === reportType ||
             (r.type || '').includes('Form 11') ||
             (r.type || '').includes('Water'))
          );
        }
      } catch (err) {
        console.warn('[ReportsTab] Local storage read error:', err);
      }

      const combined = [...(liveRecords || []), ...(localRecords || [])];
      console.log(`[CONSOLE PRINT] Records from DocType (${reportType}):`, combined);
      setRecords(combined);
    } catch (err) {
      console.error('[ReportsTab] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType]);

  // Log records when records or filters change
  useEffect(() => {
    console.log(`[CONSOLE PRINT] Current State Records for DocType "${reportType}":`, records);
  }, [records, filterMode, selectedYear, selectedQuarter, selectedMonth, startDate, endDate]);

  // Format date helper: 20-Jan-26
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    const d = parseRecordDate(dateStr);
    if (!d) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Month label helper: Jan-26
  const formatMonthHeader = (yearNum, monthIdx) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = months[monthIdx];
    const yearStr = String(yearNum).slice(-2);
    return `${monthStr}-${yearStr}`;
  };

  // Group records by Month based on selected mode
  const getGroupedReportData = () => {
    const yrNum = parseInt(selectedYear, 10) || 2026;

    // Determine target start & end dates
    let startD, endD;
    if (filterMode === 'Quarterly') {
      if (selectedQuarter === 'Q1') { startD = new Date(yrNum, 0, 1); endD = new Date(yrNum, 2, 31, 23, 59, 59); }
      else if (selectedQuarter === 'Q2') { startD = new Date(yrNum, 3, 1); endD = new Date(yrNum, 5, 30, 23, 59, 59); }
      else if (selectedQuarter === 'Q3') { startD = new Date(yrNum, 6, 1); endD = new Date(yrNum, 8, 30, 23, 59, 59); }
      else { startD = new Date(yrNum, 9, 1); endD = new Date(yrNum, 11, 31, 23, 59, 59); }
    } else if (filterMode === 'Monthly') {
      const mIdx = parseInt(selectedMonth, 10);
      startD = new Date(yrNum, mIdx, 1);
      endD = new Date(yrNum, mIdx + 1, 0, 23, 59, 59);
    } else if (filterMode === 'Custom') {
      startD = parseRecordDate(startDate) || new Date(2000, 0, 1);
      const eD = parseRecordDate(endDate) || new Date(2099, 11, 31);
      endD = new Date(eD.getFullYear(), eD.getMonth(), eD.getDate(), 23, 59, 59);
    } else {
      // Weekly mode: past 7 days
      endD = new Date();
      startD = new Date();
      startD.setDate(startD.getDate() - 7);
    }

    // Filter actual records by date range
    const filteredRecords = (records || []).filter(r => {
      const rDateStr = r.date_of_analysis || r.date_of_product || r.date || r.creation || r.timestamp;
      if (!rDateStr) return true;
      const d = parseRecordDate(rDateStr);
      if (!d) return true;
      return d >= startD && d <= endD;
    });

    if (filteredRecords.length === 0) {
      return [];
    }

    // Group actual records by YYYY-MM
    const groups = {};
    filteredRecords.forEach(rec => {
      const rDateStr = rec.date_of_analysis || rec.date_of_product || rec.date || rec.creation || 'No Date';
      let mKey = 'General';
      let monthHeaderStr = 'Records';
      const d = parseRecordDate(rDateStr);
      if (d) {
        mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthHeaderStr = formatMonthHeader(d.getFullYear(), d.getMonth());
      }

      if (!groups[mKey]) {
        groups[mKey] = {
          monthHeader: monthHeaderStr,
          rows: []
        };
      }

      // Check details / table rows or top-level values
      const details = rec.water_micro_details || rec.microbiological_analysis_detail || rec.details || [];
      if (Array.isArray(details) && details.length > 0) {
        details.forEach(det => {
          groups[mKey].rows.push({
            name: rec.name || rec.id || '—',
            date: rDateStr,
            total_coliform: det.tcc || det.total_coliform || rec.total_coliform || 'absent',
            ecoli: det.ecoli || det.e_coli || rec.ecoli || 'absent',
            hpc1: det.hpc1 ?? det.hpc_count1 ?? rec.hpc1 ?? 0,
            hpc2: det.hpc2 ?? det.hpc_count2 ?? rec.hpc2 ?? 0,
            sample: det.sample || rec.sample || '',
            vessel: rec.vessel || det.vessel || '—',
            product_size: rec.product_size || det.product_size || '—',
            market: rec.market || '—',
            analyst: rec.analyst || '—',
            approved_by: rec.approved_by || '—',
            rawRecord: rec
          });
        });
      } else {
        groups[mKey].rows.push({
          name: rec.name || rec.id || '—',
          date: rDateStr,
          total_coliform: rec.total_coliform || rec.tcc || 'absent',
          ecoli: rec.ecoli || rec.e_coli || 'absent',
          hpc1: rec.hpc1 ?? 0,
          hpc2: rec.hpc2 ?? 0,
          sample: rec.sample || '',
          vessel: rec.vessel || '—',
          product_size: rec.product_size || '—',
          market: rec.market || '—',
          analyst: rec.analyst || '—',
          approved_by: rec.approved_by || '—',
          rawRecord: rec
        });
      }
    });

    return Object.values(groups);
  };

  const groupedData = getGroupedReportData();

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="maintenance-tab-container">
      {/* Header & Controls Toolbar (Hidden during print) */}
      <div className="no-print" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-heading)' }}>
              📊 Periodic Compliance & Quality Reports
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Dynamic report viewer & filter for ERPNext DocTypes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="secondary-btn"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={fetchReportData}
              disabled={loading}
            >
              {loading ? '⟳ Syncing Data...' : '⟳ Refresh Data'}
            </button>
            <button
              type="button"
              className="primary-btn"
              style={{ fontSize: '12px', padding: '6px 16px', backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' }}
              onClick={handlePrintReport}
            >
              🖨️ Print Report / Export PDF
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div
          className="details-card"
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          {/* DocType / Form Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase' }}>
              Form Name / DocType Name
            </label>
            <select
              className="form-input"
              style={{ height: '36px', fontSize: '12px' }}
              value={reportType}
              onChange={e => setReportType(e.target.value)}
            >
              <option value="Microbiologiocal Analysis Raw and Product Water">
                Form 11: Microbiologiocal Analysis Raw and Product Water
              </option>
            </select>
          </div>

          {/* Filter Mode Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '140px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-heading)', textTransform: 'uppercase' }}>
              Filter Mode
            </label>
            <select
              className="form-input"
              style={{ height: '36px', fontSize: '12px' }}
              value={filterMode}
              onChange={e => setFilterMode(e.target.value)}
            >
              <option value="Quarterly">Quarterly</option>
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
              <option value="Custom">Custom Dates</option>
            </select>
          </div>

          {/* Year Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-heading)', textTransform: 'uppercase' }}>
              Year
            </label>
            <select
              className="form-input"
              style={{ height: '36px', fontSize: '12px' }}
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Dynamic Option based on Mode */}
          {filterMode === 'Quarterly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '130px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-heading)', textTransform: 'uppercase' }}>
                Quarter
              </label>
              <select
                className="form-input"
                style={{ height: '36px', fontSize: '12px' }}
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(e.target.value)}
              >
                <option value="Q1">Q1 (Jan - Mar)</option>
                <option value="Q2">Q2 (Apr - Jun)</option>
                <option value="Q3">Q3 (Jul - Sep)</option>
                <option value="Q4">Q4 (Oct - Dec)</option>
              </select>
            </div>
          )}

          {filterMode === 'Monthly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '130px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-heading)', textTransform: 'uppercase' }}>
                Month
              </label>
              <select
                className="form-input"
                style={{ height: '36px', fontSize: '12px' }}
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>
            </div>
          )}

          {filterMode === 'Custom' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-heading)', textTransform: 'uppercase' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  style={{ height: '36px', fontSize: '12px' }}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-heading)', textTransform: 'uppercase' }}>
                  End Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  style={{ height: '36px', fontSize: '12px' }}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Printable Report Document Card Container */}
      <div
        className="printable-report-card"
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '40px 48px',
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          position: 'relative'
        }}
      >
        {/* Document Print Header matching physical report image */}
        <div style={{ textAlign: 'center', marginBottom: '32px', position: 'relative' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', fontFamily: 'serif', letterSpacing: '0.5px' }}>
            {reportType} Report
          </h1>
          <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', textDecoration: 'underline', letterSpacing: '0.5px', color: '#0f172a' }}>
            CARPENTERS WATERS (FIJI) LIMITED
          </div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
            <u>Postal:</u> P O Box 878, Tavua, Fiji &nbsp;|&nbsp; <u>Head Office:</u> Carpenters Building, Suva
          </div>

          {/* Period Badge Top Right */}
          <div
            style={{
              position: 'absolute',
              right: '0px',
              top: '0px',
              fontSize: '16px',
              fontWeight: '800',
              color: '#1e3a8a',
              fontFamily: 'sans-serif'
            }}
          >
            {filterMode === 'Quarterly' ? `${selectedQuarter} ${String(selectedYear).slice(-2)}` : filterMode === 'Monthly' ? formatMonthHeader(selectedYear, selectedMonth) : `${selectedYear}`}
          </div>
        </div>

        {/* Console Print Notification Banner */}
        <div className="no-print" style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '6px', padding: '10px 14px', marginBottom: '24px', fontSize: '12px', color: '#1e40af' }}>
          💡 <strong>Developer Console Output:</strong> Fetched <strong>{records.length}</strong> record(s) from DocType <code>{reportType}</code>. Open your browser console (F12) to inspect raw record objects.
        </div>

        {/* Grouped Month Tables */}
        {groupedData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>No Records Found</div>
            <p style={{ fontSize: '13px', margin: 0 }}>
              No records retrieved from DocType <strong>"{reportType}"</strong> for the selected filter ({filterMode}: {filterMode === 'Quarterly' ? `${selectedQuarter} ${selectedYear}` : selectedYear}).
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {groupedData.map((group, gIdx) => (
              <div key={gIdx} style={{ border: '1.5px solid #000000' }}>
                {/* Month Title Row */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderBottom: '1.5px solid #000000',
                    textAlign: 'center',
                    padding: '6px',
                    fontWeight: '800',
                    fontSize: '13px'
                  }}
                >
                  {group.monthHeader}
                </div>

                {/* Parameters Banner Sub-header Row */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderBottom: '1.5px solid #000000',
                    textAlign: 'center',
                    padding: '6px',
                    fontWeight: '800',
                    fontSize: '12px'
                  }}
                >
                  Parameters (per 100ml sample)
                </div>

                {/* Parameters Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textTransform: 'lowercase' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #000000', textAlign: 'center', fontWeight: '800' }}>
                      <th style={{ padding: '8px 10px', borderRight: '1px solid #000000', width: '100px', textTransform: 'capitalize' }}>Date</th>
                      <th style={{ padding: '8px 10px', borderRight: '1px solid #000000', width: '130px', textTransform: 'none' }}>Ref Document</th>
                      <th style={{ padding: '8px 10px', borderRight: '1px solid #000000', width: '120px', textTransform: 'capitalize' }}>Vessel / Size</th>
                      <th style={{ padding: '8px 10px', borderRight: '1px solid #000000', textTransform: 'uppercase', fontSize: '10px' }}>
                        TOTAL COLIFORM<br/><span style={{ textTransform: 'lowercase', fontWeight: '400' }}>(per 100ml sample)</span>
                      </th>
                      <th style={{ padding: '8px 10px', borderRight: '1px solid #000000', textTransform: 'uppercase', fontSize: '10px' }}>
                        E.COLI<br/><span style={{ textTransform: 'lowercase', fontWeight: '400' }}>(per 100ml sample)</span>
                      </th>
                      <th style={{ padding: '8px 10px', borderRight: '1px solid #000000', textTransform: 'uppercase', fontSize: '10px' }}>
                        HPC<br/><span style={{ textTransform: 'lowercase', fontWeight: '400' }}>(Per 1ml sample) sample 1</span>
                      </th>
                      <th style={{ padding: '8px 10px', textTransform: 'uppercase', fontSize: '10px' }}>
                        HPC<br/><span style={{ textTransform: 'lowercase', fontWeight: '400' }}>(Per 1ml sample) sample 2</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: rIdx === group.rows.length - 1 ? 'none' : '1px solid #000000', textAlign: 'center' }}>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #000000', textTransform: 'capitalize' }}>
                          {formatDateDisplay(row.date)}
                        </td>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #000000', fontWeight: '600', fontFamily: 'monospace' }}>
                          {row.name}
                        </td>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #000000', textTransform: 'capitalize' }}>
                          {row.vessel !== '—' || row.product_size !== '—' ? `${row.vessel !== '—' ? row.vessel : ''} ${row.product_size !== '—' ? `(${row.product_size})` : ''}`.trim() : '—'}
                        </td>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #000000' }}>
                          {row.total_coliform || 'absent'}
                        </td>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #000000' }}>
                          {row.ecoli || 'absent'}
                        </td>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #000000' }}>
                          {row.hpc1 ?? 0}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          {row.hpc2 ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Footer Approval & Footnote */}
        <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#475569' }}>
          <div>
            <strong>Island Chill QA Department</strong> • Dynamic Reports Module
          </div>
          <div>
            Approved By: <u>QC Manager / Analyst</u>
          </div>
        </div>
      </div>

      {/* Print Media Styling */}
      <style>{`
        @media print {
          .no-print, .sidebar, .sidebar-nav, .module-header, header, nav, .system-status, .user-profile {
            display: none !important;
          }
          body, .maintenance-tab-container, .main-content {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-report-card {
            border: none !important;
            box-shadow: none !important;
            padding: 10px !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}


