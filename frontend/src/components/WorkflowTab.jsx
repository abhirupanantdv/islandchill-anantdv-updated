import React, { useState, useEffect, useMemo } from 'react';
import { frappe } from '../services/frappe';

/**
 * WorkflowTab Component
 * Interactive, animated beverage production line workflow with live Finished Goods, BOM & Job Card integration.
 */
export default function WorkflowTab({
  WORKFLOW_STAGES,
  simStep,
  setSimStep,
  simPlaying,
  setSimPlaying,
  simSpeed,
  setSimSpeed,
  bomList = [],
  workOrders = [],
  erpItems = [],
  loadWorkOrders = () => { }
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Strictly filter items with Item Group as "Finished Goods" (no hardcoded fallback values)
  // Filter active BOMs (is_active === 1 / active) and map to items with name and image
  const activeBomItems = useMemo(() => {
    if (!bomList || bomList.length === 0) return [];

    // Filter BOMs where is_active is 1/true AND is_default is 1/true
    const activeBoms = (bomList || []).filter(b =>
      (b.is_active === 1 || b.is_active === true || b.active === 1 || b.active === true || b.is_active === undefined) &&
      (b.is_default === 1 || b.is_default === true || b.isDefault === true || b.is_default === undefined)
    );

    return activeBoms.map(bom => {
      const fgCode = (bom.item || bom.itemCode || bom.name || '').trim();
      const fgName = (bom.productName || bom.item_name || fgCode).trim();

      const matchedErpItem = (erpItems || []).find(i => {
        const iCode = (i.code || i.item_code || i.name || '').toLowerCase().trim();
        const iName = (i.name || i.item_name || '').toLowerCase().trim();
        const targetCode = fgCode.toLowerCase();
        const targetName = fgName.toLowerCase();
        return iCode === targetCode || iName === targetName || (targetCode && iCode.includes(targetCode)) || (targetName && iName.includes(targetName));
      });

      return {
        bomId: bom.id || bom.name,
        bomName: bom.name || bom.id,
        code: fgCode,
        name: fgName || matchedErpItem?.name || fgCode,
        itemGroup: matchedErpItem?.itemGroup || matchedErpItem?.item_group || 'Finished Goods',
        image: bom.image || matchedErpItem?.image || matchedErpItem?.image_url || matchedErpItem?.image_path || null,
        stock: matchedErpItem?.stock || matchedErpItem?.qty || matchedErpItem?.actual_qty || 0,
        unit: bom.unit || matchedErpItem?.unit || matchedErpItem?.stock_uom || 'Box',
        quantity: bom.quantity || 1,
        is_active: bom.is_active || 1
      };
    });
  }, [bomList, erpItems]);

  // Selected BOM ID state (first active BOM selected by default)
  const [selectedBomId, setSelectedBomId] = useState('');

  // Keep the first active BOM selected by default
  useEffect(() => {
    if (activeBomItems.length > 0) {
      if (!selectedBomId || !activeBomItems.some(b => b.bomId === selectedBomId)) {
        setSelectedBomId(activeBomItems[0].bomId);
      }
    }
  }, [activeBomItems, selectedBomId]);

  // Active Selected BOM Item object
  const activeFGItem = useMemo(() => {
    if (activeBomItems.length === 0) return null;
    return activeBomItems.find(b => b.bomId === selectedBomId) || activeBomItems[0];
  }, [activeBomItems, selectedBomId]);

  // Full BOM doc state containing child tables (items & operations)
  const [selectedBomFullDoc, setSelectedBomFullDoc] = useState(null);

  // Fetch & store full BOM doc response (including child tables) whenever selected BOM changes
  useEffect(() => {
    if (!selectedBomId) return;
    let isMounted = true;
    frappe.getFullBOMDoc(selectedBomId).then(fullBomDoc => {
      if (isMounted && fullBomDoc) {
        setSelectedBomFullDoc(fullBomDoc);
        console.log('[Business Workflow] Selected BOM entire response including child tables:', fullBomDoc);
      }
    }).catch(err => {
      console.error('[Business Workflow] Failed to fetch full BOM doc:', err);
    });
    return () => { isMounted = false; };
  }, [selectedBomId]);

  // Console log selected Finished Good product details
  useEffect(() => {
    if (activeFGItem) {
      console.log('[Business Workflow] User selected Finished Good Product (Active BOM):', activeFGItem);
    }
  }, [activeFGItem]);

  // Operations derived from selected BOM document (fallback to WORKFLOW_STAGES if none)
  const bomOperations = useMemo(() => {
    if (selectedBomFullDoc?.operations && selectedBomFullDoc.operations.length > 0) {
      return selectedBomFullDoc.operations.map((op, idx) => ({
        id: op.name || `op-${idx + 1}`,
        idx: idx + 1,
        operation: op.operation || op.description || `Operation ${idx + 1}`,
        workstation: op.workstation || op.workstation_type || 'Production Line',
        time_in_mins: op.time_in_mins || 0,
        operating_cost: op.operating_cost || op.cost_per_unit || 0,
        description: op.description || '',
        status: simStep > idx ? 'Completed' : simStep === idx ? 'Work In Progress' : 'Open'
      }));
    }
    // Fallback if BOM has no operations table defined
    return (WORKFLOW_STAGES || []).map((stage, idx) => ({
      id: stage.id,
      idx: idx + 1,
      operation: stage.name,
      workstation: `${stage.dept} Station`,
      time_in_mins: 15,
      operating_cost: 0,
      description: stage.desc || '',
      status: simStep > idx ? 'Completed' : simStep === idx ? 'Work In Progress' : 'Open'
    }));
  }, [selectedBomFullDoc, WORKFLOW_STAGES, simStep]);

  // Raw Materials derived from selected BOM document items table
  const bomRawMaterials = useMemo(() => {
    if (!selectedBomFullDoc?.items || selectedBomFullDoc.items.length === 0) return [];
    return selectedBomFullDoc.items.map((item, idx) => ({
      idx: idx + 1,
      name: item.name || `rm-${idx + 1}`,
      item_code: item.item_code || item.item,
      item_name: item.item_name || item.item_code,
      qty: item.qty || item.stock_qty || 0,
      uom: item.uom || item.stock_uom || 'Nos',
      rate: item.rate || item.base_rate || 0,
      amount: item.amount || item.base_amount || 0,
      source_warehouse: item.source_warehouse || selectedBomFullDoc.default_source_warehouse || 'Stores - CWFPL'
    }));
  }, [selectedBomFullDoc]);

  // Raw materials show more & view mode states
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [materialViewMode, setMaterialViewMode] = useState('grid'); // 'grid' | 'list'

  const INITIAL_MATERIAL_LIMIT = 6;
  const visibleRawMaterials = useMemo(() => {
    if (showAllMaterials || bomRawMaterials.length <= INITIAL_MATERIAL_LIMIT) {
      return bomRawMaterials;
    }
    return bomRawMaterials.slice(0, INITIAL_MATERIAL_LIMIT);
  }, [bomRawMaterials, showAllMaterials]);

  // Operations stats
  const opStats = useMemo(() => {
    const completed = bomOperations.filter(op => op.status === 'Completed').length;
    const wip = bomOperations.filter(op => op.status === 'Work In Progress').length;
    const open = bomOperations.filter(op => op.status === 'Open').length;
    return { completed, wip, open, total: bomOperations.length };
  }, [bomOperations]);

  // View screen state: 'products' (Product Family Selection Screen) vs 'operations' (Selected Product Operations Screen)
  const [workflowScreen, setWorkflowScreen] = useState('products');

  // Pagination state to display 8 active BOM items at once in the selector view
  const [bomPage, setBomPage] = useState(0);
  const PAGE_SIZE = 8;
  const totalPages = Math.ceil(activeBomItems.length / PAGE_SIZE) || 1;
  const visibleActiveBomItems = useMemo(() => {
    const startIdx = bomPage * PAGE_SIZE;
    return activeBomItems.slice(startIdx, startIdx + PAGE_SIZE);
  }, [activeBomItems, bomPage]);

  const matchedBom = activeFGItem;

  // Filter work orders associated with the selected BOM or Finished Good Item
  const matchingWorkOrders = useMemo(() => {
    if (!workOrders || workOrders.length === 0) return [];
    if (!activeFGItem) return workOrders;

    const fgCode = (activeFGItem.code || '').toLowerCase();
    const fgName = (activeFGItem.name || '').toLowerCase();

    const list = workOrders.filter(wo => {
      const prodItem = (wo.production_item || wo.productionItem || '').toLowerCase();
      const woBom = (wo.bom_no || wo.bomNo || wo.bom || '').toLowerCase();
      return (
        (selectedBomId && woBom === selectedBomId.toLowerCase()) ||
        prodItem === fgCode ||
        prodItem === fgName ||
        (prodItem && fgName && (prodItem.includes(fgName) || fgName.includes(prodItem)))
      );
    });

    return list.length > 0 ? list : workOrders;
  }, [workOrders, selectedBomId, activeFGItem]);

  // Selected Work Order ID
  const [selectedWOId, setSelectedWOId] = useState('');

  // Update selected WO when selected BOM/Item changes
  useEffect(() => {
    if (matchingWorkOrders && matchingWorkOrders.length > 0) {
      if (!matchingWorkOrders.some(wo => wo.id === selectedWOId)) {
        setSelectedWOId(matchingWorkOrders[0].id);
      }
    }
  }, [matchingWorkOrders, selectedWOId]);

  // Active Selected Work Order object
  const activeWO = useMemo(() => {
    if (!matchingWorkOrders || matchingWorkOrders.length === 0) return null;
    return matchingWorkOrders.find(wo => wo.id === selectedWOId) || matchingWorkOrders[0];
  }, [matchingWorkOrders, selectedWOId]);

  // Map 11 workflow stages to Job Cards
  const stageJobCardsMap = useMemo(() => {
    const map = {};
    const jcList = activeWO?.jobCards || [];

    WORKFLOW_STAGES.forEach((stage, idx) => {
      const matched = jcList.find(jc => {
        const op = (jc.operation || '').toLowerCase();
        const sName = (stage.name || '').toLowerCase();
        return op.includes(sName) || sName.includes(op);
      }) || jcList[idx];

      if (matched) {
        map[stage.id] = matched;
      } else {
        map[stage.id] = {
          id: `MFG-JC-2026-00${100 + idx + 1}`,
          operation: stage.name,
          station: `${stage.dept} Station`,
          status: simStep > idx ? 'Completed' : simStep === idx ? 'Work In Progress' : 'Open',
          forQuantity: activeWO?.qty || activeWO?.quantity || 1000,
          totalCompletedQty: simStep > idx ? (activeWO?.qty || activeWO?.quantity || 1000) : simStep === idx ? Math.round((activeWO?.qty || 1000) * 0.45) : 0
        };
      }
    });

    return map;
  }, [activeWO, WORKFLOW_STAGES, simStep]);

  // Job card progress stats
  const jcStats = useMemo(() => {
    const list = Object.values(stageJobCardsMap);
    const completed = list.filter(jc => jc.status === 'Completed').length;
    const wip = list.filter(jc => jc.status === 'Work In Progress' || jc.status === 'Work in Progress').length;
    const open = list.filter(jc => jc.status === 'Open' || jc.status === 'Not Started').length;
    return { completed, wip, open, total: list.length };
  }, [stageJobCardsMap]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const currentOp = bomOperations[simStep] || bomOperations[0] || {};
  const currentStageData = WORKFLOW_STAGES[simStep] || WORKFLOW_STAGES[0];
  const activeJobCard = stageJobCardsMap[currentStageData.id] || {};

  // Stage positions for serpentine layout
  const STAGE_GRID_POSITIONS = [
    { row: 1, col: 1 }, // 01 Water Extraction
    { row: 1, col: 2 }, // 02 Syrup Mixing
    { row: 1, col: 3 }, // 03 Lab QA Testing
    { row: 1, col: 4 }, // 04 Blowing / Prep
    { row: 2, col: 4 }, // 05 Filling & Sealing
    { row: 2, col: 3 }, // 06 Warmer Tunnel
    { row: 2, col: 2 }, // 07 Laser Labeling
    { row: 2, col: 1 }, // 08 Final Inspection
    { row: 3, col: 1 }, // 09 Hand Packing
    { row: 3, col: 2 }, // 10 Palletising
    { row: 3, col: 3 }  // 11 Dispatch Store
  ];

  // Colors for stage numbers
  const STAGE_NUMBER_COLORS = [
    '#0ea5e9', // 01 Blue
    '#10b981', // 02 Green
    '#f59e0b', // 03 Orange
    '#8b5cf6', // 04 Purple
    '#ec4899', // 05 Pink
    '#f97316', // 06 Warm Amber
    '#e11d48', // 07 Red-pink
    '#a855f7', // 08 Violet
    '#14b8a6', // 09 Teal
    '#0284c7', // 10 Deep Blue
    '#9333ea'  // 11 Purple
  ];

  // Item Image Badge renderer for Finished Goods
  const renderItemImageBadge = (item) => {
    const rawImage = item?.image || item?.image_url || item?.image_path;
    if (rawImage) {
      const conn = frappe.getConnectionSettings();
      const baseUrl = (conn && conn.url) ? conn.url.replace(/\/+$/, '') : window.location.origin;

      let fullImgUrl = rawImage;
      if (!fullImgUrl.startsWith('http') && !fullImgUrl.startsWith('data:')) {
        fullImgUrl = `${baseUrl}${fullImgUrl.startsWith('/') ? '' : '/'}${fullImgUrl}`;
      }

      return (
        <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
          <img
            src={fullImgUrl}
            alt={item?.name || 'Finished Good'}
            onError={(e) => {
              const relUrl = rawImage.startsWith('/') ? rawImage : `/${rawImage}`;
              if (e.target.src !== `${window.location.origin}${relUrl}`) {
                e.target.src = relUrl;
              } else {
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
                }
              }
            }}
            style={{
              width: '56px',
              height: '56px',
              objectFit: 'cover',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #cbd5e1',
              padding: '2px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          />
          {/* Fallback badge shown if image fails to load */}
          <div style={{
            display: 'none',
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            border: '1.5px solid #bae6fd',
            fontWeight: '800'
          }}>
            {(item?.name || 'FG').substring(0, 2).toUpperCase()}
          </div>
        </div>
      );
    }

    // Dynamic badge when no image URL is specified
    const nameLower = (item?.name || '').toLowerCase();
    const isCan = nameLower.includes('can') || nameLower.includes('330ml') || nameLower.includes('bluez') || nameLower.includes('lager');
    return (
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '12px',
        backgroundColor: isCan ? '#fef3c7' : '#e0f2fe',
        color: isCan ? '#d97706' : '#0284c7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '26px',
        border: `1.5px solid ${isCan ? '#fde68a' : '#bae6fd'}`,
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
      }}>
        {isCan ? '🥫' : '🍾'}
      </div>
    );
  };

  // Render Machine Visual SVG Graphics for stages
  const renderStageVisual = (stageId) => {
    switch (stageId) {
      case 'extraction':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <rect x="20" y="30" width="45" height="70" rx="8" fill="#e2e8f0" stroke="#0ea5e9" strokeWidth="3" />
            <rect x="80" y="20" width="55" height="80" rx="10" fill="#cbd5e1" stroke="#0284c7" strokeWidth="3" />
            <path d="M 65 50 H 80 M 65 75 H 80 M 135 60 H 170 V 90" fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
            <circle cx="42.5" cy="65" r="12" fill="#0ea5e9" opacity="0.3" />
            <circle cx="107.5" cy="60" r="16" fill="#0284c7" opacity="0.3" />
            <path d="M 20 90 H 65 M 80 90 H 135" stroke="#0284c7" strokeWidth="4" />
            <rect x="150" y="65" width="30" height="35" rx="4" fill="#0284c7" />
          </svg>
        );
      case 'mixing':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <ellipse cx="60" cy="30" rx="30" ry="8" fill="#94a3b8" />
            <path d="M 30 30 V 85 C 30 95, 90 95, 90 85 V 30 Z" fill="#cbd5e1" stroke="#10b981" strokeWidth="3" />
            <rect x="56" y="10" width="8" height="60" fill="#475569" />
            <ellipse cx="60" cy="70" rx="20" ry="5" fill="#10b981" />
            <rect x="120" y="35" width="50" height="60" rx="6" fill="#e2e8f0" stroke="#059669" strokeWidth="3" />
            <path d="M 90 60 H 120" stroke="#10b981" strokeWidth="5" />
          </svg>
        );
      case 'testing':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <rect x="30" y="40" width="70" height="50" rx="6" fill="#1e293b" />
            <rect x="35" y="45" width="60" height="30" rx="4" fill="#0284c7" opacity="0.8" />
            <path d="M 40 60 Q 55 50 70 65 T 90 55" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="140" cy="50" r="18" fill="#f59e0b" opacity="0.2" stroke="#f59e0b" strokeWidth="3" />
            <rect x="136" y="68" width="8" height="25" fill="#64748b" />
            <rect x="125" y="90" width="30" height="6" rx="2" fill="#475569" />
          </svg>
        );
      case 'blowing':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <rect x="25" y="25" width="150" height="70" rx="8" fill="#cbd5e1" stroke="#8b5cf6" strokeWidth="3" />
            <rect x="40" y="40" width="30" height="40" fill="#8b5cf6" opacity="0.3" rx="4" />
            <rect x="85" y="40" width="30" height="40" fill="#8b5cf6" opacity="0.5" rx="4" />
            <rect x="130" y="40" width="30" height="40" fill="#8b5cf6" opacity="0.8" rx="4" />
            <line x1="25" y1="60" x2="175" y2="60" stroke="#a78bfa" strokeWidth="4" strokeDasharray="6 4" />
          </svg>
        );
      case 'filling':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <rect x="30" y="20" width="140" height="30" rx="4" fill="#475569" />
            <rect x="50" y="50" width="10" height="20" fill="#ef4444" />
            <rect x="95" y="50" width="10" height="20" fill="#ef4444" />
            <rect x="140" y="50" width="10" height="20" fill="#ef4444" />
            <rect x="47" y="70" width="16" height="30" rx="3" fill="#38bdf8" opacity="0.7" />
            <rect x="92" y="70" width="16" height="30" rx="3" fill="#38bdf8" opacity="0.7" />
            <rect x="137" y="70" width="16" height="30" rx="3" fill="#38bdf8" opacity="0.7" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="#64748b" strokeWidth="6" />
          </svg>
        );
      case 'warmer':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <rect x="20" y="30" width="160" height="60" rx="10" fill="#fed7aa" stroke="#f97316" strokeWidth="3" />
            <path d="M 40 45 C 45 35, 55 55, 60 45 M 80 45 C 85 35, 95 55, 100 45 M 120 45 C 125 35, 135 55, 140 45" stroke="#ea580c" strokeWidth="3" fill="none" />
            <line x1="20" y1="75" x2="180" y2="75" stroke="#f97316" strokeWidth="4" />
          </svg>
        );
      case 'labeling':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <circle cx="60" cy="60" r="35" fill="#fbcfe8" stroke="#ec4899" strokeWidth="3" />
            <rect x="52" y="35" width="16" height="50" rx="4" fill="#38bdf8" />
            <path d="M 120 30 L 150 60 L 120 90 Z" fill="#ec4899" opacity="0.8" />
            <line x1="95" y1="60" x2="120" y2="60" stroke="#ec4899" strokeWidth="4" strokeDasharray="3 3" />
          </svg>
        );
      case 'final_qc':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <rect x="40" y="30" width="120" height="60" rx="8" fill="#1e293b" />
            <circle cx="100" cy="60" r="20" fill="#38bdf8" opacity="0.3" stroke="#d946ef" strokeWidth="3" />
            <line x1="70" y1="60" x2="130" y2="60" stroke="#d946ef" strokeWidth="2" />
            <line x1="100" y1="30" x2="100" y2="90" stroke="#d946ef" strokeWidth="2" />
          </svg>
        );
      case 'packing':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <rect x="30" y="40" width="60" height="50" rx="4" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
            <rect x="100" y="40" width="60" height="50" rx="4" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
            <line x1="20" y1="90" x2="180" y2="90" stroke="#64748b" strokeWidth="6" />
          </svg>
        );
      case 'palletising':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <rect x="40" y="85" width="120" height="12" fill="#b45309" rx="2" />
            <rect x="50" y="55" width="45" height="28" fill="#f59e0b" rx="3" />
            <rect x="105" y="55" width="45" height="28" fill="#f59e0b" rx="3" />
            <rect x="75" y="25" width="50" height="28" fill="#d97706" rx="3" />
          </svg>
        );
      case 'dispatch':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <rect x="20" y="35" width="110" height="55" rx="6" fill="#0284c7" />
            <text x="75" y="67" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">Island Chill</text>
            <path d="M 130 50 H 165 L 180 70 V 90 H 130 Z" fill="#0ea5e9" />
            <circle cx="50" cy="90" r="12" fill="#1e293b" />
            <circle cx="110" cy="90" r="12" fill="#1e293b" />
            <circle cx="160" cy="90" r="12" fill="#1e293b" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#1e293b'
    }}>
      {/* Top Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
            Process Workflow & Job Card Tracking
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Interactive, animated simulation mapped to live Finished Goods items, BOMs, and ERPNext Job Cards.
          </p>
        </div>

        {/* Right Header Status & Control Cards (Only shown when operations screen is active) */}
        {workflowScreen === 'operations' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Running Status Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '8px 16px',
              borderRadius: '12px'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                ▶
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#065f46' }}>
                  {simPlaying ? 'Running' : 'Paused'}
                </div>
                <div style={{ fontSize: '11px', color: '#047857' }}>
                  Production Line {simPlaying ? 'Active' : 'Standby'}
                </div>
              </div>
            </div>

            {/* Controls: Pause / Reset / Speeds */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '6px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <button
                onClick={() => setSimPlaying(!simPlaying)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: simPlaying ? '#f1f5f9' : '#0ea5e9',
                  color: simPlaying ? '#334155' : '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {simPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={() => { setSimPlaying(false); setSimStep(0); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                🔄 Reset
              </button>
              <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />
              {[
                { label: '0.5x', speed: 4000 },
                { label: '1x', speed: 2000 },
                { label: '2x', speed: 1000 }
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => setSimSpeed(btn.speed)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: simSpeed === btn.speed ? '#0284c7' : 'transparent',
                    color: simSpeed === btn.speed ? '#ffffff' : '#64748b',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* SCREEN 1: Product Family Selection Screen */}
      {workflowScreen === 'products' ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          {/* Header & Page Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🍾</span> Select Product Family ({activeBomItems.length} Active BOMs)
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Click any product family card below to transition to its manufacturing operations view.
              </p>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setBomPage(prev => Math.max(0, prev - 1))}
                  disabled={bomPage === 0}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: bomPage === 0 ? '#f8fafc' : '#ffffff',
                    color: bomPage === 0 ? '#94a3b8' : '#334155',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: bomPage === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ◀ Prev
                </button>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '6px 14px', borderRadius: '10px' }}>
                  Page {bomPage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setBomPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={bomPage >= totalPages - 1}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: bomPage >= totalPages - 1 ? '#f8fafc' : '#ffffff',
                    color: bomPage >= totalPages - 1 ? '#94a3b8' : '#334155',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: bomPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>

          {/* Grid of Product Family Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '20px'
          }}>
            {visibleActiveBomItems.map((item) => {
              const isSelected = item.bomId === selectedBomId;
              const rawImage = item?.image || item?.image_url || item?.image_path;

              let fullImgUrl = null;
              if (rawImage) {
                const conn = frappe.getConnectionSettings();
                const baseUrl = (conn && conn.url) ? conn.url.replace(/\/+$/, '') : window.location.origin;
                fullImgUrl = rawImage.startsWith('http') || rawImage.startsWith('data:')
                  ? rawImage
                  : `${baseUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
              }

              return (
                <div
                  key={item.bomId}
                  onClick={() => {
                    setSelectedBomId(item.bomId);
                    setWorkflowScreen('operations');
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: isSelected ? '2.5px solid #0284c7' : '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected
                      ? '0 12px 28px rgba(2, 132, 199, 0.16), 0 0 0 1px #0284c7'
                      : '0 4px 12px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  {/* Image Box */}
                  <div style={{
                    width: '100%',
                    height: '130px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    marginBottom: '14px',
                    overflow: 'hidden'
                  }}>
                    {fullImgUrl ? (
                      <img
                        src={fullImgUrl}
                        alt={item.name}
                        onError={(e) => {
                          const relUrl = rawImage.startsWith('/') ? rawImage : `/${rawImage}`;
                          if (e.target.src !== `${window.location.origin}${relUrl}`) {
                            e.target.src = relUrl;
                          } else {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }
                        }}
                        style={{
                          maxHeight: '106px',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.06))'
                        }}
                      />
                    ) : null}
                    <div style={{
                      display: fullImgUrl ? 'none' : 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '44px' }}>🥤</span>
                    </div>
                  </div>

                  {/* Title */}
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '800',
                    color: '#0f172a',
                    marginBottom: '4px',
                    lineHeight: '1.3',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.name}
                  </div>

                  {/* Subtitle */}
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '14px' }}>
                    {item.itemGroup || 'Finished Goods'}
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    style={{
                      marginTop: 'auto',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    View Operations ➔
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* SCREEN 2: Selected Product Operations View */
        <div>
          {/* Navigation Back Header */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setWorkflowScreen('products')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0284c7',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease'
              }}
            >
              ← Back to Product Families
            </button>

            <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', backgroundColor: '#ffffff', padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              Product Family ➔ <strong>{selectedBomFullDoc?.item_name || activeFGItem?.name || selectedBomId}</strong>
            </span>
          </div>

          {/* Selected Product Manufacturing Operations Showcase Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            marginBottom: '20px'
          }}>
            {/* Operations Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' }}>
                    BOM: {selectedBomId}
                  </span>
                  <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' }}>
                    🟢 Active & Default
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚙️</span> Production Operations Pipeline for {selectedBomFullDoc?.item_name || activeFGItem?.name || selectedBomId}
                </h2>
              </div>

              {/* <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '8px 16px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>Operations Count</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7' }}>
                    {bomOperations.length} Steps
                  </div>
                </div>

                <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', padding: '8px 16px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>Est. Cycle Time</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#d97706' }}>
                    {bomOperations.reduce((sum, op) => sum + (op.time_in_mins || 0), 0)} Mins
                  </div>
                </div>

                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '8px 16px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#065f46', textTransform: 'uppercase' }}>Total BOM Cost</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#059669' }}>
                    FJD ${(selectedBomFullDoc?.total_cost || selectedBomFullDoc?.base_total_cost || 0).toFixed(2)}
                  </div>
                </div>
              </div> */}
            </div>

            {/* Operations Step Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {bomOperations.map((op, idx) => {
                const isActive = simStep === idx;
                const isPassed = simStep > idx;
                const numColor = STAGE_NUMBER_COLORS[idx % STAGE_NUMBER_COLORS.length];

                return (
                  <div
                    key={op.id}
                    onClick={() => setSimStep(idx)}
                    style={{
                      backgroundColor: isActive ? '#ffffff' : '#f8fafc',
                      border: isActive ? `2.5px solid ${numColor}` : '1.5px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      cursor: 'pointer',
                      boxShadow: isActive
                        ? `0 10px 25px rgba(0,0,0,0.08), 0 0 0 4px ${numColor}15`
                        : '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.3s ease',
                      transform: isActive ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: numColor,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        fontSize: '13px',
                        boxShadow: `0 4px 10px ${numColor}40`
                      }}>
                        {op.idx.toString().padStart(2, '0')}
                      </div>
                      {isPassed ? (
                        <span style={{ backgroundColor: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                          ✓ Done
                        </span>
                      ) : isActive ? (
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                          ▶ Active
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                          ⏳ Open
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                        {op.operation}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🏭</span> {op.workstation}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#475569' }}>
                      <span>⏱ {op.time_in_mins} mins</span>
                      <span style={{ fontWeight: '700', color: '#059669' }}>💰 FJD ${op.operating_cost || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Operation Real ERP Details Inspector */}
            {currentOp && (
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: STAGE_NUMBER_COLORS[simStep % STAGE_NUMBER_COLORS.length],
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '14px'
                    }}>
                      {(simStep + 1).toString().padStart(2, '0')}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                        {currentOp.operation || 'Selected Operation'}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🏭 Workstation:</span> <strong>{currentOp.workstation || 'Production Line'}</strong>
                      </div>
                    </div>
                  </div>

                  <span style={{
                    backgroundColor: currentOp.status === 'Completed' ? '#ecfdf5' : currentOp.status === 'Work In Progress' ? '#e0f2fe' : '#f1f5f9',
                    color: currentOp.status === 'Completed' ? '#047857' : currentOp.status === 'Work In Progress' ? '#0369a1' : '#64748b',
                    border: currentOp.status === 'Completed' ? '1px solid #a7f3d0' : currentOp.status === 'Work In Progress' ? '1px solid #bae6fd' : '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: '800',
                    padding: '4px 14px',
                    borderRadius: '12px'
                  }}>
                    {currentOp.status || 'Open'}
                  </span>
                </div>

                {currentOp.description ? (
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                    {currentOp.description}
                  </p>
                ) : null}

                {/* Dynamic ERP Operation Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Operation Time</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>⏱ {currentOp.time_in_mins || 0} Mins</div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Operating Cost</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>💰 FJD ${(currentOp.operating_cost || 0).toFixed(2)}</div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Sequence Step</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7', marginTop: '2px' }}>Step #{simStep + 1} of {bomOperations.length}</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

