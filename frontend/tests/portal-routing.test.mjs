import assert from 'node:assert/strict';
import test from 'node:test';

const MES = 'IslandChill MES User';
const ADMIN = 'IslandChill Admin User';
const resolve = async (roles, selection) => {
  const { resolveLoginPortal } = await import('../src/services/portalRouting.js');
  return resolveLoginPortal(roles, selection);
};

test('users with both roles can choose either portal or request the chooser', async () => {
  assert.equal(await resolve([MES, ADMIN], 'mes'), 'mes');
  assert.equal(await resolve([MES, ADMIN], 'admin'), 'admin');
  assert.equal(await resolve([MES, ADMIN], 'auto'), 'choose');
});

test('automatic routing sends single-role users to their assigned portal', async () => {
  assert.equal(await resolve([MES], 'auto'), 'mes');
  assert.equal(await resolve([ADMIN], 'auto'), 'admin');
});

test('selection cannot grant a missing portal role', async () => {
  assert.equal(await resolve([MES], 'admin'), 'denied');
  assert.equal(await resolve([ADMIN], 'mes'), 'denied');
  for (const selection of ['auto', 'mes', 'admin']) {
    assert.equal(await resolve([], selection), 'denied');
    assert.equal(await resolve(['System Manager'], selection), 'denied');
  }
  assert.equal(await resolve(undefined, 'auto'), 'denied');
  assert.equal(await resolve([MES, ADMIN], 'invalid'), 'denied');
});
