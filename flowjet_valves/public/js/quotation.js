frappe.ui.form.on('Quotation', {
    refresh(frm) {
        if (frm.doc.docstatus === 0 && !frm.is_new()) {
            frm.add_custom_button('Request for Quotation', () => {
                frappe.call({
                    method: 'flowjet_valves.public.py.quotation.make_rfq_from_quotation',
                    args: { quotation: frm.doc.name},
                    callback: function(r) {
                        if (r.message) {
                            frappe.model.sync(r.message);
                            frappe.set_route("Form", r.message.doctype, r.message.name);
                        } else {
                            frappe.msgprint("No items found for RFQ.");
                        }
                    }
                });
            }, 'Create');
        }
    }
});


frappe.ui.form.on('Quotation Item', {
    item_code(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (row.item_code && frm.doc.party_name) {
            frappe.call({
                method: 'flowjet_valves.public.py.sales_order.get_last_item_rate',
                args: {
                    party_name: frm.doc.party_name,
                    item_code: row.item_code
                },
                callback(r) {
                    frappe.model.set_value(cdt, cdn, 'custom_previous_rate', r.message/frm.doc.conversion_rate || 0);
                }
            });
        }
    }
});