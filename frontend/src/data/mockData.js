export const PRODUCTS = [
  {
    code: "RUM-COLA-500",
    name: "RUM Cola 500ml Can",
    type: "Can",
    packSize: 24, // 24 cans per carton
    unitVol: "500ml",
    bomCode: "BOM-RC500-001"
  },
  {
    code: "RUM-COLA-330",
    name: "RUM Cola 330ml Can",
    type: "Can",
    packSize: 24,
    unitVol: "330ml",
    bomCode: "BOM-RC330-001"
  },
  {
    code: "IC-WATER-500",
    name: "Island Chill Water 500ml Bottle",
    type: "PET Bottle",
    packSize: 24, // 24 bottles per carton
    unitVol: "500ml",
    bomCode: "BOM-IC500-001"
  },
  {
    code: "IC-WATER-1500",
    name: "Island Chill Water 1.5L Bottle",
    type: "PET Bottle",
    packSize: 12, // 12 bottles per carton
    unitVol: "1.5L",
    bomCode: "BOM-IC1500-001"
  },
  {
    code: "CRUSH-WATER-1.5L",
    name: "CRUSH WATER 1.5L CARTONS",
    type: "PET Bottle",
    packSize: 12,
    unitVol: "1.5L",
    bomCode: "BOM-CR1.5-001"
  }
];

export const BOMS = {
  "BOM-RC500-001": {
    productName: "RUM Cola 500ml Can",
    materials: [
      { code: "RM-WATER", name: "Purified Water", qty: 11.5, unit: "L" }, // per Box of 24
      { code: "RM-SUGAR", name: "Refined Sugar", qty: 0.96, unit: "kg" },
      { code: "RM-CONCENTRATE", name: "Cola Concentrate", qty: 0.24, unit: "L" },
      { code: "RM-CO2", name: "Carbon Dioxide Gas", qty: 0.12, unit: "kg" },
      { code: "PK-CAN-500", name: "Aluminum Cans 500ml", qty: 24, unit: "Nos" },
      { code: "PK-TAB", name: "Can Pull Tabs", qty: 24, unit: "Nos" },
      { code: "PK-CARTON-24", name: "Cardboard Carton (24-Pack)", qty: 1, unit: "Nos" }
    ]
  },
  "BOM-RC330-001": {
    productName: "RUM Cola 330ml Can",
    materials: [
      { code: "RM-WATER", name: "Purified Water", qty: 7.6, unit: "L" }, // per Box of 24
      { code: "RM-SUGAR", name: "Refined Sugar", qty: 0.63, unit: "kg" },
      { code: "RM-CONCENTRATE", name: "Cola Concentrate", qty: 0.16, unit: "L" },
      { code: "RM-CO2", name: "Carbon Dioxide Gas", qty: 0.08, unit: "kg" },
      { code: "PK-CAN-330", name: "Aluminum Cans 330ml", qty: 24, unit: "Nos" },
      { code: "PK-TAB", name: "Can Pull Tabs", qty: 24, unit: "Nos" },
      { code: "PK-CARTON-24", name: "Cardboard Carton (24-Pack)", qty: 1, unit: "Nos" }
    ]
  },
  "BOM-IC500-001": {
    productName: "Island Chill Water 500ml Bottle",
    materials: [
      { code: "RM-WATER", name: "Artesian Water (Fiji)", qty: 12.0, unit: "L" }, // per Box of 24
      { code: "PK-PREFORM-500", name: "PET Preforms 500ml", qty: 24, unit: "Nos" },
      { code: "PK-CAP-BLUE", name: "Blue Cap 28mm", qty: 24, unit: "Nos" },
      { code: "PK-LABEL-IC500", name: "Island Chill 500ml Labels", qty: 24, unit: "Nos" },
      { code: "PK-CARTON-24", name: "Cardboard Carton (24-Pack)", qty: 1, unit: "Nos" }
    ]
  },
  "BOM-IC1500-001": {
    productName: "Island Chill Water 1.5L Bottle",
    materials: [
      { code: "RM-WATER", name: "Artesian Water (Fiji)", qty: 18.0, unit: "L" }, // per Box of 12
      { code: "PK-PREFORM-1.5", name: "PET Preforms 1.5L", qty: 12, unit: "Nos" },
      { code: "PK-CAP-BLUE", name: "Blue Cap 28mm", qty: 12, unit: "Nos" },
      { code: "PK-LABEL-IC1.5", name: "Island Chill 1.5L Labels", qty: 12, unit: "Nos" },
      { code: "PK-CARTON-12", name: "Cardboard Carton (12-Pack)", qty: 1, unit: "Nos" }
    ]
  },
  "BOM-CR1.5-001": {
    productName: "CRUSH WATER 1.5L CARTONS",
    materials: [
      { code: "RM-WATER", name: "Purified Water", qty: 18.0, unit: "L" }, // per Box of 12
      { code: "PK-PREFORM-1.5", name: "PET Preforms 1.5L", qty: 12, unit: "Nos" },
      { code: "PK-CAP-WHITE", name: "White Cap 28mm", qty: 12, unit: "Nos" },
      { code: "PK-LABEL-CR1.5", name: "Crush Water 1.5L Labels", qty: 12, unit: "Nos" },
      { code: "PK-CARTON-12", name: "Cardboard Carton (12-Pack)", qty: 1, unit: "Nos" }
    ]
  }
};

export const INITIAL_INVENTORY = {
  // Raw Materials
  "RM-WATER": { name: "Artesian/Purified Water Source", qty: 54000, unit: "L", category: "Raw Material", minLevel: 10000 },
  "RM-SUGAR": { name: "Refined Sugar", qty: 3500, unit: "kg", category: "Raw Material", minLevel: 500 },
  "RM-CONCENTRATE": { name: "Cola Concentrate", qty: 850, unit: "L", category: "Raw Material", minLevel: 100 },
  "RM-CO2": { name: "Carbon Dioxide Gas", qty: 1200, unit: "kg", category: "Raw Material", minLevel: 200 },
  
  // Packaging Materials
  "PK-CAN-500": { name: "Aluminum Cans 500ml", qty: 45000, unit: "Nos", category: "Packaging", minLevel: 5000 },
  "PK-CAN-330": { name: "Aluminum Cans 330ml", qty: 28000, unit: "Nos", category: "Packaging", minLevel: 5000 },
  "PK-TAB": { name: "Can Pull Tabs", qty: 85000, unit: "Nos", category: "Packaging", minLevel: 10000 },
  "PK-PREFORM-500": { name: "PET Preforms 500ml", qty: 65000, unit: "Nos", category: "Packaging", minLevel: 10000 },
  "PK-PREFORM-1.5": { name: "PET Preforms 1.5L", qty: 38000, unit: "Nos", category: "Packaging", minLevel: 5000 },
  "PK-CAP-BLUE": { name: "Blue Cap 28mm", qty: 95000, unit: "Nos", category: "Packaging", minLevel: 10000 },
  "PK-CAP-WHITE": { name: "White Cap 28mm", qty: 54000, unit: "Nos", category: "Packaging", minLevel: 10000 },
  "PK-LABEL-IC500": { name: "Island Chill 500ml Labels", qty: 60000, unit: "Nos", category: "Packaging", minLevel: 8000 },
  "PK-LABEL-IC1.5": { name: "Island Chill 1.5L Labels", qty: 40000, unit: "Nos", category: "Packaging", minLevel: 5000 },
  "PK-LABEL-CR1.5": { name: "Crush Water 1.5L Labels", qty: 30000, unit: "Nos", category: "Packaging", minLevel: 5000 },
  "PK-CARTON-24": { name: "Cardboard Carton (24-Pack)", qty: 3200, unit: "Nos", category: "Packaging", minLevel: 400 },
  "PK-CARTON-12": { name: "Cardboard Carton (12-Pack)", qty: 2500, unit: "Nos", category: "Packaging", minLevel: 400 },

  // Finished Goods (In Stock Boxes)
  "FG-RUM-COLA-500": { name: "RUM Cola 500ml Can Box", qty: 340, unit: "Box", category: "Finished Goods", minLevel: 50 },
  "FG-IC-WATER-500": { name: "Island Chill Water 500ml Box", qty: 580, unit: "Box", category: "Finished Goods", minLevel: 100 },
  "FG-CRUSH-WATER-1.5L": { name: "CRUSH WATER 1.5L Box", qty: 192, unit: "Box", category: "Finished Goods", minLevel: 50 }
};

export const INITIAL_WORK_ORDERS = [
  {
    id: "MFG-WO-2026-00097",
    product: "CRUSH WATER 1.5L CARTONS",
    item: "CRUSH WATER 1.5L CARTONS",
    quantity: 200,
    produced: 192,
    plannedStart: "2026-05-28 23:52:19",
    status: "Completed",
    bomNo: "BOM-CR1.5-001",
    lineNo: "Filling Line 1",
    batchSize: 200,
    jobCards: [
      { id: "PO-JOB00504", operation: "Mixing", station: "Mixing Station", status: "Completed", operator: "S. Prasad", remarks: "BOM checked. Water filtration and carbon filters active. 3600L mixed successfully." },
      { id: "PO-JOB00505", operation: "Lab Testing", station: "Lab Testing Station", status: "Completed", operator: "T. Naidu", remarks: "pH 7.4, brix 0.0, microbial 0. Passed specifications." },
      { id: "PO-JOB00506", operation: "Can/Bottle Prep", station: "Can Preparation Station", status: "Completed", operator: "J. Ravu", remarks: "Bottles blown from preforms, washed and rinsed at 90 psi." },
      { id: "PO-JOB00507", operation: "Filling", station: "Filling Machine", status: "Completed", operator: "K. Reddy", remarks: "Filling run completed at 118 cartons/hr." },
      { id: "PO-JOB00508", operation: "Initial Quality Check", station: "Initial QC Station", status: "Completed", operator: "P. Sharma", remarks: "Average fill volume 1502ml. 8 defective bottles rejected." },
      { id: "PO-JOB00509", operation: "Warmer", station: "Warmer Machine", status: "Completed", operator: "K. Reddy", remarks: "Brought bottles up to 21°C to prevent condensation." },
      { id: "PO-JOB00510", operation: "Laser Labeling", station: "Labeling Station", status: "Completed", operator: "A. Singh", remarks: "Batch number BATCH-CW1.5-20260528-A and MFG date laser-printed." },
      { id: "PO-JOB00511", operation: "Final Quality Check", station: "Final QC Station", status: "Completed", operator: "P. Sharma", remarks: "Final inspection pass. Zero cap leaks detected." },
      { id: "PO-JOB00512", operation: "Hand Packing", station: "Packing Station", status: "Completed", operator: "V. Kumar", remarks: "Packed into 192 cartons of 12 bottles." },
      { id: "PO-JOB00513", operation: "Palletising", station: "Palletisation Area", status: "Completed", operator: "V. Kumar", remarks: "Palletised onto PLT-2026-0040. Transferred to WH1." },
      { id: "PO-JOB00514", operation: "Store & Dispatch", station: "Warehouse/Logistics", status: "Completed", operator: "M. Whippy", remarks: "Dispatched to Central Distribution Center Suva. Delivery Note DN-2026-0185." }
    ]
  },
  {
    id: "MFG-WO-2026-00098",
    product: "Gold Stone Rum and Cola demo",
    item: "Gold Stone Rum and Cola 500ml",
    quantity: 200,
    produced: 0,
    plannedStart: "2026-05-29 17:52:23",
    status: "Cancelled",
    bomNo: "BOM-RC500-001",
    lineNo: "Filling Line 2",
    batchSize: 200,
    jobCards: []
  },
  {
    id: "MFG-WO-2026-00099",
    product: "RUM Cola 500ml Can",
    item: "RUM Cola 500ml Can",
    quantity: 300,
    produced: 145,
    plannedStart: "2026-06-02 08:30:00",
    status: "In Progress",
    bomNo: "BOM-RC500-001",
    lineNo: "Filling Line 2",
    batchSize: 300,
    jobCards: [
      { id: "PO-JOB00601", operation: "Mixing", station: "Mixing Station", status: "Completed", operator: "S. Prasad", remarks: "Concentrate, Sugar & Water mixed. 7200L batch prepared." },
      { id: "PO-JOB00602", operation: "Lab Testing", station: "Lab Testing Station", status: "Completed", operator: "T. Naidu", remarks: "pH 3.22, Brix 11.4, CO2 3.75 vol. Spec passed." },
      { id: "PO-JOB00603", operation: "Can/Bottle Prep", station: "Can Preparation Station", status: "Completed", operator: "J. Ravu", remarks: "Cans fed from depalletizer and ionised air washed." },
      { id: "PO-JOB00604", operation: "Filling", station: "Filling Machine", status: "In Progress", operator: "K. Reddy", remarks: "Filling cans. 3480 cans filled so far." },
      { id: "PO-JOB00605", operation: "Initial Quality Check", station: "Initial QC Station", status: "Not Started", operator: "", remarks: "" },
      { id: "PO-JOB00606", operation: "Warmer", station: "Warmer Machine", status: "Not Started", operator: "", remarks: "" },
      { id: "PO-JOB00607", operation: "Laser Labeling", station: "Labeling Station", status: "Not Started", operator: "", remarks: "" },
      { id: "PO-JOB00608", operation: "Final Quality Check", station: "Final QC Station", status: "Not Started", operator: "", remarks: "" },
      { id: "PO-JOB00609", operation: "Hand Packing", station: "Packing Station", status: "Not Started", operator: "", remarks: "" },
      { id: "PO-JOB00610", operation: "Palletising", station: "Palletisation Area", status: "Not Started", operator: "", remarks: "" },
      { id: "PO-JOB00611", operation: "Store & Dispatch", station: "Warehouse/Logistics", status: "Not Started", operator: "", remarks: "" }
    ]
  }
];

export const WORKFLOW_STEPS = [
  {
    id: "1",
    title: "Forecasting",
    desc: "Demand forecasting based on market data",
    function: "Planning Manager",
    color: "bg-blue-500",
    role: "Planner"
  },
  {
    id: "P",
    title: "Generate Production Plan",
    desc: "Auto-generate plan from forecast",
    function: "Planning Manager",
    color: "bg-blue-500",
    role: "Planner"
  },
  {
    id: "2",
    title: "Procurement / Supply",
    desc: "Procure raw materials from suppliers",
    function: "Supply Chain",
    color: "bg-green-500",
    role: "Logistics"
  },
  {
    id: "R",
    title: "Receive & Inspect",
    desc: "Inspect quality and quantity of packaging & ingredients",
    function: "Supply Chain",
    color: "bg-green-500",
    role: "Logistics"
  },
  {
    id: "S",
    title: "Store Raw Materials",
    desc: "Warehouse storage",
    function: "Supply Chain",
    color: "bg-green-500",
    role: "Logistics"
  },
  {
    id: "3",
    title: "Mixing",
    desc: "Mix raw materials per approved formula and recipe limits",
    function: "Production Team",
    color: "bg-orange-500",
    role: "Operator"
  },
  {
    id: "4",
    title: "Lab Testing",
    desc: "Confirm proper pH, Brix, and CO2 in quality lab",
    function: "Quality Control",
    color: "bg-purple-500",
    role: "QC Inspector"
  },
  {
    id: "D1",
    title: "Lab Test Result",
    desc: "Pass → Continue | Fail → Reject & Quarantine Batch",
    function: "Quality Control",
    color: "bg-yellow-500",
    role: "QC Inspector",
    type: "decision"
  },
  {
    id: "5",
    title: "Can/Bottle Prep",
    desc: "Blow preforms (PET) or feed empty cans and clean",
    function: "Production Team",
    color: "bg-orange-500",
    role: "Operator"
  },
  {
    id: "6",
    title: "Filling",
    desc: "Fill bottles/cans at filling lines",
    function: "Production Team",
    color: "bg-orange-500",
    role: "Operator"
  },
  {
    id: "7",
    title: "Initial Quality Check",
    desc: "Verify filling volume tolerances and seal integrity",
    function: "Production Team",
    color: "bg-orange-500",
    role: "Operator"
  },
  {
    id: "8",
    title: "Warmer",
    desc: "Bring filled cans/bottles up to ambient temp",
    function: "Production Team",
    color: "bg-orange-500",
    role: "Operator"
  },
  {
    id: "9",
    title: "Laser Labeling",
    desc: "Laser print manufacturing date, time, and batch ID",
    function: "Production Team",
    color: "bg-orange-500",
    role: "Operator"
  },
  {
    id: "10",
    title: "Final Quality Check",
    desc: "Final visual/leak QC inspection before packing",
    function: "Quality Control",
    color: "bg-purple-500",
    role: "QC Inspector"
  },
  {
    id: "D2",
    title: "Final QC Result",
    desc: "Pass → Pack | Fail → Quarantine & Hold",
    function: "Quality Control",
    color: "bg-yellow-500",
    role: "QC Inspector",
    type: "decision"
  },
  {
    id: "11",
    title: "Hand Packing",
    desc: "Pack cans (24/carton) or bottles (12/carton)",
    function: "Packing Team",
    color: "bg-amber-500",
    role: "Packer"
  },
  {
    id: "12",
    title: "Palletising",
    desc: "Group cartons on wooden pallets and log in warehouse",
    function: "Packing Team",
    color: "bg-amber-500",
    role: "Packer"
  },
  {
    id: "W",
    title: "Store & Dispatch",
    desc: "Warehouse storage and delivery note auto-generation",
    function: "Warehouse / Logistics",
    color: "bg-teal-500",
    role: "Logistics"
  }
];
