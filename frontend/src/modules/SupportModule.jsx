import { useState } from 'react';

const SupportModule = ({ 
  tickets, 
  onCreateTicket, 
  onResolveTicket, 
  onUpdateTicketStatus, 
  onSendMessage 
}) => {
  const [activeTab, setActiveTab] = useState('registry'); // 'registry' or 'ai-chat'
  
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

      {activeTab === 'registry' ? (
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

      {/* Drawer overlay for New Ticket */}
      {isDrawerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '450px',
          height: '100vh',
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
          zIndex: 2000,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Raise Support Incident</h3>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>

          {submitError && (
            <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '6px', fontSize: '12px' }}>
              ⚠️ {submitError}
            </div>
          )}

          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Incident Subject *</label>
              <input
                type="text"
                className="search-input"
                placeholder="e.g. Consignment delayed at custom wharf"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Inquirer Customer *</label>
              <select
                className="chart-select"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                style={{ width: '100%', height: '38px', padding: '0 10px' }}
              >
                <option value="Micronesia Shipping Ltd">Micronesia Shipping Ltd</option>
                <option value="Solomon Logistics Ltd">Solomon Logistics Ltd</option>
                <option value="Papua Trade Agency">Papua Trade Agency</option>
                <option value="New Zealand Seafoods">New Zealand Seafoods</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Priority Level *</label>
              <select
                className="chart-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%', height: '38px', padding: '0 10px' }}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Raised By Email *</label>
              <input
                type="email"
                className="search-input"
                placeholder="e.g. logistics@customer.com"
                value={raisedBy}
                onChange={(e) => setRaisedBy(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Detailed Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the operations blockages, vessel name, cargo references, etc."
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  fontSize: '13px',
                  fontFamily: 'var(--sans)'
                }}
                required
              />
            </div>

            <button 
              type="submit" 
              className="primary-btn"
              style={{
                width: '100%',
                height: '42px',
                fontWeight: '700',
                marginTop: '10px'
              }}
            >
              Submit Ticket to ERPNext
            </button>
          </form>
        </div>
      )}
      
    </div>
  );
};

export default SupportModule;
