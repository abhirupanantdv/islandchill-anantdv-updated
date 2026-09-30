frappe.query_reports["User Activity Summary"] = {
	filters: [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_days(frappe.datetime.get_today(), -7),
			reqd: 1,
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1,
		},
		{
			fieldname: "user",
			label: __("Employee / User"),
			fieldtype: "Link",
			options: "User",
		},
		{
			fieldname: "action",
			label: __("What They Did"),
			fieldtype: "Select",
			options: ["", "Login", "Logout", "Created", "Edit", "Updated", "Workflow Change", "Status Change", "Submit", "Cancel", "Reopen"].join("\n"),
		},
		{
			fieldname: "document_type",
			label: __("Document Type"),
			fieldtype: "Link",
			options: "DocType",
			get_query: () => {
				return {
					filters: {
						istable: 0,
						issingle: 0,
					},
				};
			},
		},
		{
			fieldname: "transaction_type",
			label: __("Purchase / Transaction Type"),
			fieldtype: "Data",
		},
		{
			fieldname: "status",
			label: __("Current Status Contains"),
			fieldtype: "Data",
		},
		{
			fieldname: "include_logins",
			label: __("Include Login / Logout"),
			fieldtype: "Check",
			default: 1,
		},
		{
			fieldname: "enabled_users_only",
			label: __("Enabled Users Only"),
			fieldtype: "Check",
			default: 1,
		},
	],
	formatter(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		if (column.fieldname !== "action" || !data) {
			return value;
		}
		const color = {
			Login: "blue",
			Logout: "grey",
			Created: "blue",
			Edit: "orange",
			Updated: "orange",
			"Workflow Change": "purple",
			"Status Change": "yellow",
			Submit: "green",
			Cancel: "red",
			Reopen: "orange",
		}[data.action] || "grey";
		return `<span class="indicator-pill ${color}">${value}</span>`;
	},
};
