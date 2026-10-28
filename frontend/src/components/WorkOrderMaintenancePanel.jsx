import { useEffect, useState } from 'react';
import { frappe } from '../services/frappe';
import WorkOrderMaintenanceChecklists from './WorkOrderMaintenanceChecklists';

export default function WorkOrderMaintenancePanel({ wo, isScheduledFuture, revision, onFillChecklist }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setResult(null);
    if (isScheduledFuture) {
      setLoading(false);
      return;
    }
    const conn = frappe.getConnectionSettings();
    if (!conn.isLive || !conn.connected) {
      setError('Connect to ERPNext to view maintenance checklists.');
      setLoading(false);
      return;
    }
    frappe.getWorkOrderMaintenanceChecklists(wo.id)
      .then(data => {
        if (cancelled) return;
        if (!data) throw new Error('No maintenance checklist data was returned.');
        setResult(data);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Unable to load maintenance checklists.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [wo.id, isScheduledFuture, revision, retry]);

  if (isScheduledFuture || result?.is_future_date) {
    return <p className="text-muted">Maintenance checklists will be available on the planned start date ({result?.planned_start_date || wo.plannedStart?.substring(0, 10)}).</p>;
  }
  if (loading) return <p role="status" className="text-muted">Loading maintenance checklists...</p>;
  if (error) return (
    <div role="alert">
      <p>{error}</p>
      <button type="button" className="secondary-btn" onClick={() => setRetry(value => value + 1)}>Retry</button>
    </div>
  );
  if (!result?.checklists?.length) return <p className="text-muted">No maintenance checklists are applicable to this Work Order.</p>;

  return (
    <WorkOrderMaintenanceChecklists
      validation={{
        woId: wo.id,
        checklists: result.checklists,
        completedCount: result.completed_count || 0,
        totalCount: result.total_count ?? result.checklists.length,
        allCompleted: Boolean(result.all_completed)
      }}
      onFillChecklist={onFillChecklist}
    />
  );
}
