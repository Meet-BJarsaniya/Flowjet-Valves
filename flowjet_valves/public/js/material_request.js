frappe.ui.form.on("Material Request", {
	make_purchase_order: function (frm) {
		// frappe.call({
		//     method: "flowjet_valves.public.py.material_request.create_purchase_orders_by_custom_supplier",
		//     args: {
		//         material_request: frm.doc.name
		//     },
		//     callback: function (r) {
		//         if (r.message) {
		//             // Show links to created Purchase Orders
		//             r.message.forEach(po => {
		//                 frappe.msgprint({
		//                     title: __("Purchase Order Created"),
		//                     message: __('Created <a href="/app/purchase-order/{0}">{0}</a>', [po]),
		//                     indicator: "green"
		//                 });
		//             });
		//         }
		//     }
		// });
		frappe.call({
			method: "flowjet_valves.public.py.material_request.get_material_request_items_with_supplier",
			args: { material_request: frm.doc.name },
			callback: function (r) {
				if (!r.message || r.message.length === 0) {
					frappe.msgprint("No items found in the Material Request.");
					return;
				}

				let items = r.message.map((item) => ({
					item_code: item.item_code,
					item_name: item.item_name,
					supplier: item.supplier,
					selected: 0,
					qty: item.qty,
					name: item.name,
				}));
				console.log("Items:", items);

				let dialog = new frappe.ui.Dialog({
					title: __("Create Purchase Order"),
					fields: [
						{
							fieldtype: "Link",
							fieldname: "default_supplier",
							label: __("For Default Supplier (Optional)"),
							hidden: 1,
							options: "Supplier",
							get_query: () => ({
								query: "erpnext.stock.doctype.material_request.material_request.get_default_supplier_query",
								filters: { doc: frm.doc.name },
							}),
						},
						{
							fieldtype: "Link",
							fieldname: "supplier",
							label: "Supplier",
							options: "Supplier", // This must be a string, not a variable
							reqd: 0, // Optional (set to 1 if required)
							default: "", // Use "" if no default value
							description: "Select a supplier to filter or associate items",
						},

						{
							fieldtype: "Section Break",
						},
						{
							fieldtype: "Data",
							fieldname: "selected_count",
							label: "Selected Items Count",
							default: 0,
							read_only: 1,
						},
						{
							fieldtype: "Table",
							fieldname: "item_table",
							label: "Items",
							cannot_add_rows: true,
							cannot_delete_all_rows: true,
							fields: [
								{
									fieldtype: "Check",
									fieldname: "selected",
									label: "Select",
									in_list_view: 1,
									columns: 1.5,
									onchange: function () {
										updateSelectedCount();
									},
								},
								{
									fieldtype: "Data",
									fieldname: "item_code",
									label: "Item Code",
									read_only: 1,
									in_list_view: 1,
									columns: 3,
								},
								{
									fieldtype: "Float",
									fieldname: "qty",
									label: "Qty",
									read_only: 1,
									in_list_view: 1,
									columns: 2,
								},
								{
									fieldtype: "Data",
									fieldname: "item_name",
									label: "Item Name",
									read_only: 1,
									columns: 3,
								},
							],
						},
					],
					primary_action_label: __("Create"),
					primary_action(values) {
						let selected_items = values.item_table.filter((row) => row.selected);
						console.log(selected_items);
						if (!selected_items.length) {
							frappe.msgprint("Please select at least one item.");
							return;
						}

						dialog.hide();
						frappe.model.open_mapped_doc({
							method: "erpnext.stock.doctype.material_request.material_request.make_purchase_order",
							frm: frm,
							args: {
								supplier: values.supplier, // pass selected supplier
								filtered_children: selected_items.map((row) => row.name), // pass only selected items
							},
							run_link_triggers: true,
						});
					},
				});

				// Fill and show dialog
				dialog.fields_dict.item_table.df.data = items;
				dialog.fields_dict.item_table.grid.grid_pagination.page_length = 10;
				dialog.fields_dict.item_table.grid.refresh();

				dialog.show();

				// Selected count logic
				function updateSelectedCount() {
					let count = dialog.fields_dict.item_table.df.data.filter(
						(row) => row.selected
					).length;
					dialog.set_value("selected_count", count);
					dialog.refresh_field("selected_count");
				}

				setTimeout(() => {
					$(dialog.fields_dict.item_table.grid.wrapper).on(
						"change",
						'input[type="checkbox"]',
						function () {
							let row_index = $(this).closest(".grid-row").attr("data-idx") - 1;
							dialog.fields_dict.item_table.df.data[row_index].selected = this
								.checked
								? 1
								: 0;
							updateSelectedCount();
						}
					);
				}, 500);
			},
		});
	},

	onload: function (frm) {
		// Define priority order
		const priority_order = ["Urgent", "High", "Medium", "Low"];

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
