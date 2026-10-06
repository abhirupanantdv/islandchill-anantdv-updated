import frappe

MES_ROLE = "IslandChill MES User"
ADMIN_ROLE = "IslandChill Admin User"


def execute():
    """Prepare portal roles before fixtures update existing installations."""
    if frappe.db.exists("Role", ADMIN_ROLE):
        frappe.db.set_value(
            "Role",
            ADMIN_ROLE,
            {"desk_access": 1, "home_page": None, "disabled": 0},
            update_modified=False,
        )

    if not frappe.db.exists("Role", MES_ROLE):
        return

    frappe.db.set_value(
        "Role",
        MES_ROLE,
        {"desk_access": 0, "home_page": "islandchill", "disabled": 0},
        update_modified=False,
    )

    users = frappe.get_all(
        "Has Role",
        filters={"role": MES_ROLE, "parenttype": "User"},
        pluck="parent",
    )
    for user in set(users):
        assigned_roles = frappe.get_all(
            "Has Role",
            filters={"parent": user, "parenttype": "User"},
            pluck="role",
        )
        has_desk_role = bool(
            assigned_roles
            and frappe.db.exists(
                "Role",
                {"name": ["in", assigned_roles], "desk_access": 1, "disabled": 0},
            )
        )
        frappe.db.set_value(
            "User",
            user,
            "user_type",
            "System User" if has_desk_role else "Website User",
            update_modified=False,
        )
        frappe.clear_cache(user=user)

    frappe.clear_cache()
