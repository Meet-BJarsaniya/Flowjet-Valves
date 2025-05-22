frappe.ui.form.on('Sales Order', {
    custom_priority(frm) {
        if (frm.doc.items && frm.doc.custom_priority) {
            // updateProductionPlans(frm);
            frm.doc.items.forEach(row => {
                if (!row.custom_priority) row.custom_priority = frm.doc.custom_priority;
            });
            frm.refresh_field('items');
        }
    },
    after_save(frm) {
        if (frm.doc.docstatus == 1) updateManufactureCycle(frm);
    },
    refresh(frm) {
        if (!frm.doc.selling_price_list) return;

        frm.doc.items.forEach(row => {
            if (!row.item_code) return;

            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Item Price",
                    filters: {
                        item_code: row.item_code,
                        price_list: frm.doc.selling_price_list
                    },
                    fieldname: "price_list_rate"
                },
                callback: function (r) {
                    if (!r.message) return;

                    let price_list_rate = r.message.price_list_rate;
                    if (flt(row.rate) !== flt(price_list_rate)) {
                        $(`[data-idx="${row.idx}"] [data-fieldname="rate"]`).css("color", "red");
                    } else {
                        $(`[data-idx="${row.idx}"] [data-fieldname="rate"]`).css("color", "");
                    }
                }
            });
        });
    }
});


frappe.ui.form.on('Sales Order Item', {
    rate(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.item_code || !frm.doc.selling_price_list) return;

        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Item Price",
                filters: {
                    item_code: row.item_code,
                    price_list: frm.doc.selling_price_list
                },
                fieldname: "price_list_rate"
            },
            callback: function (r) {
                if (!r.message) return;

                let price_list_rate = r.message.price_list_rate;
                // Compare the rate
                if (flt(row.rate) !== flt(price_list_rate)) {
                    // Apply red style to the 'rate' field
                    $(`[data-idx="${row.idx}"] [data-fieldname="rate"]`).css("color", "red");
                } else {
                    // Reset color if it's the same
                    $(`[data-idx="${row.idx}"] [data-fieldname="rate"]`).css("color", "");
                }
            }
        });
    }
});


function updateManufactureCycle(frm) {
    let item_priority_map = {};

    (frm.doc.items || []).forEach(item => {
        if (item.item_code) {
            item_priority_map[item.item_code] = item.custom_priority;
        }
    });

    frm.call({
        method: 'flowjet_valves.public.py.sales_order.update_manufacture_cycle',
        args: {
            name: frm.doc.name,
            custom_priority: frm.doc.custom_priority,
            item_priority_map: item_priority_map
        }
    });
}