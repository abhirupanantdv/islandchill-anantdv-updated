import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { LabMetadataFields, LabFieldControl, LabTableSections } = await server.ssrLoadModule('/src/components/LabMetadataFields.jsx');
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const noop = () => {};

test('sections, columns, signatures and tables retain metadata order without dropping fields', () => {
  const html = render(LabMetadataFields, {
    fields: [
      { fieldname: 'first', fieldtype: 'Section Break', label: 'Sample details' },
      { fieldname: 'count', fieldtype: 'Int', label: 'Count' },
      { fieldname: 'col', fieldtype: 'Column Break' },
      { fieldname: 'notes', fieldtype: 'Small Text', label: 'Notes (optional)' },
      { fieldname: 'results', fieldtype: 'Table', label: 'Results' },
      { fieldname: 'approval', fieldtype: 'Section Break', label: 'Approval' },
      { fieldname: 'signature', fieldtype: 'Signature', label: 'Signature' },
      { fieldname: 'secret', fieldtype: 'Data', label: 'Secret', hidden: '1' },
    ], formData: { count: 0 }, onChange: noop,
    renderTable: field => React.createElement('div', { key: field.fieldname }, 'Results table'),
  });
  const labels = ['Sample details', 'Count', 'Notes (optional)', 'Results table', 'Approval', 'Signature'];
  for (let i = 1; i < labels.length; i++) assert.ok(html.indexOf(labels[i - 1]) < html.indexOf(labels[i]), labels[i]);
  assert.ok(!html.includes('Secret'));
  assert.match(html, /value="0"/);
  assert.match(html, /lab-field-column/);
});

test('Link dropdowns contain only target records and preserve canonical IDs', () => {
  const html = render(LabFieldControl, {
    field: { fieldname: 'analyst', label: 'Analyst', fieldtype: 'Link', options: 'User' },
    value: 'qa@example.com', onChange: noop,
    linkOptionsMap: { User: ['qa@example.com'], Employee: ['EMP-001'] },
    employeeList: [{ name: 'EMP-001', employee_name: 'Alex' }],
  });
  assert.match(html, /<select/);
  assert.match(html, /value="qa@example.com" selected/);
  assert.ok(!html.includes('EMP-001'));
});

test('Employee labels do not become saved link values', () => {
  const html = render(LabFieldControl, {
    field: { fieldname: 'analyst', label: 'Analyst', fieldtype: 'Link', options: 'Employee' },
    value: 'EMP-001', onChange: noop, linkOptionsMap: { Employee: ['EMP-001'] },
    employeeList: [{ name: 'EMP-001', employee_name: 'Alex' }],
  });
  assert.match(html, /value="EMP-001" selected/);
  assert.match(html, /Alex/);
});

test('explicit Date and Time metadata takes precedence over incubation field names', () => {
  for (const [fieldtype, type, value] of [['Date', 'date', '2026-09-28'], ['Time', 'time', '10:00']]) {
    const html = render(LabFieldControl, { field: { fieldname: 'incubation_in', fieldtype }, value, onChange: noop });
    assert.match(html, new RegExp(`type="${type}"`));
    assert.match(html, new RegExp(`value="${value}"`));
  }
});

test('metadata controls required, read-only, zero values and unchecked string flags', () => {
  const html = render(LabFieldControl, { field: { fieldname: 'count', fieldtype: 'Int', reqd: '1', read_only: '1' }, value: 0, onChange: noop });
  assert.match(html, /value="0"/);
  assert.match(html, /disabled/);
  const check = render(LabFieldControl, { field: { fieldname: 'passed', fieldtype: 'Check' }, value: '0', onChange: noop });
  assert.ok(!check.includes('checked=""'));
});

test('Dynamic Link resolves its target from the current row before the parent document', () => {
  const html = render(LabFieldControl, {
    field: { fieldname: 'reference', fieldtype: 'Dynamic Link', options: 'reference_type' },
    doc: { reference_type: 'Item' }, parentDoc: { reference_type: 'Employee' },
    value: 'ITEM-1', onChange: noop, linkOptionsMap: { Item: ['ITEM-1'], Employee: ['EMP-001'] },
  });
  assert.match(html, /value="ITEM-1" selected/);
  assert.ok(!html.includes('EMP-001'));
});


test('names such as analyst do not override a declared Data field', () => {
  const html = render(LabFieldControl, { field: { fieldname: 'analyst', label: 'Analyst', fieldtype: 'Data' }, value: 'Free text', onChange: noop });
  assert.match(html, /type="text"/);
  assert.ok(!html.includes('<select'));
});

test('hidden sections suppress their fields until the next visible section', () => {
  const html = render(LabMetadataFields, {
    fields: [
      { fieldname: 'private_section', fieldtype: 'Section Break', label: 'Private section', hidden: 1 },
      { fieldname: 'private_value', fieldtype: 'Data', label: 'Private value' },
      { fieldname: 'public_section', fieldtype: 'Section Break', label: 'Public section' },
      { fieldname: 'public_value', fieldtype: 'Data', label: 'Public value' },
    ], formData: {}, onChange: noop, renderTable: noop,
  });
  assert.ok(!html.includes('Private'));
  assert.match(html, /Public value/);
});

test('child-table sections group real columns without producing fake input cells', () => {
  const fields = [
    { fieldname: 'incubation', fieldtype: 'Section Break', label: 'Incubation' },
    { fieldname: 'in_date', fieldtype: 'Date', label: 'In date' },
    { fieldname: 'in_time', fieldtype: 'Time', label: 'In time' },
    { fieldname: 'results', fieldtype: 'Section Break', label: 'Results' },
    { fieldname: 'count', fieldtype: 'Int', label: 'Count' },
  ];
  const html = render(LabTableSections, { fields, visibleFields: [fields[1], fields[2], fields[4]], leadingColumns: 1 });
  assert.match(html, /colSpan="2"[^>]*>Incubation/);
  assert.match(html, /colSpan="1"[^>]*>Results/);
  assert.ok(!html.includes('<input'));
});

test('child-table filtering respects hidden sections and retains visible signatures', async () => {
  const { getLabTableFields } = await import('../src/components/labFieldMetadata.js');
  const fields = getLabTableFields([
    { fieldname: 'private_section', fieldtype: 'Section Break', hidden: '1' },
    { fieldname: 'private_value', fieldtype: 'Data' },
    { fieldname: 'public_section', fieldtype: 'Section Break' },
    { fieldname: 'signature', fieldtype: 'Signature' },
    { fieldname: 'column', fieldtype: 'Column Break' },
    { fieldname: 'hidden_value', fieldtype: 'Data', hidden: true },
  ]);
  assert.deepEqual(fields.map(field => field.fieldname), ['signature']);
});

test('tab headings remain visible when immediately followed by a section break', () => {
  const html = render(LabMetadataFields, {
    fields: [
      { fieldname: 'analysis_tab', fieldtype: 'Tab Break', label: 'Analysis tab' },
      { fieldname: 'samples_section', fieldtype: 'Section Break', label: 'Samples section' },
      { fieldname: 'count', fieldtype: 'Int', label: 'Count' },
    ], formData: {}, onChange: noop, renderTable: noop,
  });
  assert.match(html, /Analysis tab/);
  assert.ok(html.indexOf('Analysis tab') < html.indexOf('Samples section'));
});

test('new-row defaults include declared values and ignore layout fields', async () => {
  const { getLabRowDefaults } = await import('../src/components/labFieldMetadata.js');
  assert.equal(typeof getLabRowDefaults, 'function');
  assert.deepEqual(getLabRowDefaults([
    { fieldname: 'count', fieldtype: 'Int', default: '5' },
    { fieldname: 'passed', fieldtype: 'Check', default: '0' },
    { fieldname: 'status', fieldtype: 'Select', options: 'Pending\nPass', default: 'Pass' },
    { fieldname: 'notes', fieldtype: 'Text' },
    { fieldname: 'section', fieldtype: 'Section Break', default: 'ignored' },
  ]), { count: '5', passed: 0, status: 'Pass' });
});

test('unlabeled section metadata remains blank instead of exposing its fieldname', async () => {
  const { normalizeLabField } = await import('../src/components/labFieldMetadata.js');
  assert.equal(typeof normalizeLabField, 'function');
  const fields = [
    { fieldname: 'section_break_internal', fieldtype: 'Section Break' },
    { fieldname: 'count', fieldtype: 'Int', label: 'Count' },
    { fieldname: 'section_break_empty', fieldtype: 'Section Break', label: '' },
    { fieldname: 'notes', fieldtype: 'Text', label: 'Notes' },
  ].map(normalizeLabField);
  const html = render(LabMetadataFields, { fields, formData: {}, onChange: noop, renderTable: noop });
  assert.ok(!html.includes('section_break_internal'));
  assert.ok(!html.includes('section_break_empty'));
  assert.ok(!html.includes('<h4'));
  assert.match(html, /Count/);
  assert.match(html, /Notes/);
});

test('Signature fields provide a drawing surface and required validation', () => {
  const html = render(LabFieldControl, { field: { fieldname: 'signature', label: 'Analyst signature', fieldtype: 'Signature', reqd: 1 }, value: '', onChange: noop });
  assert.match(html, /<canvas/);
  assert.match(html, /required/);
  assert.match(html, /Clear/);
});

test('read-only Signature fields display saved images without edit controls', () => {
  const value = 'data:image/png;base64,c2lnbmF0dXJl';
  const html = render(LabFieldControl, { field: { fieldname: 'signature', label: 'Analyst signature', fieldtype: 'Signature', read_only: 1 }, value, onChange: noop });
  assert.match(html, /<img/);
  assert.ok(html.includes(value));
  assert.ok(!html.includes('<canvas'));
  assert.ok(!html.includes('<button'));
});

test('checked_by and verified_by include available Employees even when generic Link results are empty', () => {
  for (const fieldname of ['checked_by', 'verified_by']) {
    const html = render(LabFieldControl, {
      field: { fieldname, label: fieldname, fieldtype: 'Link', options: 'Employee' },
      value: '', onChange: noop, linkOptionsMap: { Employee: [] },
      employeeList: [{ name: 'EMP-007', employee_name: 'Sam' }],
    });
    assert.match(html, /value="EMP-007"/);
    assert.match(html, /Sam/);
    assert.ok(!html.includes('type="search"'));
  }
});
