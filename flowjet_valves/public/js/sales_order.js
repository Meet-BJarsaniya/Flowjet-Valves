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