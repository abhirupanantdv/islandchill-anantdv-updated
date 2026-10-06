export const MES_ROLE = 'IslandChill MES User';
export const ADMIN_ROLE = 'IslandChill Admin User';

export function resolveLoginPortal(roles = []) {
  const isMES = roles.includes(MES_ROLE);
  const isAdmin = roles.includes(ADMIN_ROLE);

  if (isAdmin) return 'admin';
  if (isMES) return 'mes';
  return 'denied';
}

export function canSwitchPortals(roles = []) {
  return roles.includes(MES_ROLE) && roles.includes(ADMIN_ROLE);
}

export function resolvePortalVisit(roles = [], requestedPortal = 'default') {
  const isMES = roles.includes(MES_ROLE);
  const isAdmin = roles.includes(ADMIN_ROLE);

  if (requestedPortal === 'mes' && isMES) return 'mes';
  if (isAdmin) return 'admin';
  if (isMES) return 'mes';
  return 'denied';
}
