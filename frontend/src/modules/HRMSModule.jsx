import { useState, useEffect, useRef } from 'react';
import { frappe } from '../services/frappe';

const generateNodeId = () => `role_${Date.now()}`;
const generateConnectionId = () => `c_${Date.now()}`;

const HRMSModule = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States loaded from localStorage or default mocks
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('fiji_hr_employees');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'EMP-01', name: 'S. Prasad', role: 'Mixing Operator', department: 'Operations', email: 's.prasad@islandchill.com.fj', salary: 35000, status: 'Active', performance: 'Standard', hireDate: '2021-04-12' },
      { id: 'EMP-02', name: 'A. Naidu', role: 'Lab Technician', department: 'Quality Control', email: 'a.naidu@islandchill.com.fj', salary: 42000, status: 'Active', performance: 'Outperforming', hireDate: '2022-09-15' },
      { id: 'EMP-03', name: 'R. Singh', role: 'Maintenance Engineer', department: 'Engineering', email: 'r.singh@islandchill.com.fj', salary: 48000, status: 'Active', performance: 'Standard', hireDate: '2020-11-20' },
      { id: 'EMP-04', name: 'Elena Whippy', role: 'HR Assistant', department: 'Management', email: 'e.whippy@islandchill.com.fj', salary: 38000, status: 'Active', performance: 'Standard', hireDate: '2023-01-10' }
    ];
  });

  const [leaves, setLeaves] = useState(() => {
    const saved = localStorage.getItem('fiji_hr_leaves');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'LV-01', employeeName: 'S. Prasad', department: 'Operations', leaveType: 'Sick Leave', duration: 3, startDate: '2026-06-05', endDate: '2026-06-08', status: 'Pending', reason: 'Flu symptoms and medical checkup' },
      { id: 'LV-02', employeeName: 'A. Naidu', department: 'Quality Control', leaveType: 'Annual Leave', duration: 5, startDate: '2026-06-12', endDate: '2026-06-17', status: 'Approved', reason: 'Family vacation' }
    ];
  });

  const payroll = [
    { id: 'PAY-26-01', month: 'May 2026', total_employees: 4, amount: 163000, status: 'Paid', date: '2026-05-30' },
    { id: 'PAY-26-02', month: 'April 2026', total_employees: 4, amount: 163000, status: 'Paid', date: '2026-04-30' }
  ];

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem('fiji_hr_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('fiji_hr_leaves', JSON.stringify(leaves));
  }, [leaves]);

  // Load from ERPNext live mode if connected
  useEffect(() => {
    const loadLiveEmployees = async () => {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive && conn.connected) {
        try {
          const liveEmps = await frappe.getEmployees();
          if (liveEmps && liveEmps.length > 0) {
            const mapped = liveEmps.map(emp => ({
              id: emp.name,
              name: emp.employee_name || emp.name,
              role: emp.designation || 'Staff',
              department: emp.department || 'Operations',
              email: emp.company_email || emp.personal_email || `${emp.name.toLowerCase()}@islandchill.com.fj`,
              salary: emp.salary || 35000,
              status: emp.status === 'Active' ? 'Active' : 'Suspended',
              performance: 'Standard',
              hireDate: emp.date_of_joining || '2022-01-01',
              image: emp.image ? (emp.image.startsWith('http') ? emp.image : `${conn.url}${emp.image}`) : null
            }));
            setEmployees(mapped);
          }
        } catch (err) {
          console.error("Error loading employees from ERPNext:", err);
        }
      }
    };
    loadLiveEmployees();
  }, []);

  // Org Chart Modeler States
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('fiji_org_nodes');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'ceo', type: 'ceo', label: 'General Manager', employeeName: 'Elena Whippy', department: 'Management', x: 250, y: 50, width: 170, height: 70 },
      { id: 'ops_mgr', type: 'manager', label: 'Operations Lead', employeeName: 'S. Prasad', department: 'Operations', x: 100, y: 180, width: 150, height: 70 },
      { id: 'qc_mgr', type: 'manager', label: 'QC Lab Lead', employeeName: 'A. Naidu', department: 'Quality Control', x: 400, y: 180, width: 150, height: 70 }
    ];
  });

  const [connections, setConnections] = useState(() => {
    const saved = localStorage.getItem('fiji_org_connections');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'c1', from: 'ceo', to: 'ops_mgr', type: 'reporting', label: 'Manages' },
      { id: 'c2', from: 'ceo', to: 'qc_mgr', type: 'reporting', label: 'Manages' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('fiji_org_nodes', JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
    localStorage.setItem('fiji_org_connections', JSON.stringify(connections));
  }, [connections]);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  
  // Interactive drawing states
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState(null);
  const [previewLine, setPreviewLine] = useState(null);

  // Filters and Drawers
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isAddEmpOpen, setIsAddEmpOpen] = useState(false);

  // New Employee Form States
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Operations');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpSalary, setNewEmpSalary] = useState('');
  const [newEmpPerf, setNewEmpPerf] = useState('Standard');
  const [formError, setFormError] = useState('');

  // Svg drag offset
  const svgRef = useRef(null);
  const [draggedNodeOffset, setDraggedNodeOffset] = useState({ x: 0, y: 0 });
  const [activeDragNodeId, setActiveDragNodeId] = useState(null);

  // Stats
  const totalEmployeesCount = employees.length;
  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
  const monthlyPayrollTotal = payroll.reduce((sum, p) => sum + p.amount, 0) / (payroll.length || 1);

  // Department counts
  const departmentsList = ['Management', 'Engineering', 'Operations', 'Quality Control'];
  const departmentCounts = departmentsList.map(dept => ({
    name: dept,
    count: employees.filter(e => e.department === dept).length,
    color: dept === 'Management' ? '#ef4444' : dept === 'Engineering' ? '#3b82f6' : dept === 'Operations' ? '#f59e0b' : '#10b981'
  }));

  // Average Salary per department
  const departmentSalaries = departmentsList.map(dept => {
    const deptEmps = employees.filter(e => e.department === dept);
    const avgSalary = deptEmps.reduce((sum, e) => sum + e.salary, 0) / (deptEmps.length || 1);
    return { name: dept, avg: Math.round(avgSalary) };
  });
  const maxAvgSalary = Math.max(...departmentSalaries.map(s => s.avg)) || 1;

  // Onboard Employee handler
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newEmpName || !newEmpRole || !newEmpEmail || !newEmpSalary) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const hireDateStr = new Date().toISOString().split('T')[0];
    let newId = `EMP-0${employees.length + 1}`;

    const conn = frappe.getConnectionSettings();
    if (conn.isLive && conn.connected) {
      try {
        const payload = {
          employee_name: newEmpName,
          designation: newEmpRole,
          department: newEmpDept,
          company_email: newEmpEmail,
          status: 'Active',
          date_of_joining: hireDateStr
        };
        const response = await frappe.makeRequest('POST', 'Employee', '', payload);
        if (response && response.data && response.data.name) {
          newId = response.data.name;
        }
      } catch (err) {
        console.error("Failed to save employee to ERPNext:", err);
        setFormError(`Failed to save to ERPNext: ${err.message}`);
        return;
      }
    }

    const newEmp = {
      id: newId,
      name: newEmpName,
      role: newEmpRole,
      department: newEmpDept,
      email: newEmpEmail,
      salary: Number(newEmpSalary),
      performance: newEmpPerf,
      status: 'Active',
      hireDate: hireDateStr,
      image: null
    };

    setEmployees(prev => [...prev, newEmp]);
    setNewEmpName('');
    setNewEmpRole('');
    setNewEmpEmail('');
    setNewEmpSalary('');
    setIsAddEmpOpen(false);
  };

  // Leave approval handler
  const handleLeaveAction = (id, newStatus) => {
    setLeaves(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, status: newStatus };
      }
      return l;
    }));

    if (newStatus === 'Approved') {
      const leave = leaves.find(l => l.id === id);
      if (leave) {
        setEmployees(prev => prev.map(e => {
          if (e.name === leave.employeeName) {
            return { ...e, status: 'On Leave' };
          }
          return e;
        }));
      }
    }
  };

  // BPMN org chart handlers
  const handleAddElement = (type) => {
    const id = generateNodeId();
    let label = 'New Role';
    let width = 150;
    let height = 70;

    if (type === 'ceo') {
      label = 'General Manager';
      width = 170;
    } else if (type === 'manager') {
      label = 'Department Lead';
    } else if (type === 'gateway') {
      label = 'Gatekeeper';
      width = 50;
      height = 50;
    }

    const spawnX = 250;
    const spawnY = 150 + (nodes.length % 5) * 20;

    const newNode = {
      id,
      type,
      label,
      employeeName: type !== 'gateway' ? 'Unassigned' : undefined,
      department: type !== 'gateway' ? 'Operations' : undefined,
      x: spawnX,
      y: spawnY,
      width,
      height
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
    setSelectedConnectionId(null);
  };

  const handleResetChart = () => {
    if (window.confirm('Reset org chart to defaults?')) {
      localStorage.removeItem('fiji_org_nodes');
      localStorage.removeItem('fiji_org_connections');
      setNodes([
        { id: 'ceo', type: 'ceo', label: 'General Manager', employeeName: 'Elena Whippy', department: 'Management', x: 250, y: 50, width: 170, height: 70 },
        { id: 'ops_mgr', type: 'manager', label: 'Operations Lead', employeeName: 'S. Prasad', department: 'Operations', x: 100, y: 180, width: 150, height: 70 },
        { id: 'qc_mgr', type: 'manager', label: 'QC Lab Lead', employeeName: 'A. Naidu', department: 'Quality Control', x: 400, y: 180, width: 150, height: 70 }
      ]);
      setConnections([
        { id: 'c1', from: 'ceo', to: 'ops_mgr', type: 'reporting', label: 'Manages' },
        { id: 'c2', from: 'ceo', to: 'qc_mgr', type: 'reporting', label: 'Manages' }
      ]);
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
    }
  };

  // Node drag functionality
  const handleNodeMouseDown = (e, nodeId) => {
    if (isConnecting) return;
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setSelectedConnectionId(null);
    setActiveDragNodeId(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (node && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setDraggedNodeOffset({
        x: mouseX - node.x,
        y: mouseY - node.y
      });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (activeDragNodeId && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newX = mouseX - draggedNodeOffset.x;
      const newY = mouseY - draggedNodeOffset.y;

      setNodes(prev => prev.map(n => {
        if (n.id === activeDragNodeId) {
          return {
            ...n,
            x: Math.max(10, Math.round(newX / 10) * 10),
            y: Math.max(10, Math.round(newY / 10) * 10)
          };
        }
        return n;
      }));
    }

    if (isConnecting && connectSourceId && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const sourceNode = nodes.find(n => n.id === connectSourceId);
      if (sourceNode) {
        const startX = sourceNode.x + (sourceNode.width || 150) / 2;
        const startY = sourceNode.y + (sourceNode.height || 70) / 2;
        setPreviewLine({ x1: startX, y1: startY, x2: mouseX, y2: mouseY });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setActiveDragNodeId(null);
  };

  // Node connector linking
  const handleConnectorMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setIsConnecting(true);
    setConnectSourceId(nodeId);
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (sourceNode) {
      const startX = sourceNode.x + (sourceNode.width || 150) / 2;
      const startY = sourceNode.y + (sourceNode.height || 70) / 2;
      setPreviewLine({ x1: startX, y1: startY, x2: startX, y2: startY });
    }
  };

  const handleNodeMouseUp = (e, targetNodeId) => {
    if (isConnecting && connectSourceId && connectSourceId !== targetNodeId) {
      e.stopPropagation();
      
      const newConnection = {
        id: generateConnectionId(),
        from: connectSourceId,
        to: targetNodeId,
        type: 'reporting',
        label: 'Reports to'
      };

      setConnections(prev => [...prev, newConnection]);
      setIsConnecting(false);
      setConnectSourceId(null);
      setPreviewLine(null);
    }
  };

  const cancelConnection = () => {
    setIsConnecting(false);
    setConnectSourceId(null);
    setPreviewLine(null);
  };

  const handleDeleteNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    setSelectedNodeId(null);
  };

  // Orthogonal drawing path
  const calculateOrthogonalPath = (fromNode, toNode) => {
    if (!fromNode || !toNode) return '';
    const fromWidth = fromNode.width || 150;
    const fromHeight = fromNode.height || 70;
    const toWidth = toNode.width || 150;
    const toHeight = toNode.height || 70;

    const x1 = fromNode.x + fromWidth / 2;
    const y1 = fromNode.y + fromHeight / 2;
    const x2 = toNode.x + toWidth / 2;
    const y2 = toNode.y + toHeight / 2;

    let startX = x1;
    let startY = y1;
    let endX = x2;
    let endY = y2;

    if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
      startX = x1 > x2 ? fromNode.x : fromNode.x + fromWidth;
      endX = x1 > x2 ? toNode.x + toWidth : toNode.x;
      const midX = (startX + endX) / 2;
      return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
    } else {
      startY = y1 > y2 ? fromNode.y : fromNode.y + fromHeight;
      endY = y1 > y2 ? toNode.y + toHeight : toNode.y;
      const midY = (startY + endY) / 2;
      return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
    }
  };

  // Filtered employees list
  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.role.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || e.department === deptFilter;
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="maintenance-tab-container">
      
      {/* Title Header */}
      <div className="module-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div className="module-title">
          <h2>Human Resource Module</h2>
          <p>Onboard employees, manage corporate payroll structures, track leave approvals, and layout organization charts</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {activeTab === 'directory' && (
            <button className="primary-btn" onClick={() => setIsAddEmpOpen(true)}>
              ➕ Onboard Employee
            </button>
          )}
          {activeTab === 'org-chart' && (
            <button className="secondary-btn" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleResetChart}>
              🔄 Reset Chart
            </button>
          )}

          {/* Tab buttons */}
          <div className="hrms-tabs">
            <button 
              className={`hrms-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📈 Dashboard
            </button>
            <button 
              className={`hrms-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
              onClick={() => setActiveTab('directory')}
            >
              👥 Employees
            </button>
            <button 
              className={`hrms-tab-btn ${activeTab === 'org-chart' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('org-chart');
                cancelConnection();
              }}
            >
              🏗️ Org Chart
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPI metrics cards */}
          <div className="metrics-row">
            <div className="metric-widget">
              <div className="metric-widget-header">
                <span>Total Staff</span>
                <span>👥</span>
              </div>
              <div className="metric-value-container">
                <span className="metric-val">{totalEmployeesCount}</span>
              </div>
            </div>

            <div className="metric-widget">
              <div className="metric-widget-header">
                <span>Pending Leaves</span>
                <span>📅</span>
              </div>
              <div className="metric-value-container">
                <span className="metric-val" style={{ color: 'var(--warning)' }}>{pendingLeavesCount}</span>
              </div>
            </div>

            <div className="metric-widget">
              <div className="metric-widget-header">
                <span>Avg Monthly Payroll</span>
                <span>💰</span>
              </div>
              <div className="metric-value-container">
                <span className="metric-val">FJD {monthlyPayrollTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Donut and Bar Charts section */}
          <div className="hrms-chart-row">
            
            {/* Donut Headcount distribution */}
            <div className="details-card">
              <div className="details-card-header">
                <h3 className="details-card-title">Staff Headcount by Department</h3>
              </div>
              <div className="donut-chart-container">
                <div className="donut-svg-wrapper">
                  <svg width="140" height="140" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="4.2"></circle>
                    {(() => {
                      let accumulatedPercentage = 0;
                      return departmentCounts.map((dept, index) => {
                        const total = employees.length || 1;
                        const percentage = (dept.count / total) * 100;
                        const strokeDashArray = `${percentage} ${100 - percentage}`;
                        const strokeDashOffset = 100 - accumulatedPercentage + 25;
                        accumulatedPercentage += percentage;

                        return (
                          <circle
                            key={index}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke={dept.color}
                            strokeWidth="4.2"
                            strokeDasharray={strokeDashArray}
                            strokeDashoffset={strokeDashOffset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="donut-label-center">
                    <span className="donut-label-val">{employees.length}</span>
                    <span className="donut-label-lbl">Staff</span>
                  </div>
                </div>

                <div className="donut-legend">
                  {departmentCounts.map((dept, index) => (
                    <div className="legend-item" key={index}>
                      <span className="legend-color-dot" style={{ backgroundColor: dept.color }} />
                      <span>{dept.name} (<strong>{dept.count}</strong>)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Average Salaries Chart */}
            <div className="details-card">
              <div className="details-card-header">
                <h3 className="details-card-title">Average Salary Structure (FJD)</h3>
              </div>
              <div className="bar-chart-container">
                {departmentSalaries.map((dept, index) => {
                  const widthPercent = (dept.avg / maxAvgSalary) * 100;
                  return (
                    <div className="bar-chart-row" key={index}>
                      <span className="bar-chart-label" title={dept.name}>{dept.name}</span>
                      <div className="bar-chart-progress-wrapper">
                        <div 
                          className="bar-chart-progress-fill" 
                          style={{ width: `${widthPercent || 0}%` }}
                        />
                      </div>
                      <span className="bar-chart-value">FJD {dept.avg ? dept.avg.toLocaleString() : '0'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Pending leave approvals list */}
          <div className="details-card" style={{ minHeight: '200px' }}>
            <div className="details-card-header">
              <h3 className="details-card-title">Leave Approvals Queue</h3>
            </div>

            <div className="leave-request-list" style={{ marginTop: '10px' }}>
              {leaves.filter(l => l.status === 'Pending').length > 0 ? (
                leaves.filter(l => l.status === 'Pending').map((leave) => (
                  <div className="leave-request-card" key={leave.id}>
                    <div>
                      <div className="leave-emp-name">{leave.employeeName}</div>
                      <div className="leave-emp-dept">{leave.department}</div>
                    </div>
                    <div>
                      <span className="leave-type-pill">{leave.leaveType}</span>
                    </div>
                    <div className="leave-duration">
                      <strong>{leave.duration} Days</strong> ({leave.startDate} to {leave.endDate})
                    </div>
                    <div className="leave-reason" title={leave.reason}>
                      "{leave.reason}"
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className="secondary-btn" 
                        onClick={() => handleLeaveAction(leave.id, 'Rejected')}
                        style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      >
                        ✕ Reject
                      </button>
                      <button 
                        className="secondary-btn" 
                        onClick={() => handleLeaveAction(leave.id, 'Approved')}
                        style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--success)', borderColor: 'var(--success)' }}
                      >
                        ✓ Approve
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  All leave requests processed.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filters Row */}
          <div className="details-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <input 
                  type="text"
                  className="search-input"
                  placeholder="Search by Employee ID, Name or Role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '32px' }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
              </div>

              <select 
                className="chart-select"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ padding: '8px 12px', height: '38px' }}
              >
                <option value="All">All Departments</option>
                {departmentsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select 
                className="chart-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', height: '38px' }}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Directory Cards Grid */}
          <div className="employees-grid">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <div className={`employee-card ${emp.department.replace(' ', '')}`} key={emp.id}>
                  <div className="emp-card-header">
                    <div className="emp-card-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {emp.image ? (
                        <img 
                          src={emp.image} 
                          alt={emp.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                        />
                      ) : null}
                      <span style={{ display: emp.image ? 'none' : 'block' }}>
                        {emp.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="emp-card-meta">
                      <div className="emp-card-name">{emp.name}</div>
                      <div className="emp-card-role">{emp.role}</div>
                    </div>
                  </div>
                  <div className="emp-card-body">
                    <div>
                      <div className="emp-info-label">Dept</div>
                      <div className="emp-info-value">{emp.department}</div>
                    </div>
                    <div>
                      <div className="emp-info-label">Status</div>
                      <span className={`emp-performance-badge ${emp.status === 'Active' ? 'standard' : 'outperforming'}`}>
                        {emp.status}
                      </span>
                    </div>
                    <div>
                      <div className="emp-info-label">Salary</div>
                      <div className="emp-info-value">FJD {emp.salary.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="emp-info-label">Hired</div>
                      <div className="emp-info-value">{emp.hireDate}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No employees match filters.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'org-chart' && (
        <div className="bpmn-workspace" onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp}>
          <div className="bpmn-palette">
            <div className="palette-section-title">Drag or Add Roles</div>
            <div className="palette-items">
              <button className="palette-item" onClick={() => handleAddElement('ceo')}>
                <div className="palette-icon-box">👑</div>
                <span>General Manager</span>
              </button>
              <button className="palette-item" onClick={() => handleAddElement('manager')}>
                <div className="palette-icon-box">👥</div>
                <span>Dept Lead</span>
              </button>
              <button className="palette-item" onClick={() => handleAddElement('gateway')}>
                <div className="palette-icon-box">🔶</div>
                <span>Gatekeeper</span>
              </button>
            </div>
            <div style={{ marginTop: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
              💡 Click a connector dot inside a node to draw reporting lines.
            </div>
          </div>

          <div className="bpmn-canvas-wrapper" ref={svgRef}>
            <div className="bpmn-controls-header">
              <div className="canvas-mode-indicator">
                <span>⚡ Interactive Org Modeler</span>
              </div>
              {selectedNodeId && (
                <button 
                  className="secondary-btn"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => handleDeleteNode(selectedNodeId)}
                >
                  Delete Selected Node
                </button>
              )}
            </div>

            <div className="bpmn-canvas-area">
              <svg className="bpmn-svg-canvas">
                {/* Connections Lines */}
                {connections.map((c) => {
                  const fromNode = nodes.find(n => n.id === c.from);
                  const toNode = nodes.find(n => n.id === c.to);
                  if (!fromNode || !toNode) return null;
                  return (
                    <g 
                      key={c.id} 
                      className={`bpmn-flow-wrapper ${selectedConnectionId === c.id ? 'selected' : ''}`}
                      onClick={() => { setSelectedConnectionId(c.id); setSelectedNodeId(null); }}
                    >
                      <path 
                        className="bpmn-flow-line sequence" 
                        d={calculateOrthogonalPath(fromNode, toNode)}
                        markerEnd="url(#arrow)"
                      />
                    </g>
                  );
                })}

                {/* Preview Link Line */}
                {previewLine && (
                  <line 
                    className="bpmn-preview-line" 
                    x1={previewLine.x1} 
                    y1={previewLine.y1} 
                    x2={previewLine.x2} 
                    y2={previewLine.y2} 
                  />
                )}

                {/* SVG Arrow Marker definitions */}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                  </marker>
                </defs>

                {/* Render Nodes */}
                {nodes.map((n) => {
                  const isSelected = selectedNodeId === n.id;
                  const isGateway = n.type === 'gateway';

                  if (isGateway) {
                    return (
                      <g 
                        key={n.id}
                        transform={`translate(${n.x}, ${n.y})`}
                        onClick={(e) => { e.stopPropagation(); setSelectedNodeId(n.id); }}
                        onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                        onMouseUp={(e) => handleNodeMouseUp(e, n.id)}
                        className={`bpmn-gateway-node ${isSelected ? 'selected' : ''}`}
                      >
                        <polygon points="25,0 50,25 25,50 0,25" className="bpmn-gateway-bg" />
                        <text x="25" y="29" textAnchor="middle" fontSize="10" fontWeight="600" fill="#92400e">🔶</text>
                        {/* Connector dots */}
                        <circle cx="25" cy="25" r="4" className="bpmn-conn-point" onMouseDown={(e) => handleConnectorMouseDown(e, n.id)} />
                      </g>
                    );
                  }

                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x}, ${n.y})`}
                      onClick={(e) => { e.stopPropagation(); setSelectedNodeId(n.id); }}
                      onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                      onMouseUp={(e) => handleNodeMouseUp(e, n.id)}
                      className={`bpmn-role-node ${isSelected ? 'selected' : ''}`}
                    >
                      <rect className="bpmn-role-card-bg" width={n.width} height={n.height} />
                      {/* Top accent bar */}
                      <rect 
                        width={n.width} 
                        height="6" 
                        rx="3" 
                        ry="3" 
                        fill={n.type === 'ceo' ? '#ef4444' : (n.type === 'manager' ? '#f59e0b' : '#3b82f6')} 
                      />
                      
                      <text x="12" y="24" className="bpmn-node-title">{n.label}</text>
                      <text x="12" y="42" className="bpmn-node-emp">{n.employeeName || 'Vacant Role'}</text>
                      <text x="12" y="56" className="bpmn-node-dept">{n.department || 'Operations'}</text>

                      {/* Connection handle dot */}
                      <circle cx={n.width - 15} cy={n.height / 2} r="5" className="bpmn-conn-point" onMouseDown={(e) => handleConnectorMouseDown(e, n.id)} />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Properties Inspector Panel */}
          <div className="bpmn-inspector">
            <div className="palette-section-title">Properties Inspector</div>
            {selectedNodeId ? (() => {
              const node = nodes.find(n => n.id === selectedNodeId);
              if (!node) return null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Role/Label</label>
                    <input 
                      type="text"
                      className="search-input"
                      value={node.label}
                      onChange={(e) => setNodes(nodes.map(temp => temp.id === node.id ? { ...temp, label: e.target.value } : temp))}
                    />
                  </div>
                  {node.type !== 'gateway' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Assigned Employee</label>
                        <select 
                          className="chart-select"
                          value={node.employeeName || ''}
                          onChange={(e) => setNodes(nodes.map(temp => temp.id === node.id ? { ...temp, employeeName: e.target.value } : temp))}
                          style={{ height: '34px' }}
                        >
                          <option value="Unassigned">Unassigned</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Department</label>
                        <select 
                          className="chart-select"
                          value={node.department || ''}
                          onChange={(e) => setNodes(nodes.map(temp => temp.id === node.id ? { ...temp, department: e.target.value } : temp))}
                          style={{ height: '34px' }}
                        >
                          {departmentsList.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <button 
                    className="secondary-btn" 
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)', width: '100%', marginTop: '12px' }}
                    onClick={() => handleDeleteNode(node.id)}
                  >
                    Delete Role
                  </button>
                </div>
              );
            })() : (
              <div className="inspector-empty">
                <span>ℹ️</span>
                <p style={{ fontSize: '12px', margin: 0 }}>Select any element or connector on the canvas to configure reporting properties.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onboard Employee Drawer overlay */}
      {isAddEmpOpen && (
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
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Onboard Employee</h3>
            <button 
              onClick={() => setIsAddEmpOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>

          {formError && (
            <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '6px', fontSize: '12px' }}>
              ⚠️ {formError}
            </div>
          )}

          <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Full Name *</label>
              <input
                type="text"
                className="search-input"
                placeholder="e.g. Bila Ravu"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Job Role / Title *</label>
              <input
                type="text"
                className="search-input"
                placeholder="e.g. Quality Inspector"
                value={newEmpRole}
                onChange={(e) => setNewEmpRole(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Corporate Department *</label>
              <select
                className="chart-select"
                value={newEmpDept}
                onChange={(e) => setNewEmpDept(e.target.value)}
                style={{ width: '100%', height: '38px', padding: '0 10px' }}
              >
                {departmentsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Corporate Email *</label>
              <input
                type="email"
                className="search-input"
                placeholder="e.g. b.ravu@islandchill.com.fj"
                value={newEmpEmail}
                onChange={(e) => setNewEmpEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Base Monthly Salary (FJD) *</label>
              <input
                type="number"
                className="search-input"
                placeholder="e.g. 42000"
                value={newEmpSalary}
                onChange={(e) => setNewEmpSalary(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Performance Standing *</label>
              <select
                className="chart-select"
                value={newEmpPerf}
                onChange={(e) => setNewEmpPerf(e.target.value)}
                style={{ width: '100%', height: '38px', padding: '0 10px' }}
              >
                <option value="Outperforming">Outperforming</option>
                <option value="Standard">Standard</option>
                <option value="Underperforming">Underperforming</option>
              </select>
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
              Submit Onboarding to Frappe HR
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default HRMSModule;
