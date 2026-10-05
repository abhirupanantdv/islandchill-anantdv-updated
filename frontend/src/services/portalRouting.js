export function resolveLoginPortal(roles = [], selection = 'auto') {
  const isMES = roles.includes('IslandChill MES User');
  const isAdmin = roles.includes('IslandChill Admin User');
  if (selection === 'mes') return isMES ? 'mes' : 'denied';
  if (selection === 'admin') return isAdmin ? 'admin' : 'denied';
  if (selection !== 'auto') return 'denied';
  if (isMES && isAdmin) return 'choose';
  if (isMES) return 'mes';
  if (isAdmin) return 'admin';
  return 'denied';
}
