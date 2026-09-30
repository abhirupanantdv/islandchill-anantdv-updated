frappe.query_reports["Daily Document Register"] = {
	filters: [
		{
			fieldname: "report_view",
			label: __("View"),
			fieldtype: "Select",
			options: ["Daily Consolidated Summary", "Document Details"].join("\n"),
			default: "Daily Consolidated Summary",
			reqd: 1,
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
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
			fieldname: "created_by",
			label: __("User"),
			fieldtype: "Link",
			options: "User",
		},
		{
			fieldname: "action",
			label: __("Action"),
			fieldtype: "Select",
			options: ["", "Created", "Edit", "Submit", "Cancel", "Workflow Change", "Status Change"].join("\n"),
			depends_on: "eval:doc.report_view=='Daily Consolidated Summary'",
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
			fieldname: "include_cancelled",
			label: __("Include Cancelled Documents"),
			fieldtype: "Check",
			default: 0,
			depends_on: "eval:doc.report_view=='Document Details'",
		},
	],
	formatter(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		const colors = {
			created: "blue",
			edited: "orange",
			submitted: "green",
			cancelled: "red",
			workflow_changes: "purple",
			status_changes: "yellow",
		};
		if (colors[column.fieldname] && data && data[column.fieldname]) {
			return `<span class="indicator-pill ${colors[column.fieldname]}">${value}</span>`;
		}
		if (column.fieldname === "document_type") {
			return `<strong>${value}</strong>`;
		}
		return value;
	},
};

