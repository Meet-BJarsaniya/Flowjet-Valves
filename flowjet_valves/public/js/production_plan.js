frappe.ui.form.on('Production Plan', {
    onload: function(frm) {
        if (frm.doc.docstatus == 0 && !frm.doc.custom_work_type) {
            frappe.prompt([
                {
                    label: 'Work Type',
                    fieldname: 'custom_work_type',
                    fieldtype: 'Select',
                    options: ['In-house', 'Brought Out'],
                    reqd: 1
                }
            ], function(values) {
                frm.set_value('custom_work_type', values.custom_work_type);
                frm.save();  // Save the form automatically after setting the value
            }, 'Select Work Type', 'Set');
        }
    },
    refresh(frm) {
        setTimeout(() => {
            // Update custom_priority in sales_orders table
            if (frm.doc.sales_orders && frm.doc.sales_orders.length > 0) {
                frm.doc.sales_orders.forEach(row => {
                    if (row.sales_order) {
                        frappe.db.get_doc('Sales Order', row.sales_order).then(sales_order => {
                            row.custom_priority = sales_order.custom_priority;
                            frm.refresh_field('sales_orders');

                            // Build item_priority_map from Sales Order Items
                            let item_priority_map = {};
                            (sales_order.items || []).forEach(so_item => {
                                if (so_item.item_code && so_item.custom_priority) {
                                    item_priority_map[so_item.item_code] = so_item.custom_priority;
                                }
                            });

                            // Now update po_items based on item_code match
                            (frm.doc.po_items || []).forEach(po_item => {
                                if (item_priority_map[po_item.item_code]) {
                                    po_item.custom_priority = item_priority_map[po_item.item_code];
                                }
                            });

                            frm.refresh_field('po_items');
                        });
                    }
                });
            }
        }, 500);
        frm.page.remove_inner_button('Material Request', 'Create');

		if (frm.doc.docstatus === 1 && frm.doc.status !== 'Completed' && frm.doc.status !== 'Closed') {
            frm.add_custom_button(__('Material Request'), function () {
                // Directly trigger without confirmation
                frm.events.create_material_request(frm, 0);
            }, __('Create'));
        }
    },
    get_items(frm) {
        frm.save();
    }
});
