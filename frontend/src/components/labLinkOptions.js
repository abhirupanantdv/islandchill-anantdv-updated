// Share in-flight requests across parent and child-table Link controls.
// Completed requests are not cached so reopening a form refreshes its options.
export function createLabLinkLoader(service) {
  const pending = new Map();
  const pageSize = 100;

  const fetchRecords = async doctype => {
    if (doctype === 'Employee') {
      // This app's Employee endpoint has a limit, but no offset argument.
      let limit = pageSize;
      let previousCount = -1;
      while (true) {
        const records = await service.getEmployees('', limit) || [];
        if (records.length < limit || records.length === previousCount) return records;
        previousCount = records.length;
        limit *= 2;
      }
    }

    const records = new Map();
    for (let start = 0; ; start += pageSize) {
      const page = await service.fetchERP(doctype, {
        fields: ['name'], limit: pageSize, start, order_by: 'name asc',
      }) || [];
      const previousCount = records.size;
      for (const record of page) {
        const name = typeof record === 'string' ? record : record?.name;
        if (name) records.set(name, record);
      }
      // Also stop if a server ignores the offset and returns the same page.
      if (page.length < pageSize || records.size === previousCount) return [...records.values()];
    }
  };

  return doctype => {
    const target = typeof doctype === 'string' ? doctype.trim() : '';
    if (!target) return Promise.resolve([]);
    if (!pending.has(target)) {
      const request = fetchRecords(target).finally(() => pending.delete(target));
      pending.set(target, request);
    }
    return pending.get(target);
  };
}
