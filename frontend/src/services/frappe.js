// frappe.js - ERPNext/Frappe Integration Service for Island Chill Bottling App
import { CONFIG } from '../config';

// Sentinel error thrown when an identical request is already in-flight.
// Callers can check `err instanceof DuplicateRequestError` to silently ignore double-click events.
export class DuplicateRequestError extends Error {
  constructor(key) {
    super(`duplicate_request:${key}`);
    this.name = 'DuplicateRequestError';
  }
}

const STORAGE_KEYS = {
  CONNECTION: 'fiji_frappe_connection',
};

class FrappeService {
  constructor() {
    this.connection = this.getConnectionSettings();
    // Tracks in-flight mutating requests to prevent accidental duplicate submissions
    this._pendingRequests = new Set();
    this._sessionExpiredCallbacks = [];
    this._isSessionExpiring = false;
  }

  onSessionExpired(callback) {
    if (typeof callback === 'function') {
      this._sessionExpiredCallbacks.push(callback);
      return () => {
        this._sessionExpiredCallbacks = this._sessionExpiredCallbacks.filter(cb => cb !== callback);
      };
    }
    return () => {};
  }

  isSessionExpiredError(status, messageStr) {
    if (status === 401) return true;
    const msg = (messageStr || '').toLowerCase();
    if (
      msg.includes('logged out') ||
      msg.includes('login to access') ||
      msg.includes('session expired') ||
      msg.includes('sessionexpired') ||
      msg.includes('invalid session') ||
      msg.includes('authentication failed') ||
      msg.includes('user guest')
    ) {
      return true;
    }
    return false;
  }

  triggerSessionExpired(reason = 'Session expired') {
    if (this._isSessionExpiring) return;
    this._isSessionExpiring = true;
    console.warn('[FrappeService] Session expired / logged out:', reason);

    this.logout();

    if (this._sessionExpiredCallbacks) {
      this._sessionExpiredCallbacks.forEach(cb => {
        try { cb(reason); } catch (e) { console.error('Session expired callback error:', e); }
      });
    }

    setTimeout(() => {
      this._isSessionExpiring = false;
    }, 2000);
  }

  async checkSessionStatus() {
    if (!this.connection.isLive) return true;

    try {
      const baseUrl = this.resolveUrl(this.connection.url);
      const auth = this.getAuthHeader();
      const headers = { Accept: 'application/json' };
      if (auth) headers['Authorization'] = auth;

      const response = await fetch(`${baseUrl}/api/method/frappe.auth.get_logged_user`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (response.status === 401 || response.status === 403) {
        this.triggerSessionExpired('Session invalid (401/403)');
        return false;
      }

      const json = await response.json().catch(() => null);
      const user = json?.message;
      if (!user || user === 'Guest') {
        this.triggerSessionExpired('Session logged out');
        return false;
      }
      return true;
    } catch (e) {
      // Network hiccup, do not trigger session logout
      return true;
    }
  }

  getConnectionSettings() {
    const connStr = localStorage.getItem(STORAGE_KEYS.CONNECTION);
    if (connStr) {
      try {
        const conn = JSON.parse(connStr);
        if (!conn.url) conn.url = CONFIG.ERPNEXT_SERVER_URL;
        if (conn.user && conn.user !== 'Guest' && conn.connected !== false) {
          conn.isLive = true;
          conn.connected = true;
        } else {
          conn.isLive = false;
          conn.connected = false;
          conn.user = '';
        }
        return conn;
      } catch {
        return { isLive: false, url: CONFIG.ERPNEXT_SERVER_URL, apiKey: '', apiSecret: '', username: '', password: '', user: '', role: '', connected: false, defaultCompany: 'Carpenters Waters (Fiji) PTE Limited' };
      }
    }
    return { isLive: false, url: CONFIG.ERPNEXT_SERVER_URL, apiKey: '', apiSecret: '', username: '', password: '', user: '', role: '', connected: false, defaultCompany: 'Carpenters Waters (Fiji) PTE Limited' };
  }

  setConnectionSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.CONNECTION, JSON.stringify(settings));
    this.connection = settings;
  }

  resolveUrl(url) {
    if (!url) return '';
    const clean = url.endsWith('/') ? url.slice(0, -1) : url;

    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      if (clean === cleanOrigin) {
        return '';
      }

      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '';
      }
    }

    if (
      clean.includes('vms.advtinni.com') ||
      clean.includes('192.168.101.129') ||
      clean === CONFIG.ERPNEXT_SERVER_URL
    ) {
      return '';
    }
    return clean;
  }

  getAuthHeader() {
    const { apiKey, apiSecret } = this.connection;
    if (apiKey && apiSecret) {
      return `token ${apiKey}:${apiSecret}`;
    }
    return '';
  }

  cleanFrappeError(value) {
    let message = value || 'ERPNext request failed';

    if (Array.isArray(message)) {
      message = message.join(' ');
    }

    if (typeof message !== 'string') {
      try {
        message = JSON.stringify(message);
      } catch {
        message = String(message);
      }
    }

    const parseMessageText = (txt) => {
      if (typeof txt !== 'string') return txt;
      try {
        const p = JSON.parse(txt);
        if (p && typeof p === 'object') {
          if (Array.isArray(p)) {
            return p.map(parseMessageText).join(' ');
          }
          return p.message || p.title || JSON.stringify(p);
        }
      } catch {
        // Not a JSON string
      }
      return txt;
    };

    try {
      const parsed = JSON.parse(message);
      if (Array.isArray(parsed)) {
        message = parsed.map(item => {
          const cleanedItem = parseMessageText(item);
          if (typeof cleanedItem === 'string') return cleanedItem;
          return cleanedItem.message || cleanedItem.title || JSON.stringify(cleanedItem);
        }).join(' ');
      } else if (parsed && typeof parsed === 'object') {
        message = parsed.message || parsed.title || JSON.stringify(parsed);
      }
    } catch {
      // Not JSON, continue.
    }

    return String(message)
      .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1')
      .replace(/<strong\b[^>]*>(.*?)<\/strong>/gi, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  async callIslandChillMethod(methodName, payload = {}) {
    if (!this.connection.isLive) return { success: true, localOnly: true };

    const requestKey = `method:${methodName}:${JSON.stringify(payload)}`;
    if (!this._inFlightPromises) this._inFlightPromises = new Map();
    if (this._inFlightPromises.has(requestKey)) {
      return this._inFlightPromises.get(requestKey);
    }

    const promise = (async () => {
      const baseUrl = this.resolveUrl(this.connection.url);
      const auth = this.getAuthHeader();

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      };

      if (auth) {
        headers.Authorization = auth;
      } else {
        const csrfToken =
          window.csrf_token ||
          window.frappe?.csrf_token ||
          document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        if (csrfToken) {
          headers['X-Frappe-CSRF-Token'] = csrfToken;
          headers['X-CSRF-Token'] = csrfToken;
        }
      }

      try {
        const response = await fetch(`${baseUrl}/api/method/islandchill.api.manufacturing.${methodName}`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
          const rawMessage =
            json?._server_messages ||
            json?.exception ||
            json?.exc ||
            json?.message ||
            response.statusText ||
            'ERPNext request failed';

          const cleaned = this.cleanFrappeError(rawMessage);
          if (this.isSessionExpiredError(response.status, rawMessage)) {
            this.triggerSessionExpired(cleaned);
          }
          throw new Error(cleaned);
        }

        return json?.message || json;
      } finally {
        this._inFlightPromises.delete(requestKey);
      }
    })();

    this._inFlightPromises.set(requestKey, promise);
    return promise;
  }

  async login(url, usernameOrKey, passwordOrSecret, isLive = true, defaultCompany = 'Carpenters Waters (Fiji) PTE Limited') {
    try {
      const targetUrl = url || CONFIG.ERPNEXT_SERVER_URL;
      const baseUrl = this.resolveUrl(targetUrl);

      // Perform standard session-based login using POST to /api/method/login
      const response = await fetch(`${baseUrl}/api/method/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          usr: usernameOrKey,
          pwd: passwordOrSecret
        })
      });

      if (!response.ok) {
        throw new Error('Connection failed: Invalid credentials or URL is unreachable.');
      }

      const loginRes = await response.json();

      // Now fetch user details using the session
      const userRes = await fetch(`${baseUrl}/api/method/frappe.auth.get_logged_user`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!userRes.ok) {
        throw new Error('Failed to retrieve user session details.');
      }

      const resData = await userRes.json();
      const userEmail = resData.message;

      if (!userEmail || userEmail === 'Guest') {
        throw new Error('Login failed: Invalid username or password.');
      }

      // Try fetching profile details
      let fullName = userEmail;
      let islandchill_user_type = '';
      try {
        const profileRes = await fetch(`${baseUrl}/api/resource/User/${encodeURIComponent(userEmail)}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          fullName = profileData.data.full_name || userEmail;
          islandchill_user_type = profileData?.data?.islandchill_user_type;
        }
      } catch (err) {
        console.warn('Profile fetch failed, using email instead', err);
      }

      const settings = {
        isLive: true,
        url: targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl, // store original url
        username: usernameOrKey,
        password: passwordOrSecret,
        apiKey: '',
        apiSecret: '',
        connected: true,
        user: fullName,
        role: 'ERPNext Administrator',
        defaultCompany
      };

      this.setConnectionSettings(settings);

      return { success: true, user: fullName, role: settings.role, islandchill_user_type: islandchill_user_type };
    } catch (error) {
      console.error('ERPNext login error:', error);
      return { success: false, message: error.message };
    }
  }

  async logout() {
    try {
      const baseUrl = this.resolveUrl(this.connection.url);
      await fetch(`${baseUrl}/api/method/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }).catch(() => {});
    } catch (e) {
      console.warn('Logout API call failed:', e);
    }
    this.setConnectionSettings({ isLive: false, url: CONFIG.ERPNEXT_SERVER_URL, apiKey: '', apiSecret: '', username: '', password: '', connected: false, defaultCompany: 'Carpenters Waters (Fiji) PTE Limited' });
  }

  // Generic Fetch wrapper
  async fetchERP(doctype, options = {}) {
    if (!this.connection.isLive) return null;

    const { url } = this.connection;
    const baseUrl = this.resolveUrl(url);
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const auth = this.getAuthHeader();
    if (auth) headers['Authorization'] = auth;

    let queryParams = '';
    if (options.filters) queryParams += `&filters=${encodeURIComponent(JSON.stringify(options.filters))}`;
    if (options.fields) queryParams += `&fields=${encodeURIComponent(JSON.stringify(options.fields))}`;
    if (options.limit) queryParams += `&limit_page_length=${options.limit}`;
    if (options.start) queryParams += `&limit_start=${options.start}`;
    if (options.order_by) queryParams += `&order_by=${options.order_by}`;
    queryParams += `&ignore_permissions=true`;

    const fetchUrl = `${baseUrl}/api/resource/${encodeURIComponent(doctype)}?${queryParams.substring(1)}`;

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      let message = `ERPNext API Error: ${response.statusText}`;
      try {
        const errData = await response.json();
        message = errData.exception || errData.message || errData._server_messages || message;
      } catch { }
      const cleaned = this.cleanFrappeError(message);
      if (this.isSessionExpiredError(response.status, message)) {
        this.triggerSessionExpired(cleaned);
      }
      throw new Error(cleaned);
    }

    const res = await response.json();
    return res.data;
  }

  // Generic Create / Update / Delete wrapper
  async makeRequest(method, doctype, docname = '', body = null) {
    if (!this.connection.isLive) return null;

    // Dedup guard for mutating requests (POST, PUT, DELETE) only
    const isMutating = ['POST', 'PUT', 'DELETE'].includes(method?.toUpperCase());
    const requestKey = isMutating ? `resource:${method}:${doctype}:${docname}` : null;
    if (requestKey) {
      if (this._pendingRequests.has(requestKey)) {
        console.warn(`[FrappeService] Duplicate request blocked: ${requestKey}`);
        throw new DuplicateRequestError(requestKey);
      }
      this._pendingRequests.add(requestKey);
    }

    const { url } = this.connection;
    const baseUrl = this.resolveUrl(url);
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const auth = this.getAuthHeader();
    if (auth) {
      headers['Authorization'] = auth;
    } else {
      const csrfToken =
        window.csrf_token ||
        window.frappe?.csrf_token ||
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

      if (csrfToken) {
        headers['X-Frappe-CSRF-Token'] = csrfToken;
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    const fetchUrl = docname
      ? `${baseUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}?ignore_permissions=true`
      : `${baseUrl}/api/resource/${encodeURIComponent(doctype)}?ignore_permissions=true`;

    try {
      const response = await fetch(fetchUrl, {
        method,
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : null
      });

      if (!response.ok) {
        let message = `ERPNext Request Failed: ${response.statusText}`;
        try {
          const errData = await response.json();
          message =
            errData._server_messages ||
            errData.exception ||
            errData.exc ||
            errData.message ||
            message;
        } catch { }
        const cleaned = this.cleanFrappeError(message);
        if (this.isSessionExpiredError(response.status, message)) {
          this.triggerSessionExpired(cleaned);
        }
        throw new Error(cleaned);
      }

      return await response.json();
    } finally {
      if (requestKey) this._pendingRequests.delete(requestKey);
    }
  }

  // Fetch Work Orders (Paginated)
  async getWorkOrders(limit = 20, start = 0) {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Work Order', {
          fields: ['name', 'production_item', 'qty', 'produced_qty', 'planned_start_date', 'status', 'bom_no'],
          limit,
          start,
          order_by: 'creation desc'
        });

        if (res && res.length > 0) {
          return res.map(wo => ({
            id: wo.name,
            product: wo.production_item,
            item: wo.production_item,
            quantity: Number(wo.qty || 0),
            produced: Number(wo.produced_qty || 0),
            plannedStart: wo.planned_start_date || '',
            status: wo.status === 'Submitted' ? 'Pending' : (wo.status === 'Not Started' ? 'Pending' : wo.status),
            bomNo: wo.bom_no || '',
            lineNo: 'Filling Line 1', // Default map
            batchSize: Number(wo.qty || 0),
            jobCards: [] // Filled in locally or mock
          }));
        }
        return [];
      } catch (e) {
        console.error('Failed to fetch Work Orders from ERPNext:', e);
        throw e;
      }
    }
    return null;
  }

  // Fetch Work Orders Count
  async getWorkOrdersCount() {
    if (this.connection.isLive) {
      try {
        const { url } = this.connection;
        const baseUrl = this.resolveUrl(url);
        const headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        const auth = this.getAuthHeader();
        if (auth) headers['Authorization'] = auth;

        const response = await fetch(`${baseUrl}/api/method/frappe.client.get_count`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ doctype: 'Work Order' })
        });

        if (response.ok) {
          const res = await response.json();
          return Number(res.message || 0);
        }
      } catch (e) {
        console.error('Failed to fetch Work Orders count from ERPNext:', e);
      }
    }
    return 0;
  }

  // Create Work Order
  async createWorkOrder(woData) {
    if (this.connection.isLive) {
      try {
        let operations = [];
        try {
          const bomRes = await this.makeRequest('GET', 'BOM', woData.bomNo);
          if (bomRes && bomRes.data && bomRes.data.operations) {
            operations = bomRes.data.operations.map(op => ({
              operation: op.operation,
              workstation: op.workstation,
              time_in_mins: Number(op.time_in_mins || 1.0)
            }));
          }
        } catch (bomErr) {
          console.warn('Failed to fetch BOM operations for Work Order creation:', bomErr);
        }

        const payload = {
          production_item: woData.product,
          qty: woData.quantity,
          planned_start_date: woData.plannedStart.replace(' ', 'T'),
          bom_no: woData.bomNo,
          company: woData.company || this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited',
          // Warehouses — all 5 must come from the user's selection (company-specific)
          source_warehouse: woData.sourceWarehouse || null,
          wip_warehouse: woData.wipWarehouse || null,
          fg_warehouse: woData.fgWarehouse || null,
          scrap_warehouse: woData.scrapWarehouse || null,
          custom_extra_goods_warehouse: woData.extraGoodsWarehouse || null,
          operations: operations,
          docstatus: 1
        };
        // Remove null fields so ERPNext doesn't complain about invalid warehouse links
        Object.keys(payload).forEach(k => { if (payload[k] === null) delete payload[k]; });
        const response = await this.makeRequest('POST', 'Work Order', '', payload);
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Work Order on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `MFG-WO-2026-${Date.now().toString().slice(-5)}` };
  }

  // Generic document cancellation helper via custom whitelisted methods or frappe.client.cancel
  async cancelDoc(doctype, docName) {
    if (!this.connection.isLive) return { success: true };
    try {
      if (doctype === 'Work Order') {
        const res = await this.callIslandChillMethod('cancel_work_order', { work_order: docName });
        if (res && res.success) return { success: true };
      }
      if (doctype === 'Stock Entry') {
        const res = await this.callIslandChillMethod('cancel_stock_entry', { stock_entry: docName });
        if (res && res.success) return { success: true };
      }

      const { url } = this.connection;
      const baseUrl = this.resolveUrl(url);
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      const auth = this.getAuthHeader();
      if (auth) {
        headers['Authorization'] = auth;
      } else {
        const csrfToken =
          window.csrf_token ||
          window.frappe?.csrf_token ||
          document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
          headers['X-Frappe-CSRF-Token'] = csrfToken;
          headers['X-CSRF-Token'] = csrfToken;
        }
      }

      const response = await fetch(
        `${baseUrl}/api/method/frappe.client.cancel`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ doctype: doctype, name: docName })
        }
      );

      if (!response.ok) {
        let msg = `Cancel failed for ${doctype} ${docName}: ${response.statusText}`;
        try {
          const err = await response.json();
          msg = err.exception || err._server_messages || err.message || msg;
        } catch { }
        throw new Error(this.cleanFrappeError(msg));
      }
      const json = await response.json();
      if (json.exc) throw new Error(this.cleanFrappeError(json.exc));
      return { success: true };
    } catch (e) {
      console.error(`Failed to cancel ${doctype} ${docName}:`, e);
      throw e;
    }
  }

  // Generic document deletion helper via resource API
  async deleteDoc(doctype, docName) {
    if (!this.connection.isLive) return { success: true };
    try {
      const { url } = this.connection;
      const baseUrl = this.resolveUrl(url);
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      const auth = this.getAuthHeader();
      if (auth) {
        headers['Authorization'] = auth;
      } else {
        const csrfToken =
          window.csrf_token ||
          window.frappe?.csrf_token ||
          document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
          headers['X-Frappe-CSRF-Token'] = csrfToken;
          headers['X-CSRF-Token'] = csrfToken;
        }
      }

      const response = await fetch(
        `${baseUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docName)}`,
        { method: 'DELETE', headers, credentials: 'include' }
      );

      if (!response.ok) {
        let msg = `Delete failed for ${doctype} ${docName}: ${response.statusText}`;
        try {
          const err = await response.json();
          const raw = err.exception || err._server_messages || err.message || msg;
          if (raw && raw.includes('Submitted Record cannot be deleted')) {
            msg = `${doctype} must be Cancelled before it can be deleted. Please cancel it first, then delete.`;
          } else {
            msg = this.cleanFrappeError(raw);
          }
        } catch { }
        throw new Error(msg);
      }
      return { success: true };
    } catch (e) {
      console.error(`Failed to delete ${doctype} ${docName}:`, e);
      throw e;
    }
  }

  // Cancel a Work Order (uses the generic helper)
  async cancelWorkOrder(woName) {
    return this.cancelDoc('Work Order', woName);
  }

  // Delete a Work Order (uses the generic helper)
  async deleteWorkOrder(woName) {
    return this.deleteDoc('Work Order', woName);
  }

  // Query linked stock entries for a Work Order (for cascading cancel/delete checks)
  async getLinkedStockEntries(woName) {
    if (!this.connection.isLive) return [];
    try {
      const res = await this.fetchERP('Stock Entry', {
        fields: ['name', 'docstatus', 'stock_entry_type'],
        filters: [['work_order', '=', woName]],
        limit: 100
      });
      return res || [];
    } catch (e) {
      console.error(`Failed to fetch linked stock entries for ${woName}:`, e);
      return [];
    }
  }

  // Fetch GL (Accounting Ledger) entries for a submitted document (Stock Entry, etc.)
  async getGLEntriesForVoucher(voucherNo) {
    if (!this.connection.isLive) {
      // Mock GL entries
      return [
        { account: 'Stock In Hand - AD', debit: 1200, credit: 0, posting_date: '2026-07-13', cost_center: 'Main - AD', remarks: 'Auto created by Stock Entry' },
        { account: 'Raw Materials - AD', debit: 0, credit: 1200, posting_date: '2026-07-13', cost_center: 'Main - AD', remarks: 'Auto created by Stock Entry' }
      ];
    }
    try {
      const res = await this.fetchERP('GL Entry', {
        fields: ['account', 'debit', 'credit', 'posting_date', 'cost_center', 'remarks', 'against', 'party', 'party_type'],
        filters: [
          ['voucher_no', '=', voucherNo],
          ['is_cancelled', '=', 0]
        ],
        order_by: 'creation asc',
        limit: 100
      });
      return res || [];
    } catch (e) {
      console.error(`Failed to fetch GL Entries for ${voucherNo}:`, e);
      return [];
    }
  }

  // Create Stock Entry (Material Transfer for Manufacture)
  async createStockEntry(seData) {
    if (this.connection.isLive) {
      try {
        console.log("STOCK ENTRY DATA", seData);
        console.log("WORK ORDER SENT", seData.workOrder);
        const payload = {
          stock_entry_type: "Material Transfer for Manufacture",
          work_order: seData.workOrder,
          company: seData.company || this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited',
          posting_date: seData.postingDate,
          posting_time: seData.postingTime,
          docstatus: 1, // Submitted
          items: seData.items.map(item => ({
            item_code: item.code,
            qty: Number(item.qty),
            s_warehouse: item.sourceWarehouse || seData.sourceWarehouse || "Stores - AD",
            t_warehouse: item.targetWarehouse || seData.targetWarehouse || "Work In Progress - AD",
            uom: item.unit,
            stock_uom: item.unit
          }))
        };
        const response = await this.makeRequest('POST', 'Stock Entry', '', payload);
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Stock Entry on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `MAT-STE-2026-${Date.now().toString().slice(-5)}` };
  }


  async getStockEntryForWorkOrder(workOrder) {
    if (!this.connection.isLive) return null;

    const { url } = this.connection;
    const baseUrl = this.resolveUrl(url);

    const response = await fetch(
      `${baseUrl}/api/method/islandchill.api.manufacturing.get_stock_entry_for_work_order?work_order=${encodeURIComponent(workOrder)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      }
    );

    if (!response.ok) {
      let message = 'Failed to fetch Stock Entry draft';
      try {
        const err = await response.json();
        message = err.exception || err.message || err._server_messages || message;
      } catch { }
      throw new Error(this.cleanFrappeError(message));
    }

    const json = await response.json();
    return json.message || null;
  }

  // Save or update Stock Entry Draft through backend Python method.
  async saveStockEntryDraft(data) {
    if (!this.connection.isLive) {
      return {
        success: true,
        name: data.stockEntryName || `DEMO-SE-${Date.now().toString().slice(-6)}`
      };
    }

    const { url } = this.connection;
    const baseUrl = this.resolveUrl(url);

    const csrfToken =
      window.csrf_token ||
      window.frappe?.csrf_token ||
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
      '';

    const response = await fetch(
      `${baseUrl}/api/method/islandchill.api.manufacturing.save_stock_entry_draft`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': csrfToken,
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          work_order: data.workOrder,
          company: data.company || this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited',
          posting_date: data.postingDate,
          posting_time: data.postingTime,
          stock_entry_name: data.stockEntryName || '',
          items: data.items || []
        })
      }
    );

    if (!response.ok) {
      let message = 'Failed to save Stock Entry draft';
      try {
        const err = await response.json();
        message = err.exception || err.message || err._server_messages || message;
      } catch { }
      throw new Error(this.cleanFrappeError(message));
    }

    const json = await response.json();
    return json.message;
  }

  // Submit saved Stock Entry Draft through backend Python method.
  async submitStockEntry(stockEntryName) {
    if (!this.connection.isLive) {
      return { success: true };
    }

    const { url } = this.connection;
    const baseUrl = this.resolveUrl(url);

    const csrfToken =
      window.csrf_token ||
      window.frappe?.csrf_token ||
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
      '';

    const response = await fetch(
      `${baseUrl}/api/method/islandchill.api.manufacturing.submit_stock_entry`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': csrfToken,
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          stock_entry_name: stockEntryName
        })
      }
    );

    if (!response.ok) {
      let message = 'Failed to submit Stock Entry';
      try {
        const err = await response.json();
        message = err.exception || err.message || err._server_messages || message;
      } catch { }
      throw new Error(this.cleanFrappeError(message));
    }

    const json = await response.json();
    return json.message;
  }

  // Fetch manufacturable items from active submitted BOMs.
  // This is the safest list for Work Order creation because every returned item has at least one usable BOM.
  async getManufacturableItems(limit = 300) {
    if (!this.connection.isLive) return null;

    try {
      const boms = await this.callIslandChillMethod('get_all_boms_list', { limit });

      if (!boms || boms.length === 0) return [];

      const unique = new Map();

      for (const bom of boms) {
        const code = bom.item || bom.itemCode;
        if (!code || unique.has(code)) continue;

        unique.set(code, {
          code,
          name: bom.productName || bom.item || code,
          unit: bom.unit || 'Nos',
          defaultBom: bom.id || bom.name
        });
      }

      const codes = Array.from(unique.keys());

      try {
        const items = await this.callIslandChillMethod('get_all_inventory_items', { limit: 200 });

        if (items && items.length > 0) {
          for (const item of items) {
            const code = item.item_code || item.code || item.name;
            if (unique.has(code)) {
              unique.set(code, {
                ...unique.get(code),
                code,
                name: item.item_name || item.name || unique.get(code).name || code,
                unit: item.stock_uom || item.unit || unique.get(code).unit || 'Nos'
              });
            }
          }
        }
      } catch (itemErr) {
        console.warn('Could not enrich manufacturable items from Item doctype:', itemErr);
      }

      return Array.from(unique.values()).sort((a, b) =>
        (a.name || a.code).localeCompare(b.name || b.code)
      );
    } catch (e) {
      console.error('Failed to fetch manufacturable items from ERPNext:', e);
      return [];
    }
  }

  async getStockEntriesForItem(itemCode) {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Stock Entry', {
          fields: ['name', 'stock_entry_type', 'work_order', 'posting_date', 'posting_time', 'company', 'docstatus'],
          filters: [
            ['Stock Entry Detail', 'item_code', '=', itemCode]
          ],
          limit: 20
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch stock entries for item:', e);
        return [];
      }
    }
    // Mock stock entries for local mode
    return [
      { name: 'STE-2026-00001', stock_entry_type: 'Material Transfer for Manufacture', work_order: 'MFG-WO-2026-00001', posting_date: '2026-07-12', posting_time: '10:00:00', company: this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited', docstatus: 1 },
      { name: 'STE-2026-00002', stock_entry_type: 'Manufacture', work_order: 'MFG-WO-2026-00001', posting_date: '2026-07-13', posting_time: '14:30:00', company: this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited', docstatus: 1 }
    ];
  }

  async getAllStockEntries(limit = 200) {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Stock Entry', {
          fields: ['name', 'stock_entry_type', 'work_order', 'posting_date', 'posting_time', 'company', 'docstatus'],
          filters: [
            ['docstatus', '=', 1],
            ['work_order', '!=', ''],
            ['posting_date', '>=', '2026-07-13']
          ],
          order_by: 'posting_date desc',
          limit
        });
        return (res || []).filter(e => e.work_order);
      } catch (e) {
        console.error('Failed to fetch all stock entries:', e);
        return [];
      }
    }
    return [
      { name: 'STE-2026-00001', stock_entry_type: 'Material Transfer for Manufacture', work_order: 'MFG-WO-2026-00001', posting_date: '2026-07-13', posting_time: '10:00:00', company: this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited', docstatus: 1 },
      { name: 'STE-2026-00002', stock_entry_type: 'Manufacture', work_order: 'MFG-WO-2026-00001', posting_date: '2026-07-13', posting_time: '14:30:00', company: this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited', docstatus: 1 }
    ];
  }

  async getStockEntryDetails(name) {
    if (this.connection.isLive) {
      try {
        const res = await this.makeRequest('GET', 'Stock Entry', name);
        return res?.data;
      } catch (e) {
        console.error(`Failed to fetch Stock Entry ${name}:`, e);
        throw e;
      }
    }
    // Mock Stock Entry details for local mode
    return {
      name: name,
      stock_entry_type: name.includes('STE-2026-00002') ? 'Manufacture' : 'Material Transfer for Manufacture',
      work_order: 'MFG-WO-2026-00001',
      posting_date: '2026-07-12',
      posting_time: '10:00:00',
      company: this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited',
      docstatus: 1,
      items: [
        { item_code: 'WTR-001', qty: 500, s_warehouse: 'Stores - AD', t_warehouse: 'Work In Progress - AD', uom: 'Litres' },
        { item_code: 'BTL-500', qty: 1000, s_warehouse: 'Stores - AD', t_warehouse: 'Work In Progress - AD', uom: 'Nos' }
      ]
    };
  }

  async getCompanies() {
    if (this.connection.isLive) {
      try {
        const res = await this.callIslandChillMethod('get_companies_list');
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Companies:', e);
        return [];
      }
    }
    // Mock companies for local mode
    return [
      { name: 'Carpenters Waters (Fiji) PTE Limited', company_name: 'Carpenters Waters (Fiji) PTE Limited' },
      { name: 'Island Chill Fiji', company_name: 'Island Chill Fiji' },
      { name: 'Oceanic Bottling', company_name: 'Oceanic Bottling' }
    ];
  }

  // Backward-compatible function used by App.jsx.
  // First tries manufacturable BOM items; falls back to Finished Goods item group if BOM lookup returns nothing.
  async getFinishedGoods(limit = 300) {
    if (this.connection.isLive) {
      try {
        const manufacturable = await this.getManufacturableItems(limit);
        if (manufacturable && manufacturable.length > 0) return manufacturable;

        const res = await this.callIslandChillMethod('get_all_inventory_items', { limit });

        if (res && res.length > 0) {
          return res.map(item => ({
            code: item.item_code || item.code || item.name,
            name: item.item_name || item.name || item.code,
            unit: item.stock_uom || item.unit || 'Nos'
          }));
        }

        return [];
      } catch (e) {
        console.error('Failed to fetch Finished Goods from ERPNext:', e);
        return [];
      }
    }

    return null;
  }

  // Fetch active submitted BOMs for a specific production item.
  async getBOMsForItem(itemCode, limit = 100) {
    if (this.connection.isLive) {
      try {
        if (!itemCode) return [];

        const res = await this.callIslandChillMethod('get_boms_for_item', { item_code: itemCode, limit });
        return res || [];
      } catch (e) {
        console.error(`Failed to fetch BOMs for ${itemCode} from ERPNext:`, e);
        return [];
      }
    }

    return [];
  }

  // Fetch BOM operations dynamically
  async getBOMOperations(bomId) {
    if (this.connection.isLive) {
      try {
        const res = await this.makeRequest('GET', 'BOM', bomId);
        if (res && res.data && res.data.operations && res.data.operations.length > 0) {
          return res.data.operations.map((op, idx) => ({
            id: op.name || `op-${idx}-${Date.now()}`,
            operation: op.operation,
            station: op.workstation || 'General Station',
            status: 'Not Started',
            operator: '',
            remarks: '',
            remarksList: []
          }));
        }
      } catch (e) {
        console.error(`Failed to fetch operations for BOM ${bomId}:`, e);
      }
    }
    return null;
  }

  // Update Work Order
  async updateWorkOrder(woId, updateData) {
    if (this.connection.isLive) {
      try {
        const payload = {};
        if (updateData.produced !== undefined) payload.produced_qty = updateData.produced;
        if (updateData.quantity !== undefined) payload.qty = updateData.quantity;

        if (Object.keys(payload).length > 0) {
          const response = await this.makeRequest('PUT', 'Work Order', woId, payload);
          return { success: true, data: response?.data };
        }
        return { success: true };
      } catch (e) {
        console.error('Failed to update Work Order on ERPNext:', e);
        throw e;
      }
    }
    return { success: true };
  }

  // Delete Work Order
  async deleteWorkOrder(woId) {
    if (this.connection.isLive) {
      try {
        await this.makeRequest('DELETE', 'Work Order', woId);
        return { success: true };
      } catch (e) {
        console.error('Failed to delete Work Order on ERPNext:', e);
        throw e;
      }
    }
    return { success: true };
  }

  // Push work order updates to ERPNext (if connected)
  async syncWorkOrderToERP(workOrder) {
    return this.updateWorkOrder(workOrder.id, workOrder);
  }

  // Push Job Card status to ERPNext
  async syncJobCardToERP(jobCardId, status, remarks = '') {
    if (!this.connection.isLive) return { success: true, localOnly: true };

    try {
      let erpStatus = 'Open';
      if (status === 'Work In Progress' || status === 'In Progress') erpStatus = 'Work In Progress';
      if (status === 'On Hold' || status === 'Paused') erpStatus = 'On Hold';
      if (status === 'Material Transferred') erpStatus = 'Material Transferred';
      if (status === 'Submitted') erpStatus = 'Submitted';
      if (status === 'Cancelled') erpStatus = 'Cancelled';
      if (status === 'Completed') erpStatus = 'Completed';

      const payload = {
        status: erpStatus,
        remarks: remarks
      };

      await this.makeRequest('PUT', 'Job Card', jobCardId, payload);

      if (remarks) {
        try {
          const lines = remarks.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const commentPayload = {
            comment_doctype: 'Job Card',
            comment_docname: jobCardId,
            content: lastLine || remarks,
            comment_by: this.connection.username || 'operator'
          };
          await this.makeRequest('POST', 'Comment', '', commentPayload);
        } catch (commentErr) {
          console.warn('Failed to post comment to Job Card:', commentErr);
        }
      }

      return { success: true };
    } catch (e) {
      console.error('Failed to sync Job Card to ERPNext:', e);
      return { success: false, error: e.message };
    }
  }



  async startJobCard(jobCardId, { employee, remarks = '', actualStartTime = '' } = {}) {
    return this.callIslandChillMethod('start_job_card', {
      job_card: jobCardId,
      employee,
      remarks,
      actual_start_time: actualStartTime
    });
  }

  async pauseJobCard(jobCardId, { remarks = '', actualEndTime = '' } = {}) {
    // ERPNext pause uses the employees already stored on the Job Card/time_logs.
    // Do not pass employee here.
    return this.callIslandChillMethod('pause_job_card', {
      job_card: jobCardId,
      remarks,
      actual_end_time: actualEndTime
    });
  }

  async resumeJobCard(jobCardId, { remarks = '', actualStartTime = '' } = {}) {
    // ERPNext resume uses the existing Job Card employee table and adds a new time_log row.
    // Do not pass employee here.
    return this.callIslandChillMethod('resume_job_card', {
      job_card: jobCardId,
      remarks,
      actual_start_time: actualStartTime
    });
  }

  async submitJobCard(jobCardId, { remarks = '', actualEndTime = '', qty = null, forQuantity = null, looseQty = 0, processLossQty = 0 } = {}) {
    // ERPNext completion closes the active time log, fills completed_qty, and submits.
    return this.callIslandChillMethod('submit_job_card', {
      job_card: jobCardId,
      remarks,
      actual_end_time: actualEndTime,
      qty,
      for_quantity: forQuantity,
      loose_qty: looseQty,
      process_loss_qty: processLossQty
    });
  }

  async getItemUoms(itemCode) {
    return this.callIslandChillMethod('get_item_uoms', { item_code: itemCode });
  }

  async finishWorkOrder(workOrderId, { qty = null, processLossQty = null, scrapItems = null, company = null, submit = 1, postingDate = null, postingTime = null, extraQty = null, extraUom = null } = {}) {
    return this.callIslandChillMethod('finish_work_order', {
      work_order: workOrderId,
      qty,
      process_loss_qty: processLossQty,
      scrap_items: scrapItems,
      company,
      submit,
      posting_date: postingDate,
      posting_time: postingTime,
      extra_qty: extraQty,
      extra_uom: extraUom
    });
  }

  async changeWorkOrderStatus(workOrderId, status) {
    return this.callIslandChillMethod('change_work_order_status', {
      work_order: workOrderId,
      status
    });
  }


  async addJobCardComment(jobCardId, content, operator = '') {
    return this.callIslandChillMethod('add_job_card_comment', {
      job_card: jobCardId,
      content,
      operator
    });
  }

  async getJobCardComments(jobCardId) {
    const res = await this.callIslandChillMethod('get_job_card_comments', {
      job_card: jobCardId
    });
    return res?.comments || [];
  }

  async forceWorkOrderInProgress(workOrder) {
    const baseUrl = this.resolveUrl(this.connection.url);

    const response = await fetch(
      `${baseUrl}/api/method/islandchill.api.manufacturing.force_work_order_in_progress`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || window.frappe?.csrf_token || ''
        },
        credentials: 'include',
        body: JSON.stringify({ work_order: workOrder })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.exception || err?.message || 'Failed to update Work Order status');
    }

    const json = await response.json();
    return json.message;
  }

  // Push stock updates to ERPNext (if connected)
  async syncStockToERP(itemCode, currentQty) {
    if (!this.connection.isLive) return { success: true, localOnly: true };

    try {
      const payload = {
        item_code: itemCode,
        warehouse: "Finished Goods - CWFL",
        qty: currentQty
      };
      await this.makeRequest('POST', 'Stock Reconciliation', '', {
        purpose: 'Stock Reconciliation',
        items: [payload]
      });
      return { success: true };
    } catch (e) {
      console.warn('Failed to push stock update to ERPNext (Reconciliation schema may differ):', e);
      return { success: false, error: e.message };
    }
  }

  // Fetch Employees for operator select matching keywords
  async getEmployees(searchQuery = '', limit = 50) {
    if (this.connection.isLive) {
      try {
        const res = await this.callIslandChillMethod('get_employees_list', { search_term: searchQuery, limit });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Employees from ERPNext:', e);
        return [];
      }
    }
    // Mock employees for simulation
    const mockEmployees = [
      { name: 'EMP-00001', employee_name: 'S. Prasad', gender: 'Male', date_of_birth: '1985-05-12', designation: 'Mixing Operator', status: 'Active' },
      { name: 'EMP-00002', employee_name: 'A. Naidu', gender: 'Female', date_of_birth: '1990-08-22', designation: 'Lab Technician', status: 'Active' },
      { name: 'EMP-00003', employee_name: 'K. Kumar', gender: 'Male', date_of_birth: '1988-12-05', designation: 'Packer', status: 'Active' },
      { name: 'EMP-00004', employee_name: 'L. Chaudhry', gender: 'Female', date_of_birth: '1992-03-15', designation: 'Supervisor', status: 'Active' },
      { name: 'EMP-00005', employee_name: 'R. Singh', gender: 'Male', date_of_birth: '1987-11-20', designation: 'Maintenance Engineer', status: 'Active' },
      { name: 'EMP-00006', employee_name: 'M. Fiji', gender: 'Male', date_of_birth: '1995-07-02', designation: 'Plant Operator', status: 'Active' },
      { name: 'EMP-00007', employee_name: 'Amit Patel', gender: 'Male', date_of_birth: '1983-09-25', designation: 'Forklift Operator', status: 'Active' },
      { name: 'EMP-00008', employee_name: 'Bila Ravu', gender: 'Male', date_of_birth: '1991-01-30', designation: 'QC Inspector', status: 'Active' },
      { name: 'EMP-00009', employee_name: 'David Prasad', gender: 'Male', date_of_birth: '1989-06-18', designation: 'Shift lead', status: 'Active' },
      { name: 'EMP-00010', employee_name: 'Elena Whippy', gender: 'Female', date_of_birth: '1994-02-14', designation: 'HR Assistant', status: 'Active' },
      { name: 'EMP-00011', employee_name: 'Fariq Ali', gender: 'Male', date_of_birth: '1992-10-08', designation: 'Store Keeper', status: 'Active' },
      { name: 'EMP-00012', employee_name: 'Grace Lal', gender: 'Female', date_of_birth: '1993-04-04', designation: 'Administrative Assistant', status: 'Active' }
    ];
    if (searchQuery) {
      return mockEmployees.filter(emp => emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, limit);
    }
    return mockEmployees.slice(0, limit);
  }

  // Fetch BOMs (Paginated)
  async getBOMs(limit = 100, start = 0) {
    if (this.connection.isLive) {
      try {
        const res = await this.callIslandChillMethod('get_all_boms_list', { limit, start });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch BOMs from ERPNext:', e);
        return [];
      }
    }
    return [];
  }

  // Fetch BOM Details (raw materials)
  async getBOMDetails(bomId) {
    if (this.connection.isLive) {
      try {
        const res = await this.callIslandChillMethod('get_bom_details_data', { bom_id: bomId });
        return res || [];
      } catch (e) {
        console.error(`Failed to fetch BOM details for ${bomId}:`, e);
        return [];
      }
    }
    return [];
  }

  // Fetch Items / Inventory Balances
  async getItems(limit = 200, start = 0) {
    if (this.connection.isLive) {
      try {
        const res = await this.callIslandChillMethod('get_all_inventory_items', { limit });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Items from ERPNext:', e);
        return [];
      }
    }
    return [];
  }

  // Fetch Bin quantities for item codes
  async getBinQuantities(itemCodes) {
    if (this.connection.isLive) {
      try {
        const res = await this.callIslandChillMethod('get_bin_quantities', { item_codes: itemCodes });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Bin quantities from ERPNext:', e);
        return [];
      }
    }
    return [];
  }

  // Fetch Daily Preventative Maintenance Schedules
  async getMaintenanceSchedules(limit = 100, start = 0) {
    if (this.connection.isLive) {
      try {
        const res = await this.callIslandChillMethod('get_maintenance_schedules_list', { limit, start });
        if (res && res.length > 0) {
          return res.map(rec => {
            let checkgrid = {};
            let remarks = {};
            try { checkgrid = JSON.parse(rec.checkgrid || '{}'); } catch { }
            try { remarks = JSON.parse(rec.remarks || '{}'); } catch { }
            return {
              id: rec.name,
              templateId: rec.template_id || rec.equipment,
              equipment: rec.equipment,
              workOrder: rec.work_order,
              area: rec.area,
              name: rec.equipment,
              weekNo: rec.week_no,
              fromDate: rec.from_date,
              toDate: rec.to_date,
              operator: rec.operator || rec.sign_of_the_operator,
              supervisor: rec.supervisor || rec.sign_of_supervisor,
              checkgrid,
              remarks,
              totalChecked: Number(rec.total_checked || 0),
              maxPossible: Number(rec.max_possible || 0),
              timestamp: rec.creation ? rec.creation.replace('T', ' ').substring(0, 19) : ''
            };
          });
        }
        return [];
      } catch (e) {
        console.error('Failed to fetch Daily Preventative Maintenance Schedules from ERPNext:', e);
        return [];
      }
    }
    return null;
  }

  async getWorkOrderMaintenanceChecklists(workOrder) {
    try {
      return await this.callIslandChillMethod('get_work_order_maintenance_checklists', { work_order: workOrder });
    } catch (e) {
      console.error(`Failed to get maintenance checklists for ${workOrder}:`, e);
      throw e;
    }
  }

  async getMaintenanceDashboardStats(workOrder = null) {
    try {
      const params = workOrder ? { work_order: workOrder } : {};
      return await this.callIslandChillMethod('get_maintenance_dashboard_stats', params);
    } catch (e) {
      console.error('Failed to get maintenance dashboard stats:', e);
      return { total_checklists: 0, equipment_monitored: 0, total_task_checks: 0, last_activity: null };
    }
  }

  async getMaintenanceLogHistory(workOrder = null, limit = 50, start = 0) {
    try {
      const params = { limit, start };
      if (workOrder && workOrder !== 'all') params.work_order = workOrder;
      return await this.callIslandChillMethod('get_maintenance_log_history', params);
    } catch (e) {
      console.error('Failed to get maintenance log history:', e);
      return [];
    }
  }

  // Create Daily Preventative Maintenance Schedule
  async createMaintenanceSchedule(scheduleData) {
    if (this.connection.isLive) {
      const checklistItems = (scheduleData.tasks || []).map((task, idx) => {
        const isChecked = !!(scheduleData.checkgrid && scheduleData.checkgrid[idx]);
        const remarkVal = (scheduleData.remarks && scheduleData.remarks[idx]) || '';
        const stdTime = scheduleData.stdTimes && scheduleData.stdTimes[idx] !== undefined
          ? scheduleData.stdTimes[idx]
          : (typeof task.std === 'number' ? task.std : (parseInt(task.std || '0') || 0));
        return {
          description: task.desc || task.description || '',
          standard_time_mins: stdTime,
          pass__fail: isChecked ? 'Pass' : 'Fail',
          completed: isChecked,
          remarks: remarkVal,
        };
      });

      try {
        const res = await this.callIslandChillMethod('create_daily_pm_schedule', {
          equipment: scheduleData.equipment,
          area: scheduleData.area,
          work_order: scheduleData.workOrder || scheduleData.work_order || '',
          operator: scheduleData.operator || 'Administrator',
          supervisor: scheduleData.supervisor || 'Administrator',
          overall_remarks: scheduleData.overallComments || '',
          maintenance_details: JSON.stringify(checklistItems),
          week_no: scheduleData.weekNo || '',
          from_date: scheduleData.fromDate || new Date().toISOString().slice(0, 10),
          to_date: scheduleData.toDate || new Date().toISOString().slice(0, 10),
        });
        if (res && res.name) {
          return { success: true, name: res.name };
        }
        throw new Error(res?.message || 'Failed to create Daily PM Schedule');
      } catch (err) {
        console.error('Failed to create Daily Preventative Maintenance Schedule on ERPNext:', err);
        throw err;
      }
    }
    return { success: true, name: `MAINT-${Date.now().toString().slice(-6)}` };
  }

  // Fetch Maintenance Templates from API method
  async getMaintenanceTemplates() {
    if (this.connection.isLive) {
      try {
        const { url } = this.connection;
        const baseUrl = this.resolveUrl(url);
        const headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        const auth = this.getAuthHeader();
        if (auth) {
          headers['Authorization'] = auth;
        } else {
          const csrfToken =
            window.csrf_token ||
            window.frappe?.csrf_token ||
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

          if (csrfToken) {
            headers['X-Frappe-CSRF-Token'] = csrfToken;
            headers['X-CSRF-Token'] = csrfToken;
          }
        }

        const response = await fetch(`${baseUrl}/api/method/islandchill.api.maintenance_template.get_maintenance_templates`, {
          method: 'GET',
          headers,
          credentials: 'include'
        });

        if (!response.ok) {
          let message = `Failed to fetch maintenance templates: ${response.statusText}`;
          try {
            const errData = await response.json();
            message = errData.exception || errData.message || errData._server_messages || message;
          } catch { }
          throw new Error(this.cleanFrappeError(message));
        }

        const res = await response.json();
        return res.message || res;
      } catch (e) {
        console.error('Failed to fetch Maintenance Templates from ERPNext:', e);
        throw e;
      }
    }
    return null;
  }

  // Fetch Job Cards for a Work Order
  async getJobCardsForWorkOrder(workOrderId) {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Job Card', {
          fields: ['name', 'operation', 'workstation', 'status', 'remarks', 'for_quantity', 'total_completed_qty', 'is_paused'],
          filters: [
            ['work_order', '=', workOrderId]
          ],
          limit: 100
        });

        if (res && res.length > 0) {
          return await Promise.all(res.map(async (jc) => {
            // Keep ERPNext Job Card status names in the frontend.
            // ERPNext valid statuses include: Open, Work In Progress, Material Transferred, On Hold, Submitted, Cancelled, Completed.
            let appStatus = jc.status || 'Open';
            if (appStatus === 'Work in Progress') appStatus = 'Work In Progress';

            let remarksList = [];
            try {
              const comments = await this.getJobCardComments(jc.name);
              remarksList = (comments || []).map((c) => ({
                timestamp: c.timestamp || (c.creation ? String(c.creation).replace('T', ' ').substring(0, 19) : ''),
                operator: c.operator || c.owner || 'ERPNext User',
                text: this.cleanFrappeError(c.text || c.content || '')
              })).filter(r => r.text);
            } catch (commentErr) {
              console.warn(`Failed to load comments for Job Card ${jc.name}:`, commentErr);
            }

            if (remarksList.length === 0 && jc.remarks) {
              remarksList = [{ timestamp: '', operator: 'System', text: jc.remarks }];
            }

            return {
              id: jc.name,
              operation: jc.operation,
              station: jc.workstation,
              status: appStatus,
              operator: '',
              remarks: jc.remarks || '',
              forQuantity: Number(jc.for_quantity || 0),
              totalCompletedQty: Number(jc.total_completed_qty || 0),
              is_paused: jc.is_paused || 0,
              remarksList
            };
          }));
        }
      } catch (e) {
        console.error(`Failed to fetch Job Cards for Work Order ${workOrderId}:`, e);
      }
    }
    return null;
  }

  // Fetch Sales Invoices
  async getSalesInvoices(limit = 20, start = 0) {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Sales Invoice', {
          fields: ['name', 'customer', 'posting_date', 'posting_time', 'due_date', 'grand_total', 'status', 'docstatus'],
          limit,
          start,
          order_by: 'creation desc'
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Sales Invoices from ERPNext:', e);
        throw e;
      }
    }
    // Mock Sales Invoices
    const mockInvoices = [
      { name: 'ACC-SINV-2026-00001', customer: 'Fiji Retailers Ltd', posting_date: '2026-06-01', posting_time: '10:30:00', due_date: '2026-07-01', grand_total: 1250.00, status: 'Unpaid', docstatus: 1 },
      { name: 'ACC-SINV-2026-00002', customer: 'Suva Distributors', posting_date: '2026-06-02', posting_time: '11:15:00', due_date: '2026-07-02', grand_total: 3400.50, status: 'Paid', docstatus: 1 },
      { name: 'ACC-SINV-2026-00003', customer: 'Island Resort Group', posting_date: '2026-06-03', posting_time: '14:20:00', due_date: '2026-07-03', grand_total: 980.00, status: 'Draft', docstatus: 0 },
      { name: 'ACC-SINV-2026-00004', customer: 'Nadi Supermarket', posting_date: '2026-06-04', posting_time: '09:00:00', due_date: '2026-07-04', grand_total: 5120.00, status: 'Unpaid', docstatus: 1 }
    ];
    return mockInvoices.slice(start, start + limit);
  }

  // Fetch Sales Invoice Details
  async getSalesInvoiceDetails(invoiceId) {
    if (this.connection.isLive) {
      try {
        const res = await this.makeRequest('GET', 'Sales Invoice', invoiceId);
        return res?.data;
      } catch (e) {
        console.error(`Failed to fetch Sales Invoice ${invoiceId}:`, e);
        throw e;
      }
    }
    // Mock invoice details
    return {
      name: invoiceId,
      customer: invoiceId.endsWith('01') ? 'Fiji Retailers Ltd' : invoiceId.endsWith('02') ? 'Suva Distributors' : invoiceId.endsWith('03') ? 'Island Resort Group' : 'Nadi Supermarket',
      posting_date: '2026-06-01',
      posting_time: '10:30:00',
      due_date: '2026-07-01',
      grand_total: 1250.00,
      net_total: 1100.00,
      total_taxes_and_charges: 150.00,
      status: 'Unpaid',
      docstatus: 1,
      items: [
        { item_code: 'IC-500ML-PET', item_name: 'Island Chill 500ml PET', qty: 50, rate: 12.00, amount: 600.00, warehouse: 'Finished Goods - CWFL' },
        { item_code: 'IC-1L-PET', item_name: 'Island Chill 1L PET', qty: 25, rate: 20.00, amount: 500.00, warehouse: 'Finished Goods - CWFL' }
      ]
    };
  }

  // Create Sales Invoice
  async createSalesInvoice(invoiceData) {
    if (this.connection.isLive) {
      try {
        const payload = {
          customer: invoiceData.customer,
          posting_date: invoiceData.postingDate,
          due_date: invoiceData.dueDate || invoiceData.postingDate,
          company: invoiceData.company || this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited',
          docstatus: invoiceData.docstatus || 1, // 0 for Draft, 1 for Submitted
          items: invoiceData.items.map(item => ({
            item_code: item.code,
            qty: Number(item.qty),
            rate: Number(item.rate),
            warehouse: item.warehouse || "Finished Goods - AD"
          }))
        };
        const response = await this.makeRequest('POST', 'Sales Invoice', '', payload);
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Sales Invoice on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `ACC-SINV-2026-${Date.now().toString().slice(-5)}` };
  }

  // Amend/Update Sales Invoice
  async amendSalesInvoice(invoiceId, invoiceData) {
    if (this.connection.isLive) {
      try {
        // In ERPNext, to amend a submitted document, you cancel the old one and create a new amended one.
        // For simplicity, we perform a standard PUT if updating a Draft, or simulate cancellation/amendment
        const payload = {
          customer: invoiceData.customer,
          posting_date: invoiceData.postingDate,
          due_date: invoiceData.dueDate,
          items: invoiceData.items.map(item => ({
            item_code: item.code,
            qty: Number(item.qty),
            rate: Number(item.rate),
            warehouse: item.warehouse || "Finished Goods - AD"
          }))
        };
        const response = await this.makeRequest('PUT', 'Sales Invoice', invoiceId, payload);
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error(`Failed to amend Sales Invoice ${invoiceId}:`, e);
        throw e;
      }
    }
    return { success: true, name: invoiceId };
  }

  // Fetch Delivery Notes
  async getDeliveryNotes(limit = 20, start = 0) {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Delivery Note', {
          fields: ['name', 'customer', 'posting_date', 'posting_time', 'grand_total', 'status', 'docstatus'],
          limit,
          start,
          order_by: 'creation desc'
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Delivery Notes from ERPNext:', e);
        throw e;
      }
    }
    // Mock Delivery Notes
    const mockNotes = [
      { name: 'MAT-DN-2026-00001', customer: 'Fiji Retailers Ltd', posting_date: '2026-06-01', posting_time: '10:30:00', grand_total: 1100.00, status: 'To Bill', docstatus: 1 },
      { name: 'MAT-DN-2026-00002', customer: 'Suva Distributors', posting_date: '2026-06-02', posting_time: '11:15:00', grand_total: 3000.00, status: 'Completed', docstatus: 1 },
      { name: 'MAT-DN-2026-00003', customer: 'Island Resort Group', posting_date: '2026-06-03', posting_time: '14:20:00', grand_total: 800.00, status: 'Draft', docstatus: 0 }
    ];
    return mockNotes.slice(start, start + limit);
  }

  // Fetch Delivery Note Details
  async getDeliveryNoteDetails(noteId) {
    if (this.connection.isLive) {
      try {
        const res = await this.makeRequest('GET', 'Delivery Note', noteId);
        return res?.data;
      } catch (e) {
        console.error(`Failed to fetch Delivery Note ${noteId}:`, e);
        throw e;
      }
    }
    // Mock Delivery Note details
    return {
      name: noteId,
      customer: noteId.endsWith('01') ? 'Fiji Retailers Ltd' : noteId.endsWith('02') ? 'Suva Distributors' : 'Island Resort Group',
      posting_date: '2026-06-01',
      posting_time: '10:30:00',
      grand_total: 1100.00,
      status: 'To Bill',
      docstatus: 1,
      items: [
        { item_code: 'IC-500ML-PET', item_name: 'Island Chill 500ml PET', qty: 50, rate: 12.00, amount: 600.00, warehouse: 'Finished Goods - CWFL' },
        { item_code: 'IC-1L-PET', item_name: 'Island Chill 1L PET', qty: 25, rate: 20.00, amount: 500.00, warehouse: 'Finished Goods - CWFL' }
      ]
    };
  }

  // Create Delivery Note
  async createDeliveryNote(noteData) {
    if (this.connection.isLive) {
      try {
        const payload = {
          customer: noteData.customer,
          posting_date: noteData.postingDate,
          company: noteData.company || this.connection.defaultCompany || 'Carpenters Waters (Fiji) PTE Limited',
          docstatus: noteData.docstatus || 1,
          items: noteData.items.map(item => ({
            item_code: item.code,
            qty: Number(item.qty),
            rate: Number(item.rate),
            warehouse: item.warehouse || "Finished Goods - AD"
          }))
        };
        const response = await this.makeRequest('POST', 'Delivery Note', '', payload);
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Delivery Note on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `MAT-DN-2026-${Date.now().toString().slice(-5)}` };
  }

  // Amend/Update Delivery Note
  async amendDeliveryNote(noteId, noteData) {
    if (this.connection.isLive) {
      try {
        const payload = {
          customer: noteData.customer,
          posting_date: noteData.postingDate,
          items: noteData.items.map(item => ({
            item_code: item.code,
            qty: Number(item.qty),
            rate: Number(item.rate),
            warehouse: item.warehouse || "Finished Goods - AD"
          }))
        };
        const response = await this.makeRequest('PUT', 'Delivery Note', noteId, payload);
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error(`Failed to amend Delivery Note ${noteId}:`, e);
        throw e;
      }
    }
    return { success: true, name: noteId };
  }

  // Fetch Customers for autocomplete
  async getCustomers(searchQuery = '', limit = 50) {
    if (this.connection.isLive) {
      try {
        const filters = searchQuery ? [['customer_name', 'like', `%${searchQuery}%`]] : undefined;
        const res = await this.fetchERP('Customer', {
          fields: ['name', 'customer_name'],
          filters,
          limit
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Customers from ERPNext:', e);
        return [];
      }
    }
    // Mock Customers
    const mockCustomers = [
      { name: 'CUST-00001', customer_name: 'Fiji Retailers Ltd' },
      { name: 'CUST-00002', customer_name: 'Suva Distributors' },
      { name: 'CUST-00003', customer_name: 'Island Resort Group' },
      { name: 'CUST-00004', customer_name: 'Nadi Supermarket' },
      { name: 'CUST-00005', customer_name: 'MH Supermarkets Fiji' }
    ];
    if (searchQuery) {
      return mockCustomers.filter(c => c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return mockCustomers;
  }

  // Fetch Items for child table autocomplete lookup
  async getItemsSearch(searchQuery = '', limit = 50) {
    if (this.connection.isLive) {
      try {
        const filters = searchQuery ? [
          ['item_code', 'like', `%${searchQuery}%`]
        ] : undefined;
        const res = await this.fetchERP('Item', {
          fields: ['name', 'item_code', 'item_name', 'stock_uom'],
          filters,
          limit
        });
        return res ? res.map(i => ({ code: i.item_code, name: i.item_name, unit: i.stock_uom })) : [];
      } catch (e) {
        console.error('Failed to fetch Items search from ERPNext:', e);
        return [];
      }
    }
    const mockItems = [
      { code: 'IC-500ML-PET', name: 'Island Chill 500ml PET', unit: 'Box' },
      { code: 'IC-1L-PET', name: 'Island Chill 1L PET', unit: 'Box' },
      { code: 'RUM-COLA-500', name: 'RUM Cola 500ml Can', unit: 'Box' },
      { code: 'RUM-COLA-330', name: 'RUM Cola 330ml Can', unit: 'Box' }
    ];
    if (searchQuery) {
      return mockItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.code.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return mockItems;
  }

  // Fetch Item Price list rate
  async getItemPrice(itemCode) {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Item Price', {
          fields: ['price_list_rate'],
          filters: [
            ['item_code', '=', itemCode],
            ['price_list', '=', 'Standard Selling']
          ],
          limit: 1
        });
        if (res && res.length > 0) {
          return Number(res[0].price_list_rate || 0);
        }
      } catch (e) {
        console.warn(`Failed to fetch price list rate for ${itemCode} from ERPNext:`, e);
      }
    }
    // Mock prices
    const prices = {
      'IC-500ML-PET': 12.00,
      'IC-1L-PET': 20.00,
      'RUM-COLA-500': 15.50,
      'RUM-COLA-330': 11.20
    };
    return prices[itemCode] || 10.00;
  }

  // Fetch Warehouses for autocomplete lookup
  async getWarehouses(searchQuery = '', company = '', limit = 50) {
    if (this.connection.isLive) {
      try {
        const res = await this.callIslandChillMethod('get_warehouses_list', { company });
        let warehouses = (res || []).filter(w => !w.is_group || w.is_group === 0 || w.is_group === '0');
        if (searchQuery && warehouses.length > 0) {
          const q = searchQuery.toLowerCase();
          warehouses = warehouses.filter(w => (w.warehouse_name || w.name || '').toLowerCase().includes(q));
        }
        return warehouses;
      } catch (e) {
        console.error('Failed to fetch Warehouses from ERPNext:', e);
        return [];
      }
    }
    // Mock Warehouses
    const mockWarehouses = [
      { name: 'Finished Goods - CWFL', warehouse_name: 'Finished Goods - CWFL', company: 'CWFL' },
      { name: 'Raw Materials - CWFL', warehouse_name: 'Raw Materials - CWFL', company: 'CWFL' },
      { name: 'Stores - AD', warehouse_name: 'Stores - AD', company: 'Carpenters Waters (Fiji) PTE Limited' },
      { name: 'Work In Progress - AD', warehouse_name: 'Work In Progress - AD', company: 'Carpenters Waters (Fiji) PTE Limited' }
    ];
    let filtered = mockWarehouses;
    if (company) {
      filtered = filtered.filter(w => w.company === company);
    }
    if (searchQuery) {
      filtered = filtered.filter(w => w.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }

  // Create custom Cleaning and Sanitation log record
  async createCleaningSanitationRecord(doctype, data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', doctype, '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error(`Failed to create ${doctype} on ERPNext:`, e);
        throw e;
      }
    }
    return { success: true, name: `CS-${doctype.replace(/\s+/g, '-').slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}` };
  }

  // Create Standard Form 17 For First Aid record
  async createFirstAidRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Standard Form 17 For First Aid', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Standard Form 17 For First Aid on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `SAF-FA-${Date.now().toString().slice(-6)}` };
  }

  // Create Enviromental Swab Test record
  async createSwabTestRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Enviromental Swab Test', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Enviromental Swab Test on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `SAF-SWAB-${Date.now().toString().slice(-6)}` };
  }

  // Create Induction record
  async createInductionRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Induction', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Induction on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `SAF-IND-${Date.now().toString().slice(-6)}` };
  }

  // Create Injury Report record
  async createInjuryRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Injury Report', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Injury Report on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `SAF-INJ-${Date.now().toString().slice(-6)}` };
  }

  // Create Accident and Disease Notification Report record
  async createAccidentDiseaseReport(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Accident and Disease Notification Report', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Accident and Disease Notification Report on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `SAF-ADR-${Date.now().toString().slice(-6)}` };
  }

  // Create Microbiological Analysis of Primary Raw Materials record
  async createRawMaterialsMicroRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Microbiological Analysis of Primary Raw Materials', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Microbiological Analysis of Primary Raw Materials on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `LAB-SF1-${Date.now().toString().slice(-6)}` };
  }

  // Fetch Incubator Test Type records
  async getIncubatorTestTypes() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Incubator Test Type', {
          fields: ['test_type'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Incubator Test Type from ERPNext:', e);
        return [];
      }
    }
    // Return static mock data in offline simulation
    return [
      { test_type: 'PET Preforms (Raw)' },
      { test_type: 'HDPE Closures (Raw)' },
      { test_type: 'BIB Inner Bag / Film (Raw)' }
    ];
  }

  // Create Chemical Test record
  async createChemicalTestRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Chemical Test', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Chemical Test on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `LAB-SF9-${Date.now().toString().slice(-6)}` };
  }

  // Fetch Sample List records
  async getSampleList() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Sample List', {
          fields: ['name', 'sample'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Sample List from ERPNext:', e);
        return [];
      }
    }
    // Return static mock data in offline simulation
    return [
      { name: 'Silver Ion Water', sample_name: 'Silver Ion Water' },
      { name: 'BH (Bore Hole) Water', sample_name: 'BH (Bore Hole) Water' },
      { name: '0.45um Filter Water', sample_name: '0.45um Filter Water' }
    ];
  }

  // Create Microbiological Analysis Raw and Product Water record
  async createWaterMicroRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Microbiologiocal Analysis Raw and Product Water', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Microbiological Analysis Raw and Product Water on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `LAB-SF11-${Date.now().toString().slice(-6)}` };
  }

  // Fetch Taste Result Time records
  async getTasteResultTimes() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Taste Result Time', {
          fields: ['name'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Taste Result Time from ERPNext:', e);
        return [];
      }
    }
    return [{ name: '4h' }, { name: '36h' }, { name: '72h' }];
  }

  // Fetch Visual Inspection Day records
  async getVisualInspectionDays() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Visual Inspection Day', {
          fields: ['name'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Visual Inspection Day from ERPNext:', e);
        return [];
      }
    }
    return [{ name: '5d' }, { name: '10d' }, { name: '30d' }];
  }

  // Create Taste Test and Visual Inspection record
  async createTasteVisualRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Taste Test and Visual Inspection', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Taste Test and Visual Inspection on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `LAB-SF21-${Date.now().toString().slice(-6)}` };
  }

  // Create Silver Photometer Log and Calibration record
  async createSilverPhotometerRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Silver Photometer Log and Calibration', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Silver Photometer Log and Calibration on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `LAB-SF103-${Date.now().toString().slice(-6)}` };
  }

  // Create Bourbon Whiskey And Cola Product Tank Record
  async createBourbonColaRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Bourbon Whiskey And Cola Product Tank Record', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Bourbon Whiskey And Cola Product Tank Record on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `LAB-SF36-${Date.now().toString().slice(-6)}` };
  }

  // Create Daily Production And Handover Record
  async createHandoverRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Daily Production And Handover Record', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Daily Production And Handover Record on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `LAB-SF100-${Date.now().toString().slice(-6)}` };
  }

  // Create Weight Check Record
  async createWeightCheckRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'For Weight Check Checklist', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create For Weight Check Checklist record on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `MAINT-SF88-${Date.now().toString().slice(-6)}` };
  }

  // Create Machine Breakdown Record
  async createBreakdownRecord(data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('POST', 'Machine Breakdown', '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error('Failed to create Machine Breakdown record on ERPNext:', e);
        throw e;
      }
    }
    return { success: true, name: `MAINT-SOP002-${Date.now().toString().slice(-6)}` };
  }

  // Fetch Toilet Cleaning purpose records
  async getToiletCleaningPurposes() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Toilet Cleaning purpose', {
          fields: ['name'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Toilet Cleaning purpose from ERPNext:', e);
        return [];
      }
    }
    return [{ name: 'Regular cleaning' }];
  }

  // Create custom Cleaning and Sanitation log record via RPC ignore_permissions
  async createCleaningSanitationRecord(doctype, data) {
    try {
      const res = await this.callIslandChillMethod('create_cleaning_sanitation_log', {
        doctype,
        payload: { ...data, docstatus: 1 }
      });
      if (res && (res.name || res.doc)) {
        return { success: true, name: res.name || (res.doc ? res.doc.name : `CS-${Date.now().toString().slice(-6)}`) };
      }
    } catch (e) {
      console.error(`RPC create_cleaning_sanitation_log for ${doctype} error:`, e);
    }
    return { success: true, name: `CS-${Date.now().toString().slice(-6)}` };
  }

  // Create Toilet Cleaning purpose record
  async createToiletCleaningPurpose(data) {
    return this.createCleaningSanitationRecord('Toilet Cleaning purpose', data);
  }

  // Create Cleaning of Toilets record
  async createToiletCleaningRecord(data) {
    return this.createCleaningSanitationRecord('Cleaning of Toilets', data);
  }

  // Fetch Dining Room Cleaning Purpose records
  async getDiningRoomCleaningPurposes() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Dining Room Cleaning Purpose', {
          fields: ['name'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Dining Room Cleaning Purpose from ERPNext:', e);
        return [];
      }
    }
    return [{ name: 'Regular cleaning' }];
  }

  // Create Dining Room Cleaning Purpose record
  async createDiningRoomCleaningPurpose(data) {
    return this.createCleaningSanitationRecord('Dining Room Cleaning Purpose', data);
  }

  // Create Cleaning of Dining Room record
  async createDiningRoomCleaningRecord(data) {
    return this.createCleaningSanitationRecord('Cleaning of Dining Room', data);
  }

  // Fetch Factory Floor Cleaning Purpose records
  async getFactoryFloorCleaningPurposes() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Factory Floor Cleaning Purpose', {
          fields: ['name'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Factory Floor Cleaning Purpose from ERPNext:', e);
        return [];
      }
    }
    return [{ name: 'Regular cleaning' }];
  }

  // Create Factory Floor Cleaning Purpose record
  async createFactoryFloorCleaningPurpose(data) {
    return this.createCleaningSanitationRecord('Factory Floor Cleaning Purpose', data);
  }

  // Create Factory Floor cleaning record
  async createFactoryFloorCleaningRecord(data) {
    return this.createCleaningSanitationRecord('Factory Floor', data);
  }

  // Fetch Lab and Office Cleaning Purpose records
  async getLabOfficeCleaningPurposes() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Lab and Office Cleaning Purpose', {
          fields: ['name'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Lab and Office Cleaning Purpose from ERPNext:', e);
        return [];
      }
    }
    return [{ name: 'Regular cleaning' }];
  }

  // Create Lab and Office Cleaning Purpose record
  async createLabOfficeCleaningPurpose(data) {
    return this.createCleaningSanitationRecord('Lab and Office Cleaning Purpose', data);
  }

  // Create Cleaning of Lab and Office record
  async createLabOfficeCleaningRecord(data) {
    return this.createCleaningSanitationRecord('Cleaning of Lab and Office', data);
  }

  // Create Incubator Temperature Record
  async createIncubatorTemperatureRecord(data) {
    return this.createCleaningSanitationRecord('Incubator Temperature Record', data);
  }

  // Fetch Equipment List records
  async getEquipmentList() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Equipment List', {
          fields: ['name'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Equipment List from ERPNext:', e);
        return [];
      }
    }
    return [
      { name: 'Syrup Tank' },
      { name: 'Filling Valves' },
      { name: 'Capping Machine' },
      { name: 'Pipes' },
      { name: 'Bottle Conveyor' }
    ];
  }

  // Fetch Chemical Test records
  async getChemicalTests() {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP('Chemical Test', {
          fields: ['name'],
          limit: 100
        });
        return res || [];
      } catch (e) {
        console.error('Failed to fetch Chemical Test from ERPNext:', e);
        return [];
      }
    }
    return [{ name: 'CHEM-00001' }];
  }

  // Create Balance Check or Callibration record
  async createBalanceCheckRecord(data) {
    return this.createCleaningSanitationRecord('Balance Check or Callibration', data);
  }

  // Create Equipment Sanitation & CIP record
  async createEquipmentSanitationCIP(data) {
    return this.createCleaningSanitationRecord('equipment sanitation and cip', data);
  }

  // Fetch past logs for custom Cleaning and Sanitation DocTypes
  async getCleaningSanitationRecords(doctype, limit = 50, start = 0) {
    if (this.connection.isLive) {
      try {
        const res = await this.fetchERP(doctype, {
          fields: ['*'],
          limit,
          start,
          order_by: 'creation desc'
        });
        return res || [];
      } catch (e) {
        console.error(`Failed to fetch ${doctype} from ERPNext:`, e);
        throw e;
      }
    }
    return null;
  }

  // Create custom Cleaning and Sanitation log record via RPC ignore_permissions
  async createCleaningSanitationRecord(doctype, data) {
    if (this.connection.isLive) {
      try {
        const res = await this.callIslandChillMethod('create_cleaning_sanitation_log', {
          doctype,
          payload: { ...data, docstatus: 1 }
        });
        if (res && res.name) return { success: true, name: res.name };
      } catch (e) {
        console.warn(`RPC create_cleaning_sanitation_log for ${doctype} failed, falling back to POST:`, e);
      }
      try {
        const response = await this.makeRequest('POST', doctype, '', {
          ...data,
          docstatus: 1
        });
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error(`Failed to create ${doctype} on ERPNext:`, e);
        throw e;
      }
    }
    return { success: true, name: `CS-${Date.now().toString().slice(-6)}` };
  }

  // Update/amend custom Cleaning and Sanitation log record
  async updateCleaningSanitationRecord(doctype, name, data) {
    if (this.connection.isLive) {
      try {
        const response = await this.makeRequest('PUT', doctype, name, data);
        return { success: true, name: response.data.name };
      } catch (e) {
        console.error(`Failed to update ${doctype} on ERPNext:`, e);
        throw e;
      }
    }
    return { success: true, name };
  }

  // Delete custom Cleaning and Sanitation log record
  async deleteCleaningSanitationRecord(doctype, name) {
    if (this.connection.isLive) {
      try {
        await this.makeRequest('DELETE', doctype, name);
        return { success: true };
      } catch (e) {
        console.error(`Failed to delete ${doctype} from ERPNext:`, e);
        throw e;
      }
    }
    return { success: true };
  }

  // Fetch all Cleaning & Sanitation records across all 7 DocTypes
  async fetchAllCleaningRecords() {
    try {
      const res = await this.callIslandChillMethod('get_all_cleaning_records');
      if (res && Array.isArray(res)) {
        return res;
      }
    } catch (e) {
      console.warn('Backend RPC get_all_cleaning_records failed, falling back to fetchERP:', e);
    }

    const doctypes = [
      'Cleaning of Toilets',
      'Cleaning of Dining Room',
      'Factory Floor',
      'Cleaning of Lab and Office',
      'Incubator Temperature Record',
      'Balance Check or Callibration',
      'equipment sanitation and cip'
    ];

    try {
      const results = await Promise.allSettled(
        doctypes.map(dt => this.fetchERP(dt, { fields: ['*'], limit: 100, order_by: 'creation desc' }))
      );

      const allRecords = [];
      results.forEach((res, index) => {
        const dt = doctypes[index];
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          res.value.forEach(item => {
            allRecords.push({
              id: item.name,
              name: item.name,
              type: dt,
              timestamp: item.creation || item.modified || new Date().toISOString(),
              status: item.sanitation_result || item.status || 'Clean',
              cleaner: item.duties_performed_by || item.performed_by_operator || item.checked_by || 'Staff',
              supervisor: item.checked_by || item.verified_by_supervisor || item.verified_by || '',
              posting_date: item.date || (item.creation ? item.creation.split(' ')[0] : ''),
              posting_time: item.time || (item.creation ? item.creation.split(' ')[1] : ''),
              details: item
            });
          });
        }
      });

      allRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return allRecords;
    } catch (e) {
      console.error('Failed to fetch all cleaning records from ERPNext:', e);
      return [];
    }
  }


  async getWorkOrderDashboard(limit = 20, start = 0, company = '', status = '') {
    const baseUrl = this.resolveUrl(this.connection.url);
    const companyQuery = company ? `&company=${encodeURIComponent(company)}` : '';
    const statusQuery = status ? `&status=${encodeURIComponent(status)}` : '';

    const response = await fetch(
      `${baseUrl}/api/method/islandchill.api.manufacturing.get_work_order_dashboard?limit=${limit}&start=${start}${companyQuery}${statusQuery}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard");
    }

    const json = await response.json();

    return json.message;
  }
}

export const frappe = new FrappeService();


