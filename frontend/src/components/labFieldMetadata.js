const flag = value => value === true || value === 1 || value === '1';
const layoutTypes = new Set(['Section Break', 'Column Break', 'Tab Break', 'Fold']);
export const isLabValueField = field => !layoutTypes.has(field.fieldtype) && !flag(field.hidden) && field.fieldname !== 'amended_from';

export function getLabTableFields(fields) {
  let hiddenSection = false;
  let hiddenTab = false;
  return fields.filter(field => {
    if (field.fieldtype === 'Tab Break') { hiddenTab = flag(field.hidden); hiddenSection = false; }
    if (field.fieldtype === 'Section Break' || field.fieldtype === 'Fold') hiddenSection = flag(field.hidden);
    return !hiddenTab && !hiddenSection && isLabValueField(field);
  });
}

export function getLabFieldDefault(field) {
  if (field.default === undefined || field.default === null || field.default === '') return undefined;
  if (field.fieldtype === 'Check') return flag(field.default) ? 1 : 0;
  if (field.default === 'Today' && field.fieldtype === 'Date') return new Date().toLocaleDateString('en-CA');
  if (field.default === 'Now' && field.fieldtype === 'Datetime') {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  }
  return field.default;
}

export function getLabRowDefaults(fields) {
  return Object.fromEntries(fields.filter(isLabValueField)
    .map(field => [field.fieldname, getLabFieldDefault(field)])
    .filter(([, value]) => value !== undefined));
}

export function normalizeLabField(field) {
  return { ...field, label: field.label || (layoutTypes.has(field.fieldtype) ? '' : field.fieldname || '') };
}

export const isLabSignatureImage = value => typeof value === 'string' && /^(data:image\/(png|jpeg|webp|gif);base64,|\/(private\/)?files\/)/i.test(value);
