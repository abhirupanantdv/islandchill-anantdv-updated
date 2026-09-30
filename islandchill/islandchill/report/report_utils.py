from __future__ import annotations

from collections import Counter

import frappe
from frappe import _
from frappe.utils import cint, get_datetime, strip_html, time_diff_in_seconds


SYSTEM_INTERNAL_DOCTYPES = {
	"Error Log",
	"Activity Log",
	"Route History",
	"Prepared Report",
	"Access Log",
	"Version",
	"DocType",
	"DocField",
	"DocPerm",
	"Custom Field",
	"Property Setter",
	"Scheduled Job Type",
	"Scheduled Job Log",
	"Installed Application",
	"Installed Applications",
	"Patch Log",
	"System Settings",
	"Website Settings",
}

TYPE_FIELDS = ("purchase_type", "payment_type", "stock_entry_type", "purpose", "material_request_type")
PARTY_FIELDS = ("customer_name", "customer", "supplier_name", "supplier", "party_name", "party")
AMOUNT_FIELDS = ("grand_total", "rounded_total", "total_amount", "paid_amount", "received_amount")
STATUS_FIELDS = ("workflow_state", "workflow", "status")

NOISY_FIELDS = {
	"modified",
	"modified_by",
	"posting_time",
	"other_charges_calculation",
	"item_wise_tax_details",
	"base_in_words",
	"in_words",
}


def validate_filters(filters):
	from_date = filters.get("from_date") if hasattr(filters, "get") else getattr(filters, "from_date", None)
	to_date = filters.get("to_date") if hasattr(filters, "get") else getattr(filters, "to_date", None)
	if not from_date or not to_date:
		frappe.throw(_("From Date and To Date are required."))
	if get_datetime(from_date) > get_datetime(to_date):
		frappe.throw(_("From Date cannot be after To Date."))


def get_period(filters):
	from_date = filters.get("from_date") if hasattr(filters, "get") else getattr(filters, "from_date", None)
	to_date = filters.get("to_date") if hasattr(filters, "get") else getattr(filters, "to_date", None)
	return f"{from_date} 00:00:00", f"{to_date} 23:59:59.999999"


def get_doctypes(filters):
	"""Dynamically discover all DocTypes that had activity (created, modified, versioned, workflow)

	in the filtered period, or return the explicitly selected document_type filter.
	Eliminates the need to hardcode DocType lists anywhere in code.
	"""
	if filters.get("document_type"):
		return [filters.document_type] if frappe.db.exists("DocType", filters.document_type) else []

	start, end = get_period(filters)
	discovered = set()

	# 1. Discover from Version logs (edits, submits, cancels, status changes)
	try:
		versions_dt = frappe.db.sql(
			"""
			SELECT DISTINCT ref_doctype
			FROM `tabVersion`
			WHERE creation BETWEEN %s AND %s AND ref_doctype IS NOT NULL
			""",
			(start, end),
			as_list=True,
		)
		discovered.update(r[0] for r in versions_dt if r[0])
	except Exception:
		pass

	# 2. Discover from Workflow Action & Comments
	try:
		wf_dt = frappe.db.sql(
			"""
			SELECT DISTINCT reference_doctype
			FROM `tabComment`
			WHERE comment_type = 'Workflow' AND creation BETWEEN %s AND %s AND reference_doctype IS NOT NULL
			""",
			(start, end),
			as_list=True,
		)
		discovered.update(r[0] for r in wf_dt if r[0])
	except Exception:
		pass

	# 3. Discover standard transactional/master doctypes created or modified
	# Get list of normal non-table, non-single DocTypes in system
	try:
		valid_doctypes = frappe.get_all(
			"DocType",
			filters={
				"istable": 0,
				"issingle": 0,
				"is_virtual": 0,
				"name": ["not in", list(SYSTEM_INTERNAL_DOCTYPES)],
			},
			pluck="name",
		)
		for dt in valid_doctypes:
			if dt in discovered:
				continue
			# Quick check if any record was created or modified in period
			has_activity = frappe.db.sql(
				f"SELECT 1 FROM `tab{dt}` WHERE creation BETWEEN %s AND %s OR modified BETWEEN %s AND %s LIMIT 1",
				(start, end, start, end),
			)
			if has_activity:
				discovered.add(dt)
	except Exception:
		pass

	# Filter out deleted, single or internal system doctypes
	result = []
	for dt in sorted(discovered):
		if dt in SYSTEM_INTERNAL_DOCTYPES:
			continue
		try:
			meta = frappe.get_meta(dt)
			if meta and not meta.issingle and not meta.istable and frappe.db.table_exists(dt):
				result.append(dt)
		except Exception:
			continue
	return result


def get_snapshot_fields(doctype):
	meta = frappe.get_meta(doctype)
	available = {field.fieldname for field in meta.fields}
	dynamic = [field for field in TYPE_FIELDS + PARTY_FIELDS + AMOUNT_FIELDS + STATUS_FIELDS if field in available]
	return meta, list(
		dict.fromkeys(["name", "owner", "creation", "modified_by", "modified", "docstatus", *dynamic])
	)


def get_snapshots(doctype, names):
	if not names or not frappe.db.exists("DocType", doctype) or not frappe.db.table_exists(doctype):
		return {}
	_meta, fields = get_snapshot_fields(doctype)
	result = {}
	name_list = list(names)
	for start in range(0, len(name_list), 500):
		for doc in frappe.get_all(
			doctype,
			filters={"name": ["in", name_list[start : start + 500]]},
			fields=fields,
			limit_page_length=0,
		):
			result[doc.name] = doc
	return result


def get_period_documents(doctype, start, end):
	if not frappe.db.exists("DocType", doctype) or not frappe.db.table_exists(doctype):
		return []
	meta = frappe.get_meta(doctype)
	if meta.issingle or meta.istable:
		return []
	_meta, fields = get_snapshot_fields(doctype)
	by_name = {}
	for date_field in ("creation", "modified"):
		for doc in frappe.get_all(
			doctype,
			filters={date_field: ["between", [start, end]]},
			fields=fields,
			limit_page_length=0,
		):
			by_name[doc.name] = doc
	return list(by_name.values())


def first_value(doc, fieldnames, accept_zero=False):
	if not doc:
		return None
	for fieldname in fieldnames:
		value = doc.get(fieldname)
		if value or (accept_zero and value == 0):
			return value
	return None


def get_document_context(doc, is_submittable=True):
	return frappe._dict({
		"transaction_type": first_value(doc, TYPE_FIELDS),
		"party": first_value(doc, PARTY_FIELDS),
		"current_status": first_value(doc, STATUS_FIELDS) or docstatus_label(doc.get("docstatus"), is_submittable),
		"amount": first_value(doc, AMOUNT_FIELDS, accept_zero=True),
	})


def docstatus_label(docstatus, is_submittable=True):
	if not is_submittable:
		return _("Saved")
	return {0: _("Draft"), 1: _("Submitted"), 2: _("Cancelled")}.get(docstatus, "")


def parse_version(version):
	try:
		data = frappe.parse_json(version.data) or {}
	except Exception:
		data = {}
	changed = [change for change in data.get("changed", []) if len(change) >= 3]
	change_map = {change[0]: (change[1], change[2]) for change in changed}
	has_diff = bool(changed or data.get("added") or data.get("removed") or data.get("row_changed"))
	is_create_version = bool(data.get("created_by") and not has_diff)

	action = "Edit"
	from_status = None
	to_status = None
	if "docstatus" in change_map:
		old, new = change_map["docstatus"]
		if cint(new) == 2:
			action = "Cancel"
		elif cint(old) != 1 and cint(new) == 1:
			action = "Submit"
		elif cint(old) == 2 and cint(new) == 0:
			action = "Reopen"

	for fieldname in ("workflow_state", "workflow"):
		if fieldname in change_map:
			from_status, to_status = change_map[fieldname]
			if action == "Edit":
				action = "Workflow Change"
			break
	if from_status is None and "status" in change_map:
		from_status, to_status = change_map["status"]
		if action == "Edit":
			action = "Status Change"

	source, source_reference = _version_source(data)
	details = _describe_changes(version.ref_doctype, changed, data)
	return frappe._dict(
		{
			"action": action,
			"from_status": from_status,
			"to_status": to_status,
			"details": details,
			"change_count": len(changed)
			+ len(data.get("added", []))
			+ len(data.get("removed", []))
			+ len(data.get("row_changed", [])),
			"is_create_version": is_create_version,
			"source": source,
			"source_reference": source_reference,
		}
	)


def _version_source(data):
	updater = data.get("updater_reference") or {}
	if isinstance(updater, dict) and updater:
		doctype = updater.get("doctype") or updater.get("ref_doctype") or _("Automation")
		name = updater.get("name") or updater.get("docname")
		if doctype == "Data Import":
			return _("Data Import"), name
		return _("{0} automation").format(doctype), name
	if data.get("data_import"):
		return _("Data Import"), data.get("data_import")
	return _("Document Save"), None

def _describe_changes(doctype, changed, data):
	important = []
	other = []
	priority = {"docstatus", "workflow_state", "workflow", "status", *TYPE_FIELDS, *PARTY_FIELDS, *AMOUNT_FIELDS}
	for fieldname, old, new, *_rest in changed:
		if fieldname in NOISY_FIELDS:
			continue
		text = f"{_field_label(doctype, fieldname)}: {_display_value(old)} → {_display_value(new)}"
		(important if fieldname in priority else other).append(text)

	parts = (important + other)[:5]
	added = len(data.get("added", []))
	removed = len(data.get("removed", []))
	row_changed = len(data.get("row_changed", []))
	if added:
		parts.append(_("{0} row(s) added").format(added))
	if removed:
		parts.append(_("{0} row(s) removed").format(removed))
	if row_changed:
		parts.append(_("{0} child row(s) changed").format(row_changed))
	return "; ".join(parts) or _("Document saved; no field-level detail was recorded")


def _field_label(doctype, fieldname):
	try:
		field = frappe.get_meta(doctype).get_field(fieldname)
		return field.label if field and field.label else fieldname.replace("_", " ").title()
	except Exception:
		return fieldname.replace("_", " ").title()


def _display_value(value):
	if value is None or value == "":
		return _("empty")
	if isinstance(value, (list, dict)):
		return _("structured value")
	text = strip_html(str(value)).replace("\n", " ").strip()
	return f"{text[:57]}..." if len(text) > 60 else text



def get_workflow_events(doctypes, start, end):
	comments = frappe.get_all(
		"Comment",
		filters={
			"reference_doctype": ["in", list(doctypes)],
			"comment_type": "Workflow",
			"creation": ["between", [start, end]],
		},
		fields=["reference_doctype", "reference_name", "owner", "creation", "content"],
		limit_page_length=0,
	)
	actions = frappe.get_all(
		"Workflow Action",
		filters={
			"reference_doctype": ["in", list(doctypes)],
			"status": "Completed",
			"modified": ["between", [start, end]],
		},
		fields=[
			"name",
			"reference_doctype",
			"reference_name",
			"workflow_state",
			"completed_by",
			"completed_by_role",
			"modified",
		],
		limit_page_length=0,
	)
	actions_by_key = {}
	for action in actions:
		key = (action.reference_doctype, action.reference_name, action.completed_by)
		actions_by_key.setdefault(key, []).append(action)

	used_actions = set()
	events = []
	for comment in comments:
		key = (comment.reference_doctype, comment.reference_name, comment.owner)
		candidates = [
			action
			for action in actions_by_key.get(key, [])
			if action.name not in used_actions
			and abs(time_diff_in_seconds(comment.creation, action.modified)) <= 10
		]
		matched = min(
			candidates,
			key=lambda action: abs(time_diff_in_seconds(comment.creation, action.modified)),
			default=None,
		)
		if matched:
			used_actions.add(matched.name)
		role = matched.completed_by_role if matched else None
		from_status = matched.workflow_state if matched else None
		to_status = strip_html(comment.content or "").strip()
		detail = _("Workflow moved from {0} to {1}").format(
			from_status or _("previous stage unknown"), to_status or _("stage not recorded")
		)
		if role:
			detail += _("; completed as {0}").format(role)
		events.append(
			frappe._dict(
				{
					"document_type": comment.reference_doctype,
					"document_name": comment.reference_name,
					"user": comment.owner,
					"action_on": comment.creation,
					"action": "Workflow Change",
					"from_status": from_status,
					"to_status": to_status,
					"details": detail,
					"source": _("Workflow"),
				}
			)
		)

	for action in actions:
		if action.name in used_actions or not action.completed_by:
			continue
		events.append(
			frappe._dict(
				{
					"document_type": action.reference_doctype,
					"document_name": action.reference_name,
					"user": action.completed_by,
					"action_on": action.modified,
					"action": "Workflow Change",
					"from_status": action.workflow_state,
					"to_status": None,
					"details": _("Completed workflow action from {0} as {1}; destination stage was not recorded").format(
						action.workflow_state or _("unknown stage"),
						action.completed_by_role or _("unknown role"),
					),
					"source": _("Workflow"),
				}
			)
		)
	return events


def is_duplicate_workflow(event, version_events):
	for version_event in version_events:
		if (
			version_event["document_type"] == event.document_type
			and version_event["document_name"] == event.document_name
			and version_event["user"] == event.user
			and abs(time_diff_in_seconds(version_event["action_on"], event.action_on)) <= 3
		):
			return True
	return False


def status_breakdown(statuses):
	counts = Counter(status for status in statuses if status)
	return ", ".join(f"{status}: {count}" for status, count in counts.most_common())


def matches_context(context, filters):
	if filters.get("transaction_type") and filters.transaction_type.lower() not in (
		context.get("transaction_type") or ""
	).lower():
		return False
	if filters.get("status") and filters.status.lower() not in (context.get("current_status") or "").lower():
		return False
	return True
