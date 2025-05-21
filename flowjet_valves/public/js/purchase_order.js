frappe.ui.form.on('Purchase Order', {
    refresh(frm) {
        if (frm.doc.docstatus == 1) {
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
            
                // Add your custom Close button under Status menu
                frm.add_custom_button("Close", () => {
                    frappe.confirm(
                        "Do you want to create another Purchase Order for the remaining items?",
                        function () {
                            // YES — close and then create new PO with remaining items
                            frappe.call({
                                method: "erpnext.buying.doctype.purchase_order.purchase_order.update_status",
                                args: {
                                    status: "Closed",
                                    name: frm.doc.name
                                },
                                callback: function () {
                                    frm.reload_doc();
                                    frappe.msgprint("Purchase Order closed.");

                                    // Now create a new PO from this one with remaining items
                                    frappe.call({
                                        method: "flowjet_valves.public.py.purchase_order.make_new_po_from_remaining",
                                        args: {
                                            source_name: frm.doc.name
                                        },
                                        callback: function (r) {
                                            if (r.message) {
                                                frappe.model.sync(r.message);
                                                frappe.set_route("Form", r.message.doctype, r.message.name);
                                            }
                                        }
                                    });
                                }
                            });
                        },
                        function () {
                            // NO — just close
                            frappe.call({
                                method: "erpnext.buying.doctype.purchase_order.purchase_order.update_status",
                                args: {
                                    status: "Closed",
                                    name: frm.doc.name
                                },
                                callback: function () {
                                    frm.reload_doc();
                                    frappe.msgprint("Purchase Order closed.");
                                }
                            });
                        }
                    );
                }, __("Status"));
            }
        }
    },
});
