import React, { useState, useEffect } from 'react';
import { PRODUCTS, BOMS, INITIAL_INVENTORY, INITIAL_WORK_ORDERS } from './data/mockData';
import { frappe, DuplicateRequestError } from './services/frappe';
import { generateSecret, verifyTOTP } from './services/totp';
import SupportModule from './modules/SupportModule';
import HRMSModule from './modules/HRMSModule';
import { CONFIG } from './config';
import './App.css';
import logo from "../public/logo.png";

// Extracted modular components
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';
import DashboardTab from './components/DashboardTab';
import WorkflowTab from './components/WorkflowTab';
import WorkOrdersTab from './components/WorkOrdersTab';
import InventoryTab from './components/InventoryTab';
import BOMTab from './components/BOMTab';
import SalesTab, { SalesInvoiceFormModal, DeliveryNoteFormModal } from './components/SalesTab';
import MaintenanceTab, { MaintWeightCheckModal, MaintBreakdownModal } from './components/MaintenanceTab';
import SafetyTab, { SafetyIncidentFormModal, SafetyFirstAidFormModal, SafetySwabFormModal, SafetyReportViewerModal, SafetyForm37Modal } from './components/SafetyTab';
import LaboratoryTab, { LabForm1Modal, LabForm9Modal, LabForm11Modal, LabForm21Modal, LabReportViewerModal, LabForm36Modal, LabForm100Modal, LabForm103Modal } from './components/LaboratoryTab';
import CleaningTab, { CleaningFormModal, CleaningRecordDetailModal, CLEANING_TEMPLATES } from './components/CleaningTab';
import line1 from "../public/line1.png"
import line2 from "../public/line2.png"


const WORKFLOW_STAGES = [
  { id: 'extraction', name: 'Water Extraction', icon: '🚰', dept: 'Utilities', desc: 'Artesian water drawn from natural Fiji aquifer.', metrics: 'Flow: 120.00 L/min', color: '#0ea5e9', colorRgb: '14, 165, 233', tagline: '100% PURE FIJI SOURCE' },
  { id: 'mixing', name: 'Syrup Mixing', icon: '🧪', dept: 'Production', desc: 'Mixing artesian water, sugars, and concentrates.', metrics: 'Temp: 18.00°C', color: '#f59e0b', colorRgb: '245, 158, 11', tagline: 'MICRO-DIALED CONCENTRATE' },
  { id: 'testing', name: 'Lab QA Testing', icon: '🔬', dept: 'Quality Control', desc: 'Testing pH, Brix value, and microbiological safety.', metrics: 'pH: 6.80 • Brix: 11.20%', color: '#8b5cf6', colorRgb: '139, 92, 246', tagline: 'LAB INSPECTION APPROVED' },
  { id: 'blowing', name: 'Blowing / Prep', icon: '🍾', dept: 'Packaging Prep', desc: 'Blowing preforms to bottles or washing cans.', metrics: 'Output: 240.00 bpm', color: '#6366f1', colorRgb: '99, 102, 241', tagline: 'STERILE HIGH-SPEED FORMING' },
  { id: 'filling', name: 'Filling & Sealing', icon: '⚡', dept: 'Bottling Line', desc: 'Monobloc rotary filling and capping under CO2.', metrics: 'Fill rate: 12,000.00 cph', color: '#ef4444', colorRgb: '239, 68, 68', tagline: 'HERMETIC CO2 PRESSURE FILL' },
  { id: 'warmer', name: 'Warmer Tunnel', icon: '♨️', dept: 'Utilities', desc: 'Warming bottles to prevent condensation.', metrics: 'Temp: 32.00°C', color: '#f97316', colorRgb: '249, 115, 22', tagline: 'CONDENSATION PREVENTED' },
  { id: 'labeling', name: 'Laser labeling', icon: '🏷️', dept: 'Packaging', desc: 'High-speed laser label application & barcode print.', metrics: 'Laser power: 98.00%', color: '#06b6d4', colorRgb: '6, 182, 212', tagline: 'LASER-PRINTED BARCODES' },
  { id: 'final_qc', name: 'Final Inspection', icon: '👁️', dept: 'Quality Control', desc: 'Vision inspection for level checks and seals.', metrics: 'Rejects: 0.02%', color: '#d946ef', colorRgb: '217, 70, 239', tagline: 'VISION SCANNER QC PASS' },
  { id: 'packing', name: 'Hand Packing', icon: '📦', dept: 'Packing Area', desc: 'Cartoning products into box cases (12/24 units).', metrics: 'Output: 500.00 cases/hr', color: '#ec4899', colorRgb: '236, 72, 153', tagline: 'ROBOTIC CARTON PACK' },
  { id: 'palletising', name: 'Palletising', icon: '🏗️', dept: 'Logistics', desc: 'Stacking cartons on pallets & shrink wrapping.', metrics: 'Load: 60.00 cases/pal', color: '#14b8a6', colorRgb: '20, 184, 166', tagline: 'STRETCH-WRAPPED LOAD' },
  { id: 'dispatch', name: 'Dispatch Store', icon: '🚛', dept: 'Warehouse', desc: 'Inventory receipt syncing to ERPNext stores.', metrics: 'Status: Sync Complete', color: '#10b981', colorRgb: '16, 185, 129', tagline: 'ERP STORE SYNC COMPLETE' }
];

const MAINTENANCE_TEMPLATES_STATIC = [
  {
    id: 'syrup-cip',
    name: 'Daily Preventive Maintenance Schedule (Syrup & CIP Equipment)',
    equipment: 'Syrup and CIP Equipment',
    area: 'Utilities',
    days: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    tasks: [
      { id: 1, desc: 'Check sugar dissolving pumps for leakage', std: '-' },
      { id: 2, desc: 'Check Syrup transfer pumps for leakage', std: '-' },
      { id: 3, desc: 'Check Butterfly Valves for leakage', std: '-' },
      { id: 4, desc: 'Check Syrup transfer pumps for proper functioning', std: '-' },
      { id: 5, desc: 'Check any unusual sound from Propellers or motor', std: '-' },
      { id: 6, desc: 'Is there any unusual sound coming from machine', std: '-' },
      { id: 7, desc: 'Check the filter Ok to run production', std: '-' },
      { id: 8, desc: 'Check the water flow meter working condition (No meter currently)', std: '-' },
      { id: 9, desc: 'Check for the leakages from the valves and pump seals.', std: '-' },
      { id: 10, desc: 'Check Syrup transfer pump performance', std: '-' },
      { id: 11, desc: 'Check Valves condition on syrup transfer pumps', std: '-' }
    ]
  },
  {
    id: 'glycol-chilling',
    name: 'Daily Preventive Maintenance Schedule (SEM-FRM-01-00-02)',
    equipment: 'Glycol Chilling Plant & Grasso Refrigerator',
    area: 'Utilities',
    days: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    tasks: [
      { id: 1, desc: 'Check functioning of load / Unload solenoid valves', std: '-' },
      { id: 2, desc: 'Check functioning of float valve', std: '-' },
      { id: 3, desc: 'Check oil leakages at compressor shaft seals', std: '-' },
      { id: 4, desc: 'Check cold well & hot well levels', std: '-' },
      { id: 5, desc: 'Check all the compressors are ON', std: '-' },
      { id: 6, desc: 'Check the temperature level ON the screen', std: '-' },
      { id: 7, desc: 'Check for Glycol leakage in the system', std: '-' },
      { id: 8, desc: 'Check for abnormal sound in pumps & motors', std: '-' }
    ]
  },
  {
    id: 'depalletizer',
    name: 'Daily Preventive Maintenance Schedule (De-Palletizer)',
    equipment: 'De-Palletizer',
    area: 'RTD Line',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tasks: [
      { id: 1, desc: 'Check the alignment of the belts', std: '2 min' },
      { id: 2, desc: 'Check for the tension of the belts and adjust if required', std: '5 min' },
      { id: 3, desc: 'Clean the can travelling track from glass and crowns', std: '2 min' },
      { id: 4, desc: 'Check all gear boxes for sound & heating', std: '2 min' },
      { id: 5, desc: 'Clean the case conveyor from debris', std: '3 min' },
      { id: 6, desc: 'Clean all the sensor and proximities for proper functioning', std: '5 min' }
    ]
  },
  {
    id: 'date-coder',
    name: 'Daily Preventive Maintenance Schedule (Date Coder)',
    equipment: 'Date Coder',
    area: 'CSD / RTD Line',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tasks: [
      { id: 1, desc: 'Check the ink & make up levels', std: '3 min' },
      { id: 2, desc: 'Check & ensure the encoder mounting', std: '5 min' },
      { id: 3, desc: 'Check the photocell for proper sensing of the bottles', std: '10 min' },
      { id: 4, desc: 'Clean & down the electrode plates', std: '2 min' },
      { id: 5, desc: 'Check the printhead sensor is sensing', std: '3 min' },
      { id: 6, desc: 'Check the product date & expiry date', std: '-' },
      { id: 7, desc: 'Check the printings property done on the products', std: '-' }
    ]
  },
  {
    id: 'bottling-line',
    name: 'Daily Preventive Maintenance Schedule (CSD / RTD Filler)',
    equipment: 'CSD / RTD Filler',
    area: 'Bottling Line',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tasks: [
      { id: 1, desc: 'Check for any jumping movement in the discharge conveyor chain', std: '3 min' },
      { id: 2, desc: 'Drain the condensate and fill the oiler if oil level is low for smooth movement of pneu. cylinders', std: '2 min' },
      { id: 3, desc: 'Check the condition of vent tubes, spreaders and bottle seals, replace if necessary', std: '0.5 min' },
      { id: 4, desc: 'Check the condition of snifts', std: '1 min' },
      { id: 5, desc: 'Remove all the bottles pieces & clean with water jet', std: '2 min' },
      { id: 6, desc: 'Check the bottle movement at air conveyor & supporting guides', std: '2 min' },
      { id: 7, desc: 'Check the alignment of guide plates of Air conveyor', std: '2 min' },
      { id: 8, desc: 'Check the lift cylinder air pressure & Co2 counter pressure leakages', std: '3 min' },
      { id: 9, desc: 'Grease the all centerlised grease points- Central lubrication as per the schedule', std: '2 min' },
      { id: 10, desc: 'Clean the elevating magnetic conveyor belt free of all crowns dust and other foreign matter', std: '10 min' },
      { id: 11, desc: 'Check all the pneumatic pipe lines, Regulators & Pneumatic valves for leakage', std: '10 min' }
    ]
  },
  {
    id: 'conveyors',
    name: 'Daily Preventive Maintenance Schedule (Conveyors)',
    equipment: 'Conveyors',
    area: 'CSD / RTD Line',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tasks: [
      { id: 1, desc: 'Check for vibrations, sound and gear box heating of all conveyors', std: '5 min' },
      { id: 2, desc: 'Remove all foreign materials from conveyors', std: '5 min' },
      { id: 3, desc: 'Check the movement of the conveyors. Should not be jerky.', std: '10 min' },
      { id: 4, desc: 'Clean the conveyor tracks. Remove the cullet if found.', std: '5 min' },
      { id: 5, desc: 'Check for the lubrication availability on the chain.', std: '5 min' },
      { id: 6, desc: 'Inspect for adequacy of lubrication.', std: '10 min' },
      { id: 7, desc: 'Check wear strips of rails for damage, replace them if required.', std: '3 min' },
      { id: 8, desc: 'Check the smooth movement of bottles through bottle inspection stations.', std: '5 min' },
      { id: 9, desc: 'Check the oil level for conveyor motor if visible.', std: '5 min' }
    ]
  },
  {
    id: 'co2-mixer',
    name: 'Daily Preventive Maintenance Schedule (Co2 Mixer)',
    equipment: 'Co2 Mixer',
    area: 'RTD / CSD Line',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tasks: [
      { id: 1, desc: 'Check the functioning of the pneumatic modulation valves', std: '5 min' },
      { id: 2, desc: 'Check for the level balance in Syrup reservoir tank', std: '5 min' },
      { id: 3, desc: 'Check the sight glass and pipe lines for leakage', std: '5 min' },
      { id: 4, desc: 'Check the leakages from mechanical seals of mixing pump and CIP booster pump, vacuum pump', std: '3 min' },
      { id: 5, desc: 'Clean the all external surfaces of the equipment thoroughly', std: '3 min' },
      { id: 6, desc: 'Check all pumps for leakage from the unions and for vibration', std: '2 min' },
      { id: 7, desc: 'Check for any leakage of CO2 and air', std: '3 min' },
      { id: 8, desc: 'Check for the pressure and temperature indicators of the areas', std: '5 min' }
    ]
  },
  {
    id: 'bottle-washer',
    name: 'Daily Preventive Maintenance Schedule (Bottle / Can Washer)',
    equipment: 'Bottle / Can Washer',
    area: 'CSD / RTD Line',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tasks: [
      { id: 1, desc: 'Check the main line water pressure', std: '5 min' },
      { id: 2, desc: 'Check for unusual sound from pumps', std: '5 min' },
      { id: 3, desc: 'Inspect the alignment of spray nozzles & jettings of all compartments', std: '5 min' }
    ]
  },
  {
    id: 'boiler',
    name: 'Daily Preventive Maintenance Schedule (Boiler)',
    equipment: 'Boiler',
    area: 'Utilities',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tasks: [
      { id: 1, desc: 'Check pressure / temp guages', std: '-' },
      { id: 2, desc: 'Check the TDS with the help of Lab chemist', std: '-' },
      { id: 3, desc: 'Clean flame sensors & viewing glass', std: '-' },
      { id: 4, desc: 'Carry out blow down based on TDS value', std: '-' },
      { id: 5, desc: 'Check for any steam leakages', std: '-' },
      { id: 6, desc: 'Do external cleaning of the boiler', std: '-' },
      { id: 7, desc: 'Check the water level in the reservoir tank', std: '-' },
      { id: 8, desc: 'Check the reservoir tank floatless valve functioning', std: '-' }
    ]
  },
  {
    id: 'air-compressor',
    name: 'Daily Preventive Maintenance Schedule (Air Compressor)',
    equipment: 'Air Compressor',
    area: 'Utilities',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tasks: [
      { id: 1, desc: 'Check the Oil level', std: '-' },
      { id: 2, desc: 'Check the Air intake vacuum indicator', std: '-' },
      { id: 3, desc: 'Check the condensate discharged from moisture separator during loading', std: '-' },
      { id: 4, desc: 'Check unloading and loading pressure', std: '-' },
      { id: 5, desc: 'Check air drier functioning and on', std: '-' },
      { id: 6, desc: 'Drain out all the filter outlets to drain moisture & water', std: '-' },
      { id: 7, desc: 'Is there any unusual sound coming from machine', std: '-' },
      { id: 8, desc: 'Check the joint leaking', std: '-' }
    ]
  }
];



const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getNowDateTimeLocal = () => {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
  return localISOTime;
};

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication & Connection States
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const conn = frappe.getConnectionSettings();
    return conn.connected;
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const conn = frappe.getConnectionSettings();
    return conn.user || 'Guest';
  });
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    const conn = frappe.getConnectionSettings();
    return conn.role || 'Operator';
  });

  // Login form states
  const [loginUsername, setLoginUsername] = useState('administrator');
  const [loginPassword, setLoginPassword] = useState('••••••••');
  const [isLive, setIsLive] = useState(false);
  const [erpUrl, setErpUrl] = useState('https://demo.erpnext.com');
  const [erpApiKey, setErpApiKey] = useState('');
  const [erpApiSecret, setErpApiSecret] = useState('');
  const [showAdvancedLogin, setShowAdvancedLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // TOTP 2FA states
  const [is2FAPhase, setIs2FAPhase] = useState('none'); // 'none', 'setup', 'verify'
  const [otpCode, setOtpCode] = useState('');
  const [tempSecret, setTempSecret] = useState('');
  const [totpQrUrl, setTotpQrUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [use2FA, setUse2FA] = useState(false);

  // Real-time Clock State synced with browser's time zone
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tab & Control states
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewWODrawer, setShowNewWODrawer] = useState(false);
  const [selectedWOId, setSelectedWOId] = useState(null);

  // Custom Alert Modal State and helper
  const [alertModal, setAlertModal] = useState(null); // { title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' }
  const showAlert = (message, type = 'success', title = 'System Message') => {
    setAlertModal({ message, type, title });
  };

  // Stock Entry Modal State
  const [stockEntryModal, setStockEntryModal] = useState(null); // { woId: string, company: string, postingDate: string, postingTime: string, items: Array }
  const [seSaving, setSeSaving] = useState(false);
  const [labSaving, setLabSaving] = useState(false);
  const [woCreating, setWoCreating] = useState(false);
  const [maintSaving, setMaintSaving] = useState(false);

  // New Work Order dynamic loading states
  const [woProductsList, setWoProductsList] = useState([]);
  const [woBomsList, setWoBomsList] = useState([]);
  const [selectedWoProduct, setSelectedWoProduct] = useState('');
  const [selectedWoBom, setSelectedWoBom] = useState('');
  const [woProductSearch, setWoProductSearch] = useState('');
  const [woBomSearch, setWoBomSearch] = useState('');
  const [woItemsLoading, setWoItemsLoading] = useState(false);
  const [woBomsLoading, setWoBomsLoading] = useState(false);

  useEffect(() => {
    const loadDrawerItems = async () => {
      setWoItemsLoading(true);
      setWoProductsList([]);
      setWoBomsList([]);
      setSelectedWoProduct('');
      setSelectedWoBom('');
      setWoProductSearch('');
      setWoBomSearch('');

      const fallbackItems = PRODUCTS.map(p => ({
        code: p.code,
        name: p.name,
        unit: p.unit || 'Nos'
      }));

      try {
        const conn = frappe.getConnectionSettings();

        if (conn.isLive) {
          if (conn.connected) {
            const items = await frappe.getManufacturableItems?.(300) || await frappe.getFinishedGoods(300);
            if (items && items.length > 0) {
              setWoProductsList(items);
              setSelectedWoProduct(items[0].code);
              return;
            }
          }
          setWoProductsList([]);
          setSelectedWoProduct('');
          return;
        }

        setWoProductsList(fallbackItems);
        setSelectedWoProduct(fallbackItems[0]?.code || '');
      } catch (err) {
        console.error('Failed to load Work Order items:', err);
        const conn = frappe.getConnectionSettings();
        if (conn.isLive) {
          setWoProductsList([]);
          setSelectedWoProduct('');
        } else {
          setWoProductsList(fallbackItems);
          setSelectedWoProduct(fallbackItems[0]?.code || '');
        }
      } finally {
        setWoItemsLoading(false);
      }
    };

    if (showNewWODrawer) {
      loadDrawerItems();
    }
  }, [showNewWODrawer, isLoggedIn]);

  useEffect(() => {
    const loadProductBoms = async () => {
      setWoBomsList([]);
      setSelectedWoBom('');
      setWoBomSearch('');

      if (!selectedWoProduct) return;

      setWoBomsLoading(true);

      try {
        const conn = frappe.getConnectionSettings();

        if (conn.isLive) {
          if (conn.connected) {
            const boms = await frappe.getBOMsForItem(selectedWoProduct, 100);
            setWoBomsList(boms || []);
            setSelectedWoBom((boms && boms.length > 0) ? boms[0].name : '');
          } else {
            setWoBomsList([]);
            setSelectedWoBom('');
          }
          return;
        }

        const demoBom = `BOM-${selectedWoProduct}-demo`;
        setWoBomsList([{ id: demoBom, name: demoBom, productName: selectedWoProduct, active: 1 }]);
        setSelectedWoBom(demoBom);
      } catch (err) {
        console.error(`Failed to load BOMs for ${selectedWoProduct}:`, err);
        setWoBomsList([]);
        setSelectedWoBom('');
      } finally {
        setWoBomsLoading(false);
      }
    };

    loadProductBoms();
  }, [selectedWoProduct, isLoggedIn]);

  const filteredWoProductsList = woProductsList.filter(p => {
    const q = woProductSearch.trim().toLowerCase();
    if (!q) return true;
    return (p.code || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q);
  });

  const filteredWoBomsList = woBomsList.filter(bom => {
    const q = woBomSearch.trim().toLowerCase();
    if (!q) return true;
    return (bom.name || '').toLowerCase().includes(q) || (bom.productName || '').toLowerCase().includes(q);
  });

  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);

  // Support Helpdesk States
  const [tickets, setTickets] = useState(() => {
    const saved = localStorage.getItem('fiji_support_tickets');
    if (saved) return JSON.parse(saved);
    return [
      {
        name: 'TKT-2026-001',
        subject: 'MV Kalana delay in custom clearance',
        customer: 'Micronesia Shipping Ltd',
        status: 'Open',
        priority: 'High',
        raised_by: 'captain.clark@micronesia.com',
        creation: '2026-05-30 08:30:00',
        description: 'Vessel has been anchored at Port Moresby outer harbor waiting for customs clearance on fuel cargo. Need immediate escalation.',
        conversation: [
          { sender: 'customer', name: 'Captain Clark', text: 'Vessel has been anchored at Port Moresby outer harbor waiting for customs clearance on fuel cargo. Need immediate escalation.', timestamp: '2026-05-30 08:30:00' },
          { sender: 'agent', name: 'Operations Desk', text: 'Hello Captain Clark, we have received your request. We are contacting Port Moresby customs liaison officer to expedite.', timestamp: '2026-05-30 08:45:00' }
        ]
      },
      {
        name: 'TKT-2026-002',
        subject: 'Inconsistent billing on invoice SINV-26-004',
        customer: 'Solomon Logistics Ltd',
        status: 'In Process',
        priority: 'Medium',
        raised_by: 'billing@solomonlog.com',
        creation: '2026-05-29 14:15:00',
        description: 'The outstanding amount on invoice SINV-26-004 does not match the agreed contract rates for freight services. Please review.',
        conversation: [
          { sender: 'customer', name: 'Solomon Billing Dept', text: 'The outstanding amount on invoice SINV-26-004 does not match the agreed contract rates for freight services. Please review.', timestamp: '2026-05-29 14:15:00' },
          { sender: 'agent', name: 'Accounts Support', text: 'We are verifying the freight bill against the standard tariff rules. We will update you shortly.', timestamp: '2026-05-29 15:00:00' }
        ]
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('fiji_support_tickets', JSON.stringify(tickets));
  }, [tickets]);

  const handleCreateTicket = (ticket) => {
    const newT = {
      name: `TKT-2026-0${tickets.length + 1}`,
      status: 'Open',
      creation: new Date().toISOString().replace('T', ' ').substring(0, 19),
      conversation: [
        { sender: 'customer', name: ticket.customer, text: ticket.description, timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) }
      ],
      ...ticket
    };
    setTickets(prev => [newT, ...prev]);
  };

  const handleResolveTicket = (name) => {
    setTickets(prev => prev.map(t => {
      if (t.name === name) {
        return {
          ...t,
          status: 'Resolved',
          conversation: [...(t.conversation || []), { sender: 'system', name: 'System', text: 'Ticket resolved by support desk', timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) }]
        };
      }
      return t;
    }));
  };

  const handleUpdateTicketStatus = (name, newStatus) => {
    setTickets(prev => prev.map(t => {
      if (t.name === name) {
        return {
          ...t,
          status: newStatus,
          conversation: [...(t.conversation || []), { sender: 'system', name: 'System', text: `Ticket status updated to ${newStatus}`, timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) }]
        };
      }
      return t;
    }));
  };

  const handleSendTicketMessage = (name, text, senderType, senderName) => {
    setTickets(prev => prev.map(t => {
      if (t.name === name) {
        return {
          ...t,
          conversation: [...(t.conversation || []), { sender: senderType, name: senderName, text, timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) }]
        };
      }
      return t;
    }));
  };

  // Expanded premium dashboard & paginated states
  const [fullscreenElement, setFullscreenElement] = useState(null);
  const [selectedItemCode, setSelectedItemCode] = useState('RM-WTR-01');
  const [invPage, setInvPage] = useState(1);
  const [bomList, setBomList] = useState([]);
  const [selectedBomId, setSelectedBomId] = useState('');
  const [activeBomMaterials, setActiveBomMaterials] = useState([]);
  const [bomPage, setBomPage] = useState(1);
  const [bomLoading, setBomLoading] = useState(false);
  const [maintPage, setMaintPage] = useState(1);
  const [woMonitorPage, setWoMonitorPage] = useState(1);
  const [erpItems, setErpItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const loadBOMs = async () => {
    setBomLoading(true);
    const conn = frappe.getConnectionSettings();
    if (conn.isLive && conn.connected) {
      try {
        const offset = (bomPage - 1) * 20;
        const liveBOMs = await frappe.getBOMs(20, offset);
        if (liveBOMs && liveBOMs.length > 0) {
          setBomList(liveBOMs);
          if (!selectedBomId) setSelectedBomId(liveBOMs[0].id);
        }
      } catch (err) {
        console.error("Failed to load BOMs from ERPNext:", err);
      } finally {
        setBomLoading(false);
      }
    } else {
      const mockBOMs = PRODUCTS.map(p => ({
        id: p.bomCode,
        name: p.bomCode,
        productName: p.name,
        active: 1
      }));
      setBomList(mockBOMs);
      if (!selectedBomId) setSelectedBomId(mockBOMs[0].id);
      setBomLoading(false);
    }
  };

  useEffect(() => {
    loadBOMs();
  }, [bomPage, isLoggedIn]);

  useEffect(() => {
    const fetchBOMDetails = async () => {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive) {
        if (conn.connected && selectedBomId) {
          try {
            const details = await frappe.getBOMDetails(selectedBomId);
            if (details) {
              setActiveBomMaterials(details);
              return;
            }
          } catch (err) {
            console.error("Failed to fetch BOM details:", err);
          }
        }
        setActiveBomMaterials([]);
        return;
      }
      if (BOMS[selectedBomId]) {
        setActiveBomMaterials(BOMS[selectedBomId].materials);
      } else {
        const firstKey = Object.keys(BOMS)[0];
        setActiveBomMaterials(BOMS[selectedBomId] || BOMS[firstKey]?.materials || []);
      }
    };
    fetchBOMDetails();
  }, [selectedBomId, isLoggedIn]);



  // Business Workflow simulation states
  const [simStep, setSimStep] = useState(0);
  const [simPlaying, setSimPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState(2000);

  useEffect(() => {
    let intervalId;
    if (simPlaying) {
      intervalId = setInterval(() => {
        setSimStep(prev => (prev + 1) % 11);
      }, simSpeed);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [simPlaying, simSpeed]);


  // Settings Panel states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsUrl, setSettingsUrl] = useState('');
  const [settingsApiKey, setSettingsApiKey] = useState('');
  const [settingsApiSecret, setSettingsApiSecret] = useState('');
  const [settingsDefaultCompany, setSettingsDefaultCompany] = useState('Carpenters Waters (Fiji) PTE Limited');
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [defaultCompany, setDefaultCompany] = useState(() => {
    return frappe.getConnectionSettings().defaultCompany || 'Carpenters Waters (Fiji) PTE Limited';
  });
  const [companyList, setCompanyList] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  // Modal states for job card completion
  const [activeJCOp, setActiveJCOp] = useState(null); // { woId, jcId, operation, action: 'pause' | 'finish' | 'remark' }
  const [jcOpOperatorName, setJcOpOperatorName] = useState('');
  const [jcOpOperatorEmployeeId, setJcOpOperatorEmployeeId] = useState('');
  const [jcOpOperatorRemarks, setJcOpOperatorRemarks] = useState('');

  // Modal states for Remarks Timeline
  const [activeTimelineJC, setActiveTimelineJC] = useState(null); // { woId, jcId, operation, remarksList }
  const [timelineOperatorName, setTimelineOperatorName] = useState('');
  const [timelineOperatorRemarks, setTimelineOperatorRemarks] = useState('');

  // Job Card actual start/end time states
  const [jcActualStartTime, setJcActualStartTime] = useState('');
  const [jcActualEndTime, setJcActualEndTime] = useState('');

  // Job Card completion quantity states
  const [jcFinishForQuantity, setJcFinishForQuantity] = useState('');
  const [jcFinishCompletedQty, setJcFinishCompletedQty] = useState('');
  const [jcFinishProcessLossQty, setJcFinishProcessLossQty] = useState('');
  const [woActionLoading, setWoActionLoading] = useState(false);
  const [finishWoModal, setFinishWoModal] = useState(null);
  const [woCreateCompany, setWoCreateCompany] = useState(() => frappe.getConnectionSettings().defaultCompany || defaultCompany || 'Carpenters Waters (Fiji) PTE Limited');
  const [woSourceWarehouse, setWoSourceWarehouse] = useState('');
  const [woFgWarehouse, setWoFgWarehouse] = useState('');
  const [woWipWarehouse, setWoWipWarehouse] = useState('');
  const [woScrapWarehouse, setWoScrapWarehouse] = useState('');
  const [woExtraGoodsWarehouse, setWoExtraGoodsWarehouse] = useState('');
  const [woStatusFilter, setWoStatusFilter] = useState('All');
  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [finishWoWarehouses, setFinishWoWarehouses] = useState([]);

  // Sales section states
  const [salesSubTab, setSalesSubTab] = useState('invoice'); // 'invoice' | 'delivery'
  const [salesInvoicesList, setSalesInvoicesList] = useState([]);
  const [deliveryNotesList, setDeliveryNotesList] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesInvoicePage, setSalesInvoicePage] = useState(1);
  const [deliveryNotePage, setDeliveryNotePage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState(null);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showCreateDeliveryNoteModal, setShowCreateDeliveryNoteModal] = useState(false);
  const [showAmendInvoiceModal, setShowAmendInvoiceModal] = useState(false);
  const [showAmendDeliveryNoteModal, setShowAmendDeliveryNoteModal] = useState(false);

  // Stock Entry autocomplete states
  const [seSourceSearch, setSeSourceSearch] = useState({});
  const [seTargetSearch, setSeTargetSearch] = useState({});
  const [seSourceSuggestions, setSeSourceSuggestions] = useState({});
  const [seTargetSuggestions, setSeTargetSuggestions] = useState({});
  const [activeSeSourceRow, setActiveSeSourceRow] = useState(null);
  const [activeSeTargetRow, setActiveSeTargetRow] = useState(null);

  // Email simulation states
  const [emailModal, setEmailModal] = useState(null); // { reportId, reportType }
  const [emailRecipient, setEmailRecipient] = useState('supervisor@islandchill.com.fj');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // PM Checklist overall comments state
  const [maintOverallComments, setMaintOverallComments] = useState('');

  const [replyingToIdx, setReplyingToIdx] = useState(null);
  const [replyText, setReplyText] = useState('');

  const [employeeList, setEmployeeList] = useState([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState(null); // 'pauseModal' | 'remarksModal' | 'maintOperator' | 'maintSupervisor'

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchCompaniesList = async () => {
      setCompaniesLoading(true);
      try {
        const list = await frappe.getCompanies();
        setCompanyList(list);
      } catch (err) {
        console.error("Failed to load companies list:", err);
      } finally {
        setCompaniesLoading(false);
      }
    };
    fetchCompaniesList();
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && !defaultCompany) {
      handleOpenSettings();
    }
    // Sync the WO create company when default company is resolved after login
    if (defaultCompany) {
      setWoCreateCompany(prev => prev || defaultCompany);
    }
  }, [isLoggedIn, defaultCompany]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchWoWarehouses = async () => {
      setWarehousesLoading(true);
      try {
        const list = await frappe.getWarehouses('', woCreateCompany);
        setAvailableWarehouses(list);
      } catch (err) {
        console.error("Failed to load warehouses:", err);
      } finally {
        setWarehousesLoading(false);
      }
    };
    fetchWoWarehouses();
  }, [isLoggedIn, woCreateCompany]);

  // Auto-set warehouse defaults whenever the warehouse list or company changes
  useEffect(() => {
    if (!availableWarehouses || availableWarehouses.length === 0) return;
    const find = (keyword) => {
      const kw = keyword.toLowerCase();
      return availableWarehouses.find(w => w.name.toLowerCase().includes(kw) || (w.warehouse_name || '').toLowerCase().includes(kw));
    };
    const stores   = find('stores');
    const fg       = find('finished goods') || find('finished');
    const wip      = find('work in progress') || find('wip');
    const scrap    = find('scrap');
    const extra    = find('extra') || find('goods');
    if (stores)  setWoSourceWarehouse(prev => prev || stores.name);
    if (fg)      setWoFgWarehouse(prev => prev || fg.name);
    if (wip)     setWoWipWarehouse(prev => prev || wip.name);
    if (scrap)   setWoScrapWarehouse(prev => prev || scrap.name);
    if (extra)   setWoExtraGoodsWarehouse(prev => prev || extra.name);
  }, [availableWarehouses]);

  // Reset warehouse selections when company changes so they re-default from the new company's list
  useEffect(() => {
    setWoSourceWarehouse('');
    setWoFgWarehouse('');
    setWoWipWarehouse('');
    setWoScrapWarehouse('');
    setWoExtraGoodsWarehouse('');
  }, [woCreateCompany]);

  useEffect(() => {
    if (!isLoggedIn || !finishWoModal || !finishWoModal.company) return;
    const fetchFinishWarehouses = async () => {
      try {
        const list = await frappe.getWarehouses('', finishWoModal.company);
        setFinishWoWarehouses(list);
      } catch (err) {
        console.error("Failed to load finish warehouses:", err);
      }
    };
    fetchFinishWarehouses();
  }, [isLoggedIn, finishWoModal?.company]);

  useEffect(() => {
    if (!activeTimelineJC || !activeTimelineJC.jcId) return;
    const loadComments = async () => {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive && conn.connected) {
        try {
          const comments = await frappe.getJobCardComments(activeTimelineJC.jcId);
          setWorkOrders(prevWOs => prevWOs.map(wo => {
            if (wo.id !== activeTimelineJC.woId) return wo;
            const updatedJobCards = wo.jobCards.map(jc => {
              if (jc.id === activeTimelineJC.jcId) {
                return {
                  ...jc,
                  remarksList: comments,
                  remarks: formatRemarksList(comments)
                };
              }
              return jc;
            });
            return { ...wo, jobCards: updatedJobCards };
          }));
        } catch (err) {
          console.error("Failed to load Job Card comments from server:", err);
        }
      }
    };
    loadComments();
  }, [activeTimelineJC?.jcId]);

  const handleSearchEmployees = async (query, field) => {
    if (field === 'maintOperator') setMaintOperator(query);
    else if (field === 'maintSupervisor') setMaintSupervisor(query);
    else if (
      field === 'safetyOperator' ||
      field === 'safetySupervisor' ||
      field === 'safetyInjured' ||
      field === 'firstAidEmployee' ||
      field === 'firstAidSupervisor' ||
      field === 'labAnalyst' ||
      field === 'labVerifiedBy' ||
      field === 'labManager' ||
      field === 'labTasteAnalyst' ||
      field === 'labParticleAnalyst' ||
      field === 'labPreparedBy' ||
      field === 'labTechnician' ||
      field === 'labProdSupervisor' ||
      field === 'labEndorsedBy' ||
      field === 'labReceivedBy'
    ) {
      // local states managed inside sub-component modals
    } else if (field === 'remarksModal') {
      setTimelineOperatorName(query);
    } else if (field === 'pauseModal') {
      setJcOpOperatorName(query);
      setJcOpOperatorEmployeeId('');
    } else {
      setJcOpOperatorName(query);
    }

    setActiveSearchField(field);
    const emps = await frappe.getEmployees(query.trim(), 20);
    setEmployeeList(emps);
    setShowEmployeeDropdown(true);
  };

  useEffect(() => {
    const fetchInitialEmployees = async () => {
      const emps = await frappe.getEmployees('', 20);
      setEmployeeList(emps);
    };
    fetchInitialEmployees();
  }, []);

  // Update email template when modal is opened
  useEffect(() => {
    if (emailModal) {
      setEmailSubject(`Report Dispatch: ${emailModal.reportType} (ID: ${emailModal.reportId})`);
      setEmailBody(`Bula,\n\nPlease find attached the ${emailModal.reportType} for ID ${emailModal.reportId}, generated on ${new Date().toLocaleString()}.\n\nRegards,\nOperations Team\nCarpenters Water Fiji PTE Limited`);
    }
  }, [emailModal]);

  const handleSendEmail = (e) => {
    e.preventDefault();
    setEmailSending(true);
    setTimeout(() => {
      setEmailSending(false);
      setEmailModal(null);
      showAlert(`Email with report attached sent to ${emailRecipient} successfully!`, 'success', 'Email Sent');
    }, 1500);
  };

  // Maintenance module states
  const [maintenanceRecords, setMaintenanceRecords] = useState(() => {
    const saved = localStorage.getItem('fiji_maintenance_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeMaintTemplate, setActiveMaintTemplate] = useState(null); // template index (0-4) or null
  const [viewingRecord, setViewingRecord] = useState(null); // record object or null
  const [maintWeekNo, setMaintWeekNo] = useState('');
  const [maintFromDate, setMaintFromDate] = useState('');
  const [maintToDate, setMaintToDate] = useState('');
  const [maintCheckgrid, setMaintCheckgrid] = useState({}); // { rowIdx-day: boolean }
  const [maintRemarks, setMaintRemarks] = useState({}); // { rowIdx: string }
  const [maintStdTimes, setMaintStdTimes] = useState({}); // { tIdx: number }
  const [maintOperator, setMaintOperator] = useState('');
  const [maintSupervisor, setMaintSupervisor] = useState('');
  const [maintViewMode, setMaintViewMode] = useState('grid'); // 'grid' | 'list'
  const [activeMaintSubTab, setActiveMaintSubTab] = useState('preventive'); // 'preventive' | 'regular-breakdown'
  const [activeMaintForm, setActiveMaintForm] = useState(null); // 'weight-check' | 'breakdown' | null
  const [maintSearchQuery, setMaintSearchQuery] = useState('');
  const [maintFilterEquipment, setMaintFilterEquipment] = useState('All');
  const [maintTemplates, setMaintTemplates] = useState(MAINTENANCE_TEMPLATES_STATIC);

  useEffect(() => {
    if (!isLoggedIn) {
      setMaintTemplates(MAINTENANCE_TEMPLATES_STATIC);
    }
  }, [isLoggedIn]);

  // Health & Safety states
  const [safetyRecords, setSafetyRecords] = useState(() => {
    const saved = localStorage.getItem('fiji_safety_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSafetyForm, setActiveSafetyForm] = useState(null);
  const [viewingSafetyRecord, setViewingSafetyRecord] = useState(null);
  const [safetySearchQuery, setSafetySearchQuery] = useState('');
  const [safetyFilterType, setSafetyFilterType] = useState('All');
  const [safetyPage, setSafetyPage] = useState(1);
  const [safetySaving, setSafetySaving] = useState(false);

  useEffect(() => {
    localStorage.setItem('fiji_safety_records', JSON.stringify(safetyRecords));
  }, [safetyRecords]);

  useEffect(() => {
    setSafetyPage(1);
  }, [safetySearchQuery, safetyFilterType]);

  // Laboratory states
  const [laboratoryRecords, setLaboratoryRecords] = useState(() => {
    const saved = localStorage.getItem('fiji_laboratory_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeLabForm, setActiveLabForm] = useState(null);
  const [viewingLabRecord, setViewingLabRecord] = useState(null);
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [labFilterType, setLabFilterType] = useState('All');
  const [labPage, setLabPage] = useState(1);
  const [labViewMode, setLabViewMode] = useState('grid');
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [salesSearchQuery, setSalesSearchQuery] = useState('');


  useEffect(() => {
    localStorage.setItem('fiji_laboratory_records', JSON.stringify(laboratoryRecords));
  }, [laboratoryRecords]);

  useEffect(() => {
    setLabPage(1);
  }, [labSearchQuery, labFilterType]);

  // Cleaning & Sanitation states
  const [cleaningRecords, setCleaningRecords] = useState(() => {
    const saved = localStorage.getItem('fiji_cleaning_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeCleaningForm, setActiveCleaningForm] = useState(null);
  const [viewingCleaningRecord, setViewingCleaningRecord] = useState(null);
  const [cleaningSearchQuery, setCleaningSearchQuery] = useState('');
  const [cleaningFilterType, setCleaningFilterType] = useState('All');
  const [cleaningPage, setCleaningPage] = useState(1);
  const [cleaningSaving, setCleaningSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem('fiji_cleaning_records', JSON.stringify(cleaningRecords));
  }, [cleaningRecords]);

  useEffect(() => {
    setCleaningPage(1);
  }, [cleaningSearchQuery, cleaningFilterType]);

  const handleSaveCleaning = async (doctype, data) => {
    setCleaningSaving(true);
    let newId = `CS-${Date.now().toString().slice(-6)}`;
    const newRecordData = {
      type: doctype,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...data
    };

    try {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive && conn.connected) {
        try {
          let response;
          if (doctype === 'Toilet Cleaning purpose') {
            response = await frappe.createToiletCleaningPurpose({
              cleaning_purpose: data.purpose
            });
          } else if (doctype === 'Dining Room Cleaning Purpose') {
            response = await frappe.createDiningRoomCleaningPurpose({
              cleaning_purpose: data.purpose
            });
          } else if (doctype === 'Factory Floor Cleaning Purpose') {
            response = await frappe.createFactoryFloorCleaningPurpose({
              cleaning_purpose: data.purpose
            });
          } else if (doctype === 'Lab and Office Cleaning Purpose') {
            response = await frappe.createLabOfficeCleaningPurpose({
              cleaning_purpose: data.purpose
            });
          } else if (doctype === 'Cleaning of Toilets') {
            const extractEmployeeId = (val) => {
              if (!val) return '';
              const match = val.match(/\(([^)]+)\)/);
              return match ? match[1] : val;
            };

            const resolveEmployeeId = (val, defaultVal) => {
              const extracted = extractEmployeeId(val);
              if (!extracted) return defaultVal;
              const searchVal = extracted.toLowerCase().trim();
              const found = (employeeList || []).find(emp => {
                const empName = (emp.employee_name || emp.name || '').toLowerCase();
                const empId = (emp.name || '').toLowerCase();
                const initials = empName.split(' ').map(n => n[0]).join('');
                return empName === searchVal || empId === searchVal || initials === searchVal;
              });
              return found ? found.name : defaultVal;
            };

            const dateTimeStr = `${data.posting_date} ${data.posting_time || '12:00'}:00`;
            const duties_performed_by = resolveEmployeeId(data.cleaner, extractEmployeeId(data.cleaner));
            const checked_by = resolveEmployeeId(data.supervisor, extractEmployeeId(data.supervisor));

            let activePurposes = data.selectedPurposes || [];

            if (activePurposes.length === 0) {
              const purposes = await frappe.getToiletCleaningPurposes();
              activePurposes = purposes.length > 0 ? [purposes[0].name] : [];
            }

            const erpPayload = {
              table_hcqa: activePurposes.map(purposeName => ({
                doctype: 'Cleaning of Toilet Table',
                date_time: dateTimeStr,
                cleaning_purpose: purposeName,
                duties_performed_by: duties_performed_by,
                checked_by: checked_by,
                frequency: data.frequency || undefined,
                cleaning_agent_used: data.cleaning_agent_used || undefined
              }))
            };
            response = await frappe.createToiletCleaningRecord(erpPayload);
          } else if (doctype === 'Cleaning of Dining Room') {
            const extractEmployeeId = (val) => {
              if (!val) return '';
              const match = val.match(/\(([^)]+)\)/);
              return match ? match[1] : val;
            };

            const resolveEmployeeId = (val, defaultVal) => {
              const extracted = extractEmployeeId(val);
              if (!extracted) return defaultVal;
              const searchVal = extracted.toLowerCase().trim();
              const found = (employeeList || []).find(emp => {
                const empName = (emp.employee_name || emp.name || '').toLowerCase();
                const empId = (emp.name || '').toLowerCase();
                const initials = empName.split(' ').map(n => n[0]).join('');
                return empName === searchVal || empId === searchVal || initials === searchVal;
              });
              return found ? found.name : defaultVal;
            };

            const dateTimeStr = `${data.posting_date} ${data.posting_time || '12:00'}:00`;
            const duties_performed_by = resolveEmployeeId(data.cleaner, extractEmployeeId(data.cleaner));
            const checked_by = resolveEmployeeId(data.supervisor, extractEmployeeId(data.supervisor));

            let activePurposes = data.selectedPurposes || [];
            if (activePurposes.length === 0) {
              const purposes = await frappe.getDiningRoomCleaningPurposes();
              activePurposes = purposes.length > 0 ? [purposes[0].name] : [];
            }

            const erpPayload = {
              table_knse: activePurposes.map(purposeName => ({
                doctype: 'Cleaning of Dining Room Table',
                date_time: dateTimeStr,
                cleaning_purpose: purposeName,
                duties_performed_by: duties_performed_by,
                checked_by: checked_by
              }))
            };
            response = await frappe.createDiningRoomCleaningRecord(erpPayload);
          } else if (doctype === 'Factory Floor') {
            const extractEmployeeId = (val) => {
              if (!val) return '';
              const match = val.match(/\(([^)]+)\)/);
              return match ? match[1] : val;
            };

            const resolveEmployeeId = (val, defaultVal) => {
              const extracted = extractEmployeeId(val);
              if (!extracted) return defaultVal;
              const searchVal = extracted.toLowerCase().trim();
              const found = (employeeList || []).find(emp => {
                const empName = (emp.employee_name || emp.name || '').toLowerCase();
                const empId = (emp.name || '').toLowerCase();
                const initials = empName.split(' ').map(n => n[0]).join('');
                return empName === searchVal || empId === searchVal || initials === searchVal;
              });
              return found ? found.name : defaultVal;
            };

            const dateTimeStr = `${data.posting_date} ${data.posting_time || '12:00'}:00`;
            const duties_performed_by = resolveEmployeeId(data.cleaner, extractEmployeeId(data.cleaner));
            const checked_by = resolveEmployeeId(data.supervisor, extractEmployeeId(data.supervisor));

            let activePurposes = data.selectedPurposes || [];
            if (activePurposes.length === 0) {
              const purposes = await frappe.getFactoryFloorCleaningPurposes();
              activePurposes = purposes.length > 0 ? [purposes[0].name] : [];
            }

            const erpPayload = {
              table_oftv: activePurposes.map(purposeName => ({
                doctype: 'Factory Floor Cleaning Table',
                date_time: dateTimeStr,
                cleaning_purpose: purposeName,
                duties_performed_by: duties_performed_by,
                checked_by: checked_by
              }))
            };
            response = await frappe.createFactoryFloorCleaningRecord(erpPayload);
          } else if (doctype === 'Cleaning of Lab and Office') {
            const extractEmployeeId = (val) => {
              if (!val) return '';
              const match = val.match(/\(([^)]+)\)/);
              return match ? match[1] : val;
            };

            const resolveEmployeeId = (val, defaultVal) => {
              const extracted = extractEmployeeId(val);
              if (!extracted) return defaultVal;
              const searchVal = extracted.toLowerCase().trim();
              const found = (employeeList || []).find(emp => {
                const empName = (emp.employee_name || emp.name || '').toLowerCase();
                const empId = (emp.name || '').toLowerCase();
                const initials = empName.split(' ').map(n => n[0]).join('');
                return empName === searchVal || empId === searchVal || initials === searchVal;
              });
              return found ? found.name : defaultVal;
            };

            const dateTimeStr = `${data.posting_date} ${data.posting_time || '12:00'}:00`;
            const duties_performed_by = resolveEmployeeId(data.cleaner, extractEmployeeId(data.cleaner));
            const checked_by = resolveEmployeeId(data.supervisor, extractEmployeeId(data.supervisor));

            let activePurposes = data.selectedPurposes || [];
            if (activePurposes.length === 0) {
              const purposes = await frappe.getLabOfficeCleaningPurposes();
              activePurposes = purposes.length > 0 ? [purposes[0].name] : [];
            }

            const erpPayload = {
              table_ntim: activePurposes.map(purposeName => ({
                doctype: 'Cleaning of Lab and Office Table',
                date_time: dateTimeStr,
                cleaning_purpose: purposeName,
                cleaning_done: 'Completed',
                duties_performed_by: duties_performed_by,
                checked_by: checked_by
              }))
            };
            response = await frappe.createLabOfficeCleaningRecord(erpPayload);
          } else if (doctype === 'Balance Check or Callibration') {
            const extractEmployeeId = (val) => {
              if (!val) return '';
              const match = val.match(/\(([^)]+)\)/);
              return match ? match[1] : val;
            };

            const resolveEmployeeId = (val, defaultVal) => {
              const extracted = extractEmployeeId(val);
              if (!extracted) return defaultVal;
              const searchVal = extracted.toLowerCase().trim();
              const found = (employeeList || []).find(emp => {
                const empName = (emp.employee_name || emp.name || '').toLowerCase();
                const empId = (emp.name || '').toLowerCase();
                const initials = empName.split(' ').map(n => n[0]).join('');
                return empName === searchVal || empId === searchVal || initials === searchVal;
              });
              return found ? found.name : defaultVal;
            };

            const checked_by = resolveEmployeeId(data.checked_by, extractEmployeeId(data.checked_by));
            const verified_by = resolveEmployeeId(data.supervisor, extractEmployeeId(data.supervisor));
            const balance_cleaner = resolveEmployeeId(data.cleaning_of_the_balance_done_by, extractEmployeeId(data.cleaning_of_the_balance_done_by));

            const erpPayload = {
              date: data.posting_date,
              checked_by: checked_by,
              verified_by: verified_by || undefined,
              weight_10g: parseFloat(data.weight_10g) || 0,
              weight_20g: parseFloat(data.weight_20g) || 0,
              weight_50g: parseFloat(data.weight_50g) || 0,
              tolerance: data.tolerance || '(+/- 2%)',
              cleaning_of_the_balance_done_by: balance_cleaner,
              using: data.using || '',
              comments: data.remarks || ''
            };
            response = await frappe.createBalanceCheckRecord(erpPayload);
          } else if (doctype === 'Incubator Temperature Record') {
            const extractEmployeeId = (val) => {
              if (!val) return '';
              const match = val.match(/\(([^)]+)\)/);
              return match ? match[1] : val;
            };

            const resolveEmployeeId = (val, defaultVal) => {
              const extracted = extractEmployeeId(val);
              if (!extracted) return defaultVal;
              const searchVal = extracted.toLowerCase().trim();
              const found = (employeeList || []).find(emp => {
                const empName = (emp.employee_name || emp.name || '').toLowerCase();
                const empId = (emp.name || '').toLowerCase();
                const initials = empName.split(' ').map(n => n[0]).join('');
                return empName === searchVal || empId === searchVal || initials === searchVal;
              });
              return found ? found.name : defaultVal;
            };

            const checked_by_emp = resolveEmployeeId(data.recorded_by, extractEmployeeId(data.recorded_by));
            const verified_by_emp = resolveEmployeeId(data.supervisor, extractEmployeeId(data.supervisor));

            const erpPayload = {
              date: data.posting_date,
              checked_by: checked_by_emp,
              verified_by: verified_by_emp,
              table_wahj: [
                {
                  doctype: 'Incubator Temperature Check',
                  time: data.time || '12:00',
                  incubator_1: String(data.incubator_1 || ''),
                  time_2: data.time_2 || '12:00',
                  incubator_2: String(data.incubator_2 || ''),
                  remarks: data.remarks || ''
                }
              ]
            };
            response = await frappe.createIncubatorTemperatureRecord(erpPayload);
          } else if (doctype === 'equipment sanitation and cip') {
            const extractEmployeeId = (val) => {
              if (!val) return '';
              const match = val.match(/\(([^)]+)\)/);
              return match ? match[1] : val;
            };

            const resolveEmployeeId = (val, defaultVal) => {
              const extracted = extractEmployeeId(val);
              if (!extracted) return defaultVal;
              const searchVal = extracted.toLowerCase().trim();
              const found = (employeeList || []).find(emp => {
                const empName = (emp.employee_name || emp.name || '').toLowerCase();
                const empId = (emp.name || '').toLowerCase();
                const initials = empName.split(' ').map(n => n[0]).join('');
                return empName === searchVal || empId === searchVal || initials === searchVal;
              });
              return found ? found.name : defaultVal;
            };

            const performed_by_emp = resolveEmployeeId(data.performed_by, extractEmployeeId(data.performed_by));
            const verified_by_emp = resolveEmployeeId(data.supervisor, extractEmployeeId(data.supervisor));

            const erpPayload = {
              date: data.posting_date,
              time: data.posting_time || '12:00:00',
              performed_by_operator: performed_by_emp,
              verified_by_supervisor: verified_by_emp,
              equipmentline_cleaned: data.equipment_sanitized,
              chemicalmethod_used: data.chemical_used,
              concentration_ppm__: data.concentration_ppm ? String(data.concentration_ppm) : '',
              contact_time_mins: parseInt(data.contact_time_mins) || 0,
              sanitation_result: data.status || 'Satisfactory',
              observations__remarks: data.remarks || ''
            };
            response = await frappe.createEquipmentSanitationCIP(erpPayload);
          } else {
            response = await frappe.createCleaningSanitationRecord(doctype, data);
          }
          if (response && response.name) {
            newId = response.name;
          }
        } catch (err) {
          console.error(`Failed to save ${doctype} to ERPNext:`, err);
          showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
        }
      }

      const newRecord = {
        id: newId,
        ...newRecordData
      };

      setCleaningRecords(prev => [newRecord, ...prev]);
      setActiveCleaningForm(null);
      showAlert(`${doctype} logged successfully!`, 'success', 'QC Log Saved');
      loadCleaningRecords();
    } finally {
      setCleaningSaving(false);
    }
  };

  const handleSaveLaboratory = async (type, data) => {
    setLabSaving(true);
    let newId = `LAB-${Date.now().toString().slice(-6)}`;

    if (type === 'Form 1 (Micro raw)') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          const resolveEmployeeId = (val, defaultVal) => {
            const extracted = extractEmployeeId(val);
            if (!extracted) return defaultVal;
            const searchVal = extracted.toLowerCase().trim();
            const found = (employeeList || []).find(emp => {
              const empName = (emp.employee_name || emp.name || '').toLowerCase();
              const empId = (emp.name || '').toLowerCase();
              const initials = empName.split(' ').map(n => n[0]).join('');
              return empName === searchVal || empId === searchVal || initials === searchVal;
            });
            return found ? found.name : defaultVal;
          };

          // 1. Map to table_kzci (Analysis and Results Table)
          const table_kzci = (data.sampleRows || []).map(row => ({
            doctype: 'Analysis and Results Table',
            sample_description: row.description,
            tcc: row.tcc,
            ecoli: row.ecoli,
            analyst: resolveEmployeeId(row.analyst, extractEmployeeId(data.analyst))
          }));

          // 2. Map to table_gdru (Result Analysis Table)
          const table_gdru = (data.sampleRows || []).map(row => ({
            doctype: 'Result Analysis Table',
            test_type: row.description,
            incubation_in_date_and_time: row.inDate && row.inTime ? `${row.inDate} ${row.inTime}:00` : null,
            incubation_out_date_and_time: row.outDate && row.outTime ? `${row.outDate} ${row.outTime}:00` : null
          }));

          const erpPayload = {
            date_of_analysis: data.date,
            analyst: extractEmployeeId(data.analyst),
            preform_lot_no: data.preformLotNo,
            closures_lot_no: data.closuresLotNo,
            bib_inner_bag: data.bibInnerBag,
            table_kzci: table_kzci,
            table_gdru: table_gdru,
            negative_or_absent_for_coliform_and_ecoli: data.specChecked ? 'Yes' : 'No',
            date: data.date,
            comments: data.comments || ''
          };

          const response = await frappe.createRawMaterialsMicroRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Microbiological Analysis of Primary Raw Materials to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    if (type === 'Form 9 (Chemical)') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          // 1. Map to table_tncp (Product Water Table)
          const table_tncp = [
            {
              doctype: 'Product Water Table',
              test_for: 'pH',
              time: data.prodPhTime ? data.prodPhTime + ':00' : '00:00:00',
              result: data.prodPh || ''
            },
            {
              doctype: 'Product Water Table',
              test_for: 'TDS',
              time: data.prodTdsTime ? data.prodTdsTime + ':00' : '00:00:00',
              result: data.prodTds || ''
            }
          ];

          // 2. Map to taste_and_particle_check (Taste and Particle Table)
          const taste_and_particle_check = [
            {
              doctype: 'Taste and Particle Table',
              time: data.tasteTime ? data.tasteTime + ':00' : '00:00:00',
              result: data.tasteCheck || ''
            },
            {
              doctype: 'Taste and Particle Table',
              time: data.particleTime ? data.particleTime + ':00' : '00:00:00',
              result: data.particleCheck || ''
            }
          ];

          const erpPayload = {
            date: data.date,
            analyst: extractEmployeeId(data.analyst),
            verified_by: extractEmployeeId(data.verifiedBy),
            ph_level: parseFloat(data.rawPh) || 0.0,
            time: data.rawPhTime ? data.rawPhTime + ':00' : '00:00:00',
            tds_level: parseFloat(data.rawTds) || 0.0,
            time_2: data.rawTdsTime ? data.rawTdsTime + ':00' : '00:00:00',
            alocohol__check_after_change_from_rtd_to_csd: parseFloat(data.alcoholCheck) || 0.0,
            brix_check_after_change_over_rtd_to_water: parseFloat(data.brixCheck) || 0.0,
            type_of_water: data.typeOfWater || 'PET',
            table_tncp: table_tncp,
            taste_and_particle_check: taste_and_particle_check,
            ph_check_for_buffer_no: 'pH 4.0',
            ph_check_for_buffer_result: parseFloat(data.buffer4) || 4.0,
            ph_check_for_buffer_no_2: 'pH 7.0',
            ph_check_for_buffer_result_2: parseFloat(data.buffer7) || 7.0,
            result_2: parseFloat(data.buffer10) || 10.0,
            check_using: parseFloat(data.checkStandard) || 1413.0,
            result: parseFloat(data.cond1413) || 1413.0,
            comments: data.comments || ''
          };

          const response = await frappe.createChemicalTestRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Chemical Test to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    if (type === 'Form 11 (Micro water)') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          // 1. Map to table_aqat (Microbiological sample table)
          const table_aqat = (data.sampleRows || []).map(row => ({
            doctype: 'Microbiological sample table',
            sample: row.sample,
            tcc: row.tcc,
            e_coli: row.ecoli,
            hpc_count: `${row.hpc1 || 0} / ${row.hpc2 || 0}`
          }));

          const erpPayload = {
            date_of_analysis: data.date,
            date_of_product: data.dateOfProduct,
            product_size: data.productSize,
            market: data.market,
            table_aqat: table_aqat,
            compact_dry_ec: data.compactDryEC,
            pipette_lot: data.pipetteLot,
            vessel: data.vessel,
            spc_agar_date: data.spcAgarDate,
            analyst: extractEmployeeId(data.analyst),
            incubator_test_type: data.incubatorTestType || 'TCC',
            incubator_no_tcc_and_hpc: data.incubatorNo,
            tcc_incubation_in: data.incubatorTestType === 'TCC' && data.tccIncubationIn ? `${data.tccIncubationIn.replace('T', ' ')}:00` : null,
            tcc_incubation_out: data.incubatorTestType === 'TCC' && data.tccIncubationOut ? `${data.tccIncubationOut.replace('T', ' ')}:00` : null,
            hpc_incubation_in: data.incubatorTestType === 'HPC' && data.hpcIncubationIn ? `${data.hpcIncubationIn.replace('T', ' ')}:00` : null,
            hpc_incubation_out: data.incubatorTestType === 'HPC' && data.hpcIncubationOut ? `${data.hpcIncubationOut.replace('T', ' ')}:00` : null,
            comments: data.comments || '',
            approved_by: extractEmployeeId(data.approvedBy)
          };

          const response = await frappe.createWaterMicroRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Microbiological Analysis Raw and Product Water to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    if (type === 'Form 21 (Taste/Visual)') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          const resolveEmployeeId = (val, defaultVal) => {
            const extracted = extractEmployeeId(val);
            if (!extracted) return defaultVal;
            const searchVal = extracted.toLowerCase().trim();
            const found = (employeeList || []).find(emp => {
              const empName = (emp.employee_name || emp.name || '').toLowerCase();
              const empId = (emp.name || '').toLowerCase();
              const initials = empName.split(' ').map(n => n[0]).join('');
              return empName === searchVal || empId === searchVal || initials === searchVal;
            });
            return found ? found.name : defaultVal;
          };

          // 1. Map to taste_test (Taste Result)
          const taste_test = (data.tasteRows || []).map(row => ({
            doctype: 'Taste Result',
            sample_date: row.sampleDate,
            sample_size: row.sampleSize || data.sampleSize || '',
            h4_taste: row.h4_taste,
            h4_done_by: resolveEmployeeId(row.h4_doneBy, extractEmployeeId(data.analyst)),
            h36_taste: row.h36_taste,
            h36_done_by: resolveEmployeeId(row.h36_doneBy, extractEmployeeId(data.analyst)),
            h72_taste: row.h72_taste,
            h72_done_by: resolveEmployeeId(row.h72_doneBy, extractEmployeeId(data.analyst)),
            verified_by: extractEmployeeId(data.verifiedBy)
          }));

          // 2. Map to visual_inspection (Visual Inspection Table)
          const visual_inspection = (data.particleRows || []).map(row => ({
            doctype: 'Visual Inspection Table',
            sample_date: row.sampleDate,
            sample_size: row.sampleSize || data.sampleSize || '',
            d5_particle: row.d5_particle,
            d5_done_by: resolveEmployeeId(row.d5_doneBy, extractEmployeeId(data.analyst)),
            d10_particle: row.d10_particle,
            d10_done_by: resolveEmployeeId(row.d10_doneBy, extractEmployeeId(data.analyst)),
            d30_particle: row.d30_particle,
            d30_done_by: resolveEmployeeId(row.d30_doneBy, extractEmployeeId(data.analyst)),
            verified_by: extractEmployeeId(data.verifiedBy)
          }));

          const erpPayload = {
            taste_test: taste_test,
            visual_inspection: visual_inspection
          };

          const response = await frappe.createTasteVisualRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Taste Test and Visual Inspection to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    if (type === 'Form 103 (Silver Log)') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          const resolveEmployeeId = (val, defaultVal) => {
            const extracted = extractEmployeeId(val);
            if (!extracted) return defaultVal;
            const searchVal = extracted.toLowerCase().trim();
            const found = (employeeList || []).find(emp => {
              const empName = (emp.employee_name || emp.name || '').toLowerCase();
              const empId = (emp.name || '').toLowerCase();
              const initials = empName.split(' ').map(n => n[0]).join('');
              return empName === searchVal || empId === searchVal || initials === searchVal;
            });
            return found ? found.name : defaultVal;
          };

          const set1 = data.sets?.[0] || {};
          const set2 = data.sets?.[1] || {};
          const set3 = data.sets?.[2] || {};

          const erpPayload = {
            date1: set1.date || null,
            tech1: resolveEmployeeId(set1.technician, extractEmployeeId(set1.technician)),
            verifier1: resolveEmployeeId(set1.verifiedBy, extractEmployeeId(set1.verifiedBy)),
            calibration1: set1.calibration || '',
            rows1: (set1.rows || []).map(r => ({
              doctype: 'Silver Photometer Readings',
              sample: r.sample,
              time: r.time,
              readings_ppb: r.reading
            })),

            date2: set2.date || null,
            tech2: resolveEmployeeId(set2.technician, extractEmployeeId(set2.technician)),
            verifier2: resolveEmployeeId(set2.verifiedBy, extractEmployeeId(set2.verifiedBy)),
            calibration2: set2.calibration || '',
            rows2: (set2.rows || []).map(r => ({
              doctype: 'Silver Photometer Readings',
              sample: r.sample,
              time: r.time,
              readings_ppb: r.reading
            })),

            date3: set3.date || null,
            tech3: resolveEmployeeId(set3.technician, extractEmployeeId(set3.technician)),
            verifier3: resolveEmployeeId(set3.verifiedBy, extractEmployeeId(set3.verifiedBy)),
            calibration3: set3.calibration || '',
            rows3: (set3.rows || []).map(r => ({
              doctype: 'Silver Photometer Readings',
              sample: r.sample,
              time: r.time,
              readings_ppb: r.reading
            }))
          };

          const response = await frappe.createSilverPhotometerRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Silver Photometer Log and Calibration to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    if (type === 'Form 36 (Bourbon/Cola)') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          const resolveEmployeeId = (val, defaultVal) => {
            const extracted = extractEmployeeId(val);
            if (!extracted) return defaultVal;
            const searchVal = extracted.toLowerCase().trim();
            const found = (employeeList || []).find(emp => {
              const empName = (emp.employee_name || emp.name || '').toLowerCase();
              const empId = (emp.name || '').toLowerCase();
              const initials = empName.split(' ').map(n => n[0]).join('');
              return empName === searchVal || empId === searchVal || initials === searchVal;
            });
            return found ? found.name : defaultVal;
          };

          const recipeItems = [
            { ingredient: 'Bourbon', standard_qty: '42Kg (46L)', lot_batch_no: data.bourbonLot, status: 'Confirmed Added' },
            { ingredient: 'Ethanol', standard_qty: '125Kg (158.5L)', lot_batch_no: data.ethanolLot, status: 'Confirmed Added' },
            { ingredient: 'Aged Cola Flavour', standard_qty: '2.0Kg', lot_batch_no: data.agedColaLot, status: 'Confirmed Added' },
            { ingredient: 'Cola Flavour', standard_qty: '3.6Kg', lot_batch_no: data.colaFlavourLot, status: 'Confirmed Added' },
            { ingredient: 'Cola Acidulant', standard_qty: '1.0Kg', lot_batch_no: data.acidulantLot, status: 'Confirmed Added' },
            { ingredient: 'Sodium Benzoate', standard_qty: '0.4Kg', lot_batch_no: data.benzoateLot, status: 'Confirmed Added' },
            { ingredient: 'Sugar', standard_qty: '150Kg', lot_batch_no: data.sugarLot, status: 'Confirmed Added' }
          ].map(item => ({
            doctype: 'Bourbon Whiskey and Cola Recipe Item',
            ...item
          }));

          const erpPayload = {
            date: data.date,
            tank_no: data.tankNo,
            volume: data.volume,
            prepared_by: resolveEmployeeId(data.preparedBy, extractEmployeeId(data.preparedBy)),
            verified_by: resolveEmployeeId(data.verifiedBy, extractEmployeeId(data.verifiedBy)),
            analysed_by: resolveEmployeeId(data.analysedBy, extractEmployeeId(data.analysedBy)),
            lab_alc: parseFloat(data.labAlc) || 0.0,
            tank_ph: parseFloat(data.tankPh) || 0.0,
            finished_ph: parseFloat(data.finishedPh) || 0.0,
            brix_mixer: parseFloat(data.brixMixer) || 0.0,
            brix_mixer_by: data.brixMixerBy || '',
            brix_product: parseFloat(data.brixProduct) || 0.0,
            brix_product_by: data.brixProductBy || '',
            gas_level: parseFloat(data.gasLevel) || 0.0,
            comments: data.comments || '',
            recipe_checklist: recipeItems
          };

          const response = await frappe.createBourbonColaRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Bourbon Whiskey & Cola Product Tank Record to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    if (type === 'Form 100 (Production Log)') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          const resolveEmployeeId = (val, defaultVal) => {
            const extracted = extractEmployeeId(val);
            if (!extracted) return defaultVal;
            const searchVal = extracted.toLowerCase().trim();
            const found = (employeeList || []).find(emp => {
              const empName = (emp.employee_name || emp.name || '').toLowerCase();
              const empId = (emp.name || '').toLowerCase();
              const initials = empName.split(' ').map(n => n[0]).join('');
              return empName === searchVal || empId === searchVal || initials === searchVal;
            });
            return found ? found.name : defaultVal;
          };

          const erpPayload = {
            date: data.date,
            time_start: data.timeStart ? data.timeStart + ':00' : null,
            time_stop: data.timeStop ? data.timeStop + ':00' : null,
            market: data.market,
            supervisor: resolveEmployeeId(data.supervisor, extractEmployeeId(data.supervisor)),
            product_desc: data.productDesc,
            product_size: data.productSize,
            packing_type: data.packingType,
            warehouse_cases: parseInt(data.warehouseCases) || 0,
            endorsed_by: resolveEmployeeId(data.endorsedBy, extractEmployeeId(data.endorsedBy)),
            received_by: resolveEmployeeId(data.receivedBy, extractEmployeeId(data.receivedBy)),
            filler_counter: data.fillerCounter || '',
            labeller_counter: data.labellerCounter || '',
            lpg_start: data.lpgStart || '',
            lpg_stop: data.lpgStop || '',
            efl_start: data.eflStart || '',
            efl_stop: data.eflStop || '',
            boc_start: data.bocStart || '',
            boc_stop: data.bocStop || '',
            crew_infeed: data.crewInfeed || '',
            crew_filler: data.crewFiller || '',
            crew_lab: data.crewLab || '',
            crew_water: data.crewWater || '',
            crew_blowing: data.crewBlowing || '',
            crew_labeller: data.crewLabeller || '',
            waste_bottles: parseInt(data.wasteBottles) || 0,
            waste_caps: parseInt(data.wasteCaps) || 0,
            waste_preform: parseInt(data.wastePreform) || 0,
            waste_ldpe: data.wasteLdpe || '',
            waste_cartons: parseInt(data.wasteCartons) || 0,
            waste_samples: parseInt(data.wasteSamples) || 0,
            comments: data.comments || ''
          };

          const response = await frappe.createHandoverRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Daily Production & Handover Record to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    const newRecord = {
      id: newId,
      type,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...data
    };
    setLaboratoryRecords(prev => [newRecord, ...prev]);
    setLabSaving(false);
    setActiveLabForm(null);
    showAlert(`${type} logged successfully!`, 'success', 'QC Log Saved');
  };



  useEffect(() => {
    localStorage.setItem('fiji_maintenance_records', JSON.stringify(maintenanceRecords));
  }, [maintenanceRecords]);

  useEffect(() => {
    setMaintPage(1);
  }, [maintSearchQuery, maintFilterEquipment]);

  const handleSaveSafety = async (type, data) => {
    setSafetySaving(true);
    let newId = `SAF-${Date.now().toString().slice(-6)}`;

    // Map data for ERPNext if Incident Report
    if (type === 'Incident Report') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const reportPayload = {
            injured_person: data.injuredPerson,
            sex: data.sex,
            address: data.address,
            dob: data.dob || null,
            job_title: data.jobTitle,
            experience_years: parseInt(data.experienceYears) || 0,
            experience_months: parseInt(data.experienceMonths) || 0,
            experience_days: parseInt(data.experienceDays) || 0,
            experience: data.experience,
            relationship: data.relationship,
            incident_time: data.incidentTime ? data.incidentTime.replace('T', ' ') + ':00' : null,
            incident_type: data.incidentType,
            incident_agency: data.incidentAgency,
            incident_location: data.incidentLocation,
            details: data.details,
            medical_treatment: data.medicalTreatment,
            practitioner_name: data.practitionerName,
            date_notified: data.dateNotified || null,
            incapacity_period: data.incapacityPeriod,
            days_lost: parseInt(data.daysLost) || 0,
            date_resumption: data.dateResumption || null,
            corrective_action: data.correctiveAction,
            date_action_taken: data.dateActionTaken || null,
            operator: data.operator,
            supervisor: data.supervisor,
            overall_comments: data.overallComments
          };

          const response = await frappe.createAccidentDiseaseReport(reportPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Accident & Disease Notification Report to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    // Map data for ERPNext if First Aid Log
    if (type === 'First Aid Log') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          let typeOfInjury = 'Minor (small cuts, bruises etc.)';
          if (data.injuryType === 'Serious') {
            typeOfInjury = 'Serious (major injury such as fracture)';
          } else if (data.injuryType === 'Critical' || data.injuryType === 'Need Immediate Medical Attention') {
            typeOfInjury = 'Need Immediate Medical Attention';
          }

          const erpPayload = {
            date: data.date,
            time: data.time,
            employee__person_injured: extractEmployeeId(data.injuredPerson),
            verified_by: extractEmployeeId(data.supervisor),
            type_of_injury: typeOfInjury,
            causes_of_injury: data.cause || '',
            first_aid_treatment_given: data.treatmentGiven,
            first_aid_given_by: data.verifiedBy,
            further_treatment_if_any: data.overallComments || ''
          };

          const response = await frappe.createFirstAidRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Standard Form 17 to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    // Map data for ERPNext if Swab Test
    if (type === 'Swab Test') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          const locationsMap = {
            filtration: 'Filtration Area',
            infeed: 'Infeed',
            cleanRoom: 'Clean Room',
            labelling: 'Labelling',
            warehouse: 'Ware-House',
            blowing: 'Blowing'
          };

          const table_mxza = Object.keys(data.swabData || {}).map(key => ({
            // doctype: 'Swab Test table',
            location: locationsMap[key] || key,
            yeast: data.swabData[key].yeast ? parseInt(data.swabData[key].yeast) : 0,
            mould: data.swabData[key].mould ? parseInt(data.swabData[key].mould) : 0,
            hpc: data.swabData[key].hpc ? parseInt(data.swabData[key].hpc) : 0
          }));

          const erpPayload = {
            date_of_swab: data.date,
            analyst: extractEmployeeId(data.analyst),
            table_hovh: table_mxza,
            comments: data.overallComments || ''
          };

          const response = await frappe.createSwabTestRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Enviromental Swab Test to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    // Map data for ERPNext if Induction Log
    if (type === 'Induction Log') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : '';
          };

          let reason = 'Other';
          let otherReason = '';
          if (data.reasonForVisit === 'Audit' || data.reasonForVisit === 'Tour') {
            reason = data.reasonForVisit;
          } else {
            otherReason = data.reasonForVisit;
          }

          const erpNextOptionMap = {
            companyPolicy: 'Company Policy (ISO 9001:2015, HACCP, Harassment, Health & Safety )',
            dressCode: 'Dress Code (jewelry policy, sanitizing hands, hair nets/face masks, safety shoes)',
            noMobile: 'No use of Mobile Phones in Production area',
            earPlugs: 'No use of ear plugs or ear muffs in following section',
            toilets: 'Toilets/ Change Rooms',
            smoking: 'Smoking/Non Smoking Areas',
            authorizedAreas: 'Authorized/Unauthorized Areas',
            hazardReporting: 'Hazard Reporting Procedures (Damaged Bait Stations, incomplete structures, etc.)',
            accidentReporting: 'Accident/Incident Reporting Procedures',
            evacuationProcedure: 'Evacuation Procedures',
            nearestExit: 'Nearest Exit in the Case of Emergency',
            fireEquipment: 'Location of Nearest Fire Fighting Equipment',
            firstAidKit: 'Location of First Aid Kit/Certified first aiders',
            healthIssues: 'Any health issues or food poisoning has occurred at least 2 weeks prior to factory visit',
            msdsLocation: 'Location of MSDS'
          };

          const checklist_rows = Object.keys(data.checklist || {}).map(key => ({
            doctype: 'INDUCTION AREAS CHECKLIST',
            areas: erpNextOptionMap[key] || key,
            approval: data.checklist[key] || 'NO'
          }));

          const erpPayload = {
            name1: data.name,
            reason_for_visit: reason,
            specify_other_reason: otherReason,
            visiting_areas: data.visitingAreas,
            comments: data.comments || '',
            names: extractEmployeeId(data.name),
            signature: data.signature === 'Checked' ? 'Checked' : 'Unsigned',
            date: data.date,
            inductors_name: extractEmployeeId(data.inductorName),
            inductors_signature: data.inductorSignature === 'Checked' ? 'Checked' : 'Unsigned',
            inductors_date: data.inductorDate,
            induction_areas_checklist: checklist_rows
          };

          const response = await frappe.createInductionRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Induction to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    const newRecord = {
      id: newId,
      type, // 'Incident Report', 'First Aid Log', 'Swab Test'
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...data
    };
    setSafetyRecords(prev => [newRecord, ...prev]);
    setSafetySaving(false);
    setActiveSafetyForm(null);
    showAlert(`${type} logged successfully!`, 'success', 'Safety Log Saved');
  };

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    setMaintSaving(true);
    const template = maintTemplates[activeMaintTemplate];

    let totalChecked = 0;
    template.tasks.forEach((task, tIdx) => {
      if (maintCheckgrid[tIdx]) {
        totalChecked++;
      }
    });

    const extractEmployeeId = (val) => {
      if (!val) return '';
      const match = val.match(/\(([^)]+)\)/);
      return match ? match[1] : val;
    };

    const resolveEmployeeId = (val, defaultVal) => {
      const extracted = extractEmployeeId(val);
      if (!extracted) return defaultVal;
      const searchVal = extracted.toLowerCase().trim();
      const found = (employeeList || []).find(emp => {
        const empName = (emp.employee_name || emp.name || '').toLowerCase();
        const empId = (emp.name || '').toLowerCase();
        const initials = empName.split(' ').map(n => n[0]).join('');
        return empName === searchVal || empId === searchVal || initials === searchVal;
      });
      return found ? found.name : defaultVal;
    };

    const resolvedOperator = resolveEmployeeId(maintOperator, extractEmployeeId(maintOperator));
    const resolvedSupervisor = resolveEmployeeId(maintSupervisor, extractEmployeeId(maintSupervisor));

    const updatedTasks = template.tasks.map((task, tIdx) => {
      const customStd = maintStdTimes[tIdx] !== undefined ? maintStdTimes[tIdx] : (parseInt(task.std) || 0);
      return {
        ...task,
        std: customStd
      };
    });

    let newId = `MAINT-${Date.now().toString().slice(-6)}`;
    const newRecordData = {
      templateId: template.id,
      equipment: template.equipment,
      area: template.area,
      name: template.name,
      weekNo: maintWeekNo,
      fromDate: maintFromDate,
      toDate: maintToDate,
      operator: resolvedOperator,
      supervisor: resolvedSupervisor,
      checkgrid: maintCheckgrid,
      remarks: maintRemarks,
      overallComments: maintOverallComments,
      totalChecked,
      maxPossible: template.tasks.length,
      tasks: updatedTasks,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    try {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive && conn.connected) {
        try {
          const response = await frappe.createMaintenanceSchedule(newRecordData);
          if (response && response.name) {
            newId = response.name;
          }
        } catch (err) {
          console.error("Failed to save schedule to ERPNext:", err);
          showAlert(`Failed to save to ERPNext: ${err.message}. Saving locally instead.`, 'warning', 'Sync Issue');
        }
      }

      const newRecord = {
        id: newId,
        ...newRecordData
      };

      setMaintenanceRecords(prev => [newRecord, ...prev]);
      setActiveMaintTemplate(null);
      setMaintWeekNo('');
      setMaintFromDate('');
      setMaintToDate('');
      setMaintCheckgrid({});
      setMaintRemarks({});
      setMaintStdTimes({});
      setMaintOperator('');
      setMaintSupervisor('');
      setMaintOverallComments('');

      showAlert(`Maintenance checklist for ${template.equipment} logged successfully!`, 'success', 'Maintenance Log Saved');
    } finally {
      setMaintSaving(false);
    }
  };

  const handleSaveMaintForm = async (type, data) => {
    let newId = `MAINT-${Date.now().toString().slice(-6)}`;

    if (type === 'weight-check') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          const resolveEmployeeId = (val, defaultVal) => {
            const extracted = extractEmployeeId(val);
            if (!extracted) return defaultVal;
            const searchVal = extracted.toLowerCase().trim();
            const found = (employeeList || []).find(emp => {
              const empName = (emp.employee_name || emp.name || '').toLowerCase();
              const empId = (emp.name || '').toLowerCase();
              const initials = empName.split(' ').map(n => n[0]).join('');
              return empName === searchVal || empId === searchVal || initials === searchVal;
            });
            return found ? found.name : defaultVal;
          };

          const mappedRows = (data.rows || []).map(row => ({
            doctype: 'Weight Check Table',
            date: row.date,
            checked_by: resolveEmployeeId(row.checkedBy, extractEmployeeId(row.checkedBy)),
            verified_by: resolveEmployeeId(row.verifiedBy, extractEmployeeId(row.verifiedBy)),
            product_desc: row.productDesc || '',
            weight_1: parseFloat(row.weight1) || 0.0,
            weight_2: parseFloat(row.weight2) || 0.0
          }));

          const erpPayload = {
            checked_by: resolveEmployeeId(data.checkedBy, extractEmployeeId(data.checkedBy)),
            verified_by: resolveEmployeeId(data.verifiedBy, extractEmployeeId(data.verifiedBy)),
            overall_comments: data.overallComments || '',
            weight_check_table: mappedRows
          };

          const response = await frappe.createWeightCheckRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync For Weight Check Checklist to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    if (type === 'breakdown') {
      try {
        const conn = frappe.getConnectionSettings();
        if (conn.isLive && conn.connected) {
          const extractEmployeeId = (val) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)/);
            return match ? match[1] : val;
          };

          const resolveEmployeeId = (val, defaultVal) => {
            const extracted = extractEmployeeId(val);
            if (!extracted) return defaultVal;
            const searchVal = extracted.toLowerCase().trim();
            const found = (employeeList || []).find(emp => {
              const empName = (emp.employee_name || emp.name || '').toLowerCase();
              const empId = (emp.name || '').toLowerCase();
              const initials = empName.split(' ').map(n => n[0]).join('');
              return empName === searchVal || empId === searchVal || initials === searchVal;
            });
            return found ? found.name : defaultVal;
          };

          const erpPayload = {
            requestor_name: resolveEmployeeId(data.requestorName, extractEmployeeId(data.requestorName)),
            machine_name: data.machineName || '',
            breakdown_date: data.breakdownDate || null,
            breakdown_time: data.breakdownTime ? data.breakdownTime + ':00' : null,
            breakdown_description: data.breakdownDesc || '',
            checked_by: resolveEmployeeId(data.checkedBySV, extractEmployeeId(data.checkedBySV)),
            approved_by: resolveEmployeeId(data.approvedByFM, extractEmployeeId(data.approvedByFM)),

            received_by: resolveEmployeeId(data.receivedBy, extractEmployeeId(data.receivedBy)),
            work_in_charge_assessment: data.workAssessment || 'Maintenance',
            descriptionof_work_carried_out: data.workCarriedOut || '',
            parts_used: data.partsUsed || '',
            date_repaired: data.dateRepaired || null,
            time_repaired: data.timeRepaired ? data.timeRepaired + ':00' : null,
            repaired_done_by: resolveEmployeeId(data.repairedDoneBy, extractEmployeeId(data.repairedDoneBy)),
            approved_by_1: resolveEmployeeId(data.approvedByMM, extractEmployeeId(data.approvedByMM)),

            checked_by_1: resolveEmployeeId(data.checkedByProdSV, extractEmployeeId(data.checkedByProdSV)),
            approved_by_2: resolveEmployeeId(data.approvedByProdFM, extractEmployeeId(data.approvedByProdFM)),
            overall_comments: data.overallComments || ''
          };

          const response = await frappe.createBreakdownRecord(erpPayload);
          if (response && response.name) {
            newId = response.name;
          }
        }
      } catch (err) {
        console.error('Failed to sync Machine Breakdown record to ERPNext:', err);
        showAlert(`Failed to sync to ERPNext: ${err.message}. Saved locally instead.`, 'warning', 'Sync Issue');
      }
    }

    const newRecord = {
      id: newId,
      templateId: type, // 'weight-check' | 'breakdown'
      equipment: type === 'weight-check' ? 'Weight Check' : 'Machine Breakdown',
      area: type === 'weight-check' ? 'Quality Check' : 'Maintenance',
      name: type === 'weight-check' ? 'Standard Form 88: Weight Check' : 'Appendix A: Machine Breakdown',
      operator: data.checkedBy || data.requestorName || 'N/A',
      supervisor: data.verifiedBy || data.approvedByProductionSV || 'N/A',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...data
    };
    setMaintenanceRecords(prev => [newRecord, ...prev]);
    setActiveMaintForm(null);
    showAlert(`${newRecord.name} logged successfully!`, 'success', 'Log Saved');
  };

  // Stock Adjust Modal states
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [adjustItemCode, setAdjustItemCode] = useState('');
  const [adjustQty, setAdjustQty] = useState(0);

  // Local Storage Data persistence
  const [workOrders, setWorkOrders] = useState(() => {
    const saved = localStorage.getItem('fiji_work_orders');
    const list = saved ? JSON.parse(saved) : INITIAL_WORK_ORDERS;
    // Map initial string remarks to remarksList array format if not already done
    return list.map(wo => {
      if (wo.jobCards) {
        wo.jobCards = wo.jobCards.map(jc => {
          if (!jc.remarksList) {
            jc.remarksList = jc.remarks ? [
              {
                timestamp: wo.plannedStart || '2026-06-02 08:30:00',
                operator: jc.operator || 'S. Prasad',
                text: jc.remarks
              }
            ] : [];
          }
          return jc;
        });
      }
      return wo;
    });
  });

  // Paginated loading hooks
  const [woLoading, setWoLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalWOPagesLive, setTotalWOPagesLive] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    if (selectedWOId && workOrders && workOrders.length > 0) {
      const idx = workOrders.findIndex(wo => wo.id === selectedWOId);
      if (idx !== -1) {
        const page = Math.floor(idx / 20) + 1;
        setCurrentPage(page);
      }
    }
  }, [selectedWOId, workOrders]);

  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('fiji_inventory');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  useEffect(() => {
    localStorage.setItem('fiji_work_orders', JSON.stringify(workOrders));
  }, [workOrders]);

  useEffect(() => {
    localStorage.setItem('fiji_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    const loadItems = async () => {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive && conn.connected) {
        setItemsLoading(true);
        try {
          const offset = (invPage - 1) * 20;
          const liveItems = await frappe.getItems(20, offset);
          if (liveItems && liveItems.length > 0) {
            const itemCodes = liveItems.map(item => item.code);
            const bins = await frappe.getBinQuantities(itemCodes);

            const merged = liveItems.map(item => {
              const targetWarehouse = item.category === 'Finished Goods' ? 'Finished Goods - CWFL' : 'Raw Materials - CWFL';
              const binMatch = bins.find(b => b.item_code === item.code && b.warehouse === targetWarehouse);
              const actualQty = binMatch ? Number(binMatch.actual_qty || 0) : null;

              const localMatch = inventory[item.code];
              return {
                ...item,
                qty: actualQty !== null ? actualQty : (localMatch ? localMatch.qty : Math.floor(Math.random() * 500) + 100)
              };
            });

            setErpItems(merged);
            if (!selectedItemCode || !merged.find(i => i.code === selectedItemCode)) {
              setSelectedItemCode(merged[0].code);
            }
          } else {
            setErpItems([]);
          }
        } catch (err) {
          console.error("Failed to load items from ERPNext:", err);
        } finally {
          setItemsLoading(false);
        }
      } else {
        setErpItems([]);
      }
    };
    loadItems();
  }, [invPage, isLoggedIn, inventory]);



  // Clear OTP when transitioning phases
  useEffect(() => {
    Promise.resolve().then(() => setOtpCode(''));
  }, [is2FAPhase]);



  // const loadWorkOrders = async () => {
  //   Promise.resolve().then(() => setWoLoading(true));
  //   const conn = frappe.getConnectionSettings();
  //   if (conn.isLive && conn.connected) {
  //     try {
  //       const offset = (currentPage - 1) * recordsPerPage;
  //       const liveWOs = await frappe.getWorkOrders(recordsPerPage, offset);
  //       if (liveWOs) {
  //         const savedLocal = localStorage.getItem('fiji_work_orders');
  //         const localList = savedLocal ? JSON.parse(savedLocal) : INITIAL_WORK_ORDERS;
  //         const merged = await Promise.all(liveWOs.map(async (live) => {
  //           const localMatch = localList.find(l => l.id === live.id);
  //           let realJobCards = null;
  //           try {
  //             realJobCards = await frappe.getJobCardsForWorkOrder(live.id);
  //           } catch (jcErr) {
  //             console.warn(`Failed to fetch Job Cards for Work Order ${live.id}:`, jcErr);
  //           }

  //           return {
  //             ...live,
  //             jobCards: (realJobCards && realJobCards.length > 0) ? realJobCards : (localMatch && localMatch.jobCards.length > 0 ? localMatch.jobCards : [
  //               { id: 'PO-JOB00601', operation: 'Mixing', station: 'Mixing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00602', operation: 'Lab Testing', station: 'Lab Testing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00603', operation: 'Can/Bottle Prep', station: 'Can Preparation Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00604', operation: 'Filling', station: 'Filling Machine', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00605', operation: 'Initial Quality Check', station: 'Initial QC Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00606', operation: 'Warmer', station: 'Warmer Machine', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00607', operation: 'Laser Labeling', station: 'Labeling Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00608', operation: 'Final Quality Check', station: 'Final QC Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00609', operation: 'Hand Packing', station: 'Packing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00610', operation: 'Palletising', station: 'Palletisation Area', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //               { id: 'PO-JOB00611', operation: 'Store & Dispatch', station: 'Warehouse/Logistics', status: 'Not Started', operator: '', remarks: '', remarksList: [] }
  //             ])
  //           };
  //         }));
  //         setWorkOrders(merged);
  //       }
  //     } catch (err) {
  //       console.error("Failed to load work orders from ERPNext:", err);
  //     } finally {
  //       setWoLoading(false);
  //     }
  //   } else {
  //     setWoLoading(false);
  //   }
  // };
  // const loadWorkOrders = async () => {
  //   Promise.resolve().then(() => setWoLoading(true));

  //   const conn = frappe.getConnectionSettings();

  //   if (conn.isLive && conn.connected) {
  //     try {
  //       const offset = (currentPage - 1) * recordsPerPage;
  //       const liveWOs = await frappe.getWorkOrders(recordsPerPage, offset);

  //       if (liveWOs) {
  //         // Dynamic page estimation or count query
  //         try {
  //           const count = await frappe.getWorkOrdersCount();
  //           if (count > 0) {
  //             setTotalWOPagesLive(Math.max(1, Math.ceil(count / recordsPerPage)));
  //           } else {
  //             if (liveWOs.length < recordsPerPage) {
  //               setTotalWOPagesLive(currentPage);
  //             } else {
  //               setTotalWOPagesLive(currentPage + 1);
  //             }
  //           }
  //         } catch (cntErr) {
  //           console.warn("Failed to fetch Work Orders count from ERPNext:", cntErr);
  //           if (liveWOs.length < recordsPerPage) {
  //             setTotalWOPagesLive(currentPage);
  //           } else {
  //             setTotalWOPagesLive(currentPage + 1);
  //           }
  //         }

  //         const savedLocal = localStorage.getItem('fiji_work_orders');
  //         const localList = savedLocal ? JSON.parse(savedLocal) : INITIAL_WORK_ORDERS;

  //         const defaultJobCards = [
  //           { id: 'PO-JOB00601', operation: 'Mixing', station: 'Mixing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00602', operation: 'Lab Testing', station: 'Lab Testing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00603', operation: 'Can/Bottle Prep', station: 'Can Preparation Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00604', operation: 'Filling', station: 'Filling Machine', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00605', operation: 'Initial Quality Check', station: 'Initial QC Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00606', operation: 'Warmer', station: 'Warmer Machine', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00607', operation: 'Laser Labeling', station: 'Labeling Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00608', operation: 'Final Quality Check', station: 'Final QC Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00609', operation: 'Hand Packing', station: 'Packing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00610', operation: 'Palletising', station: 'Palletisation Area', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //           { id: 'PO-JOB00611', operation: 'Store & Dispatch', station: 'Warehouse/Logistics', status: 'Not Started', operator: '', remarks: '', remarksList: [] }
  //         ];

  //         const merged = await Promise.all(
  //           liveWOs.map(async (live) => {
  //             const localMatch = localList.find(l => l.id === live.id);

  //             let realJobCards = null;

  //             try {
  //               realJobCards = await frappe.getJobCardsForWorkOrder(live.id);
  //             } catch (jcErr) {
  //               console.warn(`Failed to fetch Job Cards for Work Order ${live.id}:`, jcErr);
  //             }

  //             const mergedJobCards =
  //               realJobCards && realJobCards.length > 0
  //                 ? realJobCards
  //                 : localMatch && localMatch.jobCards && localMatch.jobCards.length > 0
  //                   ? localMatch.jobCards
  //                   : defaultJobCards;

  //             const materialTransferred = Boolean(
  //               localMatch?.materialTransferred ||
  //               localMatch?.stockEntryCreated
  //             );

  //             return {
  //               ...live,

  //               // Preserve local material issue flags
  //               materialTransferred,
  //               stockEntryCreated: Boolean(localMatch?.stockEntryCreated),
  //               stockEntryName: localMatch?.stockEntryName || '',
  //               stockEntryPostingDate: localMatch?.stockEntryPostingDate || '',
  //               stockEntryPostingTime: localMatch?.stockEntryPostingTime || '',

  //               // Trust ERPNext status after Stock Entry submission
  //               status: live.status,

  //               jobCards: mergedJobCards
  //             };
  //           })
  //         );

  //         setWorkOrders(merged);
  //       }
  //     } catch (err) {
  //       console.error("Failed to load work orders from ERPNext:", err);
  //     } finally {
  //       setWoLoading(false);
  //     }
  //   } else {
  //     setWoLoading(false);
  //   }
  // };


  const loadWorkOrders = async () => {
    Promise.resolve().then(() => setWoLoading(true));

    const conn = frappe.getConnectionSettings();

    if (!conn.isLive || !conn.connected) {
      setWoLoading(false);
      return;
    }

    try {
      const offset = (currentPage - 1) * recordsPerPage;

      const result = await frappe.getWorkOrderDashboard(
        recordsPerPage,
        offset,
        conn.defaultCompany || defaultCompany,
        woStatusFilter
      );

      const savedLocal = localStorage.getItem("fiji_work_orders");
      const localList = savedLocal
        ? JSON.parse(savedLocal)
        : INITIAL_WORK_ORDERS;

      const merged = result.data.map((live) => {
        const localMatch = localList.find((l) => l.id === live.id);

        return {
          ...live,

          // Preserve local-only values
          materialTransferred: Boolean(
            localMatch?.materialTransferred ||
            localMatch?.stockEntryCreated
          ),

          stockEntryCreated: Boolean(
            localMatch?.stockEntryCreated
          ),

          stockEntryName:
            localMatch?.stockEntryName || "",

          stockEntryPostingDate:
            localMatch?.stockEntryPostingDate || "",

          stockEntryPostingTime:
            localMatch?.stockEntryPostingTime || ""
        };
      });

      console.log("loadWorkOrders - merged count:", merged.length, "result count:", result?.count);
      setWorkOrders(merged);

      const parsedCount = typeof result?.count === 'number' ? result.count : parseInt(result?.count);
      const calculatedPages = isNaN(parsedCount) ? 1 : Math.max(1, Math.ceil(parsedCount / recordsPerPage));
      console.log("loadWorkOrders - calculated total live pages:", calculatedPages);
      setTotalWOPagesLive(calculatedPages);

    } catch (err) {
      console.error(
        "Failed to load Work Order dashboard:",
        err
      );
    } finally {
      setWoLoading(false);
    }
  };

  const loadMaintenanceTemplatesFromERPNext = async () => {
    const conn = frappe.getConnectionSettings();
    if (conn.isLive && conn.connected) {
      try {
        const templates = await frappe.getMaintenanceTemplates();
        if (templates && templates.length > 0) {
          setMaintTemplates(templates);
        }
      } catch (err) {
        console.error("Failed to load Maintenance Templates from ERPNext:", err);
      }
    }
  };

  const loadMaintenanceSchedules = async () => {
    const conn = frappe.getConnectionSettings();
    if (conn.isLive && conn.connected) {
      try {
        await loadMaintenanceTemplatesFromERPNext();
        const liveMaint = await frappe.getMaintenanceSchedules();
        if (liveMaint && liveMaint.length > 0) {
          setMaintenanceRecords(prev => {
            const localIds = new Set(liveMaint.map(r => r.id));
            const filteredLocal = prev.filter(r => !localIds.has(r.id));
            return [...liveMaint, ...filteredLocal];
          });
        }
      } catch (err) {
        console.error("Failed to load maintenance schedules from ERPNext:", err);
      }
    }
  };

  useEffect(() => {
    loadWorkOrders();
    loadMaintenanceSchedules();
  }, [currentPage, isLoggedIn, defaultCompany]);

  const loadSalesInvoices = async () => {
    setSalesLoading(true);
    try {
      const offset = (salesInvoicePage - 1) * 20;
      const res = await frappe.getSalesInvoices(20, offset);
      setSalesInvoicesList(res || []);
    } catch (err) {
      console.error("Failed to load sales invoices:", err);
    } finally {
      setSalesLoading(false);
    }
  };

  const loadDeliveryNotes = async () => {
    setSalesLoading(true);
    try {
      const offset = (deliveryNotePage - 1) * 20;
      const res = await frappe.getDeliveryNotes(20, offset);
      setDeliveryNotesList(res || []);
    } catch (err) {
      console.error("Failed to load delivery notes:", err);
    } finally {
      setSalesLoading(false);
    }
  };

  const loadCleaningRecords = async () => {
    const conn = frappe.getConnectionSettings();
    if (conn.isLive && conn.connected) {
      try {
        const fetchPromises = CLEANING_TEMPLATES.map(async (tpl) => {
          try {
            const records = await frappe.getCleaningSanitationRecords(tpl.doctype);
            if (records) {
              return records.map(r => ({
                id: r.name,
                type: tpl.doctype,
                timestamp: r.creation ? r.creation.replace('T', ' ').substring(0, 19) : '',
                ...r
              }));
            }
          } catch (e) {
            console.warn(`Could not load records for ${tpl.doctype} from ERPNext:`, e);
          }
          return [];
        });

        const results = await Promise.all(fetchPromises);
        const merged = results.flat().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        if (merged.length > 0) {
          setCleaningRecords(merged);
        }
      } catch (err) {
        console.error("Failed to fetch Cleaning records:", err);
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn && currentTab === 'cleaning') {
      loadCleaningRecords();
    }
  }, [currentTab, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && currentTab === 'sales') {
      if (salesSubTab === 'invoice') {
        loadSalesInvoices();
      } else {
        loadDeliveryNotes();
      }
    }
  }, [salesInvoicePage, deliveryNotePage, salesSubTab, currentTab, isLoggedIn]);



  // ERPNext status helpers
  // Work Order uses ERPNext statuses: Not Started / In Process / Stock Reserved / Completed...
  // Job Card uses ERPNext statuses: Open / Work In Progress / On Hold / Completed...
  const WORK_ORDER_ACTIVE_STATUSES = ['In Process', 'Stock Reserved', 'Stock Partially Reserved'];
  const WORK_ORDER_STARTABLE_STATUSES = ['Pending', 'Not Started', 'Draft', 'Submitted'];
  const JOB_CARD_STARTABLE_STATUSES = ['Open', 'Not Started', 'Material Transferred', 'Submitted'];
  const JOB_CARD_RUNNING_STATUSES = ['Work In Progress', 'In Process'];
  const JOB_CARD_PAUSED_STATUSES = ['On Hold', 'Paused'];

  // Dashboard calculations
  const activeWOsCount = workOrders.filter(wo => WORK_ORDER_ACTIVE_STATUSES.includes(wo.status)).length;
  const pendingWOsCount = workOrders.filter(wo => wo.status === 'Pending').length;

  let inProgressJobCardsCount = 0;
  workOrders.forEach(wo => {
    if (wo.jobCards) {
      inProgressJobCardsCount += wo.jobCards.filter(jc => JOB_CARD_RUNNING_STATUSES.includes(jc.status)).length;
    }
  });

  const lowStockCount = Object.keys(inventory).filter(key => {
    const item = inventory[key];
    return item.qty < item.minLevel;
  }).length;

  const totalProduction = workOrders.reduce((sum, wo) => sum + (wo.produced || 0), 0);
  const goodProduction = workOrders.reduce((sum, wo) => {
    if (wo.status === 'Completed') return sum + (wo.produced || 0);
    if (WORK_ORDER_ACTIVE_STATUSES.includes(wo.status)) return sum + (wo.produced || 0) * 0.96;
    return sum;
  }, 0);
  const looseProduction = totalProduction - goodProduction;

  // Login Procedures
  const handleSetup2FA = async (userVal) => {
    const cleanUser = userVal.trim() || 'administrator';
    const secret = generateSecret();
    setTempSecret(secret);
    const otpauth = `otpauth://totp/IslandChill:${cleanUser}?secret=${secret}&issuer=CarpentersFiji&period=30`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauth)}`;
    setTotpQrUrl(qrUrl);
    setIs2FAPhase('setup');
  };

  const handleVerify2FASetup = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const isValid = await verifyTOTP(otpCode, tempSecret);
      if (isValid) {
        localStorage.setItem(`totp_enabled_${loginUsername}`, 'true');
        localStorage.setItem(`totp_secret_${loginUsername}`, tempSecret);

        const result = await frappe.login(CONFIG.ERPNEXT_SERVER_URL, loginUsername, loginPassword, true);
        if (result.success) {
          setCurrentUser(result.user);
          setCurrentUserRole(result.role);
          setIsLoggedIn(true);
        } else {
          setLoginError(result.message || 'Verification succeeded, but failed to connect to ERPNext.');
          setIs2FAPhase('none');
        }
      } else {
        setLoginError('Invalid MFA code. Please check your Authenticator app.');
      }
    } catch (err) {
      setLoginError(err.message || 'MFA setup verification failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerify2FALogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const isValid = await verifyTOTP(otpCode, tempSecret);
      if (isValid) {
        const result = await frappe.login(CONFIG.ERPNEXT_SERVER_URL, loginUsername, loginPassword, true);
        if (result.success) {
          setCurrentUser(result.user);
          setCurrentUserRole(result.role);
          setIsLoggedIn(true);
        } else {
          setLoginError(result.message || 'Failed to connect to ERPNext.');
          setIs2FAPhase('none');
        }
      } else {
        setLoginError('Invalid code. Please check your Authenticator app.');
      }
    } catch (err) {
      setLoginError(err.message || 'TOTP validation failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    const has2FA = localStorage.getItem(`totp_enabled_${loginUsername}`) === 'true';
    if (has2FA) {
      const savedSecret = localStorage.getItem(`totp_secret_${loginUsername}`);
      setTempSecret(savedSecret);
      setIs2FAPhase('verify');
      return;
    }

    if (use2FA) {
      await handleSetup2FA(loginUsername);
      return;
    }

    setLoginLoading(true);
    try {
      const result = await frappe.login(CONFIG.ERPNEXT_SERVER_URL, loginUsername, loginPassword, true);
      if (result.success) {

        
        setCurrentUser(result.user);
        setCurrentUserRole(result.role);
        setIsLoggedIn(true);

        if(result.islandchill_user_type === 'Islandchill') {
          window.location.href = `/islandchill`
        } else {
          window.location.href = `/app`
        }
      } else {
        setLoginError(result.message || 'Failed to connect to ERPNext.');
      }
    } catch (err) {
      setLoginError(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLaunchDemoMode = () => {
    setLoginLoading(true);
    setTimeout(async () => {
      const result = await frappe.login('', '', '', false);
      setCurrentUser(result.user);
      setCurrentUserRole(result.role);
      setIsLoggedIn(true);
      setLoginLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    frappe.logout();
    setIsLoggedIn(false);
    setCurrentTab('dashboard');
    setIs2FAPhase('none');
  };

  const handleCopyMFAKey = () => {
    navigator.clipboard.writeText(tempSecret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleReset2FA = () => {
    localStorage.removeItem(`totp_enabled_${loginUsername}`);
    localStorage.removeItem(`totp_secret_${loginUsername}`);
    setIs2FAPhase('none');
    setUse2FA(false);
    setLoginError('2FA settings reset successfully. You can re-enroll.');
  };

  // Start a Work Order Run
  const handleStartWorkOrder = async (woId) => {
    const conn = frappe.getConnectionSettings();
    const woToStart = workOrders.find(wo => wo.id === woId);
    if (!woToStart) return;

    // First check ERPNext for an existing Draft Stock Entry.
    // If found, reopen the same draft so the user can edit qty/warehouses and submit it.
    if (conn.isLive && conn.connected) {
      setSyncStatusMsg('Checking existing Stock Entry draft...');
      try {
        const existingDraft = await frappe.getStockEntryForWorkOrder(woToStart.id);

        if (existingDraft) {
          const draftItems = (existingDraft.items || []).map(row => ({
            code: row.item_code,
            name: row.item_name || row.item_code,
            qty: Number(row.qty || row.transfer_qty || 0),
            unit: row.uom || row.stock_uom || '',
            sourceWarehouse: row.s_warehouse || '',
            targetWarehouse: row.t_warehouse || ''
          }));

          setSeSourceSearch({});
          setSeTargetSearch({});

          setStockEntryModal({
            woId: woToStart.id,
            company: existingDraft.company || woToStart.company || defaultCompany,
            postingDate: existingDraft.posting_date || '',
            postingTime: existingDraft.posting_time ? String(existingDraft.posting_time).substring(0, 5) : '',
            items: draftItems,
            stockEntryName: existingDraft.name,
            docstatus: existingDraft.docstatus || 0,
            saved: true,
            submitted: false
          });

          setSyncStatusMsg('');
          return;
        }
      } catch (err) {
        console.warn(`No editable Stock Entry draft found for Work Order ${woToStart.id}:`, err);
      } finally {
        setSyncStatusMsg('');
      }
    }

    let materials = [];
    if (conn.isLive && conn.connected) {
      setSyncStatusMsg('Loading BOM materials for Stock Entry...');
      try {
        const details = await frappe.getBOMDetails(woToStart.bomNo);
        if (details && details.length > 0) {
          materials = details.map(m => ({
            code: m.code,
            name: m.name,
            qty: Number((m.qty * (woToStart.quantity || 1)).toFixed(4)),
            unit: m.unit,
            sourceWarehouse: woToStart.sourceWarehouse || '',
            targetWarehouse: woToStart.wipWarehouse || ''
          }));
        }
      } catch (err) {
        console.error('Failed to load BOM materials for stock entry:', err);
      }
    }

    if (materials.length === 0 && !conn.isLive) {
      const mockBom = BOMS[woToStart.bomNo] || Object.values(BOMS)[0];
      materials = (mockBom?.materials || []).map(m => ({
        code: m.code,
        name: m.name,
        qty: Number((m.qty * (woToStart.quantity || 1)).toFixed(4)),
        unit: m.unit,
        sourceWarehouse: woToStart.sourceWarehouse || '',
        targetWarehouse: woToStart.wipWarehouse || ''
      }));
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    const formattedTime = today.toTimeString().split(' ')[0].substring(0, 5);

    setStockEntryModal({
      woId: woToStart.id,
      company: woToStart.company || defaultCompany,
      postingDate: formattedDate,
      postingTime: formattedTime,
      items: materials,

      // Draft/submission state for the two-step ERPNext flow
      stockEntryName: '',
      docstatus: 0,
      saved: false,
      submitted: false
    });
  };

  // const handleConfirmStockEntry = async (seData) => {
  //   setSeSaving(true);
  //   try {
  //     let success = true;
  //     let errorMsg = '';
  //     const conn = frappe.getConnectionSettings();

  //     if (conn.isLive && conn.connected) {
  //       try {
  //         setSyncStatusMsg('Creating Stock Entry on ERPNext...');
  //         const convertedDate = seData.postingDate;
  //         const seRes = await frappe.createStockEntry({
  //           workOrder: seData.woId,
  //           company: seData.company,
  //           postingDate: convertedDate,
  //           postingTime: seData.postingTime,
  //           items: seData.items
  //         });
  //         if (!seRes || !seRes.success) {
  //           success = false;
  //           errorMsg = seRes?.message || 'Stock Entry submission failed';
  //         }
  //       } catch (err) {
  //         success = false;
  //         errorMsg = err.message;
  //       }
  //     }

  //     if (!success) {
  //       showAlert(`Failed to create Stock Entry: ${errorMsg}`, 'error', 'ERPNext Error');
  //       return;
  //     }

  //     // Stock Entry success - now start the Work Order run
  //     const woToStart = workOrders.find(wo => wo.id === seData.woId);
  //     if (!woToStart) {
  //       setStockEntryModal(null);
  //       return;
  //     }

  //     const updatedJobCards = woToStart.jobCards && woToStart.jobCards.length > 0 ? woToStart.jobCards : [
  //       { id: 'PO-JOB00601', operation: 'Mixing', station: 'Mixing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00602', operation: 'Lab Testing', station: 'Lab Testing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00603', operation: 'Can/Bottle Prep', station: 'Can Preparation Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00604', operation: 'Filling', station: 'Filling Machine', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00605', operation: 'Initial Quality Check', station: 'Initial QC Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00606', operation: 'Warmer', station: 'Warmer Machine', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00607', operation: 'Laser Labeling', station: 'Labeling Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00608', operation: 'Final Quality Check', station: 'Final QC Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00609', operation: 'Hand Packing', station: 'Packing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00610', operation: 'Palletising', station: 'Palletisation Area', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
  //       { id: 'PO-JOB00611', operation: 'Store & Dispatch', station: 'Warehouse/Logistics', status: 'Not Started', operator: '', remarks: '', remarksList: [] }
  //     ];

  //     const updatedWO = {
  //       ...woToStart,
  //       status: 'In Process',
  //       jobCards: updatedJobCards
  //     };

  //     if (conn.isLive && conn.connected) {
  //       try {
  //         setSyncStatusMsg('Starting Work Order on ERPNext...');
  //         const res = await frappe.syncWorkOrderToERP(updatedWO);
  //         if (!res || !res.success) {
  //           success = false;
  //           errorMsg = res?.message || 'Sync failed';
  //         }
  //       } catch (err) {
  //         success = false;
  //         errorMsg = err.message;
  //       }
  //     }

  //     if (success) {
  //       setWorkOrders(prev => prev.map(wo => wo.id === seData.woId ? updatedWO : wo));
  //       showAlert(`Stock Entry submitted and Work Order ${seData.woId} started successfully!`, 'success', 'Work Order Started');
  //       setStockEntryModal(null);
  //     } else {
  //       showAlert(`Failed to start Work Order: ${errorMsg}`, 'error', 'ERPNext Error');
  //     }
  //   } finally {
  //     setSeSaving(false);
  //   }
  // };
  const handleConfirmStockEntry = async (seData) => {
    setSeSaving(true);

    try {
      const conn = frappe.getConnectionSettings();

      if (!conn.isLive || !conn.connected) {
        const demoStockEntryName = `DEMO-SE-${Date.now().toString().slice(-6)}`;

        setStockEntryModal(prev => ({
          ...prev,
          stockEntryName: demoStockEntryName,
          docstatus: 0,
          saved: true,
          submitted: false
        }));

        setWorkOrders(prev =>
          prev.map(wo =>
            wo.id === seData.woId
              ? {
                ...wo,
                stockEntryCreated: true,
                stockEntryName: demoStockEntryName,
                stockEntryPostingDate: seData.postingDate,
                stockEntryPostingTime: seData.postingTime
              }
              : wo
          )
        );

        showAlert(
          `Stock Entry ${demoStockEntryName} saved as Draft in demo mode. Now submit it to continue the flow.`,
          'success',
          'Stock Entry Draft Saved'
        );

        return;
      }

      setSyncStatusMsg('Saving Stock Entry draft on ERPNext...');

      const seRes = await frappe.saveStockEntryDraft({
        workOrder: seData.woId,
        company: seData.company,
        postingDate: seData.postingDate,
        postingTime: seData.postingTime,
        stockEntryName: seData.stockEntryName || '',
        items: seData.items
      });

      if (!seRes || !seRes.success) {
        showAlert(
          `Failed to save Stock Entry draft: ${seRes?.message || 'Unknown error'}`,
          'error',
          'ERPNext Error'
        );
        return;
      }

      const stockEntryName = seRes.name;

      setStockEntryModal(prev => ({
        ...prev,
        stockEntryName,
        docstatus: 0,
        saved: true,
        submitted: false
      }));

      setWorkOrders(prev =>
        prev.map(wo =>
          wo.id === seData.woId
            ? {
              ...wo,
              stockEntryCreated: true,
              stockEntryName,
              stockEntryPostingDate: seData.postingDate,
              stockEntryPostingTime: seData.postingTime
            }
            : wo
        )
      );

      showAlert(
        `Stock Entry ${stockEntryName} saved as Draft. Now submit it to start the Work Order in ERPNext.`,
        'success',
        'Stock Entry Draft Saved'
      );
    } catch (err) {
      showAlert(`Failed to save Stock Entry draft: ${err.message}`, 'error', 'ERPNext Error');
    } finally {
      setSeSaving(false);
      setSyncStatusMsg('');
    }
  };

  const handleSubmitStockEntry = async () => {
    if (!stockEntryModal?.stockEntryName) {
      showAlert('Please save the Stock Entry first.', 'warning', 'Stock Entry Not Saved');
      return;
    }

    setSeSaving(true);

    try {
      const conn = frappe.getConnectionSettings();
      const woId = stockEntryModal.woId;

      if (!conn.isLive || !conn.connected) {
        setWorkOrders(prev =>
          prev.map(wo =>
            wo.id === woId
              ? {
                ...wo,
                status: 'In Process',
                materialTransferred: true,
                stockEntryCreated: true,
                submitted: true
              }
              : wo
          )
        );

        showAlert('Demo Stock Entry submitted locally. Work Order moved to In Process.', 'success', 'Submitted');
        setStockEntryModal(null);
        return;
      }

      setSyncStatusMsg('Submitting Stock Entry on ERPNext...');

      const submitRes = await frappe.submitStockEntry(stockEntryModal.stockEntryName);

      if (!submitRes || !submitRes.success) {
        showAlert(
          `Failed to submit Stock Entry: ${submitRes?.message || 'Unknown error'}`,
          'error',
          'ERPNext Error'
        );
        return;
      }

      showAlert(
        `Stock Entry ${stockEntryModal.stockEntryName} submitted. ERPNext will update the Work Order status.`,
        'success',
        'Stock Entry Submitted'
      );

      setStockEntryModal(null);
      setSelectedWOId(woId);

      // ERPNext updates Work Order status and creates/updates Job Cards after submit.
      // Reload after a tiny delay so server-side hooks/status updates are visible.
      setTimeout(() => {
        loadWorkOrders();
      }, 700);
    } catch (err) {
      showAlert(`Failed to submit Stock Entry: ${err.message}`, 'error', 'ERPNext Error');
    } finally {
      setSeSaving(false);
      setSyncStatusMsg('');
    }
  };

  const handleSearchSeSource = async (idx, query) => {
    setSeSourceSearch(prev => ({ ...prev, [idx]: query }));
    setActiveSeSourceRow(idx);
    const company = stockEntryModal?.company || defaultCompany;
    const res = await frappe.getWarehouses(query, company);
    setSeSourceSuggestions(prev => ({ ...prev, [idx]: res || [] }));
  };

  const selectSeSource = (idx, selectedWh) => {
    if (!stockEntryModal) return;
    const newItems = [...stockEntryModal.items];
    newItems[idx].sourceWarehouse = selectedWh.name;
    setStockEntryModal(prev => ({ ...prev, items: newItems }));
    setSeSourceSearch(prev => ({ ...prev, [idx]: selectedWh.name }));
    setActiveSeSourceRow(null);
  };

  const handleSearchSeTarget = async (idx, query) => {
    setSeTargetSearch(prev => ({ ...prev, [idx]: query }));
    setActiveSeTargetRow(idx);
    const company = stockEntryModal?.company || defaultCompany;
    const res = await frappe.getWarehouses(query, company);
    setSeTargetSuggestions(prev => ({ ...prev, [idx]: res || [] }));
  };

  const selectSeTarget = (idx, selectedWh) => {
    if (!stockEntryModal) return;
    const newItems = [...stockEntryModal.items];
    newItems[idx].targetWarehouse = selectedWh.name;
    setStockEntryModal(prev => ({ ...prev, items: newItems }));
    setSeTargetSearch(prev => ({ ...prev, [idx]: selectedWh.name }));
    setActiveSeTargetRow(null);
  };

  // Deduct resources based on BOM
  const deductBOMResources = (bomCode, batchSize, stepType) => {
    const bom = BOMS[bomCode];
    if (!bom) return;

    setInventory(prevInv => {
      const updatedInv = { ...prevInv };

      bom.materials.forEach(mat => {
        const totalNeeded = mat.qty * batchSize;

        if (stepType === 'Mixing' && updatedInv[mat.code] && updatedInv[mat.code].category === 'Raw Material') {
          updatedInv[mat.code].qty = Math.max(0, updatedInv[mat.code].qty - totalNeeded);
          frappe.syncStockToERP(mat.code, updatedInv[mat.code].qty);
        }

        if (stepType === 'Can/Bottle Prep' && updatedInv[mat.code] && updatedInv[mat.code].category === 'Packaging') {
          updatedInv[mat.code].qty = Math.max(0, updatedInv[mat.code].qty - totalNeeded);
          frappe.syncStockToERP(mat.code, updatedInv[mat.code].qty);
        }
      });

      return updatedInv;
    });
  };

  const addFinishedGoodsStock = (productName, quantityProduced) => {
    const product = PRODUCTS.find(p => p.name === productName);
    if (!product) return;

    const fgCode = `FG-${product.code}`;
    setInventory(prevInv => {
      const updatedInv = { ...prevInv };
      if (updatedInv[fgCode]) {
        updatedInv[fgCode].qty += quantityProduced;
      } else {
        updatedInv[fgCode] = {
          name: `${product.name} Box`,
          qty: quantityProduced,
          unit: 'Box',
          category: 'Finished Goods',
          minLevel: 50
        };
      }
      frappe.syncStockToERP(fgCode, updatedInv[fgCode].qty);
      return updatedInv;
    });
  };

  const formatRemarksList = (list) => {
    return (list || []).map(log => {
      let logStr = `[${log.timestamp}] ${log.operator}: ${log.text}`;
      if (log.replies && log.replies.length > 0) {
        const repliesStr = log.replies.map(r => `  ↳ Reply [${r.timestamp}] ${r.operator}: ${r.text}`).join('\n');
        logStr += `\n${repliesStr}`;
      }
      return logStr;
    }).join('\n');
  };

  const openJobCardAction = (wo, jc, action) => {
    setJcOpOperatorName('');
    setJcOpOperatorEmployeeId('');
    setJcOpOperatorRemarks('');
    setJcActualStartTime('');
    setJcActualEndTime('');

    if (action === 'finish') {
      const forQty = Number(jc?.forQuantity || wo?.quantity || 0);
      const existingCompleted = Number(jc?.totalCompletedQty || 0);
      const completedQty = existingCompleted > 0 ? existingCompleted : forQty;
      const processLossQty = Math.max(0, forQty - completedQty);

      setJcFinishForQuantity(String(forQty || ''));
      setJcFinishCompletedQty(String(completedQty || ''));
      setJcFinishProcessLossQty(String(Number(processLossQty.toFixed(6)) || 0));
    } else {
      setJcFinishForQuantity('');
      setJcFinishCompletedQty('');
      setJcFinishProcessLossQty('');
    }

    setActiveJCOp({
      woId: wo.id,
      jcId: jc.id,
      operation: jc.operation,
      action
    });
  };

  const isWorkOrderReadyForFinish = (wo) => {
    if (!wo || ['Completed', 'Closed', 'Cancelled', 'Stopped'].includes(wo.status)) return false;
    if (!wo.jobCards || wo.jobCards.length === 0) return false;
    return wo.jobCards.every(jc => jc.status === 'Completed');
  };

  const handleFinishWorkOrder = async (wo) => {
    if (!wo) return;
    if (!isWorkOrderReadyForFinish(wo)) {
      showAlert('All Job Cards must be completed before finishing the Work Order.', 'warning', 'Work Order Not Ready');
      return;
    }

    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const defaultDate = `${year}-${month}-${day}`;
    
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const seconds = String(localDate.getSeconds()).padStart(2, '0');
    const defaultTime = `${hours}:${minutes}:${seconds}`;

    setFinishWoModal({
      woId: wo.id,
      product: wo.productName || wo.product,
      itemCode: wo.item || wo.product,
      qty: Math.max(0, Number(wo.quantity || 0) - Number(wo.produced || 0)),
      targetQty: Math.max(0, Number(wo.quantity || 0) - Number(wo.produced || 0)),
      extraQty: '',
      extraUom: '',
      uomsList: [],
      disableUomSelect: false,
      processLossQty: 0,
      company: wo.company || defaultCompany,
      scrapWarehouse: wo.scrapWarehouse || '',
      extraGoodsWarehouse: wo.extraGoodsWarehouse || '',
      postingDate: defaultDate,
      postingTime: defaultTime,
      scrapItems: []
    });

    try {
      const uoms = await frappe.getItemUoms(wo.item || wo.product);
      if (uoms && uoms.length > 0) {
        const configuredMinUom = uoms.find(u => Number(u.custom_min_stock_uom) === 1);
        const nosUom = uoms.find(u => u.uom && u.uom.toLowerCase() === 'nos');
        let selectedUom = null;
        let disableUomSelect = false;

        if (configuredMinUom) {
          selectedUom = configuredMinUom;
          disableUomSelect = true;
        } else if (nosUom) {
          selectedUom = nosUom;
          disableUomSelect = false;
        } else {
          const sortedUoms = [...uoms].sort((a, b) => Number(a.conversion_factor || 1) - Number(b.conversion_factor || 1));
          selectedUom = sortedUoms[0];
          disableUomSelect = false;
        }

        setFinishWoModal(prev => {
          if (!prev || prev.woId !== wo.id) return prev;
          return {
            ...prev,
            uomsList: uoms,
            extraUom: selectedUom?.uom || '',
            disableUomSelect: disableUomSelect
          };
        });
      }
    } catch (e) {
      console.error("Failed to load UOMs for item:", e);
    }
  };

  const handleConfirmFinishWorkOrder = async (data) => {
    setWoActionLoading(true);
    try {
      const res = await frappe.finishWorkOrder(data.woId, {
        qty: Number(data.qty || 0),
        processLossQty: Number(data.processLossQty || 0),
        scrapItems: data.scrapItems || [],
        company: data.company,
        submit: 1,
        postingDate: data.postingDate || null,
        postingTime: data.postingTime || null,
        extraQty: Number(data.extraQty || 0) > 0 ? Number(data.extraQty) : null,
        extraUom: Number(data.extraQty || 0) > 0 ? data.extraUom : null
      });

      if (!res || res.success === false) {
        throw new Error(res?.error || 'Failed to finish Work Order');
      }

      showAlert(`Work Order ${data.woId} finished successfully. Stock Entry ${res.stock_entry || ''} submitted.`, 'success', 'Work Order Finished');
      
      const conn = frappe.getConnectionSettings();
      if (!conn.isLive || !conn.connected) {
        setWorkOrders(prev => {
          const next = prev.map(wo => {
            if (wo.id === data.woId) {
              return {
                ...wo,
                status: 'Completed',
                produced: Number(wo.produced || 0) + Number(data.qty || 0),
                process_loss_qty: Number(wo.process_loss_qty || 0) + Number(data.processLossQty || 0)
              };
            }
            return wo;
          });
          localStorage.setItem("fiji_work_orders", JSON.stringify(next));
          return next;
        });
      }

      setFinishWoModal(null);
      await loadWorkOrders();
    } catch (err) {
      if (err instanceof DuplicateRequestError) return;
      showAlert(`Failed to finish Work Order: ${err.message}`, 'error', 'ERPNext Error');
    } finally {
      setWoActionLoading(false);
    }
  };

  const handleChangeWorkOrderStatus = async (wo, status) => {
    if (!wo) return;
    const label = status === 'Resumed' ? 'Re-open' : status;
    if (!window.confirm(`${label} Work Order ${wo.id}?`)) return;

    setWoActionLoading(true);
    try {
      const res = await frappe.changeWorkOrderStatus(wo.id, status);
      if (!res || res.success === false) {
        throw new Error(res?.error || `Failed to update Work Order to ${status}`);
      }

      showAlert(`Work Order ${wo.id} updated to ${res.status || status}.`, 'success', 'Work Order Updated');
      await loadWorkOrders();
    } catch (err) {
      if (err instanceof DuplicateRequestError) return;
      showAlert(`Failed to update Work Order: ${err.message}`, 'error', 'ERPNext Error');
    } finally {
      setWoActionLoading(false);
    }
  };

  // Job Card State modifiers (Start, Pause, Resume, Finish, Add Remarks)
  const handleStartJobCard = async (woId, jcId, operator, employeeId, remarksText = '') => {
    const cleanOp = (operator || '').trim();
    const cleanEmployeeId = (employeeId || '').trim();

    if (!cleanOp || !cleanEmployeeId) {
      showAlert('Please select a valid Employee from the dropdown before starting the Job Card.', 'warning', 'Employee Required');
      return;
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cleanRemarks = remarksText || 'Job started.';
    const log = {
      timestamp,
      operator: cleanOp,
      employeeId: cleanEmployeeId,
      text: `Started: ${cleanRemarks}`,
      actualStartTime: jcActualStartTime
    };

    const targetWO = workOrders.find(wo => wo.id === woId);
    const targetJC = targetWO?.jobCards?.find(jc => jc.id === jcId);
    const finalRemarks = formatRemarksList([...(targetJC?.remarksList || []), log]);

    setWoActionLoading(true);
    try {
      const conn = frappe.getConnectionSettings();

      if (conn.isLive && conn.connected) {
        const jcRes = await frappe.startJobCard(jcId, {
          employee: cleanEmployeeId,
          remarks: finalRemarks,
          actualStartTime: jcActualStartTime
        });

        if (!jcRes || jcRes.success === false) {
          throw new Error(jcRes?.error || 'Failed to start Job Card in ERPNext');
        }

        await frappe.forceWorkOrderInProgress(woId);
        await loadWorkOrders();
      } else {
        setWorkOrders(prevWOs => prevWOs.map(wo => {
          if (wo.id !== woId) return wo;

          const updatedJobCards = wo.jobCards.map(jc => {
            if (jc.id === jcId) {
              const updatedRemarksList = [...(jc.remarksList || []), log];
              return {
                ...jc,
                status: 'Work In Progress',
                operator: cleanOp,
                employeeId: cleanEmployeeId,
                remarksList: updatedRemarksList,
                remarks: formatRemarksList(updatedRemarksList),
                actualStartTime: jcActualStartTime || jc.actualStartTime
              };
            }
            return jc;
          });

          return {
            ...wo,
            status: 'In Process',
            jobCards: updatedJobCards
          };
        }));
      }

      setActiveJCOp(null);
      setJcOpOperatorName('');
      setJcOpOperatorEmployeeId('');
      setJcOpOperatorRemarks('');
      setJcActualStartTime('');
      setJcActualEndTime('');
    } catch (err) {
      if (err instanceof DuplicateRequestError) return;
      showAlert(`Failed to start Job Card: ${err.message}`, 'error', 'ERPNext Error');
      loadWorkOrders();
    } finally {
      setWoActionLoading(false);
    }
  };

  const handlePauseJobCard = async (woId, jcId, operator, employeeId, remarksText) => {
    // ERPNext pause does not need a new employee selection.
    // It closes the currently open Job Card Time Log row and sets is_paused = 1.
    const cleanOp = (operator || currentUser || 'Operator').trim();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cleanRemarks = remarksText || 'Operation paused.';
    const log = {
      timestamp,
      operator: cleanOp,
      text: `Paused: ${cleanRemarks}`,
      actualEndTime: jcActualEndTime
    };

    const targetWO = workOrders.find(wo => wo.id === woId);
    const targetJC = targetWO?.jobCards?.find(jc => jc.id === jcId);
    const finalRemarks = formatRemarksList([...(targetJC?.remarksList || []), log]);

    setWoActionLoading(true);
    try {
      const conn = frappe.getConnectionSettings();

      if (conn.isLive && conn.connected) {
        const jcRes = await frappe.pauseJobCard(jcId, {
          remarks: finalRemarks,
          actualEndTime: jcActualEndTime
        });

        if (!jcRes || jcRes.success === false) {
          throw new Error(jcRes?.error || 'Failed to pause Job Card in ERPNext');
        }

        await loadWorkOrders();
      } else {
        setWorkOrders(prevWOs => prevWOs.map(wo => {
          if (wo.id !== woId) return wo;

          const updatedJobCards = wo.jobCards.map(jc => {
            if (jc.id === jcId) {
              const updatedRemarksList = [...(jc.remarksList || []), log];
              return {
                ...jc,
                status: 'On Hold',
                is_paused: 1,
                operator: cleanOp,
                remarksList: updatedRemarksList,
                remarks: formatRemarksList(updatedRemarksList),
                actualEndTime: jcActualEndTime || jc.actualEndTime
              };
            }
            return jc;
          });

          return { ...wo, jobCards: updatedJobCards };
        }));
      }

      setActiveJCOp(null);
      setJcOpOperatorName('');
      setJcOpOperatorEmployeeId('');
      setJcOpOperatorRemarks('');
      setJcActualStartTime('');
      setJcActualEndTime('');
    } catch (err) {
      if (err instanceof DuplicateRequestError) return;
      showAlert(`Failed to pause Job Card: ${err.message}`, 'error', 'ERPNext Error');
      loadWorkOrders();
    } finally {
      setWoActionLoading(false);
    }
  };

  const handleResumeJobCard = async (woId, jcId, operator, employeeId, remarksText = '') => {
    // ERPNext resume does not need a new employee selection.
    // It uses the existing Job Card employee table and adds a new Time Log row.
    const cleanOp = (operator || currentUser || 'Operator').trim();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cleanRemarks = remarksText || 'Job resumed.';
    const log = {
      timestamp,
      operator: cleanOp,
      text: `Resumed: ${cleanRemarks}`,
      actualStartTime: jcActualStartTime
    };

    const targetWO = workOrders.find(wo => wo.id === woId);
    const targetJC = targetWO?.jobCards?.find(jc => jc.id === jcId);
    const finalRemarks = formatRemarksList([...(targetJC?.remarksList || []), log]);

    setWoActionLoading(true);
    try {
      const conn = frappe.getConnectionSettings();

      if (conn.isLive && conn.connected) {
        const jcRes = await frappe.resumeJobCard(jcId, {
          remarks: finalRemarks,
          actualStartTime: jcActualStartTime
        });

        if (!jcRes || jcRes.success === false) {
          throw new Error(jcRes?.error || 'Failed to resume Job Card in ERPNext');
        }

        await loadWorkOrders();
      } else {
        setWorkOrders(prevWOs => prevWOs.map(wo => {
          if (wo.id !== woId) return wo;

          const updatedJobCards = wo.jobCards.map(jc => {
            if (jc.id === jcId) {
              const updatedRemarksList = [...(jc.remarksList || []), log];
              return {
                ...jc,
                status: 'Work In Progress',
                is_paused: 0,
                operator: cleanOp,
                remarksList: updatedRemarksList,
                remarks: formatRemarksList(updatedRemarksList),
                actualStartTime: jcActualStartTime || jc.actualStartTime
              };
            }
            return jc;
          });

          return { ...wo, jobCards: updatedJobCards };
        }));
      }

      setActiveJCOp(null);
      setJcOpOperatorName('');
      setJcOpOperatorEmployeeId('');
      setJcOpOperatorRemarks('');
      setJcActualStartTime('');
      setJcActualEndTime('');
    } catch (err) {
      if (err instanceof DuplicateRequestError) return;
      showAlert(`Failed to resume Job Card: ${err.message}`, 'error', 'ERPNext Error');
      loadWorkOrders();
    } finally {
      setWoActionLoading(false);
    }
  };

  const handleFinishJobCard = async (woId, jcId, operator, employeeId, remarksText) => {
    // ERPNext completion closes the active time log, calculates time_in_mins,
    // fills completed_qty, submits the Job Card, and updates Work Order operation.
    const cleanOp = (operator || currentUser || 'Operator').trim();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cleanRemarks = remarksText || 'Operation finished.';
    const log = {
      timestamp,
      operator: cleanOp,
      text: `Finished: ${cleanRemarks}`,
      actualEndTime: jcActualEndTime
    };

    const targetWO = workOrders.find(wo => wo.id === woId);
    const targetJC = targetWO?.jobCards?.find(jc => jc.id === jcId);
    const finalRemarks = formatRemarksList([...(targetJC?.remarksList || []), log]);
    const forQty = Number(targetJC?.forQuantity || targetWO?.quantity || 0);
    const completedQty = forQty;
    const processLossQty = 0;

    if (!forQty || forQty <= 0) {
      showAlert('Quantity must be greater than 0.', 'warning', 'Invalid Quantity');
      return;
    }

    setWoActionLoading(true);
    try {
      const conn = frappe.getConnectionSettings();

      if (conn.isLive && conn.connected) {
        const jcRes = await frappe.submitJobCard(jcId, {
          remarks: finalRemarks,
          actualEndTime: jcActualEndTime,
          qty: completedQty,
          forQuantity: forQty,
          looseQty: 0,
          processLossQty
        });

        if (!jcRes || jcRes.success === false) {
          throw new Error(jcRes?.error || 'Failed to submit Job Card in ERPNext');
        }

        await loadWorkOrders();
      } else {
        setWorkOrders(prevWOs => prevWOs.map(wo => {
          if (wo.id !== woId) return wo;

          const updatedCards = wo.jobCards.map(jc => {
            if (jc.id === jcId) {
              const updatedRemarksList = [...(jc.remarksList || []), log];
              return {
                ...jc,
                status: 'Completed',
                operator: cleanOp,
                remarksList: updatedRemarksList,
                remarks: formatRemarksList(updatedRemarksList),
                actualEndTime: jcActualEndTime || jc.actualEndTime
              };
            }
            return jc;
          });

          const completedCount = updatedCards.filter(jc => jc.status === 'Completed').length;
          const isLastCard = completedCount === updatedCards.length;
          const completedJC = wo.jobCards.find(jc => jc.id === jcId);

          if (completedJC && completedJC.operation === 'Mixing') {
            deductBOMResources(wo.bomNo, wo.quantity, 'Mixing');
          }

          if (completedJC && completedJC.operation === 'Can/Bottle Prep') {
            deductBOMResources(wo.bomNo, wo.quantity, 'Can/Bottle Prep');
          }

          if (isLastCard) {
            addFinishedGoodsStock(wo.product, wo.quantity);
          }

          return {
            ...wo,
            status: isLastCard ? 'Completed' : 'In Process',
            produced: isLastCard ? wo.quantity : wo.produced,
            jobCards: updatedCards
          };
        }));
      }

      setActiveJCOp(null);
      setJcOpOperatorName('');
      setJcOpOperatorEmployeeId('');
      setJcOpOperatorRemarks('');
      setJcActualStartTime('');
      setJcActualEndTime('');
    } catch (err) {
      if (err instanceof DuplicateRequestError) return;
      showAlert(`Failed to finish Job Card: ${err.message}`, 'error', 'ERPNext Error');
      loadWorkOrders();
    } finally {
      setWoActionLoading(false);
    }
  };

  const handleAddRemarkJobCard = async (woId, jcId, operator, remarksText) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cleanOp = operator || currentUser;
    const cleanRemarks = remarksText || 'Comment added.';
    const log = {
      timestamp,
      operator: cleanOp,
      text: cleanRemarks
    };

    setWorkOrders(prevWOs => {
      const next = prevWOs.map(wo => {
        if (wo.id !== woId) return wo;

        const updatedJobCards = wo.jobCards.map(jc => {
          if (jc.id === jcId) {
            const updatedRemarksList = [...(jc.remarksList || []), log];
            return {
              ...jc,
              remarksList: updatedRemarksList,
              remarks: formatRemarksList(updatedRemarksList)
            };
          }
          return jc;
        });

        return { ...wo, jobCards: updatedJobCards };
      });
      localStorage.setItem("fiji_work_orders", JSON.stringify(next));
      return next;
    });

    try {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive && conn.connected) {
        await frappe.addJobCardComment(jcId, cleanRemarks, cleanOp);
        await loadWorkOrders();
      }
    } catch (err) {
      showAlert(`Failed to add Job Card comment: ${err.message}`, 'error', 'ERPNext Error');
    }

    setActiveJCOp(null);
    setJcOpOperatorName('');
    setJcOpOperatorRemarks('');
    setTimelineOperatorName('');
    setTimelineOperatorRemarks('');
    setJcActualStartTime('');
    setJcActualEndTime('');
  };

  const handleReplyToRemarkJobCard = (woId, jcId, remarkIndex, operator, replyText) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cleanOp = operator || currentUser;
    const cleanReply = replyText || '';
    if (!cleanReply.trim()) return;

    const replyObj = { timestamp, operator: cleanOp, text: cleanReply };

    let finalRemarks = '';
    let currentStatus = 'Work In Progress';

    setWorkOrders(prevWOs => {
      const next = prevWOs.map(wo => {
        if (wo.id !== woId) return wo;

        const updatedJobCards = wo.jobCards.map(jc => {
          if (jc.id === jcId) {
            currentStatus = jc.status;
            const updatedRemarksList = (jc.remarksList || []).map((log, idx) => {
              if (idx === remarkIndex) {
                return {
                  ...log,
                  replies: [...(log.replies || []), replyObj]
                };
              }
              return log;
            });

            finalRemarks = formatRemarksList(updatedRemarksList);

            return {
              ...jc,
              remarksList: updatedRemarksList,
              remarks: finalRemarks
            };
          }
          return jc;
        });

        return { ...wo, jobCards: updatedJobCards };
      });

      localStorage.setItem("fiji_work_orders", JSON.stringify(next));

      const conn = frappe.getConnectionSettings();
      if (conn.isLive && conn.connected) {
        frappe.syncJobCardToERP(jcId, currentStatus, finalRemarks).catch(e => {
          console.error("Failed to sync Job Card reply:", e);
        });
      }

      return next;
    });
  };

  const handleCreateNewWO = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const productCode = data.get('productCode');
    const bomNo = data.get('bomNo');
    const quantity = parseInt(data.get('quantity'), 10);
    const lineNo = data.get('lineNo');
    const plannedStart = data.get('plannedStart');
    const company = data.get('company') || woCreateCompany;
    const sourceWarehouse = data.get('sourceWarehouse');
    const fgWarehouse = data.get('fgWarehouse');
    const wipWarehouse = data.get('wipWarehouse');
    const scrapWarehouse = data.get('scrapWarehouse') || '';
    const extraGoodsWarehouse = data.get('extraGoodsWarehouse') || '';

    const product = woProductsList.find(p => p.code === productCode) || PRODUCTS.find(p => p.code === productCode);

    if (!productCode || !product) {
      showAlert('Please select a valid Item to manufacture.', 'warning', 'Missing Item');
      return;
    }

    if (!bomNo) {
      showAlert('Please select an active submitted BOM for this item.', 'warning', 'Missing BOM');
      return;
    }

    if (!quantity || quantity <= 0) {
      showAlert('Please enter a valid quantity.', 'warning', 'Invalid Quantity');
      return;
    }

    if (!sourceWarehouse) {
      showAlert('Source Warehouse is mandatory. Please select a warehouse where raw materials are available.', 'warning', 'Missing Source Warehouse');
      return;
    }

    if (!fgWarehouse) {
      showAlert('Target (Finished Goods) Warehouse is mandatory. Please select a warehouse where finished goods will be stored.', 'warning', 'Missing Target Warehouse');
      return;
    }

    if (!wipWarehouse) {
      showAlert('Work-in-Progress Warehouse is mandatory. Please select a warehouse where operations are executed.', 'warning', 'Missing WIP Warehouse');
      return;
    }

    setWoCreating(true);
    const plannedDateStr = plannedStart ? plannedStart.replace('T', ' ') : new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newWO = {
      product: product.code,
      quantity: quantity,
      plannedStart: plannedDateStr,
      bomNo: bomNo,
      lineNo: lineNo || 'Filling Line 1',
      company,
      sourceWarehouse,
      fgWarehouse,
      wipWarehouse,
      scrapWarehouse,
      extraGoodsWarehouse
    };

    try {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive) {
        setSyncStatusMsg('Creating Work Order on ERPNext...');
        const res = await frappe.createWorkOrder(newWO);
        if (res.success) {
          let jobCards = [];
          const ops = await frappe.getBOMOperations(bomNo);
          if (ops && ops.length > 0) {
            jobCards = ops;
          }

          const nextWO = {
            id: res.name,
            ...newWO,
            item: product.name,
            produced: 0,
            status: 'Pending',
            jobCards: jobCards
          };
          setWorkOrders(prev => [nextWO, ...prev]);
          setSelectedWOId(res.name);
          setShowNewWODrawer(false);
          loadWorkOrders();
        }
      } else {
        const mockName = `MFG-WO-2026-${String(workOrders.length + 98).padStart(5, '0')}`;
        const nextWO = {
          id: mockName,
          ...newWO,
          item: product.name,
          produced: 0,
          status: 'Pending',
          jobCards: [
            { id: 'PO-JOB00601', operation: 'Mixing', station: 'Mixing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00602', operation: 'Lab Testing', station: 'Lab Testing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00603', operation: 'Can/Bottle Prep', station: 'Can Preparation Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00604', operation: 'Filling', station: 'Filling Machine', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00605', operation: 'Initial Quality Check', station: 'Initial QC Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00606', operation: 'Warmer', station: 'Warmer Machine', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00607', operation: 'Laser Labeling', station: 'Labeling Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00608', operation: 'Final Quality Check', station: 'Final QC Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00609', operation: 'Hand Packing', station: 'Packing Station', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00610', operation: 'Palletising', station: 'Palletisation Area', status: 'Not Started', operator: '', remarks: '', remarksList: [] },
            { id: 'PO-JOB00611', operation: 'Store & Dispatch', station: 'Warehouse/Logistics', status: 'Not Started', operator: '', remarks: '', remarksList: [] }
          ]
        };
        setWorkOrders(prev => [nextWO, ...prev]);
        setSelectedWOId(mockName);
        setShowNewWODrawer(false);
      }
    } catch (err) {
      showAlert(`Error creating Work Order on ERPNext: ${err.message}`, 'error', 'ERPNext Error');
    } finally {
      setWoCreating(false);
    }
  };

  const handleCancelWorkOrder = async (woId) => {
    // 1. Fetch linked stock entries first
    let linkedEntries = [];
    try {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive) {
        setSyncStatusMsg('Checking linked transactions...');
        linkedEntries = await frappe.getLinkedStockEntries(woId);
        setSyncStatusMsg('');
      }
    } catch (e) {
      console.warn("Failed to fetch linked stock entries during cancel precheck:", e);
    }

    const submittedEntries = linkedEntries.filter(e => e.docstatus === 1);
    const draftEntries = linkedEntries.filter(e => e.docstatus === 0);

    let confirmMsg = `Cancel Work Order ${woId}?\n\nThis will set the Work Order status to Cancelled.`;
    if (submittedEntries.length > 0 || draftEntries.length > 0) {
      confirmMsg += `\n\n⚠️ WARNING: This Work Order has linked Stock Entries:\n`;
      if (submittedEntries.length > 0) {
        confirmMsg += `- Submitted: ${submittedEntries.map(e => e.name).join(', ')}\n`;
      }
      if (draftEntries.length > 0) {
        confirmMsg += `- Drafts: ${draftEntries.map(e => e.name).join(', ')}\n`;
      }
      confirmMsg += `\nERPNext requires all linked Stock Entries to be cancelled first. Would you like to automatically cancel and clean up these stock entries now?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive) {
        // Cancel all submitted Stock Entries first
        for (const entry of submittedEntries) {
          setSyncStatusMsg(`Cancelling Stock Entry ${entry.name}...`);
          await frappe.cancelDoc('Stock Entry', entry.name);
        }

        // Delete all draft Stock Entries
        for (const entry of draftEntries) {
          setSyncStatusMsg(`Deleting draft Stock Entry ${entry.name}...`);
          await frappe.deleteDoc('Stock Entry', entry.name);
        }

        // Finally cancel the Work Order
        setSyncStatusMsg(`Cancelling Work Order ${woId}...`);
        await frappe.cancelWorkOrder(woId);
      }

      setWorkOrders(prev =>
        prev.map(wo => wo.id === woId ? { ...wo, status: 'Cancelled' } : wo)
      );
      showAlert(`Work Order ${woId} and all associated stock entries have been cancelled.`, 'success', 'Cancelled Successfully');
      loadWorkOrders();
    } catch (err) {
      showAlert(`Error cancelling: ${err.message}`, 'error', 'Cancel Failed');
    } finally {
      setSyncStatusMsg('');
    }
  };

  const handleDeleteWorkOrder = async (woId) => {
    const targetWO = workOrders.find(w => w.id === woId);
    if (targetWO && targetWO.status !== 'Cancelled' && targetWO.status !== 'Draft' && targetWO.status !== 'Not Started') {
      showAlert(`Work Order ${woId} is currently ${targetWO.status}. You must Cancel it first before you can delete it.`, 'warning', 'Cancel Required First');
      return;
    }

    // 1. Fetch linked stock entries first
    let linkedEntries = [];
    try {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive) {
        setSyncStatusMsg('Checking linked transactions...');
        linkedEntries = await frappe.getLinkedStockEntries(woId);
        setSyncStatusMsg('');
      }
    } catch (e) {
      console.warn("Failed to fetch linked stock entries during delete precheck:", e);
    }

    // Filter by status
    const submittedEntries = linkedEntries.filter(e => e.docstatus === 1);
    const cancelledEntries = linkedEntries.filter(e => e.docstatus === 2);
    const draftEntries = linkedEntries.filter(e => e.docstatus === 0);

    // If there are submitted or cancelled stock entries, delete is blocked by ERPNext to preserve audit ledger
    if (submittedEntries.length > 0) {
      showAlert(`Cannot delete Work Order ${woId} because it has active, submitted Stock Entries (${submittedEntries.map(e => e.name).join(', ')}). Please cancel them first.`, 'danger', 'Deletion Blocked');
      return;
    }

    if (cancelledEntries.length > 0) {
      showAlert(`Work Order ${woId} cannot be deleted because it is linked to Cancelled Stock Entries (${cancelledEntries.map(e => e.name).join(', ')}). In ERPNext, transactions with ledger postings cannot be deleted to preserve accounting audit trails. The Work Order must remain in the system as Cancelled.`, 'info', 'Auditing Constraint');
      return;
    }

    let confirmMsg = `Are you sure you want to PERMANENTLY DELETE Work Order ${woId}?\n\nThis action cannot be undone.`;
    if (draftEntries.length > 0) {
      confirmMsg += `\n\nAlso deletes linked draft stock entries:\n${draftEntries.map(e => e.name).join(', ')}`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      const conn = frappe.getConnectionSettings();
      if (conn.isLive) {
        // Delete linked draft stock entries first
        for (const entry of draftEntries) {
          setSyncStatusMsg(`Deleting Draft Stock Entry ${entry.name}...`);
          await frappe.deleteDoc('Stock Entry', entry.name);
        }

        setSyncStatusMsg(`Deleting Work Order ${woId}...`);
        await frappe.deleteWorkOrder(woId);
      }
      setWorkOrders(prev => prev.filter(wo => wo.id !== woId));
      if (selectedWOId === woId) setSelectedWOId(null);
      showAlert(`Work Order ${woId} has been deleted.`, 'success', 'Deleted');
      loadWorkOrders();
    } catch (err) {
      showAlert(`Error deleting: ${err.message}`, 'error', 'Delete Failed');
    } finally {
      setSyncStatusMsg('');
    }
  };

  const handleStatusFilterChange = (newStatus) => {
    setWoStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleAdjustStockSubmit = (e) => {
    e.preventDefault();
    setInventory(prev => {
      const updated = { ...prev };
      if (updated[adjustItemCode]) {
        updated[adjustItemCode].qty = Math.max(0, updated[adjustItemCode].qty + adjustQty);
        frappe.syncStockToERP(adjustItemCode, updated[adjustItemCode].qty);
      }
      return updated;
    });
    setShowAdjustStockModal(false);
    setAdjustItemCode('');
    setAdjustQty(0);
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSyncStatusMsg('Saving company settings...');

    try {
      const conn = frappe.getConnectionSettings();
      const result = await frappe.login(conn.url, conn.username, conn.password, !!conn.isLive, settingsDefaultCompany);

      if (result.success) {
        setSyncStatusMsg('Default company saved successfully!');
        setDefaultCompany(settingsDefaultCompany);
        setTimeout(() => {
          setShowSettingsModal(false);
          setSyncStatusMsg('');
        }, 1200);
      } else {
        setSyncStatusMsg(`Error saving: ${result.message}`);
      }
    } catch (err) {
      setSyncStatusMsg(`Failed: ${err.message}`);
    }
  };

  const filteredWorkOrders = workOrders.filter(wo =>
    wo.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const conn = frappe.getConnectionSettings();
  const isLiveMode = isLoggedIn && conn.isLive && conn.connected;

  // In live mode: server already returns the paginated page (no local slicing needed)
  // In local mode: slice locally
  const displayedWorkOrders = isLiveMode
    ? filteredWorkOrders
    : filteredWorkOrders.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  const totalWOPages = isLiveMode
    ? totalWOPagesLive
    : Math.max(1, Math.ceil(filteredWorkOrders.length / recordsPerPage));

  useEffect(() => {
    loadWorkOrders();
    loadMaintenanceSchedules();
  }, [currentPage, isLoggedIn, defaultCompany, woStatusFilter]);

  // Render Login page if offline/not authenticated
  if (!isLoggedIn) {
    return (
      <LoginPage
        is2FAPhase={is2FAPhase}
        setIs2FAPhase={setIs2FAPhase}
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        loginLoading={loginLoading}
        use2FA={use2FA}
        setUse2FA={setUse2FA}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        tempSecret={tempSecret}
        totpQrUrl={totpQrUrl}
        copiedKey={copiedKey}
        handleLoginSubmit={handleLoginSubmit}
        handleVerify2FASetup={handleVerify2FASetup}
        handleVerify2FALogin={handleVerify2FALogin}
        handleCopyMFAKey={handleCopyMFAKey}
        handleReset2FA={handleReset2FA}
        handleLaunchDemoMode={handleLaunchDemoMode}
      />
    );
  }

  // DEAD CODE BELOW - original login JSX replaced by LoginPage component above
  if (false) {
    if (is2FAPhase === 'setup') {
      return (
        <div className="login-page">
          <div className="login-bg-decorations">
            <div className="login-blob login-blob-1"></div>
            <div className="login-blob login-blob-2"></div>
          </div>

          <div className="login-card totp-setup-card">
            <button onClick={() => setIs2FAPhase('none')} className="btn-back" type="button">
              ← Back to login
            </button>

            <div className="login-header" style={{ textAlign: 'center' }}>
              <div className="totp-icon-header">🛡️</div>
              <h2>Setup Authenticator</h2>
              <p>Scan this QR code with Google Authenticator to enable 2-Factor Authentication (2FA)</p>
            </div>

            {loginError && (
              <div className="totp-error-alert">
                <span>⚠️ {loginError}</span>
              </div>
            )}

            <div className="totp-setup-body">
              <div className="qr-container">
                {totpQrUrl && <img src={totpQrUrl} alt="Google Authenticator QR Code" className="qr-code-img" />}
              </div>

              <div className="secret-display-box">
                <label style={{ fontWeight: '600', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Manual Setup Key</label>
                <div className="secret-key-wrapper">
                  <span className="secret-key-text">{tempSecret}</span>
                  <button onClick={handleCopyMFAKey} className="btn-copy" type="button">
                    {copiedKey ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>

              <form onSubmit={handleVerify2FASetup} className="login-form">
                <div className="form-group">
                  <label htmlFor="otpCode">6-Digit Verification Code</label>
                  <input
                    id="otpCode"
                    type="text"
                    pattern="\d*"
                    maxLength="6"
                    className="form-input text-center letter-spacing-lg"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>

                <button type="submit" className="btn-primary-login" disabled={loginLoading || otpCode.length !== 6}>
                  {loginLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
              </form>
            </div>
          </div>
        </div>
      );
    }

    if (is2FAPhase === 'verify') {
      return (
        <div className="login-page">
          <div className="login-bg-decorations">
            <div className="login-blob login-blob-1"></div>
            <div className="login-blob login-blob-2"></div>
          </div>

          <div className="login-card totp-verify-card">
            <button onClick={() => setIs2FAPhase('none')} className="btn-back" type="button">
              ← Back to login
            </button>

            <div className="login-header" style={{ textAlign: 'center' }}>
              <div className="totp-icon-header">🛡️</div>
              <h2>MFA Verification</h2>
              <p>Enter the 6-digit code generated by your Google Authenticator app for <strong>{loginUsername}</strong></p>
            </div>

            {loginError && (
              <div className="totp-error-alert">
                <span>⚠️ {loginError}</span>
              </div>
            )}

            <form onSubmit={handleVerify2FALogin} className="login-form">
              <div className="form-group">
                <label htmlFor="otpCodeVerify">Authenticator Code</label>
                <input
                  id="otpCodeVerify"
                  type="text"
                  pattern="\d*"
                  maxLength="6"
                  className="form-input text-center letter-spacing-lg"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="btn-primary-login" disabled={loginLoading || otpCode.length !== 6}>
                {loginLoading ? 'Authenticating...' : 'Verify & Sign In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button onClick={handleReset2FA} className="btn-reset-2fa" style={{ fontSize: '11px', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer' }}>
                Reset 2FA Setup
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="login-page">
        <div className="login-bg-decorations">
          <div className="login-blob login-blob-1"></div>
          <div className="login-blob login-blob-2"></div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <img src={logo} alt="Island Chill Logo" style={{ height: '48px', width: 'auto' }} />
            </div>
            <h2 style={{ textAlign: 'center' }}>Island Chill</h2>
            <p style={{ textAlign: 'center' }}>Sign in to manage bottling and warehouse production</p>
          </div>

          {loginError && (
            <div className="totp-error-alert">
              <span>⚠️ {loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="form-group">
              <label>Username / Email</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  className="form-input-icon"
                  placeholder="administrator"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  disabled={loginLoading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  className="form-input-icon"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loginLoading}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
              <input
                type="checkbox"
                id="totp-toggle"
                checked={use2FA || localStorage.getItem(`totp_enabled_${loginUsername}`) === 'true'}
                disabled={localStorage.getItem(`totp_enabled_${loginUsername}`) === 'true'}
                onChange={(e) => setUse2FA(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="totp-toggle" style={{ fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                Secure with Google Authenticator
                {localStorage.getItem(`totp_enabled_${loginUsername}`) === 'true' && (
                  <span style={{ color: 'var(--success)', fontWeight: 'bold', marginLeft: '6px' }}>(Enabled)</span>
                )}
              </label>
            </div>

            <button type="submit" className="btn-primary-login" disabled={loginLoading} style={{ marginTop: '16px' }}>
              {loginLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }



  const filteredMaintRecords = maintenanceRecords.filter(rec => {
    const matchesSearch = !maintSearchQuery ||
      (rec.id && rec.id.toLowerCase().includes(maintSearchQuery.toLowerCase())) ||
      (rec.operator && rec.operator.toLowerCase().includes(maintSearchQuery.toLowerCase())) ||
      (rec.supervisor && rec.supervisor.toLowerCase().includes(maintSearchQuery.toLowerCase())) ||
      (rec.equipment && rec.equipment.toLowerCase().includes(maintSearchQuery.toLowerCase())) ||
      (rec.area && rec.area.toLowerCase().includes(maintSearchQuery.toLowerCase()));

    const matchesFilter = maintFilterEquipment === 'All' || rec.equipment === maintFilterEquipment;
    return matchesSearch && matchesFilter;
  });

  const filteredSafetyRecords = safetyRecords.filter(rec => {
    const matchesSearch = !safetySearchQuery ||
      (rec.id && rec.id.toLowerCase().includes(safetySearchQuery.toLowerCase())) ||
      (rec.type && rec.type.toLowerCase().includes(safetySearchQuery.toLowerCase())) ||
      (rec.operator && rec.operator.toLowerCase().includes(safetySearchQuery.toLowerCase())) ||
      (rec.injuredPerson && rec.injuredPerson.toLowerCase().includes(safetySearchQuery.toLowerCase())) ||
      (rec.details && rec.details.toLowerCase().includes(safetySearchQuery.toLowerCase()));

    const matchesFilter = safetyFilterType === 'All' || rec.type === safetyFilterType;
    return matchesSearch && matchesFilter;
  });

  const filteredLabRecords = laboratoryRecords.filter(rec => {
    const matchesSearch = !labSearchQuery ||
      (rec.id && rec.id.toLowerCase().includes(labSearchQuery.toLowerCase())) ||
      (rec.type && rec.type.toLowerCase().includes(labSearchQuery.toLowerCase())) ||
      (rec.analyst && rec.analyst.toLowerCase().includes(labSearchQuery.toLowerCase())) ||
      (rec.verifiedBy && rec.verifiedBy.toLowerCase().includes(labSearchQuery.toLowerCase())) ||
      (rec.comments && rec.comments.toLowerCase().includes(labSearchQuery.toLowerCase()));

    const matchesFilter = labFilterType === 'All' || rec.type === labFilterType;
    return matchesSearch && matchesFilter;
  });




  function handleOpenSettings() {
    const conn = frappe.getConnectionSettings();
    setSettingsUrl(conn.url || 'https://demo.erpnext.com');
    setSettingsApiKey(conn.apiKey || '');
    setSettingsApiSecret(conn.apiSecret || '');
    setSettingsDefaultCompany(conn.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited');
    setSyncStatusMsg('');
    setShowSettingsModal(true);
  }

  return (
    <div className="app-container">
      {/* Mobile Top Header Bar */}
      {isLoggedIn && (
        <div className="mobile-header-bar">
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logo} alt="Island Chill Logo" style={{ height: '32px', width: 'auto' }} />
            <span style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>Island Chill</span>
          </div>
          <div style={{ width: '40px' }}></div> {/* Spacer to balance menu button */}
        </div>
      )}

      {/* Sidebar Backdrop on Mobile */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar Navigation - extracted to Sidebar component */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        currentUserRole={currentUserRole}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        handleLogout={handleLogout}
        setSelectedWOId={setSelectedWOId}
      />

      {/* Main Workspace Area */}
      <main className="main-workspace">
        <AppHeader
          currentUser={currentUser}
          currentTime={currentTime}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          lowStockCount={lowStockCount}
          inventory={inventory}
          tickets={tickets}
          setCurrentTab={setCurrentTab}
          setShowSettingsModal={setShowSettingsModal}
          setSettingsUrl={setSettingsUrl}
          setSettingsApiKey={setSettingsApiKey}
          setSettingsApiSecret={setSettingsApiSecret}
          setSyncStatusMsg={setSyncStatusMsg}
        />

        {/* Dashboard Tab */}
        {currentTab === 'dashboard' && (
          <DashboardTab
            workOrders={workOrders}
            inventory={inventory}
            activeWOsCount={activeWOsCount}
            pendingWOsCount={pendingWOsCount}
            inProgressJobCardsCount={inProgressJobCardsCount}
            lowStockCount={lowStockCount}
            totalProduction={totalProduction}
            goodProduction={goodProduction}
            looseProduction={looseProduction}
            woMonitorPage={woMonitorPage}
            setWoMonitorPage={setWoMonitorPage}
            setCurrentTab={setCurrentTab}
            setSelectedWOId={setSelectedWOId}
            fullscreenElement={fullscreenElement}
            setFullscreenElement={setFullscreenElement}
            WORK_ORDER_ACTIVE_STATUSES={WORK_ORDER_ACTIVE_STATUSES}
          />
        )}

        {/* Work Orders Tab */}
        {currentTab === 'work-orders' && (
          <WorkOrdersTab
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            woLoading={woLoading}
            displayedWorkOrders={displayedWorkOrders}
            woStatusFilter={woStatusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            selectedWOId={selectedWOId}
            setSelectedWOId={setSelectedWOId}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalWOPages={totalWOPages}
            woProductsList={woProductsList}
            selectedWoProduct={selectedWoProduct}
            setSelectedWoProduct={setSelectedWoProduct}
            woBomsList={woBomsList}
            selectedWoBom={selectedWoBom}
            setSelectedWoBom={setSelectedWoBom}
            woItemsLoading={woItemsLoading}
            woBomsLoading={woBomsLoading}
            woProductSearch={woProductSearch}
            setWoProductSearch={setWoProductSearch}
            woBomSearch={woBomSearch}
            setWoBomSearch={setWoBomSearch}
            filteredWoProductsList={filteredWoProductsList}
            filteredWoBomsList={filteredWoBomsList}
            showNewWODrawer={showNewWODrawer}
            setShowNewWODrawer={setShowNewWODrawer}
            handleCreateNewWO={handleCreateNewWO}
            handleDeleteWorkOrder={handleDeleteWorkOrder}
            handleCancelWorkOrder={handleCancelWorkOrder}
            showAlert={showAlert}
            setStockEntryModal={setStockEntryModal}
            loadWorkOrders={loadWorkOrders}
            syncJobCardToERP={frappe.syncJobCardToERP}
            WORK_ORDER_STARTABLE_STATUSES={WORK_ORDER_STARTABLE_STATUSES}
            WORK_ORDER_ACTIVE_STATUSES={WORK_ORDER_ACTIVE_STATUSES}
            JOB_CARD_STARTABLE_STATUSES={JOB_CARD_STARTABLE_STATUSES}
            JOB_CARD_RUNNING_STATUSES={JOB_CARD_RUNNING_STATUSES}
            JOB_CARD_PAUSED_STATUSES={JOB_CARD_PAUSED_STATUSES}
            isLoggedIn={isLoggedIn}
            recordsPerPage={recordsPerPage}
            logo={logo}
            handleStartWorkOrder={handleStartWorkOrder}
            isWorkOrderReadyForFinish={isWorkOrderReadyForFinish}
            woActionLoading={woActionLoading}
            handleFinishWorkOrder={handleFinishWorkOrder}
            handleChangeWorkOrderStatus={handleChangeWorkOrderStatus}
            openJobCardAction={openJobCardAction}
            setOperatorName={setTimelineOperatorName}
            currentUser={currentUser}
            setOperatorRemarks={setTimelineOperatorRemarks}
            setActiveTimelineJC={setActiveTimelineJC}
            operatorName={timelineOperatorName}
            operatorEmployeeId={timelineOperatorName}
            setOperatorEmployeeId={setTimelineOperatorName}
            operatorRemarks={timelineOperatorRemarks}
            activeTimelineJC={activeTimelineJC}
            jcActualStartTime={jcActualStartTime}
            setJcActualStartTime={setJcActualStartTime}
            jcActualEndTime={jcActualEndTime}
            setJcActualEndTime={setJcActualEndTime}
            jcFinishForQuantity={jcFinishForQuantity}
            setJcFinishForQuantity={setJcFinishForQuantity}
            jcFinishCompletedQty={jcFinishCompletedQty}
            setJcFinishCompletedQty={setJcFinishCompletedQty}
            jcFinishProcessLossQty={jcFinishProcessLossQty}
            setJcFinishProcessLossQty={setJcFinishProcessLossQty}
            handleStartJobCard={handleStartJobCard}
            handlePauseJobCard={handlePauseJobCard}
            handleResumeJobCard={handleResumeJobCard}
            handleFinishJobCard={handleFinishJobCard}
            handleAddRemarkJobCard={handleAddRemarkJobCard}
            handleReplyToRemarkJobCard={handleReplyToRemarkJobCard}
            replyingToIdx={replyingToIdx}
            setReplyingToIdx={setReplyingToIdx}
            replyText={replyText}
            setReplyText={setReplyText}
            employeeList={employeeList}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
            setActiveSearchField={setActiveSearchField}
            handleSearchEmployees={handleSearchEmployees}
            activeJCOp={activeJCOp}
            setActiveJCOp={setActiveJCOp}
          />
        )}

        {/* Inventory Tab */}
        {currentTab === 'inventory' && (
          <InventoryTab
            erpItems={erpItems}
            inventory={inventory}
            showAdjustStockModal={showAdjustStockModal}
            setShowAdjustStockModal={setShowAdjustStockModal}
            adjustItemCode={adjustItemCode}
            setAdjustItemCode={setAdjustItemCode}
            adjustQty={adjustQty}
            setAdjustQty={setAdjustQty}
            handleAdjustStockSubmit={handleAdjustStockSubmit}
            invSearchQuery={invSearchQuery}
            setInvSearchQuery={setInvSearchQuery}
            invPage={invPage}
            setInvPage={setInvPage}
            selectedItemCode={selectedItemCode}
            setSelectedItemCode={setSelectedItemCode}
            itemsLoading={itemsLoading}
            isLoggedIn={isLoggedIn}
            workOrders={workOrders}
          />
        )}

        {/* BOM Tab */}
        {currentTab === 'bom' && (
          <BOMTab
            BOMS={BOMS}
            PRODUCTS={PRODUCTS}
            bomLoading={bomLoading}
            bomList={bomList}
            selectedBomId={selectedBomId}
            setSelectedBomId={setSelectedBomId}
            bomPage={bomPage}
            setBomPage={setBomPage}
            activeBomMaterials={activeBomMaterials}
          />
        )}

        {/* Sales Tab */}
        {currentTab === 'sales' && (
          <SalesTab
            salesInvoicesList={salesInvoicesList}
            setSalesInvoicesList={setSalesInvoicesList}
            deliveryNotesList={deliveryNotesList}
            setDeliveryNotesList={setDeliveryNotesList}
            showCreateInvoiceModal={showCreateInvoiceModal}
            setShowCreateInvoiceModal={setShowCreateInvoiceModal}
            showCreateDeliveryNoteModal={showCreateDeliveryNoteModal}
            setShowCreateDeliveryNoteModal={setShowCreateDeliveryNoteModal}
            showAmendInvoiceModal={showAmendInvoiceModal}
            setShowAmendInvoiceModal={setShowAmendInvoiceModal}
            showAmendDeliveryNoteModal={showAmendDeliveryNoteModal}
            setShowAmendDeliveryNoteModal={setShowAmendDeliveryNoteModal}
            salesLoading={salesLoading}
            setSalesLoading={setSalesLoading}
            selectedInvoice={selectedInvoice}
            setSelectedInvoice={setSelectedInvoice}
            selectedDeliveryNote={selectedDeliveryNote}
            setSelectedDeliveryNote={setSelectedDeliveryNote}
            salesSearchQuery={salesSearchQuery}
            setSalesSearchQuery={setSalesSearchQuery}
            salesInvoicePage={salesInvoicePage}
            setSalesInvoicePage={setSalesInvoicePage}
            deliveryNotePage={deliveryNotePage}
            setDeliveryNotePage={setDeliveryNotePage}
            salesSubTab={salesSubTab}
            setSalesSubTab={setSalesSubTab}
            showAlert={showAlert}
            PRODUCTS={PRODUCTS}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* Maintenance Tab */}
        {currentTab === 'maintenance' && (
          <MaintenanceTab
            maintenanceRecords={maintenanceRecords}
            setMaintenanceRecords={setMaintenanceRecords}
            maintSearchQuery={maintSearchQuery}
            setMaintSearchQuery={setMaintSearchQuery}
            maintFilterEquipment={maintFilterEquipment}
            setMaintFilterEquipment={setMaintFilterEquipment}
            maintSaving={maintSaving}
            setMaintSaving={setMaintSaving}
            MAINTENANCE_TEMPLATES={maintTemplates}
            showAlert={showAlert}
            filteredMaintRecords={filteredMaintRecords}
            activeMaintSubTab={activeMaintSubTab}
            setActiveMaintSubTab={setActiveMaintSubTab}
            maintViewMode={maintViewMode}
            setMaintViewMode={setMaintViewMode}
            getWeekNumber={getWeekNumber}
            activeMaintTemplate={activeMaintTemplate}
            setActiveMaintTemplate={setActiveMaintTemplate}
            maintWeekNo={maintWeekNo}
            setMaintWeekNo={setMaintWeekNo}
            maintFromDate={maintFromDate}
            setMaintFromDate={setMaintFromDate}
            maintToDate={maintToDate}
            setMaintToDate={setMaintToDate}
            maintCheckgrid={maintCheckgrid}
            setMaintCheckgrid={setMaintCheckgrid}
            maintRemarks={maintRemarks}
            setMaintRemarks={setMaintRemarks}
            maintOperator={maintOperator}
            setMaintOperator={setMaintOperator}
            maintSupervisor={maintSupervisor}
            setMaintSupervisor={setMaintSupervisor}
            activeMaintForm={activeMaintForm}
            setActiveMaintForm={setActiveMaintForm}
            maintPage={maintPage}
            setMaintPage={setMaintPage}
            viewingRecord={viewingRecord}
            setViewingRecord={setViewingRecord}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
            setActiveSearchField={setActiveSearchField}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* Safety Tab */}
        {currentTab === 'safety' && (
          <SafetyTab
            safetyRecords={safetyRecords}
            setSafetyRecords={setSafetyRecords}
            safetySearchQuery={safetySearchQuery}
            setSafetySearchQuery={setSafetySearchQuery}
            safetyFilterType={safetyFilterType}
            setSafetyFilterType={setSafetyFilterType}
            filteredSafetyRecords={filteredSafetyRecords}
            safetyPage={safetyPage}
            setSafetyPage={setSafetyPage}
            activeSafetyForm={activeSafetyForm}
            setActiveSafetyForm={setActiveSafetyForm}
            viewingSafetyRecord={viewingSafetyRecord}
            setViewingSafetyRecord={setViewingSafetyRecord}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
            setActiveSearchField={setActiveSearchField}
            setEmailModal={setEmailModal}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* Workflow Tab */}
        {currentTab === 'workflow' && (
          <WorkflowTab
            WORKFLOW_STAGES={WORKFLOW_STAGES}
            simStep={simStep}
            setSimStep={setSimStep}
            simPlaying={simPlaying}
            setSimPlaying={setSimPlaying}
            simSpeed={simSpeed}
            setSimSpeed={setSimSpeed}
          />
        )}

        {/* Laboratory Tab */}
        {currentTab === 'laboratory' && (
          <LaboratoryTab
            laboratoryRecords={laboratoryRecords}
            setLaboratoryRecords={setLaboratoryRecords}
            labSearchQuery={labSearchQuery}
            setLabSearchQuery={setLabSearchQuery}
            labFilterType={labFilterType}
            setLabFilterType={setLabFilterType}
            filteredLabRecords={filteredLabRecords}
            labPage={labPage}
            setLabPage={setLabPage}
            labViewMode={labViewMode}
            setLabViewMode={setLabViewMode}
            activeLabForm={activeLabForm}
            setActiveLabForm={setActiveLabForm}
            viewingLabRecord={viewingLabRecord}
            setViewingLabRecord={setViewingLabRecord}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
            setActiveSearchField={setActiveSearchField}
            setEmailModal={setEmailModal}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* Cleaning Tab */}
        {currentTab === 'cleaning' && (
          <CleaningTab
            cleaningRecords={cleaningRecords}
            setCleaningRecords={setCleaningRecords}
            CLEANING_TEMPLATES={CLEANING_TEMPLATES}
            cleaningSearchQuery={cleaningSearchQuery}
            setCleaningSearchQuery={setCleaningSearchQuery}
            cleaningFilterType={cleaningFilterType}
            setCleaningFilterType={setCleaningFilterType}
            cleaningPage={cleaningPage}
            setCleaningPage={setCleaningPage}
            activeCleaningForm={activeCleaningForm}
            setActiveCleaningForm={setActiveCleaningForm}
            viewingCleaningRecord={viewingCleaningRecord}
            setViewingCleaningRecord={setViewingCleaningRecord}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
            setActiveSearchField={setActiveSearchField}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* Support Helpdesk Module */}
        {currentTab === 'support' && (
          <SupportModule
            tickets={tickets}
            onCreateTicket={handleCreateTicket}
            onResolveTicket={handleResolveTicket}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onSendMessage={handleSendTicketMessage}
          />
        )}

        {/* Human Resource Module */}
        {currentTab === 'hr' && (
          <HRMSModule />
        )}
      </main>


      {/* Settings Modal (ERPNext Sync Credentials) */}
      {/* Settings Modal (Default Company Settings) */}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => { if (defaultCompany) setShowSettingsModal(false); }}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Default Company Settings</span>
              {defaultCompany && (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowSettingsModal(false)}>✕</button>
              )}
            </div>
            <form onSubmit={handleUpdateSettings}>
              <div className="modal-content">
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Configure the default company to be used across all manufacturing and warehouse stock operations.
                </p>

                <div className="form-group">
                  <label>Default Company</label>
                  {companiesLoading ? (
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '6px 0' }}>Loading company list from ERPNext...</div>
                  ) : (
                    <select
                      className="form-input"
                      value={settingsDefaultCompany}
                      onChange={(e) => setSettingsDefaultCompany(e.target.value)}
                      required
                    >
                      <option value="">-- Select Company --</option>
                      {companyList.map((comp) => (
                        <option key={comp.name} value={comp.name}>
                          {comp.company_name || comp.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {syncStatusMsg && (
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    marginTop: '12px',
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: syncStatusMsg.startsWith('Error') || syncStatusMsg.startsWith('Failed') ? '#fef2f2' : '#f0fdf4',
                    color: syncStatusMsg.startsWith('Error') || syncStatusMsg.startsWith('Failed') ? '#ef4444' : '#10b981'
                  }}>
                    {syncStatusMsg}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {defaultCompany && (
                  <button type="button" className="secondary-btn" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                )}
                <button type="submit" className="primary-btn">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Modal Overlay */}
      {fullscreenElement && (
        <div className="modal-backdrop" onClick={() => setFullscreenElement(null)}>
          <div className="modal-panel fullscreen-modal-panel" style={{ width: '90%', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>
                {fullscreenElement === 'live1' && 'Filling Line 1 Feed (Water Bottling)'}
                {fullscreenElement === 'live2' && 'Filling Line 2 Feed (Alcoholic & Cans)'}
                {fullscreenElement === 'chartOee' && 'Overall Equipment Effectiveness (OEE) Metrics'}
                {fullscreenElement === 'chartFlow' && 'Hourly Water Flow Rate'}
                {fullscreenElement === 'chartDefects' && 'Product Defect Breakdown'}
              </span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setFullscreenElement(null)}>✕</button>
            </div>
            <div className="modal-content" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '24px' }}>
              {fullscreenElement === 'live1' && (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img src={line1} alt="Filling Line 1" style={{ objectFit: 'contain', width: '100%', height: '100%', borderRadius: '8px' }} />
                  <div className="feed-noise" />
                  <div className="feed-hud">
                    <div className="hud-box" style={{ top: '25%', left: '30%', width: '90px', height: '90px', fontSize: '12px' }}>
                      <span className="hud-label">BOT-041: 99.8%</span>
                    </div>
                    <div className="hud-box" style={{ top: '45%', left: '55%', width: '90px', height: '90px', fontSize: '12px' }}>
                      <span className="hud-label">BOT-042: 100.0%</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: '20px', left: '20px', fontSize: '12px', fontFamily: 'monospace', color: '#00ff00', textShadow: '0 0 4px #00ff00', fontWeight: '600' }}>
                      FPS: 29.97 • RES: 1080P • AI VISION ACTIVE
                    </div>
                  </div>
                </div>
              )}
              {fullscreenElement === 'live2' && (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img src={line2} alt="Filling Line 2" style={{ objectFit: 'contain', width: '100%', height: '100%', borderRadius: '8px' }} />
                  <div className="feed-noise" />
                  <div className="feed-hud">
                    <div className="hud-box" style={{ top: '35%', left: '20%', width: '80px', height: '80px', fontSize: '12px' }}>
                      <span className="hud-label">CAN-891: FILL OK</span>
                    </div>
                    <div className="hud-box" style={{ top: '50%', left: '60%', width: '80px', height: '80px', fontSize: '12px' }}>
                      <span className="hud-label">CAN-892: SEAL OK</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: '20px', left: '20px', fontSize: '12px', fontFamily: 'monospace', color: '#00ff00', textShadow: '0 0 4px #00ff00', fontWeight: '600' }}>
                      FPS: 29.97 • RES: 1080P • AI VISION ACTIVE
                    </div>
                  </div>
                </div>
              )}
              {fullscreenElement === 'chartOee' && (
                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {[
                    { label: 'Availability', value: 92.45, color: 'var(--info)', desc: 'Percentage of planned uptime that the plant is active' },
                    { label: 'Performance', value: 88.20, color: 'var(--warning)', desc: 'Uptime processing speed vs rated machine capacity' },
                    { label: 'Quality Rate', value: 98.76, color: 'var(--success)', desc: 'Percentage of good production vs total production' },
                    { label: 'Overall OEE', value: 80.54, color: 'var(--accent)', desc: 'Availability × Performance × Quality' }
                  ].map((gauge, gIdx) => (
                    <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <div>
                          <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{gauge.label}</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{gauge.desc}</div>
                        </div>
                        <strong style={{ color: gauge.color, fontSize: '16px' }}>{gauge.value.toFixed(2)}%</strong>
                      </div>
                      <div style={{ height: '14px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '7px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${gauge.value}%`, backgroundColor: gauge.color, borderRadius: '7px' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {fullscreenElement === 'chartFlow' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ height: '80%', position: 'relative' }}>
                    <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="flow-glow-full" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--info)" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="var(--info)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 160 Q 75 120 150 140 T 300 90 T 450 110 T 600 70 L 600 200 L 0 200 Z"
                        fill="url(#flow-glow-full)"
                      />
                      <path
                        d="M 0 160 Q 75 120 150 140 T 300 90 T 450 110 T 600 70"
                        fill="none"
                        stroke="var(--info)"
                        strokeWidth="3.5"
                      />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <span>08:00 (120 L/min)</span>
                    <span>10:00 (140 L/min)</span>
                    <span>12:00 (165 L/min)</span>
                    <span>14:00 (150 L/min)</span>
                    <span>16:00 (180 L/min)</span>
                  </div>
                </div>
              )}
              {fullscreenElement === 'chartDefects' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
                  <svg width="180" height="180" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--danger)" strokeWidth="3.2"
                      strokeDasharray="60 40" strokeDashoffset="25" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--warning)" strokeWidth="3.2"
                      strokeDasharray="30 70" strokeDashoffset="85" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--info)" strokeWidth="3.2"
                      strokeDasharray="10 90" strokeDashoffset="115" />
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--danger)', borderRadius: '50%' }}></span>
                      <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>Underfill Volume: 60.00%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--warning)', borderRadius: '50%' }}></span>
                      <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>Cap Seal Leakage: 30.00%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--info)', borderRadius: '50%' }}></span>
                      <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>Barcode Scan Failure: 10.00%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Create Work Order */}
      {showNewWODrawer && (
        <div className="drawer-backdrop" onClick={() => setShowNewWODrawer(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Schedule New Production Run</h3>
              <button className="drawer-close-btn" onClick={() => setShowNewWODrawer(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateNewWO} className="drawer-content" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingBottom: '20px' }}>
              <div className="form-group">
                <label>Select Product (Item to Manufacture) *</label>
                {/* <input
                  type="text"
                  className="form-input"
                  placeholder="Search item code or name..."
                  value={woProductSearch}
                  onChange={(e) => setWoProductSearch(e.target.value)}
                  disabled={woItemsLoading}
                  style={{ marginBottom: '8px' }}
                /> */}
                <select
                  name="productCode"
                  className="form-input"
                  value={selectedWoProduct}
                  onChange={(e) => setSelectedWoProduct(e.target.value)}
                  disabled={woItemsLoading || filteredWoProductsList.length === 0}
                  required
                >
                  {woItemsLoading ? (
                    <option value="">Loading items...</option>
                  ) : filteredWoProductsList.length === 0 ? (
                    <option value="">No manufacturable items found</option>
                  ) : (
                    filteredWoProductsList.map(p => (
                      <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                    ))
                  )}
                </select>
                <small className="text-muted" style={{ fontSize: '11px' }}>
                  Live mode shows Items that have an active submitted BOM.
                </small>
              </div>

              <div className="form-group">
                <label>BOM No *</label>
                {/* <input
                  type="text"
                  className="form-input"
                  placeholder="Search BOM..."
                  value={woBomSearch}
                  onChange={(e) => setWoBomSearch(e.target.value)}
                  disabled={woBomsLoading || !selectedWoProduct}
                  style={{ marginBottom: '8px' }}
                /> */}
                <select
                  name="bomNo"
                  className="form-input"
                  value={selectedWoBom}
                  onChange={(e) => setSelectedWoBom(e.target.value)}
                  disabled={woBomsLoading || filteredWoBomsList.length === 0}
                  required
                >
                  {woBomsLoading ? (
                    <option value="">Loading BOMs...</option>
                  ) : filteredWoBomsList.length === 0 ? (
                    <option value="">No active submitted BOM for selected item</option>
                  ) : (
                    filteredWoBomsList.map(bom => (
                      <option key={bom.id} value={bom.name}>
                        {bom.name}{bom.isDefault ? ' • Default' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Batch Size (Qty to Manufacture) *</label>
                <input
                  type="number"
                  name="quantity"
                  className="form-input"
                  defaultValue="1"
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Company *</label>
                <select
                  name="company"
                  className="form-input"
                  value={woCreateCompany}
                  onChange={(e) => setWoCreateCompany(e.target.value)}
                  required
                >
                  {companyList.map((comp) => (
                    <option key={comp.name} value={comp.name}>
                      {comp.company_name || comp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Warehouse Section ── */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: '10px', marginTop: '4px' }}>
                  Warehouses
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Source Warehouse * <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Raw Materials)</span></label>
                    {warehousesLoading ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</div>
                    ) : (
                      <select name="sourceWarehouse" className="form-input" required
                        value={woSourceWarehouse} onChange={e => setWoSourceWarehouse(e.target.value)}>
                        <option value="">-- Select Source Warehouse --</option>
                        {availableWarehouses.map((wh) => (
                          <option key={wh.name} value={wh.name}>{wh.warehouse_name || wh.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Target Warehouse * <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Finished Goods)</span></label>
                    {warehousesLoading ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</div>
                    ) : (
                      <select name="fgWarehouse" className="form-input" required
                        value={woFgWarehouse} onChange={e => setWoFgWarehouse(e.target.value)}>
                        <option value="">-- Select Target Warehouse --</option>
                        {availableWarehouses.map((wh) => (
                          <option key={wh.name} value={wh.name}>{wh.warehouse_name || wh.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Work-in-Progress Warehouse * <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Operations)</span></label>
                    {warehousesLoading ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</div>
                    ) : (
                      <select name="wipWarehouse" className="form-input" required
                        value={woWipWarehouse} onChange={e => setWoWipWarehouse(e.target.value)}>
                        <option value="">-- Select WIP Warehouse --</option>
                        {availableWarehouses.map((wh) => (
                          <option key={wh.name} value={wh.name}>{wh.warehouse_name || wh.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Scrap Warehouse <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Scraped Materials)</span></label>
                    {warehousesLoading ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</div>
                    ) : (
                      <select name="scrapWarehouse" className="form-input"
                        value={woScrapWarehouse} onChange={e => setWoScrapWarehouse(e.target.value)}>
                        <option value="">-- Select Scrap Warehouse --</option>
                        {availableWarehouses.map((wh) => (
                          <option key={wh.name} value={wh.name}>{wh.warehouse_name || wh.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label>Extra Goods Warehouse <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Extra Produced Products)</span></label>
                    {warehousesLoading ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</div>
                    ) : (
                      <select name="extraGoodsWarehouse" className="form-input"
                        value={woExtraGoodsWarehouse} onChange={e => setWoExtraGoodsWarehouse(e.target.value)}>
                        <option value="">-- Select Extra Goods Warehouse --</option>
                        {availableWarehouses.map((wh) => (
                          <option key={wh.name} value={wh.name}>{wh.warehouse_name || wh.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                </div>
              </div>

              <div className="form-group">
                <label>Production Bottling Line</label>
                <select name="lineNo" className="form-input">
                  <option value="Filling Line 1">Filling Line 1 (Water Line)</option>
                  <option value="Filling Line 2">Filling Line 2 (Alcoholic Cans)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Planned Start Time *</label>
                <input
                  type="datetime-local"
                  name="plannedStart"
                  className="form-input"
                  defaultValue={getNowDateTimeLocal()}
                  required
                />
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="primary-btn" disabled={woCreating} style={{ flexGrow: 1, justifyContent: 'center' }}>
                  {woCreating ? (
                    <>
                      <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '6px' }}></span>
                      Launching...
                    </>
                  ) : 'Launch Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Modal: Job Card Checklist Action (Pause / Finish / Add Remarks) */}
      {activeJCOp && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <div className="modal-header">
              <span>
                {activeJCOp.action === 'start' && '▶ Start Job Card'}
                {activeJCOp.action === 'pause' && '⏸ Pause Job Card'}
                {activeJCOp.action === 'resume' && '▶ Resume Job Card'}
                {activeJCOp.action === 'finish' && '✓ Complete & Submit Job Card'}
                {activeJCOp.action === 'remark' && '💬 Add Observation Notes / Remark'}
              </span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setActiveJCOp(null)}>✕</button>
            </div>
            <div className="modal-content">
              <p style={{ fontSize: '13px', margin: '0 0 16px 0', color: 'var(--text-muted)' }}>
                Logging updates for operation **{activeJCOp.operation}**. This status change updates Central ERPNext instantly.
              </p>

              {activeJCOp.action === 'finish' && activeJCOp.operation === 'Mixing' && (
                <div style={{ padding: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', fontSize: '12px', color: 'var(--info)', marginBottom: '16px', fontWeight: '500' }}>
                  ℹ️ **Mixing Phase**: Raw materials recipe (Water, Sugar, CO2, Concentrate) will be deducted from warehouse inventory.
                </div>
              )}

              {activeJCOp.action === 'finish' && activeJCOp.operation === 'Can/Bottle Prep' && (
                <div style={{ padding: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', fontSize: '12px', color: 'var(--accent-hover)', marginBottom: '16px', fontWeight: '500' }}>
                  ℹ️ **Packaging Prep**: Production materials (Cans, preforms, tabs, boxes) will be deducted from packaging stock.
                </div>
              )}

              {activeJCOp.action === 'start' && (
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Select Employee / Operator</label>
                  <input
                    type="text"
                    className="form-input"
                    value={jcOpOperatorName}
                    onChange={(e) => {
                      setJcOpOperatorEmployeeId('');
                      handleSearchEmployees(e.target.value, 'pauseModal');
                    }}
                    onFocus={() => {
                      setActiveSearchField('pauseModal');
                      if (jcOpOperatorName.trim().length >= 3 || employeeList.length > 0) {
                        setShowEmployeeDropdown(true);
                      }
                    }}
                    placeholder="Search employee and select from dropdown"
                    required
                    autoComplete="off"
                  />
                  {jcOpOperatorEmployeeId && (
                    <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px', fontWeight: '600' }}>
                      Selected Employee ID: {jcOpOperatorEmployeeId}
                    </div>
                  )}
                  {showEmployeeDropdown && activeSearchField === 'pauseModal' && employeeList.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                      {employeeList.map((emp) => (
                        <div
                          key={emp.name}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            borderBottom: '1px solid #f3f4f6',
                            color: '#374151'
                          }}
                          onMouseDown={() => {
                            setJcOpOperatorName(emp.employee_name || emp.name);
                            setJcOpOperatorEmployeeId(emp.name);
                            setShowEmployeeDropdown(false);
                          }}
                          className="employee-dropdown-item"
                        >
                          <strong>{emp.employee_name || emp.name}</strong> <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({emp.name})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeJCOp.action !== 'start' && (
                <div style={{ padding: '10px', backgroundColor: 'rgba(14, 165, 233, 0.08)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  ERPNext will use the existing Job Card Time Log employee. Pause/Resume/Finish will not create a new employee assignment.
                </div>
              )}

              {['start', 'resume'].includes(activeJCOp.action) && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Actual Start Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={jcActualStartTime}
                    onChange={(e) => setJcActualStartTime(e.target.value)}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Used only for Start/Resume. Leave blank to use current ERPNext time.
                  </div>
                </div>
              )}

              {['pause', 'finish'].includes(activeJCOp.action) && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Actual End Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={jcActualEndTime}
                    onChange={(e) => setJcActualEndTime(e.target.value)}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Used only for Pause/Finish. Leave blank to use current ERPNext time.
                  </div>
                </div>
              )}




              <div className="form-group">
                <label>Observation Notes / Remarks</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '80px', fontFamily: 'inherit' }}
                  value={jcOpOperatorRemarks}
                  onChange={(e) => setJcOpOperatorRemarks(e.target.value)}
                  placeholder={
                    activeJCOp.action === 'pause'
                      ? "Enter reason for pause (e.g. mechanical calibration needed, shift change)..."
                      : activeJCOp.action === 'start'
                        ? "Enter start notes (optional)..."
                        : activeJCOp.action === 'resume'
                          ? "Enter resume notes (optional)..."
                          : "Enter completion details (e.g. pH check 3.2, seal checks normal)..."
                  }
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-btn" disabled={woActionLoading} onClick={() => setActiveJCOp(null)}>Cancel</button>
              <button
                type="button"
                className="primary-btn"
                disabled={woActionLoading}
                onClick={() => {
                  if (activeJCOp.action === 'start') {
                    handleStartJobCard(activeJCOp.woId, activeJCOp.jcId, jcOpOperatorName, jcOpOperatorEmployeeId, jcOpOperatorRemarks);
                  } else if (activeJCOp.action === 'pause') {
                    handlePauseJobCard(activeJCOp.woId, activeJCOp.jcId, jcOpOperatorName, jcOpOperatorEmployeeId, jcOpOperatorRemarks);
                  } else if (activeJCOp.action === 'resume') {
                    handleResumeJobCard(activeJCOp.woId, activeJCOp.jcId, jcOpOperatorName, jcOpOperatorEmployeeId, jcOpOperatorRemarks);
                  } else if (activeJCOp.action === 'finish') {
                    handleFinishJobCard(activeJCOp.woId, activeJCOp.jcId, jcOpOperatorName, jcOpOperatorEmployeeId, jcOpOperatorRemarks);
                  } else if (activeJCOp.action === 'remark') {
                    handleAddRemarkJobCard(activeJCOp.woId, activeJCOp.jcId, jcOpOperatorName, jcOpOperatorRemarks);
                  }
                }}
              >
                {woActionLoading ? 'Submitting...' : 'Sign & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View & Add Remarks History Timeline */}
      {activeTimelineJC && (() => {
        const liveWO = workOrders.find(w => w.id === activeTimelineJC.woId);
        const liveJC = liveWO?.jobCards?.find(j => j.id === activeTimelineJC.jcId);
        const remarksList = liveJC?.remarksList || [];

        return (
          <div className="modal-backdrop" onClick={() => { setActiveTimelineJC(null); setReplyingToIdx(null); setReplyText(''); }}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ width: '560px' }}>
              <div className="modal-header">
                <span>Remarks History & Observation Notes: {liveJC?.operation || activeTimelineJC.operation}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setActiveTimelineJC(null); setReplyingToIdx(null); setReplyText(''); }}>✕</button>
              </div>
              <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Timeline display */}
                <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                  {remarksList.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                      No remarks recorded yet. Add the first remark below.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border-color)', margin: '8px 0 8px 10px' }}>
                      {remarksList.map((log, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <div style={{
                            position: 'absolute',
                            left: '-26px',
                            top: '2px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent)',
                            border: '2px solid white'
                          }}></div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                            ⏱️ {log.timestamp} • 👤 {log.operator}
                            <button
                              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '10px', marginLeft: '12px', textDecoration: 'underline', padding: '0' }}
                              onClick={() => {
                                setReplyingToIdx(replyingToIdx === index ? null : index);
                                setReplyText('');
                              }}
                            >
                              {replyingToIdx === index ? 'Cancel Reply' : 'Reply'}
                            </button>
                          </div>
                          <div style={{
                            fontSize: '13px',
                            backgroundColor: '#f3f4f6',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            color: 'var(--text-heading)',
                            fontWeight: '500'
                          }}>
                            {log.text}
                            {(log.actualStartTime || log.actualEndTime) && (
                              <div style={{ fontSize: '10px', color: 'var(--accent)', marginTop: '4px', fontStyle: 'italic', fontWeight: '600' }}>
                                {log.actualStartTime && `Start: ${log.actualStartTime.replace('T', ' ')}`}
                                {log.actualStartTime && log.actualEndTime && ' | '}
                                {log.actualEndTime && `End: ${log.actualEndTime.replace('T', ' ')}`}
                              </div>
                            )}
                          </div>

                          {/* Nested Replies display */}
                          {log.replies && log.replies.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px', marginTop: '8px', borderLeft: '2px dashed var(--border-color)', paddingLeft: '12px' }}>
                              {log.replies.map((reply, rIdx) => (
                                <div key={rIdx} style={{ position: 'relative' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                                    ⏱️ {reply.timestamp} • 👤 {reply.operator}
                                  </div>
                                  <div style={{
                                    fontSize: '12px',
                                    backgroundColor: '#eef2f6',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    color: 'var(--text-heading)'
                                  }}>
                                    {reply.text}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Inline Reply input field */}
                          {replyingToIdx === index && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '16px', marginTop: '8px', padding: '8px', backgroundColor: 'rgba(251, 191, 36, 0.05)', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                              <span style={{ fontSize: '11px', fontWeight: '600' }}>Replying as operator: {timelineOperatorName || currentUser}</span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '6px', fontSize: '12px', flex: 1 }}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Type your reply comment..."
                                 animate="off"
                                />
                                <button
                                  type="button"
                                  className="primary-btn"
                                  style={{ padding: '6px 12px', fontSize: '11px' }}
                                  onClick={() => {
                                    if (!replyText.trim()) return;
                                    handleReplyToRemarkJobCard(activeTimelineJC.woId, activeTimelineJC.jcId, index, timelineOperatorName || currentUser, replyText);
                                    setReplyText('');
                                    setReplyingToIdx(null);
                                  }}
                                >
                                  Submit
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Remark form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', margin: '0' }}>Add New Remark</h4>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Operator</label>
                      <input
                        type="text"
                        className="form-input"
                        value={timelineOperatorName}
                        onChange={(e) => handleSearchEmployees(e.target.value, 'remarksModal')}
                        onFocus={() => {
                          setActiveSearchField('remarksModal');
                          if (timelineOperatorName.trim().length >= 3 || employeeList.length > 0) {
                            setShowEmployeeDropdown(true);
                          }
                        }}
                        placeholder="Operator name"
                        style={{ padding: '8px', fontSize: '12px' }}
                        autoComplete="off"
                      />
                      {showEmployeeDropdown && activeSearchField === 'remarksModal' && employeeList.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          maxHeight: '150px',
                          overflowY: 'auto',
                          zIndex: 1000,
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          {employeeList.map((emp) => (
                            <div
                              key={emp.name}
                              style={{
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                borderBottom: '1px solid #f3f4f6',
                                color: '#374151'
                              }}
                              onMouseDown={() => {
                                setTimelineOperatorName(emp.employee_name || emp.name);
                                setShowEmployeeDropdown(false);
                              }}
                              className="employee-dropdown-item"
                            >
                              <strong>{emp.employee_name}</strong> <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>({emp.name})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px', backgroundColor: 'rgba(14, 165, 233, 0.08)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Remarks do not update Job Card time logs. Start time is controlled by Start/Resume, and end time is controlled by Pause/Finish.
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Observation Notes</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: '60px', fontFamily: 'inherit', padding: '8px', fontSize: '12px' }}
                      value={timelineOperatorRemarks}
                      onChange={(e) => setTimelineOperatorRemarks(e.target.value)}
                      placeholder="Type remark message..."
                    />
                  </div>
                </div>

              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="secondary-btn" onClick={() => { setActiveTimelineJC(null); setReplyingToIdx(null); setReplyText(''); }}>Close</button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    if (!timelineOperatorRemarks.trim()) return;
                    handleAddRemarkJobCard(activeTimelineJC.woId, activeTimelineJC.jcId, timelineOperatorName, timelineOperatorRemarks);
                    setTimelineOperatorRemarks('');
                  }}
                >
                  Submit Remark
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Adjust Inventory Stock */}
      {showAdjustStockModal && (
        <div className="modal-backdrop" onClick={() => setShowAdjustStockModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Adjust Stock Quantity</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowAdjustStockModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdjustStockSubmit}>
              <div className="modal-content">
                <div className="form-group">
                  <label>Select Catalog Item</label>
                  <select
                    className="form-input"
                    value={adjustItemCode}
                    onChange={(e) => setAdjustItemCode(e.target.value)}
                  >
                    {Object.keys(inventory).map(code => (
                      <option key={code} value={code}>{code} - {inventory[code].name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity to Add/Subtract</label>
                  <input
                    type="number"
                    className="form-input"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(parseInt(e.target.value, 10))}
                    placeholder="Enter positive to add, negative to deduct..."
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Current inventory stock level: **{Number(inventory[adjustItemCode]?.qty || 0).toFixed(2)} {inventory[adjustItemCode]?.unit}**
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowAdjustStockModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Submit Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Weight Check (Form 88) */}
      {activeMaintForm === 'weight-check' && (() => {
        return (
          <MaintWeightCheckModal
            onClose={() => setActiveMaintForm(null)}
            onSubmit={(data) => handleSaveMaintForm('weight-check', data)}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
          />
        );
      })()}

      {/* Modal: Log Machine Breakdown */}
      {activeMaintForm === 'breakdown' && (() => {
        return (
          <MaintBreakdownModal
            onClose={() => setActiveMaintForm(null)}
            onSubmit={(data) => handleSaveMaintForm('breakdown', data)}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
          />
        );
      })()}

      {/* Modal: Fill Daily Maintenance Checklist */}
      {activeMaintTemplate !== null && (() => {
        const template = maintTemplates[activeMaintTemplate];
        return (
          <div className="modal-backdrop">
            <div className="modal-panel" style={{ width: '920px', maxWidth: '95%' }}>
              <div className="modal-header">
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Water Fiji PTE Limited</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Daily Preventive Maintenance Schedule</span>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={() => setActiveMaintTemplate(null)}>✕</button>
              </div>
              <form onSubmit={handleSaveMaintenance}>
                <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

                  {/* Top metadata input */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Equipment</label>
                      <input type="text" className="form-input" value={template.equipment} disabled style={{ backgroundColor: '#f3f4f6' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Area</label>
                      <input type="text" className="form-input" value={template.area} disabled style={{ backgroundColor: '#f3f4f6' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>WEEK NO</label>
                      <input
                        type="text"
                        className="form-input"
                        value={maintWeekNo}
                        disabled
                        style={{ backgroundColor: '#f3f4f6' }}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>From</label>
                        <input
                          type="date"
                          className="form-input"
                          value={maintFromDate}
                          disabled
                          style={{ backgroundColor: '#f3f4f6' }}
                          required
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>To</label>
                        <input
                          type="date"
                          className="form-input"
                          value={maintToDate}
                          disabled
                          style={{ backgroundColor: '#f3f4f6' }}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checklist Grid Table */}
                  <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ width: '40px', padding: '6px' }}>Sr.No</th>
                          <th style={{ minWidth: '220px', padding: '6px', textAlign: 'left' }}>Description</th>
                          <th style={{ width: '60px', padding: '6px' }}>Std Time</th>
                          <th style={{ width: '80px', padding: '6px', textAlign: 'center' }}>Completed</th>
                          <th style={{ minWidth: '150px', padding: '6px' }}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {template.tasks.map((task, tIdx) => (
                          <tr key={task.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ textAlign: 'center', padding: '6px', fontWeight: '600' }}>{task.id}</td>
                            <td style={{ padding: '6px', fontWeight: '500' }}>{task.desc}</td>
                            <td style={{ textAlign: 'center', padding: '4px' }}>
                              <select
                                className="form-input"
                                style={{ padding: '2px 4px', fontSize: '11px', height: '26px', width: '70px', textAlign: 'center' }}
                                value={maintStdTimes[tIdx] !== undefined ? maintStdTimes[tIdx] : (parseInt(task.std) || 0)}
                                onChange={(e) => {
                                  setMaintStdTimes(prev => ({
                                    ...prev,
                                    [tIdx]: parseInt(e.target.value) || 0
                                  }));
                                }}
                              >
                                <option value={0}>-</option>
                                <option value={1}>1 min</option>
                                <option value={2}>2 min</option>
                                <option value={3}>3 min</option>
                                <option value={4}>4 min</option>
                                <option value={5}>5 min</option>
                                <option value={10}>10 min</option>
                                <option value={15}>15 min</option>
                                <option value={20}>20 min</option>
                                <option value={30}>30 min</option>
                                <option value={45}>45 min</option>
                                <option value={60}>60 min</option>
                                <option value={90}>90 min</option>
                                <option value={120}>120 min</option>
                              </select>
                            </td>
                            <td style={{ textAlign: 'center', padding: '4px' }}>
                              <input
                                type="checkbox"
                                checked={!!maintCheckgrid[tIdx]}
                                onChange={(e) => {
                                  setMaintCheckgrid(prev => ({
                                    ...prev,
                                    [tIdx]: e.target.checked
                                  }));
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Remarks/Observations"
                                style={{ padding: '4px 8px', fontSize: '11px', height: '28px' }}
                                value={maintRemarks[tIdx] || ''}
                                onChange={(e) => {
                                  setMaintRemarks(prev => ({
                                    ...prev,
                                    [tIdx]: e.target.value
                                  }));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600' }}>Overall Comments / Remarks</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: '50px', padding: '6px' }}
                      value={maintOverallComments}
                      onChange={e => setMaintOverallComments(e.target.value)}
                      placeholder="Enter overall comments or observations about this maintenance run..."
                    />
                  </div>

                  {/* Signatures & Employee Autocomplete Search */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Sign. Of the Operator</label>
                      <input
                        type="text"
                        className="form-input"
                        value={maintOperator}
                        onChange={(e) => handleSearchEmployees(e.target.value, 'maintOperator')}
                        onFocus={() => {
                          setActiveSearchField('maintOperator');
                          if (maintOperator.trim().length >= 3 || employeeList.length > 0) {
                            setShowEmployeeDropdown(true);
                          }
                        }}
                        placeholder="Search employee..."
                        required
                        autoComplete="off"
                      />
                      {showEmployeeDropdown && activeSearchField === 'maintOperator' && employeeList.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          maxHeight: '130px',
                          overflowY: 'auto',
                          zIndex: 1001,
                          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          {employeeList.map((emp) => (
                            <div
                              key={emp.name}
                              style={{
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                borderBottom: '1px solid #f3f4f6',
                                color: '#374151'
                              }}
                              onMouseDown={() => {
                                setMaintOperator(emp.employee_name);
                                setShowEmployeeDropdown(false);
                              }}
                              className="employee-dropdown-item"
                            >
                              <strong>{emp.employee_name}</strong> <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>({emp.name})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ position: 'relative' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Sign. Of the Supervisor</label>
                      <input
                        type="text"
                        className="form-input"
                        value={maintSupervisor}
                        onChange={(e) => handleSearchEmployees(e.target.value, 'maintSupervisor')}
                        onFocus={() => {
                          setActiveSearchField('maintSupervisor');
                          if (maintSupervisor.trim().length >= 3 || employeeList.length > 0) {
                            setShowEmployeeDropdown(true);
                          }
                        }}
                        placeholder="Search employee..."
                        required
                        autoComplete="off"
                      />
                      {showEmployeeDropdown && activeSearchField === 'maintSupervisor' && employeeList.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          maxHeight: '130px',
                          overflowY: 'auto',
                          zIndex: 1001,
                          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          {employeeList.map((emp) => (
                            <div
                              key={emp.name}
                              style={{
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                borderBottom: '1px solid #f3f4f6',
                                color: '#374151'
                              }}
                              onMouseDown={() => {
                                setMaintSupervisor(emp.employee_name);
                                setShowEmployeeDropdown(false);
                              }}
                              className="employee-dropdown-item"
                            >
                              <strong>{emp.employee_name}</strong> <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>({emp.name})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Computed Metrics</label>
                      <div className="form-input" style={{ backgroundColor: '#f3f4f6', height: '36px', display: 'flex', alignItems: 'center', padding: '0 12px', fontWeight: '700', color: 'var(--accent)' }}>
                        Total Tasks Completed: {Object.values(maintCheckgrid).filter(Boolean).length}
                      </div>
                    </div>
                  </div>

                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="secondary-btn" onClick={() => setActiveMaintTemplate(null)}>Cancel</button>
                  <button type="submit" className="primary-btn" disabled={maintSaving}>
                    {maintSaving ? (
                      <>
                        <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '6px' }}></span>
                        Saving...
                      </>
                    ) : 'Save Checklist Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal: View Saved Maintenance Checklist Report */}
      {viewingRecord && (() => {
        if (viewingRecord.templateId === 'weight-check') {
          return (
            <div className="modal-backdrop">
              <div className="modal-panel print-report-container" style={{ width: '850px', maxWidth: '95%' }}>
                <div className="modal-header">
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Island Chill / Crush / US Cola</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form 88: Weight Check Report ({viewingRecord.id})</span>
                  </div>
                  <button className="no-print" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={() => setViewingRecord(null)}>✕</button>
                </div>
                <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderLeft: '4px solid var(--accent)', color: 'var(--text-heading)', fontSize: '12px', marginBottom: '12px' }}>
                    <strong>Note:</strong> Weight Check frequency is twice per Day.
                  </div>
                  <table className="custom-table" style={{ width: '100%', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th>Slot</th>
                        <th>Date</th>
                        <th>Checked By</th>
                        <th>Verified By</th>
                        <th>Product Description</th>
                        <th>Weight 1</th>
                        <th>Weight 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingRecord.rows?.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td><strong>Slot {idx + 1}</strong></td>
                          <td>{row.date}</td>
                          <td>{row.checkedBy}</td>
                          <td>{row.verifiedBy}</td>
                          <td>{row.productDesc}</td>
                          <td>{row.weight1}</td>
                          <td>{row.weight2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {viewingRecord.overallComments && (
                    <div style={{ marginTop: '16px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
                      <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OVERALL COMMENTS / REMARKS</strong>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-heading)' }}>{viewingRecord.overallComments}</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="primary-btn" onClick={() => setEmailModal({ reportId: viewingRecord.id, reportType: 'Weight Check Report' })} style={{ backgroundColor: '#a27b5c', borderColor: '#a27b5c' }}>📧 Send Email</button>
                  <button type="button" className="primary-btn" onClick={() => window.print()} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>🖨️ Print Report</button>
                  <button type="button" className="secondary-btn" onClick={() => setViewingRecord(null)}>Close Report</button>
                </div>
              </div>
            </div>
          );
        }

        if (viewingRecord.templateId === 'breakdown') {
          return (
            <div className="modal-backdrop">
              <div className="modal-panel print-report-container" style={{ width: '900px', maxWidth: '95%' }}>
                <div className="modal-header">
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Island Chill - Carpenters Waters (Fiji) PTE Limited</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Machine Breakdown Report ({viewingRecord.id})</span>
                  </div>
                  <button className="no-print" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={() => setViewingRecord(null)}>✕</button>
                </div>
                <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>

                  <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '8px', fontWeight: '700' }}>Section 1: Request Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      <div><strong>Requestor Name:</strong> {viewingRecord.requestorName}</div>
                      <div><strong>Machine Name & No:</strong> {viewingRecord.machineName}</div>
                      <div><strong>Breakdown Date & Time:</strong> {viewingRecord.breakdownDate} {viewingRecord.breakdownTime}</div>
                      <div><strong>Checked By (SV Name):</strong> {viewingRecord.checkedBySV}</div>
                      <div><strong>Approved By (FM Name):</strong> {viewingRecord.approvedByFM}</div>
                    </div>
                    <div style={{ marginTop: '8px' }}><strong>Breakdown Description:</strong> {viewingRecord.breakdownDesc}</div>
                  </div>

                  <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '8px', fontWeight: '700' }}>Section 2: Maintenance Work Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      <div><strong>Received By:</strong> {viewingRecord.receivedBy}</div>
                      <div><strong>Work In-charge Assessment:</strong> {viewingRecord.workAssessment}</div>
                      <div><strong>Date & Time Repaired:</strong> {viewingRecord.dateRepaired} {viewingRecord.timeRepaired}</div>
                      <div><strong>Repaired Done By:</strong> {viewingRecord.repairedDoneBy}</div>
                      <div><strong>Approved By (MM Name):</strong> {viewingRecord.approvedByMM}</div>
                    </div>
                    <div style={{ marginTop: '8px' }}><strong>Description of Work Carried Out:</strong> {viewingRecord.workCarriedOut}</div>
                    <div style={{ marginTop: '8px' }}><strong>Parts Used:</strong> {viewingRecord.partsUsed}</div>
                  </div>

                  {viewingRecord.overallComments && (
                    <div style={{ marginTop: '16px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
                      <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OVERALL COMMENTS / REMARKS</strong>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-heading)' }}>{viewingRecord.overallComments}</div>
                    </div>
                  )}

                </div>
                <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="primary-btn" onClick={() => setEmailModal({ reportId: viewingRecord.id, reportType: 'Machine Breakdown Report' })} style={{ backgroundColor: '#a27b5c', borderColor: '#a27b5c' }}>📧 Send Email</button>
                  <button type="button" className="primary-btn" onClick={() => window.print()} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>🖨️ Print Report</button>
                  <button type="button" className="secondary-btn" onClick={() => setViewingRecord(null)}>Close Report</button>
                </div>
              </div>
            </div>
          );
        }

        const template = maintTemplates.find(t => t.id === viewingRecord.templateId) || maintTemplates[0];
        return (
          <div className="modal-backdrop">
            <div className="modal-panel print-report-container" style={{ width: '920px', maxWidth: '95%' }}>
              <div className="modal-header">
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Carpenters Water Fiji PTE Limited</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Archived Preventive Maintenance Schedule Details ({viewingRecord.id})</span>
                </div>
                <button className="no-print" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={() => setViewingRecord(null)}>✕</button>
              </div>
              <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

                {/* Top metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Equipment</label>
                    <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', fontSize: '12px', fontWeight: '600' }}>
                      {viewingRecord.equipment}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Area</label>
                    <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', fontSize: '12px', fontWeight: '600' }}>
                      {viewingRecord.area}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>WEEK NO</label>
                    <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', fontSize: '12px', fontWeight: '700', color: 'var(--accent)' }}>
                      Wk {viewingRecord.weekNo}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>From</label>
                      <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', fontSize: '12px' }}>
                        {viewingRecord.fromDate}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>To</label>
                      <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', fontSize: '12px' }}>
                        {viewingRecord.toDate}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checklist Grid Table */}
                <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ width: '40px', padding: '6px' }}>Sr.No</th>
                        <th style={{ minWidth: '220px', padding: '6px', textAlign: 'left' }}>Description</th>
                        <th style={{ width: '60px', padding: '6px' }}>Std Time</th>
                        <th style={{ width: '80px', padding: '6px', textAlign: 'center' }}>Completed</th>
                        <th style={{ minWidth: '150px', padding: '6px' }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {template.tasks.map((task, tIdx) => {
                        const hasCheckgrid = viewingRecord.checkgrid !== undefined && viewingRecord.checkgrid !== null;
                        const isChecked = hasCheckgrid && (
                          viewingRecord.checkgrid[tIdx] !== undefined
                            ? !!viewingRecord.checkgrid[tIdx]
                            : (template.days && template.days.some(day => !!viewingRecord.checkgrid[`${tIdx}-${day}`]))
                        );

                        return (
                          <tr key={task.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ textAlign: 'center', padding: '6px', fontWeight: '600' }}>{task.id}</td>
                            <td style={{ padding: '6px', fontWeight: '500' }}>{task.desc}</td>
                            <td style={{ textAlign: 'center', padding: '6px', color: 'var(--text-muted)' }}>{task.std}</td>
                            <td style={{ textAlign: 'center', padding: '4px', fontSize: '16px' }}>
                              {isChecked ? '✅' : '❌'}
                            </td>
                            <td style={{ padding: '6px', fontStyle: 'italic', color: 'var(--text-heading)' }}>
                              {(viewingRecord.remarks && viewingRecord.remarks[tIdx]) || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {viewingRecord.overallComments && (
                  <div style={{ marginTop: '16px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', marginBottom: '16px' }}>
                    <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OVERALL COMMENTS / REMARKS</strong>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-heading)' }}>{viewingRecord.overallComments}</div>
                  </div>
                )}

                {/* Signatures details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Sign. Of the Operator</label>
                    <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', fontSize: '12px', fontWeight: '600' }}>
                      👤 {viewingRecord.operator || 'Not Signed'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Sign. Of the Supervisor</label>
                    <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#f9fafb', fontSize: '12px', fontWeight: '600' }}>
                      👤 {viewingRecord.supervisor || 'Not Signed'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Audit Summary</label>
                    <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontSize: '12px', fontWeight: '700' }}>
                      Checklist Completion Rate: {viewingRecord.maxPossible ? Math.round(((viewingRecord.totalChecked || 0) / viewingRecord.maxPossible) * 100) : 0}% ({viewingRecord.totalChecked || 0} / {viewingRecord.maxPossible || 0})
                    </div>
                  </div>
                </div>

              </div>
              <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="primary-btn" onClick={() => setEmailModal({ reportId: viewingRecord.id, reportType: viewingRecord.equipment + ' PM Report' })} style={{ backgroundColor: '#a27b5c', borderColor: '#a27b5c' }}>📧 Send Email</button>
                <button type="button" className="primary-btn" onClick={() => window.print()} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>🖨️ Print Report</button>
                <button type="button" className="secondary-btn" onClick={() => setViewingRecord(null)}>Close Report</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Cleaning & Sanitation Form */}
      {activeCleaningForm && (
        <CleaningFormModal
          templateId={activeCleaningForm}
          onClose={() => setActiveCleaningForm(null)}
          onSubmit={(data) => handleSaveCleaning(CLEANING_TEMPLATES.find(t => t.id === activeCleaningForm).doctype, data)}
          employeeList={employeeList}
          handleSearchEmployees={handleSearchEmployees}
          showEmployeeDropdown={showEmployeeDropdown}
          setShowEmployeeDropdown={setShowEmployeeDropdown}
          activeSearchField={activeSearchField}
          setActiveSearchField={setActiveSearchField}
        />
      )}

      {/* Modal: View Cleaning & Sanitation Report Details */}
      {viewingCleaningRecord && (
        <CleaningRecordDetailModal
          record={viewingCleaningRecord}
          onClose={() => setViewingCleaningRecord(null)}
        />
      )}

      {/* Modal: Log Accident (OHSF 1 & 2) */}
      {activeSafetyForm === 'ohsf' && (() => {
        return (
          <SafetyIncidentFormModal
            onClose={() => setActiveSafetyForm(null)}
            onSubmit={(data) => handleSaveSafety('Incident Report', data)}
            saving={safetySaving}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
            setActiveSearchField={setActiveSearchField}
          />
        );
      })()}

      {/* Modal: First Aid Log (Form 17) */}
      {activeSafetyForm === 'first-aid' && (() => {
        return (
          <SafetyFirstAidFormModal
            onClose={() => setActiveSafetyForm(null)}
            onSubmit={(data) => handleSaveSafety('First Aid Log', data)}
            saving={safetySaving}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
            setActiveSearchField={setActiveSearchField}
          />
        );
      })()}

      {/* Modal: Environmental Swab Test (Form 14) */}
      {activeSafetyForm === 'swab' && (() => {
        return (
          <SafetySwabFormModal
            onClose={() => setActiveSafetyForm(null)}
            onSubmit={(data) => handleSaveSafety('Swab Test', data)}
            saving={safetySaving}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
          />
        );
      })()}

      {/* Modal: OHS Induction Form (Form 37) */}
      {activeSafetyForm === 'induction' && (() => {
        return (
          <SafetyForm37Modal
            onClose={() => setActiveSafetyForm(null)}
            onSubmit={(data) => handleSaveSafety('Induction Log', data)}
            saving={safetySaving}
            employeeList={employeeList}
            handleSearchEmployees={handleSearchEmployees}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            activeSearchField={activeSearchField}
          />
        );
      })()}

      {/* Modal: View Safety Report Details */}
      {viewingSafetyRecord && (() => {
        return (
          <SafetyReportViewerModal
            record={viewingSafetyRecord}
            onClose={() => setViewingSafetyRecord(null)}
          />
        );
      })()}

      {/* Modal: Laboratory Form 1 */}
      {activeLabForm === 'form1' && (
        <LabForm1Modal
          onClose={() => setActiveLabForm(null)}
          onSubmit={(data) => handleSaveLaboratory('Form 1 (Micro raw)', data)}
          saving={labSaving}
          employeeList={employeeList}
          handleSearchEmployees={handleSearchEmployees}
          showEmployeeDropdown={showEmployeeDropdown}
          setShowEmployeeDropdown={setShowEmployeeDropdown}
          activeSearchField={activeSearchField}
        />
      )}

      {/* Modal: Laboratory Form 9 */}
      {activeLabForm === 'form9' && (
        <LabForm9Modal
          onClose={() => setActiveLabForm(null)}
          onSubmit={(data) => handleSaveLaboratory('Form 9 (Chemical)', data)}
          saving={labSaving}
          employeeList={employeeList}
          handleSearchEmployees={handleSearchEmployees}
          showEmployeeDropdown={showEmployeeDropdown}
          setShowEmployeeDropdown={setShowEmployeeDropdown}
          activeSearchField={activeSearchField}
        />
      )}

      {/* Modal: Laboratory Form 11 */}
      {activeLabForm === 'form11' && (
        <LabForm11Modal
          onClose={() => setActiveLabForm(null)}
          onSubmit={(data) => handleSaveLaboratory('Form 11 (Micro water)', data)}
          saving={labSaving}
          employeeList={employeeList}
          handleSearchEmployees={handleSearchEmployees}
          showEmployeeDropdown={showEmployeeDropdown}
          setShowEmployeeDropdown={setShowEmployeeDropdown}
          activeSearchField={activeSearchField}
        />
      )}

      {/* Modal: Laboratory Form 21 */}
      {activeLabForm === 'form21' && (
        <LabForm21Modal
          onClose={() => setActiveLabForm(null)}
          onSubmit={(data) => handleSaveLaboratory('Form 21 (Taste/Visual)', data)}
          saving={labSaving}
          employeeList={employeeList}
          handleSearchEmployees={handleSearchEmployees}
          showEmployeeDropdown={showEmployeeDropdown}
          setShowEmployeeDropdown={setShowEmployeeDropdown}
          activeSearchField={activeSearchField}
        />
      )}

      {/* Modal: Laboratory Form 36 */}
      {activeLabForm === 'form36' && (
        <LabForm36Modal
          onClose={() => setActiveLabForm(null)}
          onSubmit={(data) => handleSaveLaboratory('Form 36 (Bourbon/Cola)', data)}
          employeeList={employeeList}
          handleSearchEmployees={handleSearchEmployees}
          showEmployeeDropdown={showEmployeeDropdown}
          setShowEmployeeDropdown={setShowEmployeeDropdown}
          activeSearchField={activeSearchField}
        />
      )}

      {/* Modal: Laboratory Form 100 */}
      {activeLabForm === 'form100' && (
        <LabForm100Modal
          onClose={() => setActiveLabForm(null)}
          onSubmit={(data) => handleSaveLaboratory('Form 100 (Production Log)', data)}
          employeeList={employeeList}
          handleSearchEmployees={handleSearchEmployees}
          showEmployeeDropdown={showEmployeeDropdown}
          setShowEmployeeDropdown={setShowEmployeeDropdown}
          activeSearchField={activeSearchField}
        />
      )}
      {/* Modal: Laboratory Form 103 */}
      {activeLabForm === 'form103' && (
        <LabForm103Modal
          onClose={() => setActiveLabForm(null)}
          onSubmit={(data) => handleSaveLaboratory('Form 103 (Silver Log)', data)}
          saving={labSaving}
          employeeList={employeeList}
          handleSearchEmployees={handleSearchEmployees}
          showEmployeeDropdown={showEmployeeDropdown}
          setShowEmployeeDropdown={setShowEmployeeDropdown}
          activeSearchField={activeSearchField}
        />
      )}

      {/* Modal: View Laboratory Report Details */}
      {viewingLabRecord && (
        <LabReportViewerModal
          record={viewingLabRecord}
          onClose={() => setViewingLabRecord(null)}
        />
      )}

      {/* Modal: Finish Work Order & Manufacture Stock Entry */}
      {finishWoModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-panel" style={{ maxWidth: '650px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Finish Work Order & Manufacture</h3>
              <button className="close-btn" onClick={() => setFinishWoModal(null)}>✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleConfirmFinishWorkOrder(finishWoModal);
            }}>
              <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: '600' }}>Work Order ID</label>
                    <input type="text" className="form-input" value={finishWoModal.woId} disabled style={{ opacity: 0.7 }} />
                  </div>
                  <div>
                    <label className="input-label" style={{ fontWeight: '600' }}>Product</label>
                    <input type="text" className="form-input" value={finishWoModal.product} disabled style={{ opacity: 0.7 }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: '600' }}>Finished Goods Qty *</label>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-input"
                      value={finishWoModal.qty}
                      onChange={(e) => {
                        const newQty = e.target.value;
                        const eq = Number(finishWoModal.extraQty || 0);
                        const uomObj = (finishWoModal.uomsList || []).find(u => u.uom === finishWoModal.extraUom);
                        const factor = Number(uomObj?.conversion_factor || 1.0);
                        const extraBase = eq * factor;
                        const target = Number(finishWoModal.targetQty || 0);
                        const calculatedLoss = Math.max(0, Number((target - (Number(newQty || 0) + extraBase)).toFixed(6)));
                        setFinishWoModal(prev => ({ ...prev, qty: newQty, processLossQty: calculatedLoss }));
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label" style={{ fontWeight: '600' }}>Process Loss Qty (Waste)</label>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-input"
                      value={finishWoModal.processLossQty}
                      disabled
                      style={{ opacity: 0.75, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Auto-calculated</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: '600' }}>Extra Qty</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 10"
                      className="form-input"
                      value={finishWoModal.extraQty}
                      onChange={(e) => {
                        const newExtra = e.target.value;
                        const eq = Number(newExtra || 0);
                        const uomObj = (finishWoModal.uomsList || []).find(u => u.uom === finishWoModal.extraUom);
                        const factor = Number(uomObj?.conversion_factor || 1.0);
                        const extraBase = eq * factor;
                        const target = Number(finishWoModal.targetQty || 0);
                        const calculatedLoss = Math.max(0, Number((target - (Number(finishWoModal.qty || 0) + extraBase)).toFixed(6)));
                        setFinishWoModal(prev => ({ ...prev, extraQty: newExtra, processLossQty: calculatedLoss }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="input-label" style={{ fontWeight: '600' }}>Extra UOM</label>
                    <select
                      className="form-input"
                      value={finishWoModal.extraUom}
                      disabled={finishWoModal.disableUomSelect}
                      onChange={(e) => {
                        const newUom = e.target.value;
                        const uomObj = (finishWoModal.uomsList || []).find(u => u.uom === newUom);
                        const factor = Number(uomObj?.conversion_factor || 1.0);
                        const eq = Number(finishWoModal.extraQty || 0);
                        const extraBase = eq * factor;
                        const target = Number(finishWoModal.targetQty || 0);
                        const calculatedLoss = Math.max(0, Number((target - (Number(finishWoModal.qty || 0) + extraBase)).toFixed(6)));
                        setFinishWoModal(prev => ({ ...prev, extraUom: newUom, processLossQty: calculatedLoss }));
                      }}
                      style={finishWoModal.disableUomSelect ? { opacity: 0.8, backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                    >
                      {finishWoModal.uomsList && finishWoModal.uomsList.length > 0 ? (
                        finishWoModal.uomsList.map(u => (
                          <option key={u.uom} value={u.uom}>
                            {u.uom} ({Number(u.conversion_factor || 0).toFixed(4)})
                          </option>
                        ))
                      ) : (
                        <option value="Nos">Nos</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label" style={{ fontWeight: '600' }}>Company *</label>
                  <select
                    className="form-input"
                    value={finishWoModal.company}
                    onChange={(e) => setFinishWoModal(prev => ({ ...prev, company: e.target.value }))}
                    required
                  >
                    {companyList.map((comp) => (
                      <option key={comp.name} value={comp.name}>
                        {comp.company_name || comp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: '600' }}>Posting Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={finishWoModal.postingDate}
                      onChange={(e) => setFinishWoModal(prev => ({ ...prev, postingDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label" style={{ fontWeight: '600' }}>Posting Time *</label>
                    <input
                      type="time"
                      step="1"
                      className="form-input"
                      value={finishWoModal.postingTime}
                      onChange={(e) => setFinishWoModal(prev => ({ ...prev, postingTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>


              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setFinishWoModal(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={woActionLoading}>
                  {woActionLoading ? 'Submitting...' : 'Finish & Manufacture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Entry Dialog Modal */}
      {/* Stock Entry Dialog Modal */}
      {stockEntryModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => { setActiveSeSourceRow(null); setActiveSeTargetRow(null); }}>
          <div className="modal-panel" style={{ maxWidth: '850px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{stockEntryModal.stockEntryName ? `Edit Stock Entry Draft: ${stockEntryModal.stockEntryName}` : 'New Stock Entry (Material Transfer for Manufacture)'}</h3>
              <button className="close-btn" onClick={() => setStockEntryModal(null)}>✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleConfirmStockEntry(stockEntryModal);
            }}>
              <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="input-label">Series</label>
                    <input type="text" className="text-input" value="MAT-STE-YYYY.-" disabled style={{ opacity: 0.7 }} />
                  </div>
                  <div>
                    <label className="input-label">Stock Entry Type</label>
                    <input type="text" className="text-input" value="Material Transfer for Manufacture" disabled style={{ opacity: 0.7 }} />
                  </div>
                  <div>
                    <label className="input-label">Work Order</label>
                    <input type="text" className="text-input" value={stockEntryModal.woId} disabled style={{ opacity: 0.7 }} />
                  </div>
                  <div>
                    <label className="input-label">Company *</label>
                    <input
                      type="text"
                      className="text-input"
                      value={stockEntryModal.company}
                      onChange={(e) => setStockEntryModal(prev => ({ ...prev, company: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Posting Date *</label>
                    <input
                      type="date"
                      className="text-input"
                      value={stockEntryModal.postingDate}
                      onChange={(e) => setStockEntryModal(prev => ({ ...prev, postingDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Posting Time *</label>
                    <input
                      type="time"
                      className="text-input"
                      value={stockEntryModal.postingTime}
                      onChange={(e) => setStockEntryModal(prev => ({ ...prev, postingTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '12px', marginBottom: '4px', color: 'var(--text-heading)' }}>Items List</h4>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflowX: 'auto' }}>
                  <table className="custom-table" style={{ margin: 0, width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th>Source Warehouse *</th>
                        <th>Target Warehouse *</th>
                        <th>Item Code</th>
                        <th style={{ width: '120px' }}>Transfer Qty *</th>
                        <th>UOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockEntryModal.items.map((item, idx) => (
                        <tr key={item.code} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ position: 'relative', minWidth: '180px' }}>
                            <input
                              type="text"
                              className="text-input"
                              style={{ padding: '4px 8px', fontSize: '13px' }}
                              value={seSourceSearch[idx] !== undefined ? seSourceSearch[idx] : item.sourceWarehouse}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSeSourceSearch(prev => ({ ...prev, [idx]: val }));
                                const newItems = [...stockEntryModal.items];
                                newItems[idx].sourceWarehouse = val;
                                setStockEntryModal(prev => ({ ...prev, items: newItems }));
                                handleSearchSeSource(idx, val);
                              }}
                              onFocus={() => setActiveSeSourceRow(idx)}
                              placeholder="Search Source..."
                              required
                            />
                            {activeSeSourceRow === idx && seSourceSuggestions[idx] && seSourceSuggestions[idx].length > 0 && (
                              <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '120px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                {seSourceSuggestions[idx].map(w => (
                                  <div
                                    key={w.name}
                                    className="dropdown-item"
                                    style={{ padding: '6px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '11px', color: '#111' }}
                                    onClick={() => selectSeSource(idx, w)}
                                  >
                                    🏢 {w.warehouse_name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ position: 'relative', minWidth: '180px' }}>
                            <input
                              type="text"
                              className="text-input"
                              style={{ padding: '4px 8px', fontSize: '13px' }}
                              value={seTargetSearch[idx] !== undefined ? seTargetSearch[idx] : item.targetWarehouse}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSeTargetSearch(prev => ({ ...prev, [idx]: val }));
                                const newItems = [...stockEntryModal.items];
                                newItems[idx].targetWarehouse = val;
                                setStockEntryModal(prev => ({ ...prev, items: newItems }));
                                handleSearchSeTarget(idx, val);
                              }}
                              onFocus={() => setActiveSeTargetRow(idx)}
                              placeholder="Search Target..."
                              required
                            />
                            {activeSeTargetRow === idx && seTargetSuggestions[idx] && seTargetSuggestions[idx].length > 0 && (
                              <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '120px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                {seTargetSuggestions[idx].map(w => (
                                  <div
                                    key={w.name}
                                    className="dropdown-item"
                                    style={{ padding: '6px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '11px', color: '#111' }}
                                    onClick={() => selectSeTarget(idx, w)}
                                  >
                                    🏢 {w.warehouse_name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-heading)' }}>
                            <strong>{item.code}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.name}</div>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="text-input"
                              style={{ padding: '4px 8px', fontSize: '13px' }}
                              value={item.qty}
                              onChange={(e) => {
                                const newItems = [...stockEntryModal.items];
                                newItems[idx].qty = e.target.value;
                                setStockEntryModal(prev => ({ ...prev, items: newItems }));
                              }}
                              required
                            />
                          </td>
                          <td style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setStockEntryModal(null)}
                  disabled={seSaving}
                >
                  Cancel
                </button>

                {stockEntryModal.stockEntryName && (
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled
                  >
                    Draft: {stockEntryModal.stockEntryName}
                  </button>
                )}

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={seSaving}
                  style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}
                >
                  {seSaving ? (
                    <>
                      <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '6px' }}></span>
                      {stockEntryModal.stockEntryName ? 'Updating Draft...' : 'Saving Draft...'}
                    </>
                  ) : (stockEntryModal.stockEntryName ? 'Update Stock Entry Draft' : 'Save Stock Entry')}
                </button>

                {stockEntryModal.stockEntryName && (
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={seSaving}
                    onClick={handleSubmitStockEntry}
                    style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                  >
                    {seSaving ? (
                      <>
                        <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '6px' }}></span>
                        Submitting...
                      </>
                    ) : 'Submit Stock Entry'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Send Email */}
      {emailModal && (
        <div className="modal-backdrop" style={{ zIndex: 1150 }} onClick={() => setEmailModal(null)}>
          <div className="modal-panel" style={{ maxWidth: '500px', width: '90%', background: '#faf6f0', border: '1px solid #dcd1c4', borderRadius: '12px', boxShadow: '0 10px 25px rgba(92, 74, 60, 0.15)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid #eadecf', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#5c4a3c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📧 Dispatch Report via Email
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#8c7664' }} onClick={() => setEmailModal(null)}>✕</button>
            </div>

            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#7c6553', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recipient Email *</label>
                <input
                  type="email"
                  className="form-input"
                  style={{ borderColor: '#dcd1c4', backgroundColor: '#fff', color: '#3c3025' }}
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  required
                  placeholder="enter email address..."
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#7c6553', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ borderColor: '#dcd1c4', backgroundColor: '#fff', color: '#3c3025' }}
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#7c6553', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message Body</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '100px', borderColor: '#dcd1c4', backgroundColor: '#fff', color: '#3c3025', fontFamily: 'inherit', fontSize: '12px', padding: '8px' }}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f5efe6', padding: '10px', borderRadius: '8px', border: '1px solid #eadecf' }}>
                <span style={{ fontSize: '20px' }}>📎</span>
                <div style={{ fontSize: '12px', color: '#5c4a3c' }}>
                  <strong>Attachment:</strong> {emailModal.reportType} (Generated PDF Simulation)
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #eadecf', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="secondary-btn" style={{ backgroundColor: '#e7dfd8', color: '#5c4a3c', border: 'none' }} onClick={() => setEmailModal(null)} disabled={emailSending}>Cancel</button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ backgroundColor: '#a27b5c', borderColor: '#a27b5c', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={emailSending}
                >
                  {emailSending ? (
                    <>
                      <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                      Sending...
                    </>
                  ) : (
                    'Send Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Sales Invoice */}
      {showCreateInvoiceModal && (
        <SalesInvoiceFormModal
          onClose={() => setShowCreateInvoiceModal(false)}
          products={PRODUCTS}
          loading={salesLoading}
          onSubmit={async (data) => {
            setSalesLoading(true);
            try {
              const res = await frappe.createSalesInvoice(data);
              if (res.success) {
                showAlert(`Sales Invoice ${res.name} created and submitted successfully!`, 'success', 'Invoice Created');
                loadSalesInvoices();
              }
            } catch (err) {
              showAlert(err.message || 'Failed to create invoice', 'error', 'Error');
            } finally {
              setSalesLoading(false);
              setShowCreateInvoiceModal(false);
            }
          }}
        />
      )}

      {/* Modal: Amend Sales Invoice */}
      {showAmendInvoiceModal && selectedInvoice && (
        <SalesInvoiceFormModal
          onClose={() => setShowAmendInvoiceModal(false)}
          products={PRODUCTS}
          initialData={selectedInvoice}
          loading={salesLoading}
          onSubmit={async (data) => {
            setSalesLoading(true);
            try {
              const res = await frappe.amendSalesInvoice(selectedInvoice.name, data);
              if (res.success) {
                showAlert(`Sales Invoice ${res.name} amended successfully!`, 'success', 'Invoice Amended');
                loadSalesInvoices();
                setSelectedInvoice(null);
              }
            } catch (err) {
              showAlert(err.message || 'Failed to amend invoice', 'error', 'Error');
            } finally {
              setSalesLoading(false);
              setShowAmendInvoiceModal(false);
            }
          }}
        />
      )}

      {/* Modal: Create Delivery Note */}
      {showCreateDeliveryNoteModal && (
        <DeliveryNoteFormModal
          onClose={() => setShowCreateDeliveryNoteModal(false)}
          products={PRODUCTS}
          loading={salesLoading}
          onSubmit={async (data) => {
            setSalesLoading(true);
            try {
              const res = await frappe.createDeliveryNote(data);
              if (res.success) {
                showAlert(`Delivery Note ${res.name} created and submitted successfully!`, 'success', 'Delivery Note Created');
                loadDeliveryNotes();
              }
            } catch (err) {
              showAlert(err.message || 'Failed to create Delivery Note', 'error', 'Error');
            } finally {
              setSalesLoading(false);
              setShowCreateDeliveryNoteModal(false);
            }
          }}
        />
      )}

      {/* Modal: Amend Delivery Note */}
      {showAmendDeliveryNoteModal && selectedDeliveryNote && (
        <DeliveryNoteFormModal
          onClose={() => setShowAmendDeliveryNoteModal(false)}
          products={PRODUCTS}
          initialData={selectedDeliveryNote}
          loading={salesLoading}
          onSubmit={async (data) => {
            setSalesLoading(true);
            try {
              const res = await frappe.amendDeliveryNote(selectedDeliveryNote.name, data);
              if (res.success) {
                showAlert(`Delivery Note ${res.name} amended successfully!`, 'success', 'Delivery Note Amended');
                loadDeliveryNotes();
                setSelectedDeliveryNote(null);
              }
            } catch (err) {
              showAlert(err.message || 'Failed to amend Delivery Note', 'error', 'Error');
            } finally {
              setSalesLoading(false);
              setShowAmendDeliveryNoteModal(false);
            }
          }}
        />
      )}

      {/* Custom Alert Message Modal */}
      {alertModal && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }} onClick={() => setAlertModal(null)}>
          <div className="modal-panel" style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {alertModal.type === 'error' ? '❌' : alertModal.type === 'warning' ? '⚠️' : '✅'}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-heading)' }}>
              {alertModal.title}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              {alertModal.message}
            </p>
            <button
              className="primary-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setAlertModal(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-components for Health & Safety Tab

export default App;


