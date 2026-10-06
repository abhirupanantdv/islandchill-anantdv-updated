const number = value => Number(value || 0);

export function buildStockEntryItems(materials = [], workOrder = {}) {
  return materials
    .filter(material => !material.disabled)
    .map(material => {
      const bomQuantity = number(material.bom_quantity) || 1;
      const requiredQuantity = number(material.qty) * number(workOrder.quantity || 1) / bomQuantity;
      return {
        code: material.code || material.item_code,
        name: material.name || material.item_name || material.code || material.item_code,
        qty: Number(requiredQuantity.toFixed(4)),
        unit: material.unit || material.uom || '',
        sourceWarehouse: workOrder.sourceWarehouse || material.source_warehouse || '',
        targetWarehouse: workOrder.wipWarehouse || '',
        availableQty: number(material.available_qty),
      };
    });
}

export function getStockEntryShortages(items = []) {
  return items.flatMap(item => {
    if (item.availableQty === undefined || item.availableQty === null || item.availableQty === '') return [];
    const requiredQty = number(item.qty);
    const availableQty = number(item.availableQty);
    if (requiredQty <= availableQty) return [];
    return [{
      code: item.code || item.item_code || 'Unknown item',
      requiredQty,
      availableQty,
      shortageQty: Number((requiredQty - availableQty).toFixed(4)),
      warehouse: item.sourceWarehouse || item.s_warehouse || '',
    }];
  });
}
