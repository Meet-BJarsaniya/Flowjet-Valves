frappe.ui.form.on("Purchase Receipt", {
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

	after_save: function (frm) {
		if (frm.doc.docstatus === 0) {
			let promises = [];
			// let need_approval = false;
			frm.doc.items.forEach((item) => {
				const promise = frappe.db
					.get_value("Item", item.item_code, [
						"custom_has_tolerance",
						"custom_minimum_weight_per_nos",
						"custom_maximum_weight_per_nos",
					])
					.then((res) => {
						if (res.message.custom_has_tolerance) {
							const actual_weight_per_nos = item.custom_total_wt / item.qty;
							if (
								res.message.custom_minimum_weight_per_nos >
									actual_weight_per_nos ||
								actual_weight_per_nos > res.message.custom_maximum_weight_per_nos
							) {
								frappe.msgprint(
									`Item ${
										item.item_code
									} weight per Nos ${actual_weight_per_nos.toFixed(
										3
									)} should be between ${
										res.message.custom_minimum_weight_per_nos
									} and ${res.message.custom_maximum_weight_per_nos}`
								);
								// need_approval = true;
								return true; // needs approval
							}
						}
						return false; // doesn't need approval
					});
				promises.push(promise);
			});

			Promise.all(promises).then((results) => {
				const need_approval = results.includes(true);
				frappe.db
					.set_value(
						frm.doc.doctype,
						frm.doc.name,
						"custom_need_approval",
						need_approval ? 1 : 0
					)
					.then(() => {
						frm.reload_doc(); // <- this will fully refresh the form with updated DB values
					});
			});
		}
	},

	refresh: function (frm) {
		if (frm.doc.docstatus === 0) {
			frm.doc.items.forEach((item) => {
				if (!item.custom_total_wt && item.custom_weight_per_nos) {
					frappe.model.set_value(
						"Purchase Receipt Item",
						item.name,
						"custom_total_wt",
						item.custom_weight_per_nos * item.qty
					);
				}
			});
			frm.add_custom_button(
				__("Update Quality Inspection(s)"),
				async function () {
					// Check for missing batch/serial/bundle info
					// const missing = [];
					// let item_batch_pairs = [];
					// const batch_promises = [];

					// for (let item of frm.doc.items) {
					// 	const item_details = await frappe.db.get_doc("Item", item.item_code);

					// 	if (item_details.is_stock_item) {
					// 		const needs_batch = item_details.has_batch_no;
					// 		const needs_serial = item_details.has_serial_no;

					// 		const has_bundle = !!item.serial_and_batch_bundle;
					// 		const has_batch = !!item.batch_no;
					// 		const has_serial = !!item.serial_no;

					// 		const missing_batch_serial =
					// 			(needs_batch && !has_batch && !has_bundle) ||
					// 			(needs_serial && !has_serial && !has_bundle);

					// 		if (missing_batch_serial) {
					// 			missing.push(`Item: <b>${item.item_code}</b>`);
					// 		}

					// 		// 🔴 Skip items that don't require inspection before purchase
					// 		if (!item_details.inspection_required_before_purchase) {
					// 			continue;
					// 		}

					// 		// Build item-batch pairs
					// 		if (has_batch) {
					// 			item_batch_pairs.push({
					// 				item_code: item.item_code,
					// 				batch_no: item.batch_no,
					// 			});
					// 		} else if (has_bundle) {
					// 			batch_promises.push(
					// 				frappe.db
					// 					.get_doc(
					// 						"Serial and Batch Bundle",
					// 						item.serial_and_batch_bundle
					// 					)
					// 					.then((bundle) => {
					// 						if (
					// 							bundle.entries &&
					// 							Array.isArray(bundle.entries) &&
					// 							bundle.entries.length > 0
					// 						) {
					// 							for (let row of bundle.entries) {
					// 								item_batch_pairs.push({
					// 									item_code: item.item_code,
					// 									batch_no: row.batch_no || "",
					// 								});
					// 							}
					// 						} else {
					// 							// No entries in bundle, still push blank batch
					// 							item_batch_pairs.push({
					// 								item_code: item.item_code,
					// 								batch_no: "",
					// 							});
					// 						}
					// 					})
					// 			);
					// 		} else {
					// 			// Neither batch nor bundle
					// 			item_batch_pairs.push({
					// 				item_code: item.item_code,
					// 				batch_no: "",
					// 			});
					// 		}
					// 	}
					// }

					// if (missing.length) {
					// 	frappe.msgprint({
					// 		title: __("Missing Serial/Batch/Bundle"),
					// 		message:
					// 			__(
					// 				"Please update Serial No / Batch No or Bundle for the following:<br>"
					// 			) + missing.join("<br>"),
					// 		indicator: "red",
					// 	});
					// 	return;
					// }

					// await Promise.all(batch_promises);

					// console.log("Item-Batch Pairs:", item_batch_pairs);

					// const enriched_pairs = [];

					// for (let pair of item_batch_pairs) {
					// 	const filters = {
					// 		reference_type: "Purchase Receipt",
					// 		reference_name: frm.doc.name,
					// 		item_code: pair.item_code,
					// 		docstatus: ["in", [0, 1]]
					// 	};

					// 	if (pair.batch_no) filters.batch_no = pair.batch_no;

					// 	const qi = await frappe.db.get_list("Quality Inspection", {
					// 		filters,
					// 		fields: ["name"],
					// 		limit: 1,
					// 		order_by: "creation desc"
					// 	});

					// 	enriched_pairs.push({
					// 		item_code: pair.item_code,
					// 		batch_no: pair.batch_no,
					// 		quality_inspections: qi.length ? qi[0].name : null
					// 	});
					// }

					// console.log("Enriched QI map:", enriched_pairs);

					const missing = [];
					const item_batch_pairs = [];
					const batch_promises = [];

					// Step 1: Build item-batch pairs and validate missing info
					for (let item of frm.doc.items) {
						const item_details = await frappe.db.get_doc("Item", item.item_code);

						if (!item_details.is_stock_item) {
							continue;
						}

						const has_batch = !!item.batch_no;
						const has_serial = !!item.serial_no;
						const has_bundle = !!item.serial_and_batch_bundle;

						const needs_batch = item_details.has_batch_no;
						const needs_serial = item_details.has_serial_no;

						const missing_info =
							(needs_batch && !has_batch && !has_bundle) ||
							(needs_serial && !has_serial && !has_bundle);

						if (missing_info) {
							missing.push(`Item: <b>${item.item_code}</b>`);
						}

						if (!item_details.inspection_required_before_purchase) {
							continue;
						}

						if (has_batch) {
							item_batch_pairs.push({
								item_code: item.item_code,
								batch_no: item.batch_no,
								has_batch: true,
							});
						} else if (has_bundle) {
							batch_promises.push(
								frappe.db
									.get_doc(
										"Serial and Batch Bundle",
										item.serial_and_batch_bundle
									)
									.then((bundle) => {
										const entries = bundle.entries || [];
										if (entries.length) {
											entries.forEach((row) => {
												item_batch_pairs.push({
													item_code: item.item_code,
													batch_no: row.batch_no || "",
												});
											});
										} else {
											item_batch_pairs.push({
												item_code: item.item_code,
												batch_no: "",
											});
										}
									})
							);
						} else {
							item_batch_pairs.push({ item_code: item.item_code, batch_no: "" });
						}
					}

					// Step 2: Show missing batch/serial warning
					if (missing.length) {
						frappe.msgprint({
							title: __("Missing Serial/Batch/Bundle"),
							message:
								__(
									"Please update Serial No / Batch No or Bundle for the following:<br>"
								) + missing.join("<br>"),
							indicator: "red",
						});
						return;
					}

					// Step 3: Resolve bundles and enrich with QI
					await Promise.all(batch_promises);

					const enriched_pairs = [];

					for (let pair of item_batch_pairs) {
						const filters = {
							reference_type: "Purchase Receipt",
							reference_name: frm.doc.name,
							item_code: pair.item_code,
							docstatus: ["in", [0, 1]],
						};
						if (pair.batch_no) filters.batch_no = pair.batch_no;

						const [qi] = await frappe.db.get_list("Quality Inspection", {
							filters,
							fields: ["name"],
							limit: 1,
							order_by: "creation desc",
						});

						enriched_pairs.push({
							item_code: pair.item_code,
							batch_no: pair.batch_no,
							quality_inspections: qi?.name || null,
							has_batch: pair.has_batch,
						});
					}

					const items_without_qi = enriched_pairs
						.filter((item) => !item.quality_inspections)
						.map((item) => ({
							item_code: item.item_code,
							batch_no: item.batch_no,
							quality_inspections: null,
							has_batch: item.has_batch,
						}));

					if (!items_without_qi.length) {
						frappe.msgprint("No items to QC.");
						// dialog.hide();
						return;
					}

					// Step 4: Open dialog if validation passed
					const dialog = new frappe.ui.Dialog({
						title: "Remaining Item-Batch for Quality Inspections",
						fields: [
							{
								fieldname: "qi_table",
								fieldtype: "Table",
								label: "Items",
								cannot_add_rows: false,
								in_place_edit: true,
								fields: [
									{
										fieldname: "item_code",
										fieldtype: "Data",
										label: "Item Code",
										in_list_view: 1,
										read_only: 1,
									},
									{
										fieldname: "batch_no",
										fieldtype: "Link",
										label: "Batch No",
										options: "Batch",
										in_list_view: 1,
										read_only: 1,
									},
								],
								data: items_without_qi
									// .filter(item => !item.quality_inspections) // ✅ Only items without QI
									.map((item) => ({
										item_code: item.item_code,
										batch_no: item.batch_no,
										has_batch: item.has_batch,
									})),
							},
						],
						primary_action_label: "Make Quality Inspection",
						primary_action(values) {
							const table_data = values.qi_table || [];

							if (!table_data.length) {
								frappe.msgprint("No items to QC.");
								dialog.hide();
								return;
							}

							frappe.dom.freeze("Creating Quality Inspections...");

							const promises = table_data.map((row) => {
								const qi_doc = {
									doctype: "Quality Inspection",
									inspection_type: "Incoming",
									reference_type: "Purchase Receipt",
									reference_name: frm.doc.name,
									item_code: row.item_code,
									inspected_by: frappe.session.user,
									sample_size: 0,
									batch_no: row.batch_no || null,
								};

								return frappe
									.call({
										method: "frappe.client.insert",
										args: { doc: qi_doc },
									})
									.then((r) => {
										frm.doc.items.forEach((item) => {
											if (item.item_code === row.item_code && !item.batch_no && !row.has_batch) {
												frappe.model.set_value("Purchase Receipt Item", item.name, "quality_inspection", r.message.name);
											}
										});
										frm.doc.items.forEach((item) => {
											if (item.item_code === row.item_code && item.batch_no === row.batch_no && row.has_batch) {
												frappe.model.set_value("Purchase Receipt Item", item.name, "quality_inspection", r.message.name);
											}
										});
										return r;
									});
							});

							Promise.all(promises)
								.then(() => {
									dialog.hide();
									frappe.show_alert({ message: __("Quality Inspection(s) created successfully."), indicator: "green" });
									frm.save();
								})
								.catch((error) => {
									console.error("Error creating QIs:", error);
									frappe.msgprint(
										__(
											"There was an error while creating Quality Inspections."
										)
									);
								})
								.finally(() => {
									frappe.dom.unfreeze();
								});
						},
					});

					dialog.show();
				},
				__("Create")
			);
		}
	},
});

frappe.ui.form.on("Purchase Receipt Item", {
	item_code: function (frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		if (frm.doc.docstatus === 0 && !child.custom_total_wt && child.custom_weight_per_nos) {
			frappe.model.set_value(
				cdt,
				cdn,
				"custom_total_wt",
				child.custom_weight_per_nos * child.qty
			);
		}
	},
	custom_total_wt: function (frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		frappe.model.set_value(
			cdt,
			cdn,
			"rate",
			(child.price_list_rate * child.custom_total_wt) /
				child.qty /
				child.custom_weight_per_nos
		);
	},
});
