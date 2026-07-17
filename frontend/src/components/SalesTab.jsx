import React, { useState, useEffect } from 'react';
import { frappe } from '../services/frappe';

const convertNumberToWords = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  let str = '';
  const parts = Number(num).toFixed(2).split('.');
  const dollars = parseInt(parts[0], 10);
  const cents = parseInt(parts[1], 10);

  if (dollars === 0) {
    str = 'Zero Dollars';
  } else {
    const convertChunk = (n) => {
      let chunkStr = '';
      if (n >= 100) {
        chunkStr += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        chunkStr += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        chunkStr += ones[n] + ' ';
      }
      return chunkStr.trim();
    };

    let tempDollars = dollars;
    let scaleIdx = 0;
    let dollarWords = '';

    while (tempDollars > 0) {
      const chunk = tempDollars % 1000;
      if (chunk > 0) {
        const chunkWords = convertChunk(chunk);
        dollarWords = chunkWords + ' ' + (scales[scaleIdx] ? scales[scaleIdx] + ' ' : '') + dollarWords;
      }
      tempDollars = Math.floor(tempDollars / 1000);
      scaleIdx++;
    }
    str = dollarWords.trim() + ' Dollars';
  }

  if (cents > 0) {
    let centWords = '';
    if (cents < 20) {
      centWords = ones[cents];
    } else {
      centWords = tens[Math.floor(cents / 10)] + (cents % 10 > 0 ? '-' + ones[cents % 10] : '');
    }
    str += ' and ' + centWords + ' Cents';
  } else {
    str += ' and Zero Cents';
  }

  return str + ' Only';
};


export function SalesInvoiceFormModal({ onClose, onSubmit, products, initialData = null, loading = false }) {
  const [customer, setCustomer] = useState(initialData?.customer || '');
  const [postingDate, setPostingDate] = useState(initialData?.posting_date || new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(initialData?.due_date || new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState(initialData?.items || [{ item_code: products[0]?.code || '', qty: 10, rate: 10.00 }]);

  // Customer Autocomplete States
  const [customerSearch, setCustomerSearch] = useState(initialData?.customer || '');
  const [customerList, setCustomerList] = useState([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Item Autocomplete States
  const [itemSearchText, setItemSearchText] = useState({}); // { [idx]: string }
  const [itemSuggestions, setItemSuggestions] = useState({}); // { [idx]: Array }
  const [activeItemRow, setActiveItemRow] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      const res = await frappe.getCustomers(customerSearch);
      setCustomerList(res || []);
    };
    if (customerSearch.length > 0) {
      const delayDebounceFn = setTimeout(() => {
        fetchCustomers();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setCustomerList([]);
    }
  }, [customerSearch]);

  const handleSearchItem = async (idx, query) => {
    setItemSearchText(prev => ({ ...prev, [idx]: query }));
    setActiveItemRow(idx);
    const res = await frappe.getItemsSearch(query);
    setItemSuggestions(prev => ({ ...prev, [idx]: res || [] }));
  };

  const selectItem = async (idx, selectedItem) => {
    const rate = await frappe.getItemPrice(selectedItem.code);
    const updated = items.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          item_code: selectedItem.code,
          item_name: selectedItem.name,
          unit: selectedItem.unit || 'Nos',
          rate: rate
        };
      }
      return item;
    });
    setItems(updated);
    setItemSearchText(prev => ({ ...prev, [idx]: selectedItem.code }));
    setActiveItemRow(null);
  };

  const handleAddItem = () => {
    setItems([...items, { item_code: products[0]?.code || '', qty: 10, rate: 10.00 }]);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, key, val) => {
    const updated = items.map((item, i) => {
      if (i === idx) {
        return { ...item, [key]: val };
      }
      return item;
    });
    setItems(updated);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!customer) {
      alert("Please select a valid customer.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item.");
      return;
    }
    onSubmit({
      customer,
      postingDate,
      dueDate,
      items
    });
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => { setShowCustDropdown(false); setActiveItemRow(null); }}>
      <div className="modal-panel" style={{ width: '800px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
            {initialData ? '✏️ Amend Sales Invoice' : '📝 Create Sales Invoice'}
          </h3>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleFormSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <label className="input-label">Customer Name *</label>
                <input
                  type="text"
                  className="text-input"
                  required
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setCustomer(e.target.value); setShowCustDropdown(true); }}
                  onFocus={() => setShowCustDropdown(true)}
                  placeholder="Search Customer..."
                />
                {showCustDropdown && customerList.length > 0 && (
                  <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    {customerList.map(c => (
                      <div
                        key={c.name}
                        className="dropdown-item"
                        style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', color: '#111' }}
                        onClick={() => { setCustomerSearch(c.customer_name); setCustomer(c.customer_name); setShowCustDropdown(false); }}
                      >
                        🏢 {c.customer_name} ({c.name})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="input-label">Posting Date *</label>
                <input type="date" className="text-input" required value={postingDate} onChange={e => setPostingDate(e.target.value)} />
              </div>
              <div>
                <label className="input-label">Due Date *</label>
                <input type="date" className="text-input" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <h4 style={{ margin: 0, fontWeight: '700', color: 'var(--text-heading)' }}>Invoice Items</h4>
              <button type="button" className="secondary-btn" onClick={handleAddItem} style={{ padding: '4px 8px', fontSize: '11px' }}>+ Add Row</button>
            </div>

            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th>Item Code *</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Qty</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Rate ($)</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Amount</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="text-input"
                        style={{ padding: '4px' }}
                        required
                        placeholder="Search Item..."
                        value={itemSearchText[idx] !== undefined ? itemSearchText[idx] : item.item_code}
                        onChange={e => handleSearchItem(idx, e.target.value)}
                        onFocus={() => setActiveItemRow(idx)}
                      />
                      {activeItemRow === idx && itemSuggestions[idx] && itemSuggestions[idx].length > 0 && (
                        <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          {itemSuggestions[idx].map(p => (
                            <div
                              key={p.code}
                              className="dropdown-item"
                              style={{ padding: '6px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '11px', color: '#111' }}
                              onClick={() => selectItem(idx, p)}
                            >
                              📦 {p.name} ({p.code})
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="text-input"
                        style={{ padding: '4px', textAlign: 'center' }}
                        required
                        min="1"
                        value={item.qty}
                        onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="text-input"
                        style={{ padding: '4px', textAlign: 'right' }}
                        required
                        min="0"
                        value={item.rate}
                        onChange={e => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0.0)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', paddingRight: '8px' }}>
                      ${Number(item.qty * item.rate).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" onClick={() => handleRemoveItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>
              {loading ? (
                <>
                  <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '6px' }}></span>
                  Submitting...
                </>
              ) : (initialData ? 'Save & Submit Amended Invoice' : 'Save & Submit Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function DeliveryNoteFormModal({ onClose, onSubmit, products, initialData = null, loading = false }) {
  const [customer, setCustomer] = useState(initialData?.customer || '');
  const [postingDate, setPostingDate] = useState(initialData?.posting_date || new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState(initialData?.items || [{ item_code: products[0]?.code || '', qty: 10, warehouse: 'Finished Goods - CWFL' }]);

  // Customer Autocomplete States
  const [customerSearch, setCustomerSearch] = useState(initialData?.customer || '');
  const [customerList, setCustomerList] = useState([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Item Autocomplete States
  const [itemSearchText, setItemSearchText] = useState({}); // { [idx]: string }
  const [itemSuggestions, setItemSuggestions] = useState({}); // { [idx]: Array }
  const [activeItemRow, setActiveItemRow] = useState(null);

  // Warehouse Autocomplete States
  const [whSearchText, setWhSearchText] = useState({}); // { [idx]: string }
  const [whSuggestions, setWhSuggestions] = useState({}); // { [idx]: Array }
  const [activeWhRow, setActiveWhRow] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      const res = await frappe.getCustomers(customerSearch);
      setCustomerList(res || []);
    };
    if (customerSearch.length > 0) {
      const delayDebounceFn = setTimeout(() => {
        fetchCustomers();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setCustomerList([]);
    }
  }, [customerSearch]);

  const handleSearchItem = async (idx, query) => {
    setItemSearchText(prev => ({ ...prev, [idx]: query }));
    setActiveItemRow(idx);
    const res = await frappe.getItemsSearch(query);
    setItemSuggestions(prev => ({ ...prev, [idx]: res || [] }));
  };

  const selectItem = (idx, selectedItem) => {
    const updated = items.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          item_code: selectedItem.code,
          item_name: selectedItem.name,
          unit: selectedItem.unit || 'Nos'
        };
      }
      return item;
    });
    setItems(updated);
    setItemSearchText(prev => ({ ...prev, [idx]: selectedItem.code }));
    setActiveItemRow(null);
  };

  const handleSearchWh = async (idx, query) => {
    setWhSearchText(prev => ({ ...prev, [idx]: query }));
    setActiveWhRow(idx);
    const res = await frappe.getWarehouses(query);
    setWhSuggestions(prev => ({ ...prev, [idx]: res || [] }));
  };

  const selectWh = (idx, selectedWh) => {
    const updated = items.map((item, i) => {
      if (i === idx) {
        return { ...item, warehouse: selectedWh.name };
      }
      return item;
    });
    setItems(updated);
    setWhSearchText(prev => ({ ...prev, [idx]: selectedWh.name }));
    setActiveWhRow(null);
  };

  const handleAddItem = () => {
    setItems([...items, { item_code: products[0]?.code || '', qty: 10, warehouse: 'Finished Goods - CWFL' }]);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, key, val) => {
    const updated = items.map((item, i) => {
      if (i === idx) {
        return { ...item, [key]: val };
      }
      return item;
    });
    setItems(updated);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!customer) {
      alert("Please select a valid customer.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item.");
      return;
    }
    onSubmit({
      customer,
      postingDate,
      items
    });
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => { setShowCustDropdown(false); setActiveItemRow(null); setActiveWhRow(null); }}>
      <div className="modal-panel" style={{ width: '800px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
            {initialData ? '✏️ Amend Delivery Note' : '🚚 Create Delivery Note'}
          </h3>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleFormSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <label className="input-label">Customer Name *</label>
                <input
                  type="text"
                  className="text-input"
                  required
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setCustomer(e.target.value); setShowCustDropdown(true); }}
                  onFocus={() => setShowCustDropdown(true)}
                  placeholder="Search Customer..."
                />
                {showCustDropdown && customerList.length > 0 && (
                  <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    {customerList.map(c => (
                      <div
                        key={c.name}
                        className="dropdown-item"
                        style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', color: '#111' }}
                        onClick={() => { setCustomerSearch(c.customer_name); setCustomer(c.customer_name); setShowCustDropdown(false); }}
                      >
                        🏢 {c.customer_name} ({c.name})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="input-label">Posting Date *</label>
                <input type="date" className="text-input" required value={postingDate} onChange={e => setPostingDate(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <h4 style={{ margin: 0, fontWeight: '700', color: 'var(--text-heading)' }}>Shipment Items</h4>
              <button type="button" className="secondary-btn" onClick={handleAddItem} style={{ padding: '4px 8px', fontSize: '11px' }}>+ Add Row</button>
            </div>

            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th>Item Code *</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Qty</th>
                  <th>Source Warehouse *</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="text-input"
                        style={{ padding: '4px' }}
                        required
                        placeholder="Search Item..."
                        value={itemSearchText[idx] !== undefined ? itemSearchText[idx] : item.item_code}
                        onChange={e => handleSearchItem(idx, e.target.value)}
                        onFocus={() => setActiveItemRow(idx)}
                      />
                      {activeItemRow === idx && itemSuggestions[idx] && itemSuggestions[idx].length > 0 && (
                        <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          {itemSuggestions[idx].map(p => (
                            <div
                              key={p.code}
                              className="dropdown-item"
                              style={{ padding: '6px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '11px', color: '#111' }}
                              onClick={() => selectItem(idx, p)}
                            >
                              📦 {p.name} ({p.code})
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="text-input"
                        style={{ padding: '4px', textAlign: 'center' }}
                        required
                        min="1"
                        value={item.qty}
                        onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="text-input"
                        style={{ padding: '4px' }}
                        required
                        placeholder="Search Warehouse..."
                        value={whSearchText[idx] !== undefined ? whSearchText[idx] : item.warehouse}
                        onChange={e => handleSearchWh(idx, e.target.value)}
                        onFocus={() => setActiveWhRow(idx)}
                      />
                      {activeWhRow === idx && whSuggestions[idx] && whSuggestions[idx].length > 0 && (
                        <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          {whSuggestions[idx].map(w => (
                            <div
                              key={w.name}
                              className="dropdown-item"
                              style={{ padding: '6px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '11px', color: '#111' }}
                              onClick={() => selectWh(idx, w)}
                            >
                              🏢 {w.warehouse_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" onClick={() => handleRemoveItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>
              {loading ? (
                <>
                  <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '6px' }}></span>
                  Submitting...
                </>
              ) : (initialData ? 'Save & Submit Amended Delivery Note' : 'Save & Submit Delivery Note')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal for all 11 Cleaning & Sanitation forms

export default function SalesTab({
  salesInvoicesList,
  deliveryNotesList,
  setShowCreateInvoiceModal,
  setShowCreateDeliveryNoteModal,
  setShowAmendInvoiceModal,
  setShowAmendDeliveryNoteModal,
  salesLoading,
  setSalesLoading,
  selectedInvoice,
  setSelectedInvoice,
  selectedDeliveryNote,
  setSelectedDeliveryNote,
  salesSearchQuery,
  setSalesSearchQuery,
  salesInvoicePage,
  setSalesInvoicePage,
  deliveryNotePage,
  setDeliveryNotePage,
  salesSubTab,
  setSalesSubTab
}) {
            const filteredInvoices = salesInvoicesList.filter(inv =>
            inv.name.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
            inv.customer.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
            inv.status.toLowerCase().includes(salesSearchQuery.toLowerCase())
          );

          const filteredDeliveryNotes = deliveryNotesList.filter(dn =>
            dn.name.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
            dn.customer.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
            dn.status.toLowerCase().includes(salesSearchQuery.toLowerCase())
          );

          return (
            <div className="bom-tab-container">
              <div className="tab-title-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2>💰 Sales & Billing Operations</h2>
                  <p>Manage, invoice, and track finished goods shipments and invoice dispatches.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {salesSubTab === 'invoice' ? (
                    <button
                      className="primary-btn"
                      onClick={() => setShowCreateInvoiceModal(true)}
                      style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}
                    >
                      + Create Sales Invoice
                    </button>
                  ) : (
                    <button
                      className="primary-btn"
                      onClick={() => setShowCreateDeliveryNoteModal(true)}
                      style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}
                    >
                      + Create Delivery Note
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-tabs toggles */}
              <div className="sub-tabs-container" style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', marginBottom: '20px', paddingBottom: '2px' }}>
                <button
                  className={`tab-btn ${salesSubTab === 'invoice' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '700', border: 'none', borderBottom: salesSubTab === 'invoice' ? '3px solid var(--accent)' : 'none', background: 'none', cursor: 'pointer', color: salesSubTab === 'invoice' ? 'var(--accent)' : 'var(--text-muted)' }}
                  onClick={() => { setSalesSubTab('invoice'); setSelectedInvoice(null); }}
                >
                  📝 Sales Invoices
                </button>
                <button
                  className={`tab-btn ${salesSubTab === 'delivery' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '700', border: 'none', borderBottom: salesSubTab === 'delivery' ? '3px solid var(--accent)' : 'none', background: 'none', cursor: 'pointer', color: salesSubTab === 'delivery' ? 'var(--accent)' : 'var(--text-muted)' }}
                  onClick={() => { setSalesSubTab('delivery'); setSelectedDeliveryNote(null); }}
                >
                  🚚 Delivery Notes
                </button>
              </div>

              {/* Content body split layout */}
              <div className="bom-explorer-grid">

                {/* Left Column: List with pagination */}
                <div className="bom-list">
                  <div style={{ paddingBottom: '8px' }}>
                    <input
                      type="text"
                      className="text-input"
                      style={{ width: '100%', padding: '6px 12px', fontSize: '11px' }}
                      placeholder={salesSubTab === 'invoice' ? "Search Invoices..." : "Search Delivery Notes..."}
                      value={salesSearchQuery}
                      onChange={e => setSalesSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="bom-list-header" style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    {salesSubTab === 'invoice' ? 'Invoices List' : 'Delivery Notes List'}
                  </div>

                  {salesLoading ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading data...
                    </div>
                  ) : salesSubTab === 'invoice' ? (
                    filteredInvoices.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found.</div>
                    ) : (
                      filteredInvoices.map(inv => (
                        <div
                          key={inv.name}
                          className={`bom-list-item ${selectedInvoice?.name === inv.name ? 'active' : ''}`}
                          onClick={async () => {
                            setSalesLoading(true);
                            try {
                              const details = await frappe.getSalesInvoiceDetails(inv.name);
                              setSelectedInvoice(details);
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setSalesLoading(false);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', color: 'var(--accent)' }}>{inv.name}</span>
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : inv.status === 'Draft' ? 'rgba(156, 163, 175, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: inv.status === 'Paid' ? 'var(--success)' : inv.status === 'Draft' ? 'var(--text-muted)' : 'var(--danger)', fontWeight: 'bold' }}>{inv.status}</span>
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>{inv.customer}</span>
                            <strong>${Number(inv.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            📅 {inv.posting_date}
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    filteredDeliveryNotes.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No delivery notes found.</div>
                    ) : (
                      filteredDeliveryNotes.map(dn => (
                        <div
                          key={dn.name}
                          className={`bom-list-item ${selectedDeliveryNote?.name === dn.name ? 'active' : ''}`}
                          onClick={async () => {
                            setSalesLoading(true);
                            try {
                              const details = await frappe.getDeliveryNoteDetails(dn.name);
                              setSelectedDeliveryNote(details);
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setSalesLoading(false);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', color: 'var(--accent)' }}>{dn.name}</span>
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: dn.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : dn.status === 'Draft' ? 'rgba(156, 163, 175, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: dn.status === 'Completed' ? 'var(--success)' : dn.status === 'Draft' ? 'var(--text-muted)' : 'var(--warning)', fontWeight: 'bold' }}>{dn.status}</span>
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>{dn.customer}</span>
                            <strong>${Number(dn.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            📅 {dn.posting_date}
                          </div>
                        </div>
                      ))
                    )
                  )}

                  {/* Left Side Pagination */}
                  {salesSubTab === 'invoice' ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '12px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                      <button
                        className="secondary-btn"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        disabled={salesInvoicePage === 1 || salesLoading}
                        onClick={() => setSalesInvoicePage(prev => Math.max(1, prev - 1))}
                      >
                        ◀ Previous
                      </button>
                      <span style={{ fontSize: '11px', fontWeight: '600' }}>Page {salesInvoicePage}</span>
                      <button
                        className="secondary-btn"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        disabled={salesInvoicesList.length < 20 || salesLoading}
                        onClick={() => setSalesInvoicePage(prev => prev + 1)}
                      >
                        Next ▶
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '12px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                      <button
                        className="secondary-btn"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        disabled={deliveryNotePage === 1 || salesLoading}
                        onClick={() => setDeliveryNotePage(prev => Math.max(1, prev - 1))}
                      >
                        ◀ Previous
                      </button>
                      <span style={{ fontSize: '11px', fontWeight: '600' }}>Page {deliveryNotePage}</span>
                      <button
                        className="secondary-btn"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        disabled={deliveryNotesList.length < 20 || salesLoading}
                        onClick={() => setDeliveryNotePage(prev => prev + 1)}
                      >
                        Next ▶
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Column: Standard Format Detail View */}
                <div className="bom-recipe-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  {salesSubTab === 'invoice' ? (
                    !selectedInvoice ? (
                      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <span style={{ fontSize: '48px', marginBottom: '12px' }}>📄</span>
                        <h3>Select a Sales Invoice</h3>
                        <p style={{ fontSize: '13px' }}>Click an item on the left list to view invoice detail slip.</p>
                      </div>
                    ) : (
                      <div className="print-report-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
                          <div>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>TAX INVOICE</h3>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Carpenters Water Fiji PTE Limited</span>
                            <div style={{ marginTop: '8px', fontSize: '12px' }}>
                              <strong>Bill To:</strong> {selectedInvoice.customer}<br />
                              <strong>Tax ID:</strong> FJ-TIN-893240-Z
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <svg width="60" height="60" style={{ border: '1px solid var(--border-color)', padding: '2px', backgroundColor: '#fff', borderRadius: '4px' }} viewBox="0 0 29 29">
                              <path d="M0 0h7v7H0zm1 1v5h5V1zm8-1h1v1H9zm1 1h1v1h-1zm-2 1h1v1H8zm3 0h1v1h-1zM9 4h1v1H9zm2 0h1v1h-1zm-3 1h1v1H8zm1 1h1v1H9zM0 9h7v7H0zm1 1v5h5v-5zm11-2h1v1h-1zm-1 2h1v1h-1zm2 1h1v1h-1zm-2 2h1v1h-1zm1 1h1v1h-1zm3-6h1v1h-1zm-1 2h1v1h-1zm2 1h1v1h-1zm-2 2h1v1h-1zm1 1h1v1h-1zm5-7h7v7h-7zm1 1v5h5v-5zm-11 8h1v1h-1zm2 0h1v1h-1zm-1 1h1v1h-1zm-2 2h1v1h-1zm3 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1h-1zm2 1h1v1h-1zm-1 1h1v1h-1zm7-7h1v1h-1zm2 0h1v1h-1zm-1 1h1v1h-1zm-2 2h1v1h-1zm3 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1h-1zm2 1h1v1h-1zm-1 1h1v1h-1zm-7 2h1v1h-1zm2 0h1v1h-1zm-1 1h1v1h-1zm5-1h1v1h-1zm2 0h1v1h-1zm-1 1h1v1h-1z" fill="#111" />
                            </svg>
                            <div style={{ textAlign: 'right', fontSize: '12px' }}>
                              <h4 style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '14px', margin: '0 0 4px 0' }}>{selectedInvoice.name}</h4>
                              <span><strong>Posting Date:</strong> {selectedInvoice.posting_date}</span><br />
                              <span><strong>Due Date:</strong> {selectedInvoice.due_date || '-'}</span><br />
                              <span style={{ fontSize: '11px', display: 'inline-block', marginTop: '6px', padding: '3px 8px', borderRadius: '4px', backgroundColor: selectedInvoice.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: selectedInvoice.status === 'Paid' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>{selectedInvoice.status}</span>
                            </div>
                          </div>
                        </div>

                        <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--border-color)' }}>
                              <th style={{ padding: '8px' }}>Item Code</th>
                              <th style={{ padding: '8px' }}>Item Description</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Rate</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.items?.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '8px', fontWeight: '700' }}>{item.item_code}</td>
                                <td style={{ padding: '8px' }}>{item.item_name || 'Standard PET Water Box'}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{item.qty}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>${Number(item.rate).toFixed(2)}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700' }}>${Number(item.amount || (item.qty * item.rate)).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ flex: 1, minWidth: '240px', fontSize: '11px', fontStyle: 'italic', color: 'var(--text-muted)', borderLeft: '3px solid var(--accent)', paddingLeft: '8px', marginTop: '12px' }}>
                            <strong>Amount in Words:</strong><br />
                            <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{convertNumberToWords(selectedInvoice.grand_total || selectedInvoice.items?.reduce((acc, it) => acc + (it.qty * it.rate), 0) * 1.09)}</span>
                          </div>
                          <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Net Total:</span>
                              <strong>${Number(selectedInvoice.net_total || (selectedInvoice.grand_total - (selectedInvoice.total_taxes_and_charges || 0)) || selectedInvoice.items?.reduce((acc, it) => acc + (it.qty * it.rate), 0)).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>VAT (9%):</span>
                              <strong>${Number(selectedInvoice.total_taxes_and_charges || (selectedInvoice.grand_total * 0.09) || selectedInvoice.items?.reduce((acc, it) => acc + (it.qty * it.rate), 0) * 0.09).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '6px', fontSize: '14px', color: 'var(--accent)' }}>
                              <span>Grand Total:</span>
                              <strong>${Number(selectedInvoice.grand_total || selectedInvoice.items?.reduce((acc, it) => acc + (it.qty * it.rate), 0) * 1.09).toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Bank Details & Terms Footer */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '11px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '10px' }}>
                          <div>
                            <strong style={{ color: 'var(--text-heading)', display: 'block', marginBottom: '6px', letterSpacing: '0.3px' }}>🏦 BANK PAYMENT DETAILS</strong>
                            <span style={{ color: 'var(--text-muted)' }}>Bank Name:</span> <strong style={{ color: 'var(--text-main)' }}>Westpac Banking Fiji</strong><br />
                            <span style={{ color: 'var(--text-muted)' }}>Account Name:</span> <strong style={{ color: 'var(--text-main)' }}>Carpenters Water Fiji PTE Limited</strong><br />
                            <span style={{ color: 'var(--text-muted)' }}>Account Number:</span> <strong style={{ color: 'var(--text-main)' }}>9801452309</strong><br />
                            <span style={{ color: 'var(--text-muted)' }}>BSB/SWIFT:</span> <strong style={{ color: 'var(--text-main)' }}>WPACFJ21</strong>
                          </div>
                          <div>
                            <strong style={{ color: 'var(--text-heading)', display: 'block', marginBottom: '6px', letterSpacing: '0.3px' }}>📋 TERMS & CONDITIONS</strong>
                            <span style={{ color: 'var(--text-muted)' }}>1. Payment terms are net 30 days from posting date.</span><br />
                            <span style={{ color: 'var(--text-muted)' }}>2. Please mention Invoice number as deposit reference.</span><br />
                            <span style={{ color: 'var(--text-muted)' }}>3. Late accounts accrue 1.5% monthly compound interest.</span>
                          </div>
                        </div>

                        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
                          <button type="button" className="secondary-btn" onClick={() => setShowAmendInvoiceModal(true)}>✏️ Amend Invoice</button>
                          <button type="button" className="primary-btn" onClick={() => window.print()} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>🖨️ Print Invoice</button>
                        </div>
                      </div>
                    )
                  ) : (
                    !selectedDeliveryNote ? (
                      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <span style={{ fontSize: '48px', marginBottom: '12px' }}>🚚</span>
                        <h3>Select a Delivery Note</h3>
                        <p style={{ fontSize: '13px' }}>Click an item on the left list to view delivery note slip.</p>
                      </div>
                    ) : (
                      <div className="print-report-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
                          <div>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>DELIVERY NOTE</h3>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Carpenters Water Fiji PTE Limited</span>
                            <div style={{ marginTop: '8px', fontSize: '12px' }}>
                              <strong>Deliver To:</strong> {selectedDeliveryNote.customer}<br />
                              <strong>Shipment Point:</strong> Western Depot Lautoka
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '12px' }}>
                            <h4 style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '14px', margin: '0 0 4px 0' }}>{selectedDeliveryNote.name}</h4>
                            <span><strong>Posting Date:</strong> {selectedDeliveryNote.posting_date}</span><br />
                            <span><strong>Posting Time:</strong> {selectedDeliveryNote.posting_time}</span><br />
                            <span style={{ fontSize: '11px', display: 'inline-block', marginTop: '6px', padding: '3px 8px', borderRadius: '4px', backgroundColor: selectedDeliveryNote.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: selectedDeliveryNote.status === 'Completed' ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>{selectedDeliveryNote.status}</span>
                          </div>
                        </div>

                        <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--border-color)' }}>
                              <th style={{ padding: '8px' }}>Item Code</th>
                              <th style={{ padding: '8px' }}>Item Description</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                              <th style={{ padding: '8px' }}>Source Warehouse</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDeliveryNote.items?.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '8px', fontWeight: '700' }}>{item.item_code}</td>
                                <td style={{ padding: '8px' }}>{item.item_name || 'Standard PET Water Box'}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{item.qty}</td>
                                <td style={{ padding: '8px' }}>{item.warehouse || 'Finished Goods - CWFL'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <p><strong>Note:</strong> Goods received in good order. Please sign below upon cargo handover confirmation.</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>
                            <div style={{ borderTop: '1px dashed var(--text-muted)', paddingTop: '8px', textAlign: 'center' }}>Authorized Signature (Sender)</div>
                            <div style={{ borderTop: '1px dashed var(--text-muted)', paddingTop: '8px', textAlign: 'center' }}>Customer Signature (Receiver)</div>
                          </div>
                        </div>

                        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
                          <button type="button" className="secondary-btn" onClick={() => setShowAmendDeliveryNoteModal(true)}>✏️ Amend Note</button>
                          <button type="button" className="primary-btn" onClick={() => window.print()} style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>🖨️ Print Delivery Note</button>
                        </div>
                      </div>
                    )
                  )}
                </div>

              </div>
            </div>
          )
}