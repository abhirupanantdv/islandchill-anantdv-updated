from __future__ import annotations

from collections import defaultdict

import frappe
from frappe import _
from frappe.utils import getdate

from islandchill.islandchill.report.report_utils import (
	docstatus_label,
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
	status_breakdown,
	validate_filters,
)


ACTION_KEYS = {
	"Created": "created",
	"Edit": "edited",
	"Submit": "submitted",
	"Cancel": "cancelled",
	"Reopen": "edited",
	"Workflow Change": "workflow_changes",
	"Status Change": "status_changes",
}


def execute(filters=None):
	filters = frappe._dict(filters or {})
	validate_filters(filters)
	if (filters.get("report_view") or "Daily Consolidated Summary") == "Document Details":
		rows = _get_detail_rows(filters)
		return _get_detail_columns(), rows, _detail_message(), _detail_chart(rows), _detail_summary(rows)

	rows = _get_consolidated_rows(filters)
	return _get_summary_columns(), rows, _summary_message(), _summary_chart(rows), _summary_cards(rows)


def _get_consolidated_rows(filters):
	start, end = get_period(filters)
	groups = defaultdict(_new_group)
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

		for doc in documents.values():
			context = get_document_context(doc, meta.is_submittable)
			if not matches_context(context, filters):
				continue
			if start <= str(doc.creation) <= end and _user_matches(doc.owner, filters):
				group = groups[(getdate(doc.creation), doctype, context.transaction_type or "")]
				group["created"] += 1
				group["active_users"].add(doc.owner)
				group["affected_documents"].add(doc.name)
				group["statuses"][doc.name] = context.current_status
				group["affected_value"] += context.amount or 0
				group[f"current_{_docstatus_key(doc.docstatus, meta.is_submittable)}"] += 1
				_set_latest(group, doc.creation, "Created", doc.name, doc.owner)

		version_docs = set()
		version_workflow_events = []
		for version in versions_by_doctype[doctype]:
			doc = documents.get(version.docname)
			context = get_document_context(doc, meta.is_submittable) if doc else frappe._dict()
			if not _user_matches(version.owner, filters) or not matches_context(context, filters):
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
			if filters.get("action") and filters.action != parsed.action:
				continue
			group = groups[(getdate(version.creation), doctype, context.get("transaction_type") or "")]
			group[ACTION_KEYS.get(parsed.action, "edited")] += 1
			group["active_users"].add(version.owner)
			group["affected_documents"].add(version.docname)
			group["statuses"][version.docname] = context.get("current_status")
			version_docs.add(version.docname)
			_set_latest(group, version.creation, parsed.action, version.docname, version.owner)

		for event in workflow_events_by_doctype[doctype]:
			if is_duplicate_workflow(event, version_workflow_events):
				continue
			doc = documents.get(event.document_name)
			context = get_document_context(doc, meta.is_submittable) if doc else frappe._dict()
			if not _user_matches(event.user, filters) or not matches_context(context, filters):
				continue
			if filters.get("action") and filters.action != "Workflow Change":
				continue
			group = groups[(getdate(event.action_on), doctype, context.get("transaction_type") or "")]
			group["workflow_changes"] += 1
			group["active_users"].add(event.user)
			group["affected_documents"].add(event.document_name)
			group["statuses"][event.document_name] = context.get("current_status")
			version_docs.add(event.document_name)
			_set_latest(group, event.action_on, event.action, event.document_name, event.user)

		for doc in documents.values():
			if doc.name in version_docs or str(doc.modified) == str(doc.creation):
				continue
			if not (start <= str(doc.modified) <= end) or not _user_matches(doc.modified_by, filters):
				continue
			context = get_document_context(doc, meta.is_submittable)
			if not matches_context(context, filters):
				continue
			group = groups[(getdate(doc.modified), doctype, context.transaction_type or "")]
			group["edited"] += 1
			group["active_users"].add(doc.modified_by)
			group["affected_documents"].add(doc.name)
			group["statuses"][doc.name] = context.current_status
			_set_latest(group, doc.modified, "Updated", doc.name, doc.modified_by)

	rows = []
	for (activity_date, doctype, transaction_type), group in groups.items():
		if filters.get("action") and not group[ACTION_KEYS.get(filters.action, "edited")]:
			continue
		rows.append(
			{
				"activity_date": activity_date,
				"document_type": doctype,
				"transaction_type": transaction_type,
				"total_actions": group["created"] + group["edited"] + group["submitted"] + group["cancelled"] + group["workflow_changes"] + group["status_changes"],
				"created": group["created"],
				"edited": group["edited"],
				"submitted": group["submitted"],
				"cancelled": group["cancelled"],
				"workflow_changes": group["workflow_changes"],
				"status_changes": group["status_changes"],
				"affected_documents": len(group["affected_documents"]),
				"active_users": len(group["active_users"]),
				"users": ", ".join(sorted(group["active_users"])),
				"current_draft": group["current_draft"],
				"current_submitted": group["current_submitted"],
				"current_cancelled": group["current_cancelled"],
				"status_breakdown": status_breakdown(group["statuses"].values()),
				"affected_value": group["affected_value"],
				"latest_activity": group["latest_activity"],
				"latest_document": group["latest_document"],
			}
		)
	rows.sort(key=lambda row: (row["activity_date"], row["document_type"], row["transaction_type"]), reverse=True)
	return rows


def _new_group():
	return {
		"created": 0,
		"edited": 0,
		"submitted": 0,
		"cancelled": 0,
		"workflow_changes": 0,
		"status_changes": 0,
		"current_draft": 0,
		"current_submitted": 0,
		"current_cancelled": 0,
		"affected_value": 0,
		"active_users": set(),
		"affected_documents": set(),
		"statuses": {},
		"latest_on": None,
		"latest_activity": None,
		"latest_document": None,
	}


def _set_latest(group, timestamp, action, document, user):
	if not group["latest_on"] or timestamp > group["latest_on"]:
		group["latest_on"] = timestamp
		group["latest_activity"] = f"{action} by {user} at {timestamp}"
		group["latest_document"] = document


def _docstatus_key(docstatus, is_submittable):
	if not is_submittable:
		return "draft"
	return {0: "draft", 1: "submitted", 2: "cancelled"}.get(docstatus, "draft")


def _user_matches(user, filters):
	return not filters.get("created_by") or filters.created_by == user


def _get_detail_rows(filters):
	start, end = get_period(filters)
	rows = []
	for doctype in get_doctypes(filters):
		if not frappe.db.exists("DocType", doctype):
			continue
		meta, fields = get_snapshot_fields(doctype)
		doc_filters = {"creation": ["between", [start, end]]}
		if filters.get("created_by"):
			doc_filters["owner"] = filters.created_by
		if not filters.get("include_cancelled") and meta.is_submittable:
			doc_filters["docstatus"] = ["!=", 2]
		for doc in frappe.get_all(doctype, filters=doc_filters, fields=fields, limit_page_length=0):
			context = get_document_context(doc, meta.is_submittable)
			if not matches_context(context, filters):
				continue
			rows.append(
				{
					"document_type": doctype,
					"document_name": doc.name,
					**context,
					"document_state": docstatus_label(doc.docstatus, meta.is_submittable),
					"created_by": doc.owner,
					"created_on": doc.creation,
					"last_modified_by": doc.modified_by,
					"last_modified_on": doc.modified,
				}
			)
	rows.sort(key=lambda row: row["created_on"], reverse=True)
	return rows


def _get_summary_columns():
	return [
		{"fieldname": "activity_date", "label": _("Day"), "fieldtype": "Date", "width": 105},
		{"fieldname": "document_type", "label": _("Document Type"), "fieldtype": "Link", "options": "DocType", "width": 225},
		{"fieldname": "transaction_type", "label": _("Purchase / Transaction Type"), "fieldtype": "Data", "width": 175},
		{"fieldname": "total_actions", "label": _("Total Actions"), "fieldtype": "Int", "width": 100},
		{"fieldname": "created", "label": _("Created"), "fieldtype": "Int", "width": 80},
		{"fieldname": "edited", "label": _("Edited"), "fieldtype": "Int", "width": 75},
		{"fieldname": "submitted", "label": _("Submitted"), "fieldtype": "Int", "width": 90},
		{"fieldname": "cancelled", "label": _("Cancelled"), "fieldtype": "Int", "width": 90},
		{"fieldname": "workflow_changes", "label": _("Workflow Changes"), "fieldtype": "Int", "width": 125},
		{"fieldname": "status_changes", "label": _("Status Changes"), "fieldtype": "Int", "width": 110},
		{"fieldname": "affected_documents", "label": _("Documents Touched"), "fieldtype": "Int", "width": 130},
		{"fieldname": "active_users", "label": _("Active Users"), "fieldtype": "Int", "width": 100},
		{"fieldname": "users", "label": _("Who Worked"), "fieldtype": "Small Text", "width": 250},
		{"fieldname": "status_breakdown", "label": _("Current Status Breakdown"), "fieldtype": "Small Text", "width": 260},
		{"fieldname": "current_draft", "label": _("Created: Draft"), "fieldtype": "Int", "width": 105},
		{"fieldname": "current_submitted", "label": _("Created: Submitted"), "fieldtype": "Int", "width": 125},
		{"fieldname": "current_cancelled", "label": _("Created: Cancelled"), "fieldtype": "Int", "width": 125},
		{"fieldname": "affected_value", "label": _("Value Created"), "fieldtype": "Currency", "width": 130},
		{"fieldname": "latest_activity", "label": _("Latest Activity"), "fieldtype": "Small Text", "width": 270},
		{"fieldname": "latest_document", "label": _("Latest Document"), "fieldtype": "Dynamic Link", "options": "document_type", "width": 190},
	]


def _get_detail_columns():
	return [
		{"fieldname": "document_type", "label": _("Document Type"), "fieldtype": "Link", "options": "DocType", "width": 220},
		{"fieldname": "document_name", "label": _("Document"), "fieldtype": "Dynamic Link", "options": "document_type", "width": 190},
		{"fieldname": "transaction_type", "label": _("Purchase / Transaction Type"), "fieldtype": "Data", "width": 175},
		{"fieldname": "party", "label": _("Customer / Supplier / Party"), "fieldtype": "Data", "width": 200},
		{"fieldname": "current_status", "label": _("Current Business Status"), "fieldtype": "Data", "width": 180},
		{"fieldname": "document_state", "label": _("Document State"), "fieldtype": "Data", "width": 120},
		{"fieldname": "amount", "label": _("Amount"), "fieldtype": "Currency", "width": 130},
		{"fieldname": "created_by", "label": _("Created By"), "fieldtype": "Link", "options": "User", "width": 190},
		{"fieldname": "created_on", "label": _("Created On"), "fieldtype": "Datetime", "width": 170},
		{"fieldname": "last_modified_by", "label": _("Last Modified By"), "fieldtype": "Link", "options": "User", "width": 190},
		{"fieldname": "last_modified_on", "label": _("Last Modified On"), "fieldtype": "Datetime", "width": 170},
	]


def _summary_chart(rows):
	by_date = defaultdict(lambda: defaultdict(int))
	for row in rows:
		for fieldname in ("created", "edited", "submitted", "cancelled", "workflow_changes"):
			by_date[str(row["activity_date"])][fieldname] += row[fieldname]
	labels = sorted(by_date)
	return {
		"data": {
			"labels": labels,
			"datasets": [
				{"name": _("Created"), "values": [by_date[day]["created"] for day in labels]},
				{"name": _("Edited"), "values": [by_date[day]["edited"] for day in labels]},
				{"name": _("Submitted"), "values": [by_date[day]["submitted"] for day in labels]},
				{"name": _("Cancelled"), "values": [by_date[day]["cancelled"] for day in labels]},
				{"name": _("Workflow"), "values": [by_date[day]["workflow_changes"] for day in labels]},
			],
		},
		"type": "bar",
		"barOptions": {"stacked": True},
		"colors": ["#2490ef", "#7c7c7c", "#29cd42", "#e24c4c", "#9b59b6"],
	}


def _summary_cards(rows):
	return [
		{"value": sum(row["total_actions"] for row in rows), "label": _("Total Actions"), "datatype": "Int", "indicator": "Blue"},
		{"value": sum(row["created"] for row in rows), "label": _("Documents Created"), "datatype": "Int", "indicator": "Blue"},
		{"value": sum(row["submitted"] for row in rows), "label": _("Submit Events"), "datatype": "Int", "indicator": "Green"},
		{"value": sum(row["cancelled"] for row in rows), "label": _("Cancel Events"), "datatype": "Int", "indicator": "Red"},
		{"value": sum(row["edited"] + row["workflow_changes"] + row["status_changes"] for row in rows), "label": _("Change Events"), "datatype": "Int", "indicator": "Orange"},
		{"value": len({user for row in rows for user in row["users"].split(", ") if user}), "label": _("Active Users"), "datatype": "Int", "indicator": "Purple"},
	]


def _detail_chart(rows):
	counts = defaultdict(int)
	for row in rows:
		counts[row["document_type"]] += 1
	return {
		"data": {"labels": list(counts), "datasets": [{"name": _("Documents"), "values": list(counts.values())}]},
		"type": "bar",
	}


def _detail_summary(rows):
	return [
		{"value": len(rows), "label": _("Documents"), "datatype": "Int", "indicator": "Blue"},
		{"value": len({row["created_by"] for row in rows}), "label": _("Creators"), "datatype": "Int", "indicator": "Green"},
	]


def _summary_message():
	return _("Created counts first saves. Submit, cancel, workflow, status, and edit columns count audit events that occurred on that day, including activity on older documents.")


def _detail_message():
	return _("One row per document created in the selected period. Click a document number to open it.")
