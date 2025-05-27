frappe.ui.form.on('Material Request', {
    make_purchase_order: function (frm) {
        frappe.call({
            method: "flowjet_valves.public.py.material_request.create_purchase_orders_by_custom_supplier",
            args: {
                material_request: frm.doc.name
            },
            callback: function (r) {
                if (r.message) {
                    // Show links to created Purchase Orders
                    r.message.forEach(po => {
                        frappe.msgprint({
                            title: __("Purchase Order Created"),
                            message: __('Created <a href="/app/purchase-order/{0}">{0}</a>', [po]),
                            indicator: "green"
                        });
                    });
                }
            }
        });
    },
});
