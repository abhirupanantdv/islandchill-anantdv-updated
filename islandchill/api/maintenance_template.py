import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_maintenance_templates():
    """Return all Maintenance Checklist Masters in frontend format."""

    templates = []

    masters = frappe.get_all(
        "Maintenance Checklist Master",
        fields=["name"],
        ignore_permissions=True
    )

    for row in masters:
        doc = frappe.get_doc("Maintenance Checklist Master", row.name)

        template = {
            "id": frappe.scrub(doc.name),
            "name": f"Daily Preventive Maintenance Schedule ({doc.equipment})",
            "equipment": doc.equipment,
            "area": doc.area,
            "days": [
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
                "Sun",
            ],
            "tasks": [
                {
                    "id": idx + 1,
                    "desc": item.description,
                    "std": (
                        f"{item.standard_time_mins} min"
                        if item.standard_time_mins
                        else "-"
                    ),
                }
                for idx, item in enumerate(doc.checklist_items)
            ],
        }

        templates.append(template)

    return templates