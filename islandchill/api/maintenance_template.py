import frappe
from frappe import _

def resolve_equipment_lines(eq_name):
    """
    Returns a dict with bool flags: {'filling_line_1': bool, 'filling_line_2': bool}
    and 'production_line': string label or comma-separated lines.
    """
    if not eq_name:
        return {"filling_line_1": 0, "filling_line_2": 0, "production_line": ""}
    
    rec = frappe.db.get_value("Equipment List", eq_name, ["filling_line_1", "filling_line_2"], as_dict=True)
    if not rec:
        base_name = eq_name.split(" - ")[0].strip()
        rec = frappe.db.get_value("Equipment List", base_name, ["filling_line_1", "filling_line_2"], as_dict=True)
    if not rec:
        matching = frappe.get_all("Equipment List", filters=[["name", "like", f"{base_name}%"]], fields=["filling_line_1", "filling_line_2"], limit=1)
        if matching:
            rec = matching[0]

    fl1 = int(rec.get("filling_line_1") or 0) if rec else 0
    fl2 = int(rec.get("filling_line_2") or 0) if rec else 0

    if not fl1 and not fl2:
        line1_items = ["air compressor", "boiler", "syrup and cip", "glycol"]
        if any(k in eq_name.lower() for k in line1_items):
            fl1 = 1
        else:
            fl2 = 1

    lines = []
    if fl1:
        lines.append("Filling Line 1")
    if fl2:
        lines.append("Filling Line 2")

    return {
        "filling_line_1": fl1,
        "filling_line_2": fl2,
        "production_line": ", ".join(lines) if lines else "Filling Line 1"
    }


def resolve_equipment_production_line(eq_name):
    res = resolve_equipment_lines(eq_name)
    return res["production_line"]


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
        lines_info = resolve_equipment_lines(eq_name)
        fl1 = lines_info["filling_line_1"]
        fl2 = lines_info["filling_line_2"]

        if target_line:
            is_line1_target = "1" in target_line or "line 1" in target_line.lower()
            is_line2_target = "2" in target_line or "line 2" in target_line.lower()
            if is_line1_target and not fl1:
                continue
            if is_line2_target and not fl2:
                continue

        template = {
            "id": frappe.scrub(doc.name),
            "name": f"Daily Preventive Maintenance Schedule ({doc.equipment})",
            "equipment": doc.equipment,
            "area": doc.area,
            "filling_line_1": fl1,
            "filling_line_2": fl2,
            "production_line": lines_info["production_line"],
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