// Cleaned Data Module - All data is fetched live from ERPNext
export const PRODUCTS = [];
export const BOMS = {};
export const INITIAL_INVENTORY = {};
export const INITIAL_WORK_ORDERS = [];

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
