import assert from 'node:assert/strict';
import test from 'node:test';

const load = async () => import('../src/services/stockEntry.js');

test('BOM materials preserve live warehouse availability in the Stock Entry form', async () => {
  const { buildStockEntryItems } = await load();
  const items = buildStockEntryItems([
    { code: 'SUGAR', name: 'Sugar', qty: 2.5, unit: 'Kg', available_qty: 20, bom_quantity: 1 },
  ], {
    quantity: 4,
    sourceWarehouse: 'Stores - CWFPL',
    wipWarehouse: 'Work In Progress - CWFPL',
  });

  assert.deepEqual(items, [{
    code: 'SUGAR',
    name: 'Sugar',
    qty: 10,
    unit: 'Kg',
    sourceWarehouse: 'Stores - CWFPL',
    targetWarehouse: 'Work In Progress - CWFPL',
    availableQty: 20,
  }]);
});

test('BOM quantities are scaled from the BOM batch size', async () => {
  const { buildStockEntryItems } = await load();
  const [item] = buildStockEntryItems([
    { code: 'CAN', name: 'Can', qty: 240, unit: 'Nos', available_qty: 500, bom_quantity: 10 },
  ], { quantity: 2, sourceWarehouse: 'Stores', wipWarehouse: 'WIP' });

  assert.equal(item.qty, 48);
});

test('shortages identify only rows whose required quantity exceeds available stock', async () => {
  const { getStockEntryShortages } = await load();
  assert.deepEqual(getStockEntryShortages([
    { code: 'SUGAR', qty: 5, availableQty: 10, sourceWarehouse: 'Stores' },
    { code: 'LIDS', qty: 24, availableQty: 0, sourceWarehouse: 'Stores' },
  ]), [{ code: 'LIDS', requiredQty: 24, availableQty: 0, shortageQty: 24, warehouse: 'Stores' }]);
});
