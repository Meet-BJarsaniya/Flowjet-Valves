// Copyright (c) 2025, Sanskar Technolab pvt ltd and contributors
// For license information, please see license.txt

frappe.query_reports["Mold Transfer"] = {
	"filters": [
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"reqd": 0
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"reqd": 0
		},
		{
			"fieldname": "item_code",
			"label": __("Mold Item"),
			"fieldtype": "Link",
			"options": "Item",
			"reqd": 0,
			"get_query": function () {
				return {
					filters: {
						"custom_is_mold": 1
					}
				};
			}
		},
	],
};
