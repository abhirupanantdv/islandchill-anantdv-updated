import frappe
from frappe import _

def resolve_equipment_production_line(eq_name):
    if not eq_name:
        return ""
    line = frappe.db.get_value("Equipment List", eq_name, "production_line")
    if line:
        return line.strip()
    base_name = eq_name.split(" - ")[0].strip()
    line = frappe.db.get_value("Equipment List", base_name, "production_line")
    if line:
        return line.strip()
    matching = frappe.get_all("Equipment List", filters=[["name", "like", f"{base_name}%"]], fields=["production_line"], limit=1)
    if matching and matching[0].get("production_line"):
        return matching[0]["production_line"].strip()
    line1_items = ["air compressor", "boiler", "syrup and cip", "glycol"]
    if any(k in eq_name.lower() for k in line1_items):
        return "Filling Line 1"
    return "Filling Line 2"


@frappe.whitelist(allow_guest=True)
def get_maintenance_templates(production_line=None, work_order=None):
    """Return all Maintenance Checklist Masters in frontend format, optionally filtered by production line or work order."""

    target_line = (production_line or "").strip()
    if not target_line and work_order:
        target_line = (frappe.db.get_value("Work Order", work_order, "custom_production_line") or "").strip()

    templates = []

    masters = frappe.get_all(
        "Maintenance Checklist Master",
        fields=["name", "equipment", "area"],
        order_by="name asc",
        ignore_permissions=True
    )

    for row in masters:
        doc = frappe.get_doc("Maintenance Checklist Master", row.name)
        eq_name = doc.equipment or doc.name or ""
        eq_line = resolve_equipment_production_line(eq_name)

        if target_line and eq_line and eq_line.lower() != target_line.lower() and (target_line.lower() not in eq_line.lower()):
            continue

        template = {
            "id": frappe.scrub(doc.name),
            "name": f"Daily Preventive Maintenance Schedule ({doc.equipment})",
            "equipment": doc.equipment,
            "area": doc.area,
            "production_line": eq_line,
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