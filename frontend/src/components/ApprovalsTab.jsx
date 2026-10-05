import React, { useState, useMemo, useEffect } from 'react';
import { frappe } from '../services/frappe';

/**
 * Robust Date Normalizer
 * Handles ISO strings ('2026-10-01T...'), 'YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', etc.
 */
const normalizeDateStr = (rawDate) => {
  if (!rawDate) return '';
  const str = String(rawDate).trim().split(' ')[0].split('T')[0];
  if (!str) return '';

  // Match DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split('-');
    return `${y}-${m}-${d}`;
  }
  // Match DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Try Date constructor
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str;
};

/**
 * ApprovalsTab Component
 * Centralized Form Approvals Desk for Island Chill Bottling Operations.
 * 
 * Key Rules:
 *  1. Date Range Filtering: All KPI cards and module badges recalculate strictly based on the active Date Range.
 *  2. Lock Approved Forms: Once a form is Approved, it CANNOT be rejected (Workflow Integrity).
 *  3. Only Work Order Linked forms are tracked.
 *  4. Full Theme Alignment with Island Chill Design System.
 */
export default function ApprovalsTab({
  laboratoryRecords = [],
  setLaboratoryRecords,
  cleaningRecords = [],
  setCleaningRecords,
  safetyRecords = [],
  setSafetyRecords,
  maintenanceRecords = [],
  setMaintenanceRecords,
  workOrders = [],
  setWorkOrders,
  currentUser = 'Supervisor',
  currentUserRole = 'System Manager',
  isLoggedIn = false,
  onRefreshAll
}) {
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPastDateStr = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 1. DATE RANGE STATE (Defaults to Today)
  const [fromDate, setFromDate] = useState(getTodayStr());
  const [toDate, setToDate] = useState(getTodayStr());
  const [activeDatePreset, setActiveDatePreset] = useState('today'); // 'today' | '7days' | '30days' | 'all'
  const [liveCurrentTime, setLiveCurrentTime] = useState(new Date().toLocaleTimeString());

  // 2. DEFAULT STATUS: 'Pending'
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'laboratory' | 'cleaning' | 'safety' | 'maintenance'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWoFilter, setSelectedWoFilter] = useState('all');
  const [requireWoOnly, setRequireWoOnly] = useState(true);

  // Batch & Action State
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals
  const [inspectingItem, setInspectingItem] = useState(null);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [electronicSign, setElectronicSign] = useState(currentUser || 'Supervisor');

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Date Presets Handler
  const handleDatePreset = (preset) => {
    setActiveDatePreset(preset);
    const today = getTodayStr();
    if (preset === 'today') {
      setFromDate(today);
      setToDate(today);
    } else if (preset === '7days') {
      setFromDate(getPastDateStr(7));
      setToDate(today);
    } else if (preset === '30days') {
      setFromDate(getPastDateStr(30));
      setToDate(today);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // Helper to extract Work Order ID from diverse records
  const extractWorkOrder = (rec) => {
    if (!rec) return '';
    const val = (
      rec.work_order ||
      rec.workOrder ||
      rec.woId ||
      rec.work_order_id ||
      rec.details?.work_order ||
      rec.details?.workOrder ||
      (typeof rec.batchNo === 'string' && rec.batchNo.startsWith('MFG-') ? rec.batchNo : '') ||
      ''
    );
    return typeof val === 'string' ? val.trim() : String(val);
  };

  // 3. UNIFIED RECORD NORMALIZATION (Strict Work Order Link)
  const allNormalizedRecords = useMemo(() => {
    const list = [];

    // --- Laboratory Records ---
    (laboratoryRecords || []).forEach((rec, idx) => {
      const wo = extractWorkOrder(rec);
      if (requireWoOnly && !wo) return;

      const rawStatus = (rec.status || '').toLowerCase();
      const wfState = (rec.workflow_state || '').toLowerCase();
      const isApproved = rawStatus === 'approved' || rec.isApproved === true || rec.docstatus === 1 || rawStatus === 'completed' || rawStatus === 'pass' || wfState.includes('approved') || Boolean(rec.approvalTimestamp);
      const isRejected = rawStatus === 'rejected' || rawStatus === 'fail' || rec.isRejected === true || wfState.includes('rejected');
      const status = isRejected ? 'Rejected' : isApproved ? 'Approved' : 'Pending';

      const dateStr = normalizeDateStr(rec.date || rec.date_of_analysis || (rec.timestamp ? rec.timestamp.split(' ')[0] : '') || rec.creation);
      const uniqueId = rec.id || rec.name || `LAB-${idx}-${dateStr}`;

      list.push({
        id: uniqueId,
        doctype: rec.doctype || rec.type || 'Microbiological Analysis of Primary Raw Materials',
        module: 'laboratory',
        moduleLabel: 'Laboratory QA',
        moduleIcon: '🔬',
        moduleColor: '#8b5cf6',
        formType: rec.type || rec.formName || 'QA Laboratory Inspection',
        title: rec.type || 'Laboratory QA Test Record',
        workOrder: wo || 'N/A',
        date: dateStr,
        time: rec.time || (rec.timestamp ? rec.timestamp.split(' ')[1] : '') || '',
        submitter: rec.operator || rec.chemist || rec.testedBy || rec.user || 'Lab Chemist',
        approver: isApproved ? (rec.approved_by || rec.supervisor || rec.verified_by || 'Supervisor') : null,
        approvalTimestamp: rec.approvalTimestamp || (isApproved ? rec.timestamp : null),
        status,
        remarks: rec.remarks || rec.notes || rec.rejectionReason || '',
        referenceNo: wo || rec.batchNo || rec.sampleId || '',
        rawRecord: rec
      });
    });

    // --- Cleaning & Sanitation Records ---
    (cleaningRecords || []).forEach((rec, idx) => {
      const wo = extractWorkOrder(rec);
      if (requireWoOnly && !wo) return;

      const rawStatus = (rec.status || rec.sanitation_result || '').toLowerCase();
      const wfState = (rec.workflow_state || '').toLowerCase();
      const isApproved = rawStatus === 'approved' || rec.isApproved === true || rec.docstatus === 1 || rawStatus === 'pass' || rawStatus === 'completed' || wfState.includes('approved') || Boolean(rec.approvalTimestamp);
      const isRejected = rawStatus === 'rejected' || rawStatus === 'fail' || rec.isRejected === true || wfState.includes('rejected');
      const status = isRejected ? 'Rejected' : isApproved ? 'Approved' : 'Pending';

      const dateStr = normalizeDateStr(rec.posting_date || rec.date || (rec.timestamp ? rec.timestamp.split(' ')[0] : '') || rec.creation);
      const uniqueId = rec.id || rec.name || `CS-${idx}-${dateStr}`;

      list.push({
        id: uniqueId,
        doctype: rec.doctype || rec.type || 'Cleaning of Toilets',
        module: 'cleaning',
        moduleLabel: 'Cleaning & Sanitation',
        moduleIcon: '🧹',
        moduleColor: '#06b6d4',
        formType: rec.type || 'Cleaning & Sanitation Form',
        title: rec.type || 'Facility Sanitation Log',
        workOrder: wo || 'N/A',
        date: dateStr,
        time: rec.posting_time || rec.time || (rec.timestamp ? rec.timestamp.split(' ')[1] : '') || '',
        submitter: rec.cleaner || rec.operator_name || rec.duties_performed_by || rec.performed_by_operator || 'Sanitation Staff',
        approver: isApproved ? (rec.supervisor || rec.supervisor_name || rec.verified_by || 'Supervisor') : null,
        approvalTimestamp: rec.approvalTimestamp || (isApproved ? rec.timestamp : null),
        status,
        remarks: rec.remarks || rec.comments || rec.details?.comments || '',
        referenceNo: wo || rec.area || '',
        rawRecord: rec
      });
    });

    // --- Health & Safety Records ---
    (safetyRecords || []).forEach((rec, idx) => {
      const wo = extractWorkOrder(rec);
      if (requireWoOnly && !wo) return;

      const rawStatus = (rec.status || '').toLowerCase();
      const wfState = (rec.workflow_state || '').toLowerCase();
      const isApproved = rawStatus === 'approved' || rec.isApproved === true || rawStatus === 'closed' || rawStatus === 'resolved' || rec.docstatus === 1 || wfState.includes('approved') || Boolean(rec.approvalTimestamp);
      const isRejected = rawStatus === 'rejected' || rawStatus === 'fail' || rec.isRejected === true || wfState.includes('rejected');
      const status = isRejected ? 'Rejected' : isApproved ? 'Approved' : 'Pending';

      const dateStr = normalizeDateStr(rec.date || (rec.timestamp ? rec.timestamp.split(' ')[0] : '') || rec.creation);
      const uniqueId = rec.id || rec.name || `SAF-${idx}-${dateStr}`;

      list.push({
        id: uniqueId,
        doctype: rec.doctype || 'Incident Log',
        module: 'safety',
        moduleLabel: 'Health & Safety',
        moduleIcon: '🦺',
        moduleColor: '#f59e0b',
        formType: rec.type || 'Safety Audit Record',
        title: rec.type || 'HSE Incident & Audit Log',
        workOrder: wo || 'N/A',
        date: dateStr,
        time: rec.time || (rec.timestamp ? rec.timestamp.split(' ')[1] : '') || '',
        submitter: rec.reported_by || rec.inspector || rec.officer || rec.submittedBy || 'Safety Officer',
        approver: isApproved ? (rec.supervisor || rec.approvedByName || 'HSE Manager') : null,
        approvalTimestamp: rec.approvalTimestamp || (isApproved ? rec.timestamp : null),
        status,
        remarks: rec.remarks || rec.description || rec.rejectionReason || '',
        referenceNo: wo || rec.location || '',
        rawRecord: rec
      });
    });

    // --- Maintenance Records ---
    (maintenanceRecords || []).forEach((rec, idx) => {
      const wo = extractWorkOrder(rec);
      if (requireWoOnly && !wo) return;

      const rawStatus = (rec.status || '').toLowerCase();
      const wfState = (rec.workflow_state || '').toLowerCase();
      const isApproved = rawStatus === 'approved' || rec.isApproved === true || rec.docstatus === 1 || rawStatus === 'completed' || wfState.includes('approved') || Boolean(rec.approvalTimestamp);
      const isRejected = rawStatus === 'rejected' || rawStatus === 'fail' || rec.isRejected === true || wfState.includes('rejected');
      const status = isRejected ? 'Rejected' : isApproved ? 'Approved' : 'Pending';

      const dateStr = normalizeDateStr(rec.date || rec.fromDate || rec.breakdownDate || rec.creation);
      const uniqueId = rec.id || rec.name || `MNT-${idx}-${dateStr}`;

      list.push({
        id: uniqueId,
        doctype: rec.doctype || 'Daily Preventative Maintenance Schedule',
        module: 'maintenance',
        moduleLabel: 'Maintenance & PM',
        moduleIcon: '🔧',
        moduleColor: '#3b82f6',
        formType: rec.type || rec.templateTitle || rec.title || 'Preventive Maintenance Form',
        title: `${rec.equipment ? `[${rec.equipment}] ` : ''}${rec.type || rec.templateTitle || 'Equipment Maintenance'}`,
        workOrder: wo || 'N/A',
        date: dateStr,
        time: rec.time || rec.breakdownTime || '',
        submitter: rec.operator || rec.operatorDisplay || rec.technician || rec.requestorName || 'Maintenance Tech',
        approver: isApproved ? (rec.supervisor || rec.approvedByFM || rec.approvedByMM || 'Factory Manager') : null,
        approvalTimestamp: rec.approvalTimestamp || (isApproved ? rec.timestamp : null),
        status,
        remarks: rec.remarks || rec.breakdownDesc || rec.overallComments || '',
        referenceNo: wo || rec.equipment || '',
        rawRecord: rec
      });
    });

    return list.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [laboratoryRecords, cleaningRecords, safetyRecords, maintenanceRecords, requireWoOnly]);

  // 4. DATE-RANGE FILTERED RECORDS (Strict matching - records with empty dates are not leaked into date filters)
  const dateScopedRecords = useMemo(() => {
    return allNormalizedRecords.filter(item => {
      // If no date filters are set, include all
      if (!fromDate && !toDate) return true;

      // If date range is active, but item has no date, exclude it
      if (!item.date) return false;

      const itemDate = item.date;
      if (fromDate && itemDate < fromDate) return false;
      if (toDate && itemDate > toDate) return false;
      return true;
    });
  }, [allNormalizedRecords, fromDate, toDate]);

  // 5. DYNAMIC KPI CARDS (Calculated strictly on dateScopedRecords)
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    const categoryCounts = {
      laboratory: { pending: 0, total: 0 },
      cleaning: { pending: 0, total: 0 },
      safety: { pending: 0, total: 0 },
      maintenance: { pending: 0, total: 0 }
    };

    dateScopedRecords.forEach(item => {
      if (item.status === 'Pending') pendingCount++;
      else if (item.status === 'Approved') approvedCount++;
      else if (item.status === 'Rejected') rejectedCount++;

      if (categoryCounts[item.module]) {
        categoryCounts[item.module].total++;
        if (item.status === 'Pending') categoryCounts[item.module].pending++;
      }
    });

    return {
      total: dateScopedRecords.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      categoryCounts
    };
  }, [dateScopedRecords]);

  // 6. Table Filtered Records (Category + Status + WO + Search)
  const filteredRecords = useMemo(() => {
    return dateScopedRecords.filter(item => {
      if (activeCategory !== 'all' && item.module !== activeCategory) {
        return false;
      }

      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (selectedWoFilter !== 'all' && item.workOrder !== selectedWoFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (item.id || '').toLowerCase().includes(q);
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchType = (item.formType || '').toLowerCase().includes(q);
        const matchSubmitter = (item.submitter || '').toLowerCase().includes(q);
        const matchApprover = (item.approver || '').toLowerCase().includes(q);
        const matchWo = (item.workOrder || '').toLowerCase().includes(q);
        return matchId || matchTitle || matchType || matchSubmitter || matchApprover || matchWo;
      }

      return true;
    });
  }, [dateScopedRecords, activeCategory, statusFilter, selectedWoFilter, searchQuery]);

  // Available Work Orders for quick dropdown
  const availableWorkOrders = useMemo(() => {
    const set = new Set();
    (workOrders || []).forEach(wo => {
      const id = wo.name || wo.id;
      if (id) set.add(id);
    });
    dateScopedRecords.forEach(r => {
      if (r.workOrder && r.workOrder !== 'N/A') set.add(r.workOrder);
    });
    return Array.from(set).sort();
  }, [dateScopedRecords, workOrders]);

  // 7. PERMANENT CLEANUP: Purge all forms without a linked Work Order
  const handlePurgeUnlinkedForms = () => {
    let purgedCount = 0;

    if (setLaboratoryRecords) {
      setLaboratoryRecords(prev => {
        const kept = prev.filter(r => Boolean(extractWorkOrder(r)));
        purgedCount += prev.length - kept.length;
        localStorage.setItem('fiji_laboratory_records', JSON.stringify(kept));
        return kept;
      });
    }

    if (setCleaningRecords) {
      setCleaningRecords(prev => {
        const kept = prev.filter(r => Boolean(extractWorkOrder(r)));
        purgedCount += prev.length - kept.length;
        return kept;
      });
    }

    if (setSafetyRecords) {
      setSafetyRecords(prev => {
        const kept = prev.filter(r => Boolean(extractWorkOrder(r)));
        purgedCount += prev.length - kept.length;
        localStorage.setItem('fiji_safety_records', JSON.stringify(kept));
        return kept;
      });
    }

    if (setMaintenanceRecords) {
      setMaintenanceRecords(prev => {
        const kept = prev.filter(r => Boolean(extractWorkOrder(r)));
        purgedCount += prev.length - kept.length;
        localStorage.setItem('fiji_maintenance_records', JSON.stringify(kept));
        return kept;
      });
    }

    showToast(`Successfully purged unlinked forms from the system!`, 'success');
    setShowPurgeModal(false);
  };

  // 8. UNIFIED APPROVE ACTION (Instant UI feedback + ERPNext DB sync)
  const handleApprove = async (item, notes = '') => {
    setIsProcessing(true);
    const approverName = electronicSign || currentUser || 'Supervisor';
    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const todayDate = nowTimestamp.split(' ')[0];
    const nowTime = nowTimestamp.split(' ')[1];

    try {
      const conn = frappe.getConnectionSettings();
      const isLive = conn.isLive && conn.connected;

      // 1. ERPNext DB Sync
      if (isLive) {
        try {
          if (item.module === 'cleaning') {
            await frappe.updateCleaningSanitationRecord(item.formType || item.doctype, item.id, {
              docstatus: 1,
              sanitation_result: 'Pass',
              status: 'Approved',
              supervisor_name: approverName,
              verified_by_supervisor: approverName,
              approval_date: todayDate,
              approval_time: nowTime
            });
          } else {
            // Attempt Frappe Workflow transition if document uses a Frappe Workflow
            let wfSuccess = false;
            try {
              const wfRes = await frappe.makeRequest('POST', 'frappe.model.workflow.apply_workflow', null, {
                doc: JSON.stringify({ doctype: item.doctype || item.formType, name: item.id }),
                action: 'Approve'
              });
              if (wfRes) wfSuccess = true;
            } catch (wfErr) {
              console.log('apply_workflow transition skipped/failed, using direct doc update:', wfErr);
            }

            if (!wfSuccess) {
              await frappe.makeRequest('PUT', item.doctype || item.formType, item.id, {
                docstatus: 1,
                workflow_state: 'Approved',
                status: 'Approved',
                approved_by: approverName,
                supervisor: approverName,
                verified_by: approverName,
                approval_date: todayDate,
                approval_time: nowTime,
                approval_notes: notes
              });
            }
          }
        } catch (erpErr) {
          console.warn('ERPNext live sync warning:', erpErr);
        }
      }

      // 2. Immediate React State & LocalStorage Updates
      if (item.module === 'laboratory' && setLaboratoryRecords) {
        setLaboratoryRecords(prev => {
          const updated = prev.map(r => {
            if (r === item.rawRecord || (r.id && r.id === item.id) || (r.name && r.name === item.id) || (r.timestamp && r.timestamp === item.rawRecord.timestamp)) {
              return {
                ...r,
                status: 'Approved',
                isApproved: true,
                docstatus: 1,
                workflow_state: 'Approved',
                supervisor: approverName,
                approved_by: approverName,
                approvalTimestamp: nowTimestamp,
                approvalNotes: notes
              };
            }
            return r;
          });
          localStorage.setItem('fiji_laboratory_records', JSON.stringify(updated));
          return updated;
        });
      } else if (item.module === 'cleaning' && setCleaningRecords) {
        setCleaningRecords(prev =>
          prev.map(r => {
            if (r === item.rawRecord || (r.id && r.id === item.id) || (r.name && r.name === item.id) || (r.timestamp && r.timestamp === item.rawRecord.timestamp)) {
              return {
                ...r,
                status: 'Approved',
                isApproved: true,
                sanitation_result: 'Pass',
                docstatus: 1,
                supervisor: approverName,
                supervisor_name: approverName,
                approvalTimestamp: nowTimestamp,
                approvalNotes: notes
              };
            }
            return r;
          })
        );
      } else if (item.module === 'safety' && setSafetyRecords) {
        setSafetyRecords(prev => {
          const updated = prev.map(r => {
            if (r === item.rawRecord || (r.id && r.id === item.id) || (r.name && r.name === item.id) || (r.timestamp && r.timestamp === item.rawRecord.timestamp)) {
              return {
                ...r,
                status: 'Approved',
                isApproved: true,
                workflow_state: 'Approved',
                supervisor: approverName,
                approvedByName: approverName,
                approvalTimestamp: nowTimestamp,
                approvalNotes: notes
              };
            }
            return r;
          });
          localStorage.setItem('fiji_safety_records', JSON.stringify(updated));
          return updated;
        });
      } else if (item.module === 'maintenance' && setMaintenanceRecords) {
        setMaintenanceRecords(prev => {
          const updated = prev.map(r => {
            if (r === item.rawRecord || (r.id && r.id === item.id) || (r.name && r.name === item.id) || (r.timestamp && r.timestamp === item.rawRecord.timestamp)) {
              return {
                ...r,
                status: 'Approved',
                isApproved: true,
                docstatus: 1,
                workflow_state: 'Approved',
                supervisor: approverName,
                approvedByFM: approverName,
                approvalTimestamp: nowTimestamp,
                approvalNotes: notes
              };
            }
            return r;
          });
          localStorage.setItem('fiji_maintenance_records', JSON.stringify(updated));
          return updated;
        });
      }

      showToast(`Form "${item.id}" successfully Approved & Signed!`, 'success');
      setInspectingItem(null);
    } catch (err) {
      console.error('Error approving record:', err);
      showToast(`Failed to approve form: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 9. UNIFIED REJECT ACTION (ONLY FOR PENDING FORMS)
  const handleReject = async (item, reason = '') => {
    if (item.status === 'Approved') {
      showToast('Approved forms are finalized and cannot be rejected.', 'error');
      return;
    }

    if (!reason.trim()) {
      showToast('Please specify reason for rejection.', 'error');
      return;
    }
    setIsProcessing(true);
    const rejectorName = electronicSign || currentUser || 'Supervisor';
    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    try {
      const conn = frappe.getConnectionSettings();
      const isLive = conn.isLive && conn.connected;

      if (isLive) {
        try {
          await frappe.makeRequest('PUT', item.doctype || item.formType, item.id, {
            workflow_state: 'Rejected',
            status: 'Rejected',
            rejection_reason: reason,
            remarks: `[REJECTED: ${reason}]`
          });
        } catch (erpErr) {
          console.warn('ERPNext rejection sync warning:', erpErr);
        }
      }

      if (item.module === 'laboratory' && setLaboratoryRecords) {
        setLaboratoryRecords(prev => {
          const updated = prev.map(r => (r === item.rawRecord || r.id === item.id || r.name === item.id ? { ...r, status: 'Rejected', isRejected: true, isApproved: false, supervisor: rejectorName, rejectionReason: reason, approvalTimestamp: nowTimestamp } : r));
          localStorage.setItem('fiji_laboratory_records', JSON.stringify(updated));
          return updated;
        });
      } else if (item.module === 'cleaning' && setCleaningRecords) {
        setCleaningRecords(prev =>
          prev.map(r => (r === item.rawRecord || r.id === item.id || r.name === item.id ? { ...r, status: 'Rejected', isRejected: true, isApproved: false, sanitation_result: 'Fail', supervisor: rejectorName, remarks: `[REJECTED: ${reason}]`, approvalTimestamp: nowTimestamp } : r))
        );
      } else if (item.module === 'safety' && setSafetyRecords) {
        setSafetyRecords(prev => {
          const updated = prev.map(r => (r === item.rawRecord || r.id === item.id || r.name === item.id ? { ...r, status: 'Rejected', isRejected: true, isApproved: false, supervisor: rejectorName, rejectionReason: reason, approvalTimestamp: nowTimestamp } : r));
          localStorage.setItem('fiji_safety_records', JSON.stringify(updated));
          return updated;
        });
      } else if (item.module === 'maintenance' && setMaintenanceRecords) {
        setMaintenanceRecords(prev => {
          const updated = prev.map(r => (r === item.rawRecord || r.id === item.id || r.name === item.id ? { ...r, status: 'Rejected', isRejected: true, isApproved: false, supervisor: rejectorName, rejectionReason: reason, approvalTimestamp: nowTimestamp } : r));
          localStorage.setItem('fiji_maintenance_records', JSON.stringify(updated));
          return updated;
        });
      }

      showToast(`Form "${item.id}" marked as Rejected / Action Required.`, 'info');
      setRejectingItem(null);
      setRejectionReason('');
      setInspectingItem(null);
    } catch (err) {
      console.error('Error rejecting record:', err);
      showToast(`Failed to reject form: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch Select Handlers
  const handleSelectAll = e => {
    if (e.target.checked) {
      const pendingIds = filteredRecords
        .filter(r => r.status === 'Pending')
        .map(r => r.id);
      setSelectedItemIds(pendingIds);
    } else {
      setSelectedItemIds([]);
    }
  };

  const handleToggleSelect = id => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Batch Approve Action
  const handleBatchApprove = async () => {
    if (selectedItemIds.length === 0) return;
    setIsProcessing(true);
    const count = selectedItemIds.length;
    const approverName = electronicSign || currentUser || 'Supervisor';
    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    try {
      const selectedSet = new Set(selectedItemIds);

      if (setLaboratoryRecords) {
        setLaboratoryRecords(prev => {
          const updated = prev.map(r => selectedSet.has(r.id) || selectedSet.has(r.name) ? { ...r, status: 'Approved', isApproved: true, docstatus: 1, supervisor: approverName, approvalTimestamp: nowTimestamp } : r);
          localStorage.setItem('fiji_laboratory_records', JSON.stringify(updated));
          return updated;
        });
      }
      if (setCleaningRecords) {
        setCleaningRecords(prev =>
          prev.map(r => selectedSet.has(r.id) || selectedSet.has(r.name) ? { ...r, status: 'Approved', isApproved: true, sanitation_result: 'Pass', docstatus: 1, supervisor: approverName, approvalTimestamp: nowTimestamp } : r)
        );
      }
      if (setSafetyRecords) {
        setSafetyRecords(prev => {
          const updated = prev.map(r => selectedSet.has(r.id) || selectedSet.has(r.name) ? { ...r, status: 'Approved', isApproved: true, supervisor: approverName, approvalTimestamp: nowTimestamp } : r);
          localStorage.setItem('fiji_safety_records', JSON.stringify(updated));
          return updated;
        });
      }
      if (setMaintenanceRecords) {
        setMaintenanceRecords(prev => {
          const updated = prev.map(r => selectedSet.has(r.id) || selectedSet.has(r.name) ? { ...r, status: 'Approved', isApproved: true, docstatus: 1, supervisor: approverName, approvalTimestamp: nowTimestamp } : r);
          localStorage.setItem('fiji_maintenance_records', JSON.stringify(updated));
          return updated;
        });
      }
      if (setWorkOrders) {
        setWorkOrders(prev => {
          const updated = prev.map(wo => selectedSet.has(wo.id) || selectedSet.has(wo.name) ? { ...wo, status: 'Completed', docstatus: 1, modified: nowTimestamp, modified_by: approverName } : wo);
          localStorage.setItem('fiji_work_orders', JSON.stringify(updated));
          return updated;
        });
      }

      showToast(`Batch approved ${count} Work Order forms!`, 'success');
      setSelectedItemIds([]);
      setShowBatchModal(false);
    } catch (err) {
      console.error('Batch approval error:', err);
      showToast(`Error batch approving: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="tab-content" style={{ padding: '20px 24px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: notification.type === 'success' ? '#10b981' : notification.type === 'error' ? '#ef4444' : '#3b82f6',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          <span>{notification.type === 'success' ? '✅' : notification.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DATE RANGE TOP BAR (CONTROLS ALL CARDS & TABLE DYNAMICALLY) */}
      {/* ========================================================================= */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          borderLeft: '4px solid var(--accent, #f59e0b)'
        }}
      >
        {/* Date Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px' }}>📅</span>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-heading)', textTransform: 'uppercase' }}>
              Date Range:
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              value={fromDate}
              onChange={e => {
                setFromDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              className="form-input"
              style={{ width: '135px', padding: '6px 8px', fontSize: '12px', height: '34px', margin: 0 }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={e => {
                setToDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              className="form-input"
              style={{ width: '135px', padding: '6px 8px', fontSize: '12px', height: '34px', margin: 0 }}
            />
          </div>

          {/* Quick Date Presets */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: 'all', label: 'All Dates' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                className={activeDatePreset === p.id ? 'primary-btn' : 'secondary-btn'}
                style={{ fontSize: '11px', padding: '4px 10px', height: '32px' }}
                onClick={() => handleDatePreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* WO Only Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', cursor: 'pointer', marginLeft: '8px' }}>
            <input
              type="checkbox"
              checked={requireWoOnly}
              onChange={e => setRequireWoOnly(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Work Order Linked Only</span>
          </label>
        </div>

        {/* Live Clock, Purge Button & Signer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ fontSize: '11px', padding: '4px 10px', height: '32px', color: '#b91c1c', borderColor: '#fca5a5' }}
            onClick={() => setShowPurgeModal(true)}
            title="Clean all legacy dummy forms without a Work Order"
          >
            🧹 Purge Unlinked Forms
          </button>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⏱️</span>
            <strong style={{ color: 'var(--text-heading)', fontFamily: 'var(--mono)' }}>{liveCurrentTime}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signer:</label>
            <input
              type="text"
              value={electronicSign}
              onChange={e => setElectronicSign(e.target.value)}
              className="form-input"
              style={{ width: '120px', padding: '4px 8px', fontSize: '12px', height: '32px', margin: 0, fontWeight: '700' }}
            />
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="wo-tab-header" style={{ marginBottom: '20px' }}>
        <div className="tab-title-desc">
          <h2>Central Form Approvals & Quality Sign-off</h2>
          <p>
            Review, inspect and sign operational records linked to Work Orders across Laboratory QA, Cleaning, Safety & Maintenance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {selectedItemIds.length > 0 && (
            <button
              className="primary-btn"
              onClick={() => setShowBatchModal(true)}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
            >
              ⚡ Batch Approve ({selectedItemIds.length})
            </button>
          )}

          {onRefreshAll && (
            <button className="secondary-btn" onClick={onRefreshAll}>
              🔄 Refresh
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC KPI STATS CARDS (RECALCULATED STRICTLY BASED ON DATE RANGE) */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}
      >
        {/* Pending Card (Default highlighted) */}
        <div
          className="card"
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'all' : 'Pending')}
          style={{
            padding: '16px',
            cursor: 'pointer',
            border: statusFilter === 'Pending' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
            backgroundColor: statusFilter === 'Pending' ? '#fffbeb' : 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>
              Pending Review
            </span>
            <span className="badge badge-progress" style={{ fontSize: '10px' }}>Action Required</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#b45309', lineHeight: 1.1 }}>
            {metrics.pending}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Forms awaiting approval
          </div>
        </div>

        {/* Approved Card */}
        <div
          className="card"
          onClick={() => setStatusFilter(statusFilter === 'Approved' ? 'all' : 'Approved')}
          style={{
            padding: '16px',
            cursor: 'pointer',
            border: statusFilter === 'Approved' ? '2px solid #10b981' : '1px solid var(--border-color)',
            backgroundColor: statusFilter === 'Approved' ? '#ecfdf5' : 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#047857', textTransform: 'uppercase' }}>
              Approved Forms
            </span>
            <span className="badge badge-completed" style={{ fontSize: '10px' }}>Signed</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#047857', lineHeight: 1.1 }}>
            {metrics.approved}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Verified in date range
          </div>
        </div>

        {/* Rejected Card */}
        <div
          className="card"
          onClick={() => setStatusFilter(statusFilter === 'Rejected' ? 'all' : 'Rejected')}
          style={{
            padding: '16px',
            cursor: 'pointer',
            border: statusFilter === 'Rejected' ? '2px solid #ef4444' : '1px solid var(--border-color)',
            backgroundColor: statusFilter === 'Rejected' ? '#fef2f2' : 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase' }}>
              Rejected / Revision
            </span>
            <span className="badge badge-danger" style={{ fontSize: '10px' }}>Flagged</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#b91c1c', lineHeight: 1.1 }}>
            {metrics.rejected}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Non-conformance forms
          </div>
        </div>

        {/* Total Queue Card */}
        <div
          className="card"
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '16px',
            cursor: 'pointer',
            border: statusFilter === 'all' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-heading)', textTransform: 'uppercase' }}>
              Total WO Forms
            </span>
            <span className="badge badge-qc" style={{ fontSize: '10px' }}>All</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-heading)', lineHeight: 1.1 }}>
            {metrics.total}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            All forms in selected date range
          </div>
        </div>
      </div>

      {/* Module Category Filters */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
        {[
          { id: 'all', label: 'All Modules', icon: '🌐', count: metrics.total, pending: metrics.pending },
          { id: 'laboratory', label: 'Laboratory QA', icon: '🔬', count: metrics.categoryCounts.laboratory?.total || 0, pending: metrics.categoryCounts.laboratory?.pending || 0 },
          { id: 'cleaning', label: 'Cleaning & Sanitation', icon: '🧹', count: metrics.categoryCounts.cleaning?.total || 0, pending: metrics.categoryCounts.cleaning?.pending || 0 },
          { id: 'safety', label: 'Health & Safety', icon: '🦺', count: metrics.categoryCounts.safety?.total || 0, pending: metrics.categoryCounts.safety?.pending || 0 },
          { id: 'maintenance', label: 'Maintenance & PM', icon: '🔧', count: metrics.categoryCounts.maintenance?.total || 0, pending: metrics.categoryCounts.maintenance?.pending || 0 }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={activeCategory === cat.id ? 'primary-btn' : 'secondary-btn'}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span style={{ backgroundColor: 'rgba(0,0,0,0.08)', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>
              {cat.count}
            </span>
            {cat.pending > 0 && (
              <span style={{ backgroundColor: '#f59e0b', color: '#ffffff', padding: '1px 5px', borderRadius: '8px', fontSize: '10px', fontWeight: '800' }}>
                {cat.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Secondary Search & Dropdown Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}
      >
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by Form ID, Work Order, Submitter, Title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ width: '100%', paddingLeft: '32px', margin: 0, height: '36px' }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Work Order Filter */}
        {availableWorkOrders.length > 0 && (
          <select
            value={selectedWoFilter}
            onChange={e => setSelectedWoFilter(e.target.value)}
            className="form-input"
            style={{ width: '180px', margin: 0, height: '36px', fontSize: '12px' }}
          >
            <option value="all">All Work Orders ({availableWorkOrders.length})</option>
            {availableWorkOrders.map(wo => (
              <option key={wo} value={wo}>📋 {wo}</option>
            ))}
          </select>
        )}

        {/* Status Filter Dropdown */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-input"
          style={{ width: '160px', margin: 0, height: '36px', fontSize: '12px', fontWeight: '600' }}
        >
          <option value="all">All Statuses</option>
          <option value="Pending">⏳ Pending Approval</option>
          <option value="Approved">✅ Approved</option>
          <option value="Rejected">❌ Rejected</option>
        </select>
      </div>

      {/* Main Approvals Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
            <h3 style={{ fontSize: '15px', color: 'var(--text-heading)', margin: '0 0 4px 0' }}>
              No forms matching selected filters
            </h3>
            <p style={{ fontSize: '12px', margin: 0 }}>
              Try adjusting the date range or status filter.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '10px 12px', width: '36px' }}>
                    <input
                      type="checkbox"
                      checked={
                        selectedItemIds.length > 0 &&
                        selectedItemIds.length === filteredRecords.filter(r => r.status === 'Pending').length
                      }
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '700' }}>FORM & MODULE</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '700' }}>WORK ORDER</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '700' }}>TITLE / SPECIFICATION</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '700' }}>SUBMITTED BY</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '700' }}>DATE & TIME</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '700' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '700' }}>APPROVAL SIGN</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '700', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item, idx) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const isApproved = item.status === 'Approved';
                  const isPending = item.status === 'Pending';

                  return (
                    <tr
                      key={`${item.module}-${item.id}-${idx}`}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isSelected ? '#eff6ff' : idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '10px 12px' }}>
                        {isPending ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Module & Form ID */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{item.moduleIcon}</span>
                          <div>
                            <strong style={{ color: 'var(--text-heading)' }}>{item.id}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.moduleLabel}</div>
                          </div>
                        </div>
                      </td>

                      {/* Work Order */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: '600', color: 'var(--info)', fontSize: '11px' }}>
                          {item.workOrder || 'N/A'}
                        </span>
                      </td>

                      {/* Title */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                      </td>

                      {/* Submitter */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: 'var(--text-main)' }}>{item.submitter}</span>
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '10px 12px' }}>
                        <div>{item.date || 'N/A'}</div>
                        {item.time && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.time}</div>}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '10px 12px' }}>
                        {isPending ? (
                          <span className="badge badge-progress" style={{ fontSize: '11px' }}>⏳ Pending</span>
                        ) : isApproved ? (
                          <span className="badge badge-completed" style={{ fontSize: '11px' }}>✓ Approved</span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '11px' }}>✕ Rejected</span>
                        )}
                      </td>

                      {/* Approver info */}
                      <td style={{ padding: '10px 12px' }}>
                        {item.approver ? (
                          <div>
                            <strong style={{ color: 'var(--text-heading)', fontSize: '11px' }}>✍️ {item.approver}</strong>
                            {item.approvalTimestamp && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.approvalTimestamp}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>Unsigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => setInspectingItem(item)}
                          >
                            👁️ View
                          </button>

                          {/* Approve Button - Only for Pending/Rejected */}
                          {!isApproved && (
                            <button
                              type="button"
                              className="primary-btn"
                              style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                              disabled={isProcessing}
                              onClick={() => handleApprove(item)}
                            >
                              ✓ Approve
                            </button>
                          )}

                          {/* Reject Button - STRICTLY ONLY FOR PENDING FORMS (Approved forms are locked) */}
                          {isPending && (
                            <button
                              type="button"
                              className="danger-btn"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              disabled={isProcessing}
                              onClick={() => {
                                setRejectingItem(item);
                                setRejectionReason('');
                              }}
                            >
                              ✕ Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECTION MODAL */}
      {inspectingItem && (
        <div className="modal-backdrop" onClick={() => setInspectingItem(null)}>
          <div className="modal-panel" style={{ width: '760px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{inspectingItem.moduleIcon}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-heading)' }}>
                    {inspectingItem.title}
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {inspectingItem.moduleLabel} • Work Order: <strong style={{ color: 'var(--info)' }}>{inspectingItem.workOrder}</strong>
                  </div>
                </div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={() => setInspectingItem(null)}>✕</button>
            </div>

            <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                <div><span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Work Order:</span><br /><strong>{inspectingItem.workOrder}</strong></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Submitted By:</span><br /><strong>{inspectingItem.submitter}</strong></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Submission Date:</span><br /><strong>{inspectingItem.date} {inspectingItem.time}</strong></div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: 'var(--text-heading)' }}>Parameters & Submitted Data</h4>
                <div style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', maxHeight: '240px', overflowY: 'auto', fontSize: '12px' }}>
                  {Object.entries(inspectingItem.rawRecord || {})
                    .filter(([k]) => !['rawRecord', 'details'].includes(k))
                    .map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</span>
                        <strong style={{ color: 'var(--text-main)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}
                        </strong>
                      </div>
                    ))}
                </div>
              </div>

              {inspectingItem.status !== 'Approved' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                    Supervisor Verification Remarks:
                  </label>
                  <textarea
                    rows={2}
                    value={approvalNotes}
                    onChange={e => setApprovalNotes(e.target.value)}
                    placeholder="Add verification notes..."
                    className="form-input"
                    style={{ width: '100%', margin: 0 }}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => window.print()}>
                🖨️ Print
              </button>

              {/* Reject only available if NOT already Approved */}
              {inspectingItem.status === 'Pending' && (
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => setRejectingItem(inspectingItem)}
                >
                  ✕ Reject
                </button>
              )}

              {inspectingItem.status !== 'Approved' && (
                <button
                  type="button"
                  className="primary-btn"
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                  disabled={isProcessing}
                  onClick={() => handleApprove(inspectingItem, approvalNotes)}
                >
                  ✓ Approve & Sync ERP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingItem && (
        <div className="modal-backdrop" onClick={() => setRejectingItem(null)}>
          <div className="modal-panel" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '14px', color: '#b91c1c' }}>⚠️ Reject Form: {rejectingItem.id}</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setRejectingItem(null)}>✕</button>
            </div>
            <div className="modal-content">
              <p style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: 0 }}>
                Please specify the non-conformance or required corrective actions:
              </p>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="E.g., pH reading out of spec, retest required..."
                className="form-input"
                style={{ width: '100%', margin: 0 }}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setRejectingItem(null)}>Cancel</button>
              <button
                type="button"
                className="danger-btn"
                disabled={isProcessing}
                onClick={() => handleReject(rejectingItem, rejectionReason)}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH APPROVAL MODAL */}
      {showBatchModal && (
        <div className="modal-backdrop" onClick={() => setShowBatchModal(false)}>
          <div className="modal-panel" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '14px', color: '#047857' }}>⚡ Batch Approval ({selectedItemIds.length} Forms)</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowBatchModal(false)}>✕</button>
            </div>
            <div className="modal-content">
              <p style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: 0 }}>
                You are about to electronically approve <strong>{selectedItemIds.length}</strong> Work Order forms.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Supervisor Sign:</label>
                <input
                  type="text"
                  value={electronicSign}
                  onChange={e => setElectronicSign(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', margin: 0 }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setShowBatchModal(false)}>Cancel</button>
              <button
                type="button"
                className="primary-btn"
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                disabled={isProcessing}
                onClick={handleBatchApprove}
              >
                Confirm Batch Sign-off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PURGE CONFIRMATION MODAL */}
      {showPurgeModal && (
        <div className="modal-backdrop" onClick={() => setShowPurgeModal(false)}>
          <div className="modal-panel" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '14px', color: '#b91c1c' }}>🧹 Purge Unlinked Forms</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowPurgeModal(false)}>✕</button>
            </div>
            <div className="modal-content">
              <p style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: 0 }}>
                Apni ki shob unlinked forms (jei forms e kono Work Order nei) permanently delete korte chan?
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Eta shudhumatro valid Work Order linked forms gulo ke rakhbe ebong baki mock/dummy forms gulo ke shoriye debe.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setShowPurgeModal(false)}>Cancel</button>
              <button
                type="button"
                className="danger-btn"
                onClick={handlePurgeUnlinkedForms}
              >
                Yes, Purge Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
