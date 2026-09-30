from __future__ import annotations

from collections import Counter, defaultdict

import frappe
from frappe import _

from islandchill.islandchill.report.report_utils import (
	get_document_context,
	get_workflow_events,
	get_doctypes,
	get_period,
	get_period_documents,
	get_snapshot_fields,
	get_snapshots,
	is_duplicate_workflow,
	matches_context,
	parse_version,
	validate_filters,
)


def execute(filters=None):
	filters = frappe._dict(filters or {})
	validate_filters(filters)
	start, end = get_period(filters)
	users = _get_users(filters)
	allowed_users = set(users)
	rows = []

	versions = frappe.get_all(
		"Version",
		filters={"ref_doctype": ["in", list(get_doctypes(filters))], "creation": ["between", [start, end]]},
		fields=["ref_doctype", "docname", "owner", "creation", "data"],
		limit_page_length=0,
	)
	versions_by_doctype = defaultdict(list)
	for version in versions:
		versions_by_doctype[version.ref_doctype].append(version)
	workflow_events_by_doctype = defaultdict(list)
	for event in get_workflow_events(get_doctypes(filters), start, end):
		workflow_events_by_doctype[event.document_type].append(event)

	for doctype in get_doctypes(filters):
		if not frappe.db.exists("DocType", doctype):
			continue
		meta, _fields = get_snapshot_fields(doctype)
		documents = {doc.name: doc for doc in get_period_documents(doctype, start, end)}
		missing_names = (
			{version.docname for version in versions_by_doctype[doctype]}
			| {event.document_name for event in workflow_events_by_doctype[doctype]}
		) - set(documents)
		documents.update(get_snapshots(doctype, missing_names))
		version_docs = set()
		version_workflow_events = []

		for doc in documents.values():
			if start <= str(doc.creation) <= end and doc.owner in allowed_users:
				context = get_document_context(doc, meta.is_submittable)
				if matches_context(context, filters):
					_add_event(
						rows,
						filters,
						users,
						user=doc.owner,
						action="Created",
						action_on=doc.creation,
						doctype=doctype,
						document=doc.name,
						context=context,
						source=_("Document Create"),
					details=_("Created document; current status is {0}").format(
							context.current_status or _("not set")
						),
					)

		for version in versions_by_doctype[doctype]:
			version_docs.add(version.docname)
			if version.owner not in allowed_users:
				continue
			doc = documents.get(version.docname)
			context = get_document_context(doc, meta.is_submittable) if doc else frappe._dict()
			if not matches_context(context, filters):
				continue
			parsed = parse_version(version)
			if parsed.is_create_version:
				continue
			if parsed.action == "Workflow Change":
				version_workflow_events.append(
					{
						"document_type": doctype,
						"document_name": version.docname,
						"user": version.owner,
						"action_on": version.creation,
					}
				)
			_add_event(
				rows,
				filters,
				users,
				user=version.owner,
				action=parsed.action,
				action_on=version.creation,
				doctype=doctype,
				document=version.docname,
				context=context,
				from_status=parsed.from_status,
				to_status=parsed.to_status,
				details=parsed.details,
				change_count=parsed.change_count,
				source=parsed.source,
				source_reference=parsed.source_reference,
			)

		for event in workflow_events_by_doctype[doctype]:
			if is_duplicate_workflow(event, version_workflow_events) or event.user not in allowed_users:
				continue
			doc = documents.get(event.document_name)
			context = get_document_context(doc, meta.is_submittable) if doc else frappe._dict()
			if not matches_context(context, filters):
				continue
			version_docs.add(event.document_name)
			_add_event(
				rows,
				filters,
				users,
				user=event.user,
				action=event.action,
				action_on=event.action_on,
				doctype=doctype,
				document=event.document_name,
				context=context,
				from_status=event.from_status,
				to_status=event.to_status,
				details=event.details,
				source=event.source,
			)

		# Fallback for DocTypes without field-level Version tracking.
		for doc in documents.values():
			if doc.name in version_docs or str(doc.modified) == str(doc.creation):
				continue
			if not (start <= str(doc.modified) <= end) or doc.modified_by not in allowed_users:
				continue
			context = get_document_context(doc, meta.is_submittable)
			if not matches_context(context, filters):
				continue
			_add_event(
				rows,
				filters,
				users,
				user=doc.modified_by,
				action="Updated",
				action_on=doc.modified,
				doctype=doctype,
				document=doc.name,
				context=context,
				source=_("Latest Save (no audit history)"),
				details=_(
					"Latest save detected. Field-level history was not recorded for this DocType, so the exact changes are unavailable."
				),
			)

	if filters.get("include_logins", 1) and not filters.get("document_type"):
		_add_login_events(rows, filters, users, allowed_users, start, end)

	rows.sort(key=lambda row: row["action_on"], reverse=True)
	return _get_columns(), rows, _message(), _chart(rows), _summary(rows)


def _get_users(filters):
	user_filters = {"name": filters.user} if filters.get("user") else {}
	if filters.get("enabled_users_only", 1):
		user_filters["enabled"] = 1
	return {
		user.name: user
		for user in frappe.get_all(
			"User",
			filters=user_filters,
			fields=["name", "full_name", "enabled", "last_login", "last_active"],
			limit_page_length=0,
		)
	}


def _add_event(
	rows,
	filters,
	users,
	*,
	user,
	action,
	action_on,
	doctype=None,
	document=None,
	context=None,
	from_status=None,
	to_status=None,
	details=None,
	change_count=0,
	ip_address=None,
	source=None,
	source_reference=None,
):
	if filters.get("action") and filters.action != action:
		return
	context = context or frappe._dict()
	user_record = users[user]
	rows.append(
		{
			"user": user,
			"full_name": user_record.full_name,
			"action": action,
			"action_on": action_on,
			"document_type": doctype,
			"document_name": document,
			"transaction_type": context.get("transaction_type"),
			"party": context.get("party"),
			"current_status": context.get("current_status"),
			"from_status": from_status,
			"to_status": to_status,
			"amount": context.get("amount"),
			"change_count": change_count,
			"details": details,
			"ip_address": ip_address,
			"source": source,
			"source_reference": source_reference,
			"last_login": user_record.last_login,
			"last_active": user_record.last_active,
		}
	)


def _add_login_events(rows, filters, users, allowed_users, start, end):
	for log in frappe.get_all(
		"Activity Log",
		filters={
			"operation": ["in", ["Login", "Logout"]],
			"status": "Success",
			"creation": ["between", [start, end]],
		},
		fields=["user", "operation", "creation", "ip_address"],
		limit_page_length=0,
	):
		if log.user not in allowed_users:
			continue
		_add_event(
			rows,
			filters,
			users,
			user=log.user,
			action=log.operation,
			action_on=log.creation,
			details=_("{0} succeeded").format(log.operation),
			ip_address=log.ip_address,
			source=_("Authentication"),
		)


def _get_columns():
	return [
		{"fieldname": "action_on", "label": _("When"), "fieldtype": "Datetime", "width": 165},
		{"fieldname": "user", "label": _("User"), "fieldtype": "Link", "options": "User", "width": 210},
		{"fieldname": "full_name", "label": _("Employee / Full Name"), "fieldtype": "Data", "width": 180},
		{"fieldname": "action", "label": _("What They Did"), "fieldtype": "Data", "width": 130},
		{"fieldname": "document_type", "label": _("Document Type"), "fieldtype": "Link", "options": "DocType", "width": 220},
		{"fieldname": "document_name", "label": _("Document"), "fieldtype": "Dynamic Link", "options": "document_type", "width": 190},
		{"fieldname": "transaction_type", "label": _("Purchase / Transaction Type"), "fieldtype": "Data", "width": 175},
		{"fieldname": "party", "label": _("Customer / Supplier / Party"), "fieldtype": "Data", "width": 190},
		{"fieldname": "from_status", "label": _("From Stage / Status"), "fieldtype": "Data", "width": 165},
		{"fieldname": "to_status", "label": _("To Stage / Status"), "fieldtype": "Data", "width": 165},
		{"fieldname": "current_status", "label": _("Current Status Now"), "fieldtype": "Data", "width": 170},
		{"fieldname": "source", "label": _("Source"), "fieldtype": "Data", "width": 150},
		{"fieldname": "source_reference", "label": _("Source Reference"), "fieldtype": "Data", "width": 150},
		{"fieldname": "details", "label": _("What Changed / Activity Detail"), "fieldtype": "Small Text", "width": 420},
		{"fieldname": "change_count", "label": _("Changes"), "fieldtype": "Int", "width": 80},
		{"fieldname": "amount", "label": _("Document Amount"), "fieldtype": "Currency", "width": 135},
		{"fieldname": "ip_address", "label": _("Login IP"), "fieldtype": "Data", "width": 130},
		{"fieldname": "last_login", "label": _("User Last Login"), "fieldtype": "Datetime", "width": 165},
		{"fieldname": "last_active", "label": _("User Last Active"), "fieldtype": "Datetime", "width": 165},
	]


def _chart(rows):
	counts = Counter(row["action"] for row in rows)
	order = ["Login", "Logout", "Created", "Edit", "Updated", "Workflow Change", "Status Change", "Submit", "Cancel"]
	labels = [action for action in order if counts[action]]
	return {
		"data": {
			"labels": labels,
			"datasets": [{"name": _("Activities"), "values": [counts[action] for action in labels]}],
		},
		"type": "bar",
		"colors": ["#2490ef"],
	}


def _summary(rows):
	actions = Counter(row["action"] for row in rows)
	return [
		{"value": len(rows), "label": _("Total Activities"), "datatype": "Int", "indicator": "Blue"},
		{"value": len({row["user"] for row in rows}), "label": _("Active Users"), "datatype": "Int", "indicator": "Purple"},
		{"value": actions["Login"], "label": _("Logins"), "datatype": "Int", "indicator": "Blue"},
		{"value": actions["Created"], "label": _("Documents Created"), "datatype": "Int", "indicator": "Green"},
		{
			"value": actions["Edit"] + actions["Updated"] + actions["Workflow Change"] + actions["Status Change"],
			"label": _("Change Events"),
			"datatype": "Int",
			"indicator": "Orange",
		},
		{"value": actions["Submit"], "label": _("Submitted"), "datatype": "Int", "indicator": "Green"},
		{"value": actions["Cancel"], "label": _("Cancelled"), "datatype": "Int", "indicator": "Red"},
	]


def _message():
	return _(
		"Each row is one user action. Created comes from document ownership; submit, cancel, workflow, status, and field edits come from Version audit history. Updated rows are last-save fallbacks where field-level history was not enabled."
	)
