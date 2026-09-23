import { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';
import { FormFootnote } from '../components/LaboratoryTab';

const SupportModule = ({ 
  tickets, 
  onCreateTicket, 
  onResolveTicket, 
  onUpdateTicketStatus, 
  onSendMessage 
}) => {
  const [activeTab, setActiveTab] = useState('registry'); // 'registry', 'customer-tracking', or 'ai-chat'
  
  // Customer Complaint Report / Tracking Sheet state (No Mock Data!)
  const [complaintMeta, setComplaintMeta] = useState(null);
  const [complaintRecords, setComplaintRecords] = useState([]);
  const [loadingComplaintData, setLoadingComplaintData] = useState(false);
  const [complaintError, setComplaintError] = useState(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  // Fetch metadata and records for DocType "Customer Complaint Report" from ERPNext
  const fetchCustomerComplaintData = async () => {
    try {
      setLoadingComplaintData(true);
      setComplaintError(null);
      console.log('[Customer Complaint Report] Fetching metadata and records from ERPNext...');

      let metaRes = null;
      let recordsRes = [];

      try {
        metaRes = await frappe.getDocTypeMeta('Customer Complaint Report');
        console.log('[Customer Complaint Report Meta Response]:', metaRes);
      } catch (metaErr) {
        console.error('[Customer Complaint Report Meta Error]:', metaErr);
      }

      try {
        recordsRes = await frappe.fetchERP('Customer Complaint Report', { fields: ['*'], limit: 100, order_by: 'creation desc' });
        console.log('[Customer Complaint Report Records Response]:', recordsRes);
      } catch (recErr) {
        console.error('[Customer Complaint Report Records Error]:', recErr);
        setComplaintError(recErr.message || 'Failed to fetch Customer Complaint Report records.');
      }

      setComplaintMeta(metaRes);
      setComplaintRecords(Array.isArray(recordsRes) ? recordsRes : []);
    } catch (err) {
      console.error('[Customer Complaint Report] Unexpected error:', err);
    } finally {
      setLoadingComplaintData(false);
    }
  };

  useEffect(() => {
    fetchCustomerComplaintData();
  }, []);

  // Registry states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Status and Reply message states
  const [statusInput, setStatusInput] = useState('');
  const [replyText, setReplyText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleSelectTicket = (tkt) => {
    setSelectedTicket(tkt);
    if (tkt) {
      const fresh = tickets.find(t => t.name === tkt.name);
      setStatusInput(fresh ? fresh.status : tkt.status);
    } else {
      setStatusInput('');
    }
  };

  // Form States for creating ticket
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [customer, setCustomer] = useState('Micronesia Shipping Ltd');
  const [priority, setPriority] = useState('Medium');
  const [raisedBy, setRaisedBy] = useState('');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState('');

  // AI Chat States
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello, I am the Carpenters Operations AI Assistant. I have indexed the live ERPNext support ticket streams. I can answer registry diagnostics, compile incident statistics, or draft escalation letters for custom clearances. What would you like to check today?',
      timestamp: 'Just now'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Stats calculation
  const totalCount = tickets ? tickets.length : 0;
  const openCount = tickets ? tickets.filter(t => t.status === 'Open').length : 0;
  const inProgressCount = tickets ? tickets.filter(t => t.status === 'In Progress').length : 0;
  const resolvedCount = tickets ? tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length : 0;

  const currentTicket = selectedTicket ? (tickets.find(t => t.name === selectedTicket.name) || selectedTicket) : null;

  const handleStatusUpdate = (e) => {
    if (e) e.preventDefault();
    if (!currentTicket || !statusInput.trim()) return;
    onUpdateTicketStatus(currentTicket.name, statusInput.trim());
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!currentTicket || !replyText.trim()) return;
    const text = replyText.trim();
    setReplyText('');
    onSendMessage(currentTicket.name, text, 'agent', 'Support Desk');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!subject || !description || !raisedBy) {
      setSubmitError('Please fill in all required fields.');
      return;
    }

    const newTkt = {
      subject,
      customer,
      priority,
      raised_by: raisedBy,
      description
    };

    onCreateTicket(newTkt);
    setSubject('');
    setDescription('');
    setRaisedBy('');
    setIsDrawerOpen(false);
  };

  // Filtered Tickets list
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalTicketsCount = filteredTickets.length;
  const totalPages = Math.ceil(totalTicketsCount / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage);

  // AI Response generator
  const getAIResponse = (userMsg) => {
    const msg = userMsg.toLowerCase();
    
    if (msg.includes('clark') || msg.includes('tkt-2026-001') || msg.includes('customs') || msg.includes('escalate')) {
      const clarkTicket = tickets.find(t => t.name === 'TKT-2026-001') || {
        name: 'TKT-2026-001',
        customer: 'Micronesia Shipping Ltd',
        subject: 'MV Kalana delay in custom clearance',
        raised_by: 'captain.clark@micronesia.com'
      };
      
      return `### **Escalation Email Draft (TKT-2026-001)**\n\n**To:** operations@pngcustoms.gov.pg, ports-liaison@carpenters.com\n**Subject:** URGENT: Port Moresby Port Operations Clearance - Vessel MV Kalana (${clarkTicket.name})\n\nDear Customs Operations Director,\n\nWe are writing to urgently escalate the clearance pipeline for cargo consignment aboard the vessel **MV Kalana**, currently anchored at Port Moresby outer harbor (Ticket Reference: **${clarkTicket.name}**).\n\nThis vessel carries key marine diesel fuel required for logistics dispatch terminals. Any further dockside delay impacts downstream operations across the region.\n\n**Consignment details:**\n- **Inquirer:** ${clarkTicket.customer}\n- **Contact:** ${clarkTicket.raised_by}\n- **Logged Urgency:** Critical (High Priority)\n- **Subject Reference:** ${clarkTicket.subject}\n\nWe kindly request immediate secondary officer review to resolve this customs blockade.\n\nSincerely,\nCarpenters Port Operations Helpdesk`;
    }

    if (msg.includes('most open') || msg.includes('most ticket') || msg.includes('which customer')) {
      const counts = {};
      tickets.forEach(t => {
        if (t.status === 'Open' || t.status === 'In Progress') {
          counts[t.customer] = (counts[t.customer] || 0) + 1;
        }
      });
      
      let maxCust = '';
      let maxVal = 0;
      Object.keys(counts).forEach(c => {
        if (counts[c] > maxVal) {
          maxVal = counts[c];
          maxCust = c;
        }
      });

      let summaryText = 'Here is the active incident load by customer:\n';
      Object.keys(counts).forEach(c => {
        summaryText += `- **${c}**: ${counts[c]} active ticket(s)\n`;
      });

      if (maxCust) {
        return `Based on live helpdesk diagnostics:\n**${maxCust}** currently has the highest load with **${maxVal}** active incidents requiring investigation.\n\n${summaryText}`;
      } else {
        return `There are currently no open or active tickets logged in the registry system! All customer operations streams are fully operational.`;
      }
    }

    if (msg.includes('draft') || msg.includes('email') || msg.includes('respond')) {
      const match = msg.match(/tkt-2026-\d+/i);
      const ticketCode = match ? match[0].toUpperCase() : 'TKT-2026-002';
      const targetTkt = tickets.find(t => t.name === ticketCode) || tickets[1];

      if (targetTkt) {
        return `### **Support Response Draft for ${targetTkt.name}**\n\n**To:** ${targetTkt.raised_by}\n**Subject:** Re: Carpenters Operations Support Ticket - ${targetTkt.subject}\n\nDear Client Team,\n\nThank you for contacting the Carpenters Helpdesk. We have registered your issue under code **${targetTkt.name}** and flagged it as **${targetTkt.priority}** priority.\n\nWe have routed this issue to our specialized operations team. We are currently:\n1. Reviewing the related logs and historical records for **${targetTkt.customer}**.\n2. Calibrating verification values to rectify any discrepancies.\n\nWe will provide a status dispatch update within 2 hours. If you have any additional diagnostics telemetry or documents, please reply directly to this mail.\n\nSincerely,\nCarpenters Support Desk`;
      }
    }

    if (msg.includes('high') || msg.includes('critical') || msg.includes('priority')) {
      const highTkts = tickets.filter(t => t.priority === 'High' && (t.status === 'Open' || t.status === 'In Progress'));
      if (highTkts.length > 0) {
        let listStr = `I found **${highTkts.length}** high-priority active incidents in the registry:\n\n`;
        highTkts.forEach(t => {
          listStr += `- **${t.name}**: ${t.subject} (Customer: *${t.customer}*, Status: *${t.status}*)\n`;
        });
        return listStr + '\nWe recommend addressing these items immediately to maintain operational compliance.';
      } else {
        return `Excellent news! There are currently **no** high-priority open incidents logged in our tracking systems.`;
      }
    }

    const highPriorityCount = tickets.filter(t => t.priority === 'High').length;
    return `### **System Diagnostics Summary**\n\n- **Incident Registry Status:** Active\n- **Total Registered Tickets:** ${totalCount}\n- **Open Tickets:** ${openCount}\n- **In Progress:** ${inProgressCount}\n- **Resolved/Closed:** ${resolvedCount}\n- **Urgency Distribution:** ${highPriorityCount} High priority incidents, ${tickets.filter(t => t.priority === 'Medium').length} Medium, ${tickets.filter(t => t.priority === 'Low').length} Low.\n\nLet me know if you would like me to:\n- **Draft an escalation email** (e.g. "escalate TKT-2026-001")\n- **List high priority incidents** (e.g. "show high priority tickets")\n- **Determine customer ticket loads** (e.g. "which customer has the most open tickets?")`;
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setMessages(prev => [...prev, {
      sender: 'user',
      text: userMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiReply = getAIResponse(userMessage);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
    }, 850);
  };

  return (
    <div className="maintenance-tab-container">
      
      {/* Module Title Bar */}
      <div className="module-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div className="module-title">
          <h2>Support Helpdesk</h2>
          <p>Manage customer inquiries, logistics bottlenecks, and vessel operations feedback stream</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {activeTab === 'registry' && (
            <button className="primary-btn" onClick={() => setIsDrawerOpen(true)}>
              ➕ New Ticket
            </button>
          )}

          {activeTab === 'customer-tracking' && (
            <button className="primary-btn" onClick={() => setIsComplaintModalOpen(true)}>
              ➕ Log Customer Complaint
            </button>
          )}

          {/* Toggle Tabs */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '2px', backgroundColor: '#f3f4f6', gap: '4px' }}>
            <button 
              onClick={() => setActiveTab('registry')}
              style={{
                padding: '6px 16px',
                borderRadius: '18px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: activeTab === 'registry' ? '#ffffff' : 'transparent',
                color: activeTab === 'registry' ? 'var(--text-heading)' : 'var(--text-muted)',
                boxShadow: activeTab === 'registry' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Incident Registry
            </button>
            <button 
              onClick={() => setActiveTab('customer-tracking')}
              style={{
                padding: '6px 16px',
                borderRadius: '18px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: activeTab === 'customer-tracking' ? '#ffffff' : 'transparent',
                color: activeTab === 'customer-tracking' ? 'var(--text-heading)' : 'var(--text-muted)',
                boxShadow: activeTab === 'customer-tracking' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📋 Customer Tracking Sheet
            </button>
            <button 
              onClick={() => setActiveTab('ai-chat')}
              style={{
                padding: '6px 16px',
                borderRadius: '18px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: activeTab === 'ai-chat' ? '#ffffff' : 'transparent',
                color: activeTab === 'ai-chat' ? 'var(--text-heading)' : 'var(--text-muted)',
                boxShadow: activeTab === 'ai-chat' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ✨ AI Support Desk
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'customer-tracking' ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Customer Tracking Sheet</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                DocType: <strong>Customer Complaint Report</strong> | Dynamic schema & real-time records from ERPNext
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                className="primary-btn"
                onClick={() => setIsComplaintModalOpen(true)}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                ➕ Log Customer Complaint
              </button>
              <button 
                className="secondary-btn"
                onClick={() => fetchCustomerComplaintData()}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>

          {loadingComplaintData ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              ⏳ Fetching metadata and records for "Customer Complaint Report"...
            </div>
          ) : (
            <>
              {complaintError && (
                <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', fontSize: '12px' }}>
                  ⚠️ {complaintError}
                </div>
              )}

              {/* Render dynamic columns fetched from DocType metadata */}
              {(() => {
                const metaFields = (complaintMeta?.fields || []).filter(f =>
                  f.fieldtype !== 'Section Break' &&
                  f.fieldtype !== 'Column Break' &&
                  f.fieldtype !== 'Fold' &&
                  f.fieldtype !== 'Table' &&
                  f.fieldname !== 'amended_from' &&
                  f.fieldname !== 'work_order' &&
                  f.hidden !== 1
                );

                const displayColumns = metaFields.length > 0 
                  ? metaFields 
                  : [
                      { fieldname: 'name', label: 'ID' },
                      { fieldname: 'customer', label: 'Customer' },
                      { fieldname: 'complaint_date', label: 'Date' },
                      { fieldname: 'complaint_type', label: 'Type' },
                      { fieldname: 'status', label: 'Status' },
                      { fieldname: 'description', label: 'Description' }
                    ];

                return complaintRecords.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    📦 No <strong>Customer Complaint Report</strong> records found in ERPNext backend.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Log ID</th>
                          {displayColumns.map(col => (
                            <th key={col.fieldname} style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                              {col.label || col.fieldname}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {complaintRecords.map((rec, idx) => (
                          <tr key={rec.name || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px', fontWeight: '700' }}>{rec.name || `REC-${idx + 1}`}</td>
                            {displayColumns.map(col => (
                              <td key={col.fieldname} style={{ padding: '10px' }}>
                                {String(rec[col.fieldname] ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      ) : activeTab === 'registry' ? (
        <>
          {/* Stats Cards Row */}
          <div className="metrics-row">
            <div className="metric-widget">
              <div className="metric-widget-header">
                <span>Total Tickets</span>
                <span className="icon">🎧</span>
              </div>
              <div className="metric-value-container">
                <span className="metric-val">{totalCount}</span>
              </div>
            </div>

            <div className="metric-widget">
              <div className="metric-widget-header">
                <span>Open Tickets</span>
                <span className="icon">⚠️</span>
              </div>
              <div className="metric-value-container">
                <span className="metric-val" style={{ color: 'var(--warning)' }}>{openCount}</span>
              </div>
            </div>

            <div className="metric-widget">
              <div className="metric-widget-header">
                <span>In Progress</span>
                <span className="icon">⏳</span>
              </div>
              <div className="metric-value-container">
                <span className="metric-val" style={{ color: 'var(--info)' }}>{inProgressCount}</span>
              </div>
            </div>

            <div className="metric-widget">
              <div className="metric-widget-header">
                <span>Resolved</span>
                <span className="icon">✅</span>
              </div>
              <div className="metric-value-container">
                <span className="metric-val" style={{ color: 'var(--success)' }}>{resolvedCount}</span>
              </div>
            </div>
          </div>

          {/* Grid Layout for filters and ticket list */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', minHeight: '500px' }}>
            
            {/* Tickets Table Card */}
            <div className="details-card" style={{ height: '100%' }}>
              <div className="details-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="details-card-title">Incident Stream Registry</h3>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: '200px' }}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search subject, customer..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{ paddingLeft: '32px' }}
                    />
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                  </div>

                  <select 
                    className="chart-select" 
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>

                  <select 
                    className="chart-select" 
                    value={priorityFilter}
                    onChange={(e) => {
                      setPriorityFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                  >
                    <option value="All">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Subject</th>
                      <th>Customer</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Raised Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTickets.length > 0 ? (
                      paginatedTickets.map((tkt) => (
                        <tr 
                          key={tkt.name}
                          style={{ cursor: 'pointer', backgroundColor: selectedTicket?.name === tkt.name ? '#f3f4f6' : 'transparent' }}
                          onClick={() => handleSelectTicket(tkt)}
                        >
                          <td style={{ fontWeight: '700', color: 'var(--text-heading)' }}>{tkt.name}</td>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--text-heading)' }}>{tkt.subject}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tkt.raised_by}</div>
                          </td>
                          <td style={{ fontWeight: '600' }}>{tkt.customer}</td>
                          <td>
                            <span 
                              style={{
                                fontSize: '9px',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                backgroundColor: tkt.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : tkt.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : '#f3f4f6',
                                color: tkt.priority === 'High' ? 'var(--danger)' : tkt.priority === 'Medium' ? 'var(--warning)' : 'var(--text-muted)'
                              }}
                            >
                              {tkt.priority}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${tkt.status.toLowerCase().replace(' ', '') === 'in progress' ? 'progress' : (tkt.status.toLowerCase() === 'resolved' ? 'completed' : 'qc')}`}>
                              {tkt.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tkt.creation}</td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                className="view-btn"
                                onClick={() => handleSelectTicket(tkt)}
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                              >
                                View
                              </button>
                              {(tkt.status !== 'Resolved' && tkt.status !== 'Closed') && (
                                <button
                                  className="view-btn"
                                  onClick={() => onResolveTicket(tkt.name)}
                                  style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', color: 'var(--success)' }}
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No support tickets match filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + itemsPerPage, totalTicketsCount)}</strong> of <strong>{totalTicketsCount}</strong> tickets
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={activePage === 1}
                      style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: activePage === p ? '700' : 'normal',
                          backgroundColor: activePage === p ? 'var(--info)' : 'transparent',
                          color: activePage === p ? '#fff' : 'var(--text-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={activePage === totalPages}
                      style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Ticket Details Card */}
            <div className="details-card" style={{ height: '100%' }}>
              <div className="details-card-header">
                <h3 className="details-card-title">Ticket Details</h3>
              </div>

              {currentTicket ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-heading)', margin: 0 }}>{currentTicket.name}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Created {currentTicket.creation}</span>
                    </div>
                    <span className={`badge badge-${currentTicket.status.toLowerCase().replace(' ', '') === 'in progress' ? 'progress' : (currentTicket.status.toLowerCase() === 'resolved' ? 'completed' : 'qc')}`}>
                      {currentTicket.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span>👤</span>
                      <strong>Customer:</strong>
                      <span style={{ color: 'var(--text-main)' }}>{currentTicket.customer}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span>✉️</span>
                      <strong>Contact:</strong>
                      <span style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>{currentTicket.raised_by}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span>📄</span>
                      <strong>Priority:</strong>
                      <span 
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: currentTicket.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : currentTicket.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : '#f3f4f6',
                          color: currentTicket.priority === 'High' ? 'var(--danger)' : currentTicket.priority === 'Medium' ? 'var(--warning)' : 'var(--text-muted)'
                        }}
                      >
                        {currentTicket.priority}
                      </span>
                    </div>
                  </div>

                  {/* Status Update Form */}
                  <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <strong style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Update Ticket Status</strong>
                    <form onSubmit={handleStatusUpdate} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        list="ticket-statuses"
                        type="text"
                        className="search-input"
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value)}
                        placeholder="Type status (e.g. In Progress)"
                        style={{ flex: 1, padding: '6px 12px', fontSize: '12.5px', height: '34px' }}
                      />
                      <datalist id="ticket-statuses">
                        <option value="Open" />
                        <option value="In Progress" />
                        <option value="On Hold" />
                        <option value="Resolved" />
                        <option value="Closed" />
                      </datalist>
                      <button
                        type="submit"
                        className="primary-btn"
                        style={{ padding: '6px 12px', fontSize: '12px', height: '34px', whiteSpace: 'nowrap' }}
                      >
                        Update
                      </button>
                    </form>
                  </div>

                  {/* Chat Conversation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <strong style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ticket Activity Log</strong>
                    
                    <div style={{
                      flex: 1,
                      backgroundColor: '#f9fafb',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      overflowY: 'auto',
                      maxHeight: '260px',
                      minHeight: '200px'
                    }}>
                      {/* Original Customer Description Bubble */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '85%', gap: '2px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '4px' }}>
                          <strong>{currentTicket.customer}</strong>
                        </div>
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: '12px 12px 12px 2px',
                          backgroundColor: '#ffffff',
                          color: 'var(--text-main)',
                          border: '1px solid var(--border-color)',
                          fontSize: '12.5px',
                          lineHeight: '1.4'
                        }}>
                          <strong>Subject: {currentTicket.subject}</strong>
                          <div style={{ marginTop: '6px', fontWeight: 'normal', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                            {currentTicket.description || 'No detailed description provided.'}
                          </div>
                        </div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', alignSelf: 'flex-start', paddingLeft: '4px' }}>
                          {currentTicket.creation}
                        </span>
                      </div>

                      {/* Render dynamic conversation thread */}
                      {(currentTicket.conversation || []).map((msg, idx) => {
                        const isSystem = msg.sender === 'system';
                        const isCustomer = msg.sender === 'customer';
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignSelf: isSystem ? 'center' : (isCustomer ? 'flex-start' : 'flex-end'),
                              maxWidth: isSystem ? '100%' : '85%',
                              gap: '2px'
                            }}
                          >
                            {!isSystem && (
                              <div style={{
                                fontSize: '10px',
                                color: 'var(--text-muted)',
                                padding: '0 4px',
                                alignSelf: isCustomer ? 'flex-start' : 'flex-end'
                              }}>
                                <strong>{msg.name}</strong>
                              </div>
                            )}

                            {isSystem ? (
                              <div style={{
                                fontSize: '11px',
                                color: 'var(--text-main)',
                                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                border: '1px dashed var(--border-color)',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                margin: '4px 0',
                                textAlign: 'center'
                              }}>
                                ℹ️ {msg.text} <span style={{ fontSize: '9px', opacity: 0.7 }}>({msg.timestamp})</span>
                              </div>
                            ) : (
                              <div style={{
                                padding: '10px 14px',
                                borderRadius: isCustomer ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                                backgroundColor: isCustomer ? '#ffffff' : '#374151',
                                color: isCustomer ? 'var(--text-main)' : '#ffffff',
                                border: isCustomer ? '1px solid var(--border-color)' : 'none',
                                fontSize: '12.5px',
                                lineHeight: '1.4'
                              }}>
                                {msg.text}
                              </div>
                            )}

                            {!isSystem && (
                              <span style={{
                                fontSize: '9px',
                                color: 'var(--text-muted)',
                                alignSelf: isCustomer ? 'flex-start' : 'flex-end',
                                padding: '0 4px'
                              }}>
                                {msg.timestamp}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Send Message Form */}
                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Type a message to reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '6px' }}
                      />
                      <button
                        type="submit"
                        className="primary-btn"
                        style={{ padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 20px' }}>
                  <span style={{ fontSize: '36px' }}>🎧</span>
                  <span>Select an active ticket from the registry to display operational diagnostics and details.</span>
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        /* AI Assistant Interface */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '550px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>✨</span>
              <div>
                <strong style={{ color: 'var(--text-heading)' }}>Carpenters Operations AI Helpdesk</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simulated AI Diagnostic Agent synced with ERPNext Issues</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f9fafb' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'ai' ? 'flex-start' : 'flex-end',
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  alignSelf: m.sender === 'ai' ? 'flex-start' : 'flex-end'
                }}>
                  {m.sender === 'ai' ? '🤖 operations.ai' : '👤 manager'}
                </div>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: m.sender === 'ai' ? '16px 16px 16px 2px' : '16px 16px 2px 16px',
                  backgroundColor: m.sender === 'ai' ? '#ffffff' : 'var(--info)',
                  color: m.sender === 'ai' ? 'var(--text-main)' : '#ffffff',
                  border: m.sender === 'ai' ? '1px solid var(--border-color)' : 'none',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  {m.text.startsWith('###') ? (
                    <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: '12px' }}>{m.text}</div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  )}
                </div>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', alignSelf: m.sender === 'ai' ? 'flex-start' : 'flex-end' }}>{m.timestamp}</span>
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '12px', paddingLeft: '8px' }}>
                AI is analyzing registry diagnostics...
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} style={{ display: 'flex', padding: '16px', borderTop: '1px solid var(--border-color)', gap: '10px' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Ask AI: 'escalate TKT-2026-001' or 'which customer has the most open tickets?' or 'list high priority incidents'..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
            />
            <button type="submit" className="primary-btn" style={{ padding: '0 20px' }}>Send</button>
          </form>
        </div>
      )}

      {/* Modal: Customer Complaint Report */}
      <CustomerComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        complaintMeta={complaintMeta}
        onRecordCreated={() => fetchCustomerComplaintData()}
      />

    </div>
  );
};

const CustomerComplaintModal = ({ isOpen, onClose, complaintMeta, onRecordCreated }) => {
  const [formData, setFormData] = useState({});
  const [linkOptionsMap, setLinkOptionsMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Derive fields from complaintMeta or fallback defaults
  let fields = complaintMeta?.fields;
  if (!fields || fields.length === 0) {
    fields = [
      { idx: 1, fieldname: 'complaint_date', label: 'Complaint Date', fieldtype: 'Date' },
      { idx: 2, fieldname: 'customer', label: 'Customer Name', fieldtype: 'Link', options: 'Customer', reqd: 1 },
      { idx: 3, fieldname: 'contact_person', label: 'Contact Person', fieldtype: 'Data' },
      { idx: 4, fieldname: 'contact_email', label: 'Contact Email / Phone', fieldtype: 'Data' },
      { idx: 5, fieldname: 'product_name', label: 'Product Name / SKU', fieldtype: 'Link', options: 'Item' },
      { idx: 6, fieldname: 'batch_no', label: 'Batch No / Lot Code', fieldtype: 'Data' },
      { idx: 7, fieldname: 'complaint_type', label: 'Complaint Type / Category', fieldtype: 'Select', options: 'Quality Issue\nPackage Damage\nDelivery Delay\nTaste Discrepancy\nOther' },
      { idx: 8, fieldname: 'severity', label: 'Severity / Priority', fieldtype: 'Select', options: 'Low\nMedium\nHigh\nCritical' },
      { idx: 9, fieldname: 'recorded_by', label: 'Recorded By', fieldtype: 'Link', options: 'Employee' },
      { idx: 10, fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Open\nIn Progress\nResolved\nClosed' },
      { idx: 11, fieldname: 'description', label: 'Detailed Complaint Description', fieldtype: 'Small Text', reqd: 1 },
      { idx: 12, fieldname: 'action_taken', label: 'Immediate Action Taken / Corrective Action', fieldtype: 'Small Text' }
    ];
  }

  const validFields = fields.filter(f =>
    f.fieldtype !== 'Section Break' &&
    f.fieldtype !== 'Column Break' &&
    f.fieldtype !== 'Fold' &&
    f.fieldtype !== 'Table' &&
    f.fieldtype !== 'Signature' &&
    f.fieldname !== 'amended_from' &&
    f.fieldname !== 'work_order' &&
    f.hidden !== 1
  );

  // Fetch link options for any Link / Dynamic Link fields dynamically from ERPNext
  useEffect(() => {
    let isMounted = true;
    async function loadLinkOptions() {
      const linkFields = validFields.filter(f => (f.fieldtype === 'Link' || f.fieldtype === 'Dynamic Link') && f.options);
      const optionsMap = {};

      for (const lf of linkFields) {
        const targetDoctype = lf.options;
        if (targetDoctype && !optionsMap[targetDoctype]) {
          try {
            console.log(`[CustomerComplaintModal] Fetching link options for DocType "${targetDoctype}"...`);
            let records = [];

            try {
              records = await frappe.getLinkOptions(targetDoctype, 200);
            } catch (e1) {
              records = await frappe.fetchERP(targetDoctype, { fields: ['name'], limit: 200 });
            }

            if (Array.isArray(records) && records.length > 0) {
              optionsMap[targetDoctype] = records
                .map(r => typeof r === 'string' ? r : r?.name)
                .filter(Boolean);
            } else {
              optionsMap[targetDoctype] = [];
            }
          } catch (err) {
            console.warn(`[CustomerComplaintModal] Could not fetch link options for "${targetDoctype}":`, err);
            optionsMap[targetDoctype] = [];
          }
        }
      }

      if (isMounted) {
        console.log('[CustomerComplaintModal] Link options map loaded:', optionsMap);
        setLinkOptionsMap(optionsMap);
      }
    }

    if (isOpen) {
      loadLinkOptions();
    }
  }, [isOpen, complaintMeta]);

  if (!isOpen) return null;

  const parseSelectOptions = (rawOpts) => {
    if (!rawOpts) return [];
    if (Array.isArray(rawOpts)) return rawOpts;
    return String(rawOpts).split('\n').map(o => o.trim()).filter(Boolean);
  };

  const handleFieldChange = (fn, val) => {
    setFormData(prev => ({ ...prev, [fn]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    try {
      const payload = {
        doctype: 'Customer Complaint Report',
        ...formData,
        date: formData.date || formData.complaint_date || new Date().toISOString().slice(0, 10)
      };

      console.log('[Create Customer Complaint Report Payload]:', payload);

      let res = null;
      try {
        res = await frappe.createCleaningSanitationRecord('Customer Complaint Report', payload);
      } catch (err) {
        console.warn('createCleaningSanitationRecord fallback to makeRequest POST:', err);
        res = await frappe.makeRequest('POST', 'Customer Complaint Report', payload);
      }

      console.log('[Create Customer Complaint Report Response]:', res);

      onRecordCreated();
      onClose();
    } catch (err) {
      console.error('[Create Customer Complaint Report Error]:', err);
      setSubmitError(err.message || 'Failed to create Customer Complaint Report in ERPNext.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldInput = (f) => {
    const val = formData[f.fieldname] ?? '';
    const { fieldtype, fieldname, options, label, reqd } = f;

    // 1. Link / Dynamic Link fields (styled matching LaboratoryTab select dropdown)
    if (fieldtype === 'Link' || fieldtype === 'Dynamic Link') {
      const targetDoctype = options || 'Record';
      const fetchedOpts = linkOptionsMap[targetDoctype] || [];
      const opts = Array.from(new Set(fetchedOpts.map(o => typeof o === 'object' ? (o.name || o.id) : String(o)).filter(Boolean)));

      if (val && !opts.includes(val)) {
        opts.unshift(val);
      }

      return (
        <select
          className="form-input"
          required={reqd === 1}
          value={val}
          onChange={e => handleFieldChange(fieldname, e.target.value)}
        >
          <option value="">-- Select {label || targetDoctype} --</option>
          {opts.map((op, i) => (
            <option key={i} value={op}>{op}</option>
          ))}
        </select>
      );
    }

    // 2. Select field type
    if (fieldtype === 'Select') {
      const opts = parseSelectOptions(options);
      return (
        <select
          className="form-input"
          required={reqd === 1}
          value={val}
          onChange={e => handleFieldChange(fieldname, e.target.value)}
        >
          <option value="">-- Select {label || 'Option'} --</option>
          {opts.map((op, i) => (
            <option key={i} value={op}>{op}</option>
          ))}
        </select>
      );
    }

    // 3. Date field type
    if (fieldtype === 'Date') {
      return (
        <input
          type="date"
          className="form-input"
          required={reqd === 1}
          value={val || (fieldname.includes('date') ? new Date().toISOString().slice(0, 10) : '')}
          onChange={e => handleFieldChange(fieldname, e.target.value)}
        />
      );
    }

    // 4. Time field type
    if (fieldtype === 'Time') {
      return (
        <input
          type="time"
          className="form-input"
          required={reqd === 1}
          value={val}
          onChange={e => handleFieldChange(fieldname, e.target.value)}
        />
      );
    }

    // 5. Datetime field type
    if (fieldtype === 'Datetime') {
      return (
        <input
          type="datetime-local"
          className="form-input"
          required={reqd === 1}
          value={val}
          onChange={e => handleFieldChange(fieldname, e.target.value)}
        />
      );
    }

    // 6. Checkbox field type
    if (fieldtype === 'Check') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input
            type="checkbox"
            checked={Boolean(val)}
            onChange={e => handleFieldChange(fieldname, e.target.checked)}
          />
          <span>{label}</span>
        </label>
      );
    }

    // 7. Textarea field types (Small Text, Text, Long Text, Text Editor, Code, HTML Editor)
    if (['Small Text', 'Text', 'Long Text', 'Text Editor', 'Code', 'HTML Editor'].includes(fieldtype)) {
      return (
        <textarea
          className="form-input"
          rows="2"
          required={reqd === 1}
          value={val}
          onChange={e => handleFieldChange(fieldname, e.target.value)}
          placeholder={label}
          style={{ resize: 'vertical' }}
        />
      );
    }

    // 8. Number field types (Int, Float, Currency, Percent)
    if (['Int', 'Float', 'Currency', 'Percent'].includes(fieldtype)) {
      return (
        <input
          type="number"
          step="any"
          className="form-input"
          required={reqd === 1}
          value={val}
          onChange={e => handleFieldChange(fieldname, e.target.value)}
          placeholder={label}
        />
      );
    }

    // 9. Read Only field type
    if (fieldtype === 'Read Only') {
      return (
        <input
          type="text"
          readOnly
          className="form-input"
          value={val || '(Auto-generated)'}
          style={{ backgroundColor: '#f3f4f6', color: 'var(--text-muted)' }}
        />
      );
    }

    // 10. Attachment field types (Attach, Attach Image, File)
    if (['Attach', 'Attach Image', 'File'].includes(fieldtype)) {
      return (
        <input
          type="text"
          className="form-input"
          required={reqd === 1}
          value={val}
          onChange={e => handleFieldChange(fieldname, e.target.value)}
          placeholder={`Enter attachment file URL / path for ${label}...`}
        />
      );
    }

    // 11. Default Data / Email / Phone / Password / URL / Barcode input types
    const inputType = fieldtype === 'Email' ? 'email' : fieldtype === 'Password' ? 'password' : fieldtype === 'Phone' ? 'tel' : 'text';
    return (
      <input
        type={inputType}
        className="form-input"
        required={reqd === 1}
        value={val}
        onChange={e => handleFieldChange(fieldname, e.target.value)}
        placeholder={label}
      />
    );
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: '960px', maxWidth: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Waters (Fiji) Limited</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Log Customer Complaint / DocType: Customer Complaint Report
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
            {submitError && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '6px', fontSize: '12px' }}>
                ⚠️ {submitError}
              </div>
            )}

            {/* Dynamic Top-Level Fields Grid matching LaboratoryTab layout */}
            <div style={{ border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {validFields.map(f => (
                  <div key={f.fieldname} style={{ gridColumn: ['Small Text', 'Text', 'Long Text', 'Text Editor', 'Code', 'HTML Editor'].includes(f.fieldtype) ? 'span 3' : 'span 1' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      {f.label || f.fieldname} {f.reqd === 1 && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    {renderFieldInput(f)}
                  </div>
                ))}
              </div>
            </div>
            <FormFootnote doctype="Customer Complaint Report" defaultFormNo="Form Customer Complaint" formTitle="Customer Complaint Report" />
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" disabled={submitting} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportModule;
