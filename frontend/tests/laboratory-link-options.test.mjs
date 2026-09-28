import assert from 'node:assert/strict';
import test from 'node:test';

const loader = async service => {
  const { createLabLinkLoader } = await import('../src/components/labLinkOptions.js');
  return createLabLinkLoader(service);
};

test('Employee links use the existing Employee endpoint and retain names and IDs', async () => {
  const load = await loader({
    async getEmployees(query, limit) {
      assert.equal(query, '');
      assert.ok(limit >= 100);
      return [{ name: 'EMP-007', employee_name: 'Sam' }];
    },
    async fetchERP() { throw Error('Employee must use the existing Employee lookup'); },
  });
  assert.deepEqual(await load(' Employee '), [{ name: 'EMP-007', employee_name: 'Sam' }]);
});

test('generic links load subsequent pages from their declared doctype', async () => {
  const load = await loader({
    async fetchERP(doctype, options) {
      assert.equal(doctype, 'Item');
      assert.deepEqual(options.fields, ['name']);
      assert.equal(options.order_by, 'name asc');
      if (options.start === 0) return Array.from({ length: options.limit }, (_, i) => ({ name: `ITEM-${i}` }));
      assert.equal(options.start, options.limit);
      return [{ name: 'ITEM-LAST' }];
    },
  });
  const records = await load('Item');
  assert.ok(records.length > 100);
  assert.deepEqual(records.at(-1), { name: 'ITEM-LAST' });
});

test('Employee lookup expands beyond its first result limit', async () => {
  const load = await loader({
    async getEmployees(query, limit) {
      return Array.from({ length: Math.min(125, limit) }, (_, i) => ({ name: `EMP-${i}`, employee_name: `Employee ${i}` }));
    },
  });
  assert.equal((await load('Employee')).length, 125);
});

test('concurrent fields share a request, while reopening can reload current records', async () => {
  let calls = 0;
  const load = await loader({ async fetchERP() { calls++; return [{ name: `BATCH-${calls}` }]; } });
  const [first, second] = await Promise.all([load('Batch'), load('Batch')]);
  assert.deepEqual(first, [{ name: 'BATCH-1' }]);
  assert.deepEqual(second, first);
  assert.deepEqual(await load('Batch'), [{ name: 'BATCH-2' }]);
});
