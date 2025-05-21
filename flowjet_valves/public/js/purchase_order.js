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
            let new_details = items_data.map(row => `'${row.Item}': ${row.Qty} qty @ ${row.Rate}.`).join(', ');            
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
        }
    }
});
