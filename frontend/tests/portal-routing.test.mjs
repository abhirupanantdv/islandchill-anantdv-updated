import assert from 'node:assert/strict';
import test from 'node:test';

const MES = 'IslandChill MES User';
const ADMIN = 'IslandChill Admin User';
const routing = async () => {
  return import('../src/services/portalRouting.js');
};

test('users with both roles always enter ERPNext Desk after login', async () => {
  const { resolveLoginPortal } = await routing();
  assert.equal(resolveLoginPortal([MES, ADMIN]), 'admin');
});

test('single-role users enter only their assigned portal', async () => {
  const { resolveLoginPortal } = await routing();
  assert.equal(resolveLoginPortal([MES]), 'mes');
  assert.equal(resolveLoginPortal([ADMIN]), 'admin');
});

test('users without an IslandChill portal role are denied', async () => {
  const { resolveLoginPortal } = await routing();
  assert.equal(resolveLoginPortal([]), 'denied');
  assert.equal(resolveLoginPortal(['System Manager']), 'denied');
  assert.equal(resolveLoginPortal(undefined), 'denied');
});

test('portal switching is available only when both roles are assigned', async () => {
  const { canSwitchPortals } = await routing();
  assert.equal(canSwitchPortals([MES, ADMIN]), true);
  assert.equal(canSwitchPortals([MES]), false);
  assert.equal(canSwitchPortals([ADMIN]), false);
  assert.equal(canSwitchPortals([]), false);
  assert.equal(canSwitchPortals(undefined), false);
});

test('an explicit MES switch lets dual-role users enter MES', async () => {
  const { resolvePortalVisit } = await routing();
  assert.equal(resolvePortalVisit([MES, ADMIN], 'mes'), 'mes');
  assert.equal(resolvePortalVisit([MES, ADMIN]), 'admin');
});

test('direct IslandChill visits keep MES-only users out of Desk and return admin-only users to Desk', async () => {
  const { resolvePortalVisit } = await routing();
  assert.equal(resolvePortalVisit([MES]), 'mes');
  assert.equal(resolvePortalVisit([ADMIN]), 'admin');
  assert.equal(resolvePortalVisit([ADMIN], 'mes'), 'admin');
  assert.equal(resolvePortalVisit([]), 'denied');
});
