frappe.ui.form.on("Request for Quotation", {
	onload: function (frm) {
		// Define priority order
		const priority_order = ["Urgent", "High", "Medium", "Low", ""];

		// Sort items table by priority
		frm.doc.items.sort((a, b) => {
			return (
				priority_order.indexOf(a.custom_priority) -
				priority_order.indexOf(b.custom_priority)
			);
		});

		// Refresh the field to reflect new order
		frm.refresh_field("items");
	},
});
