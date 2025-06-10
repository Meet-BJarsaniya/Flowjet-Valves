frappe.ui.form.on('Purchase Order', {
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
    
    refresh(frm) {
        if (frm.doc.docstatus == 1) {
            if (frm.doc.custom_mold_items?.length > 0) {
                // Check if any Stock Entry exists for this PO (custom linkage)
                frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype: 'Stock Entry',
                        filters: {
                            // purpose: 'Send to Subcontractor',  // or relevant purpose
                            docstatus: ['!=', 2],
                            purchase_order: frm.doc.name       // adjust if you store PO in another field
                        },
                        limit_page_length: 1
                    },
                    callback: function(res) {
                        if ((res.message || []).length === 0) {
                            // Only add button if no SE exists
                            frm.add_custom_button('Mold Stock Entry', () => {
                            //     frappe.prompt([
                            //         {
                            //             label: 'Qty To Send',
                            //             fieldname: 'qty',
                            //             fieldtype: 'Float',
                            //             reqd: 1,
                            //             default: 1,
                            //             // description: 'Total Qty: ' + frm.doc.qty,
                            //         },
                            //     ], function(values) {
                                    // if (values.custom_work_type === 'Brought Out' && (!values.custom_qty_to_buy || 0 > values.custom_qty_to_buy || values.custom_qty_to_buy > frm.doc.qty)) {
                                    //     frappe.msgprint(__('Please enter a valid quantity'));
                                    //     return;
                                    // }
                                    // frm.set_value('custom_qty_to_buy', values.custom_qty_to_buy);
                                    // frm.set_value('custom_total_wo_qty', frm.doc.qty);
                                    // frm.set_value('qty', frm.doc.custom_total_wo_qty - frm.doc.custom_qty_to_buy);
                                    // frm.save();
                                    frappe.call({
                                        method: 'flowjet_valves.public.py.purchase_order.make_mold_stock_entry',
                                        args: { po_name: frm.doc.name, qty: 1},
                                        callback: function(r) {
                                            if (r.message) {
                                                frappe.set_route('Form', 'Stock Entry', r.message);
                                            }
                                        }
                                    });
                                // }, 'Set Mold Qty', 'Set');
                            }, 'Make');
                        }
                    }
                });
            }
            let items_data = [];

            frm.doc.items.forEach(item => {
                items_data.push({
                    "Item": item.item_code,
                    "Qty": item.qty,
                    "Rate": item.rate,
                    // "Currency": item.currency,
                });
            });

            // Convert array to string for comparison and storage
            let new_details = items_data.map(row => `'${row.Item}': ${row.Qty} qty @ ${row.Rate}`).join(', ');            
            const last_entry = frm.doc.custom_items_history.slice(-1)[0];

            if (!last_entry || last_entry.details !== new_details) {
                frappe.call({
                    method: "flowjet_valves.public.py.purchase_order.update_item_history",
                    args: {
                        po_name: frm.doc.name,
                        items_data: new_details
                    },
                    callback: function (r) {
                        frappe.msgprint(r.message);
                        frm.reload_doc(); // Refresh to show new row
                    }
                });            
            }

            if (
                !["Closed", "Delivered"].includes(frm.doc.status) &&
                frm.has_perm("submit") &&
                (flt(frm.doc.per_billed) < 100 || flt(frm.doc.per_received) < 100)
            ) {
                // Remove the default Close button if it exists
                frm.remove_custom_button("Close", "Status");

                const close_po = (with_new_po = false) => {
                    frappe.call({
                        method: "erpnext.buying.doctype.purchase_order.purchase_order.update_status",
                        args: {
                            status: "Closed",
                            name: frm.doc.name
                        },
                        callback: function () {
                            frm.reload_doc();
                            frappe.show_alert({ message: "Purchase Order closed", indicator: "orange" });

                            if (with_new_po) {
                                frappe.call({
                                    method: "flowjet_valves.public.py.purchase_order.make_new_po_from_remaining",
                                    args: {
                                        source_name: frm.doc.name
                                    },
                                    callback: function (r) {
                                        if (r.message) {
                                            frappe.model.sync(r.message);
                                            frappe.set_route("Form", r.message.doctype, r.message.name);
                                        } else {
                                            frappe.msgprint("No remaining items found for new Purchase Order.");
                                        }
                                    }
                                });
                            }
                        }
                    });
                };

                frm.add_custom_button("Close", () => {
                    if (flt(frm.doc.per_received) < 100) {
                        frappe.confirm(
                            "Do you want to create another Purchase Order for the remaining items?",
                            function () {
                                close_po(true); // Yes: close and make new PO
                            },
                            function () {
                                close_po(false); // No: just close
                            }
                        );
                    } else {
                        close_po(false); // Fully received: just close
                    }
                }, __("Status"));
            }
        }
    },

    async validate(frm) {
        for (const item of frm.doc.items) {
            await fetch_and_set_mold_items(frm, item.item_code);
        }
    }
});



// frappe.ui.form.on('Purchase Order Item', {
//     item_code(frm, cdt, cdn) {
//         let item_row = locals[cdt][cdn];

//         frappe.call({
//             method: 'frappe.client.get_list',
//             args: {
//                 doctype: 'Item',
//                 filters: {
//                     custom_mold_for_item: item_row.item_code
//                 },
//                 fields: ['name', 'item_name']
//             },
//             callback(r) {
//                 if (!r.message || r.message.length === 0) return;

//                 // Get supplier warehouse from Supplier master
//                 if (!frm.doc.supplier) {
//                     frappe.msgprint("Please select a Supplier first to fetch mold warehouse.");
//                     return;
//                 }

//                 frappe.call({
//                     method: 'frappe.client.get_value',
//                     args: {
//                         doctype: 'Supplier',
//                         filters: { name: frm.doc.supplier },
//                         fieldname: 'custom_warehouse'
//                     },
//                     callback(supplier_res) {
//                         const supplier_warehouse = supplier_res.message?.custom_warehouse;

//                         if (!supplier_warehouse) {
//                             frappe.msgprint("Supplier warehouse is not set in the Supplier master.");
//                             return;
//                         }

//                         r.message.forEach(mold => {
//                             let source_warehouse = 'Stores - FJD';  // your default source warehouse

//                             // Check if the mold item already exists in the table
//                             const already_exists = frm.doc.custom_mold_items.some(row => row.item_code === mold.name);

//                             if (already_exists) {
//                                 console.log(`Mold item ${mold.name} already exists — skipping.`);
//                                 return;
//                             }

//                             // Add new row
//                             let mold_row = frm.add_child('custom_mold_items', {
//                                 item_code: mold.name,
//                                 item_name: mold.item_name,
//                                 source_warehouse: source_warehouse,
//                                 target_warehouse: supplier_warehouse
//                             });

//                             // Fetch available qty in source & target warehouse
//                             set_available_qty(mold.name, source_warehouse, 'available_qty_at_source_wh', mold_row, frm);
//                             set_available_qty(mold.name, supplier_warehouse, 'available_qty_at_target_wh', mold_row, frm);
//                         });
//                     }
//                 });
//             }
//         });
//     },
// });
// frappe.ui.form.on('Purchase Order Item', {
//     item_code(frm, cdt, cdn) {
//         let row = locals[cdt][cdn];
//         fetch_and_add_molds(frm, row.item_code);
//     }
// });
frappe.ui.form.on('Purchase Order Item', {
    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row.item_code) {
            fetch_and_set_mold_items(frm, row.item_code);
        }
    }
});


frappe.ui.form.on('PO Mold Item', {
    source_warehouse(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row.item_code && row.source_warehouse) {
            set_available_qty(row.item_code, row.source_warehouse, 'available_qty_at_source_wh', row, frm);
        }
    },

    target_warehouse(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row.item_code && row.target_warehouse) {
            set_available_qty(row.item_code, row.target_warehouse, 'available_qty_at_target_wh', row, frm);
        }
    },
});


// function set_available_qty(item_code, warehouse, fieldname, row, frm) {
//     if (!item_code || !warehouse) return;
//     frappe.call({
//         method: 'frappe.client.get_value',
//         args: {
//             doctype: 'Bin',
//             filters: {
//                 item_code: item_code,
//                 warehouse: warehouse
//             },
//             fieldname: 'actual_qty'
//         },
//         callback: function(res) {
//             row[fieldname] = res.message.actual_qty || 0;
//             frm.refresh_field('custom_mold_items');
//         }
//     });
// }
async function set_available_qty(item_code, warehouse, fieldname, row, frm) {
    if (!item_code || !warehouse) return;

    const res = await frappe.call({
        method: 'frappe.client.get_value',
        args: {
            doctype: 'Bin',
            filters: {
                item_code: item_code,
                warehouse: warehouse
            },
            fieldname: 'actual_qty'
        }
    });

    row[fieldname] = res.message?.actual_qty || 0;
    frm.refresh_field('custom_mold_items');
}


// function fetch_and_add_molds(frm, item_code) {
//     if (!item_code) return;

//     // Get all molds for this item
//     frappe.call({
//         method: 'frappe.client.get_list',
//         args: {
//             doctype: 'Item',
//             filters: {
//                 custom_mold_for_item: item_code
//             },
//             fields: ['name', 'item_name']
//         },
//         callback(r) {
//             if (!r.message || r.message.length === 0) return;

//             // Get supplier warehouse
//             if (!frm.doc.supplier) {
//                 frappe.msgprint("Please select a Supplier first to fetch mold warehouse.");
//                 return;
//             }

//             frappe.call({
//                 method: 'frappe.client.get_value',
//                 args: {
//                     doctype: 'Supplier',
//                     filters: { name: frm.doc.supplier },
//                     fieldname: 'custom_warehouse'
//                 },
//                 callback(supplier_res) {
//                     const supplier_warehouse = supplier_res.message?.custom_warehouse;

//                     if (!supplier_warehouse) {
//                         frappe.msgprint("Supplier warehouse is not set in the Supplier master.");
//                         return;
//                     }

//                     r.message.forEach(mold => {
//                         let source_warehouse = 'Stores - FJD';

//                         const already_exists = frm.doc.custom_mold_items.some(row => row.item_code === mold.name);

//                         if (already_exists) return;

//                         let mold_row = frm.add_child('custom_mold_items', {
//                             item_code: mold.name,
//                             item_name: mold.item_name,
//                             source_warehouse,
//                             target_warehouse: supplier_warehouse
//                         });

//                         // Fetch stock qtys
//                         set_available_qty(mold.name, source_warehouse, 'available_qty_at_source_wh', mold_row, frm);
//                         set_available_qty(mold.name, supplier_warehouse, 'available_qty_at_target_wh', mold_row, frm);
//                     });

//                     frm.refresh_field('custom_mold_items');
//                 }
//             });
//         }
//     });
// }
async function fetch_and_set_mold_items(frm, item_code) {
    if (!frm.doc.supplier) {
        frappe.msgprint("Please select a Supplier first.");
        return;
    }

    // Get supplier warehouse
    let supplier_res = await frappe.call({
        method: 'frappe.client.get_value',
        args: {
            doctype: 'Supplier',
            filters: { name: frm.doc.supplier },
            fieldname: 'custom_warehouse'
        }
    });

    const supplier_warehouse = supplier_res.message?.custom_warehouse;
    if (!supplier_warehouse) {
        frappe.msgprint("Supplier warehouse is not set in the Supplier master.");
        return;
    }

    // Get mold items
    let item_res = await frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Item',
            filters: { custom_mold_for_item: item_code },
            fields: ['name', 'item_name']
        }
    });

    if (!item_res.message || item_res.message.length === 0) return;

    const source_warehouse = 'Stores - FJD'; // Default source WH

    for (const mold of item_res.message) {
        const already_exists = frm.doc.custom_mold_items.some(row => row.item_code === mold.name);
        if (already_exists) continue;

        let mold_row = frm.add_child('custom_mold_items', {
            item_code: mold.name,
            item_name: mold.item_name,
            source_warehouse: source_warehouse,
            target_warehouse: supplier_warehouse
        });

        await set_available_qty(mold.name, source_warehouse, 'available_qty_at_source_wh', mold_row, frm);
        await set_available_qty(mold.name, supplier_warehouse, 'available_qty_at_target_wh', mold_row, frm);
    }

    frm.refresh_field('custom_mold_items');
}
