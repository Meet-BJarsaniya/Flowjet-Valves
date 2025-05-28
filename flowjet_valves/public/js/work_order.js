
// frappe.ui.form.on('Work Order', {
//     refresh(frm) {
//         if (frm.doc.production_plan && frm.doc.production_plan_item) {
//             frappe.db.get_value('Production Plan Item', frm.doc.production_plan_item, 'custom_priority').then(res => {
//                 frm.set_value('custom_priority', res.custom_priority);
//             });
//         }
//         if (frm.doc.production_plan && frm.doc.production_plan_sub_assembly_item) {
//             frappe.db.get_value('Production Plan Sub Assembly Item', frm.doc.production_plan_sub_assembly_item, 'custom_priority').then(res => {
//                 frm.set_value('custom_priority', res.custom_priority);
//             });
//         }
//     }
// });
frappe.ui.form.on('Work Order', {
    onload: function(frm) {
        if (frm.doc.docstatus == 0 && !frm.doc.custom_work_type) {
            frappe.prompt([
                {
                    label: 'Work Type',
                    fieldname: 'custom_work_type',
                    fieldtype: 'Select',
                    options: ['In-house', 'Brought Out'],
                    reqd: 1
                },
                {
                    label: 'Qty To Buy',
                    fieldname: 'custom_qty_to_buy',
                    fieldtype: 'Float',
                    depends_on: "eval:doc.custom_work_type === 'Brought Out'",
                    description: 'Total Qty To Manufacture: ' + frm.doc.qty,
                },
            ], function(values) {
                // Check required condition manually
                if (values.custom_work_type === 'Brought Out' && (!values.custom_qty_to_buy || 0 > values.custom_qty_to_buy || values.custom_qty_to_buy > frm.doc.qty)) {
                    frappe.msgprint(__('Please enter a valid quantity'));
                    return;
                }

                frm.set_value('custom_work_type', values.custom_work_type);

                if (values.custom_work_type === 'Brought Out') {
                    frm.set_value('custom_qty_to_buy', values.custom_qty_to_buy);
                    frm.set_value('qty', frm.doc.qty - values.custom_qty_to_buy);
                }

                frm.save(); // Save the form
            }, 'Select Work Type', 'Set');
        }
    },
    refresh(frm) {
        if (frm.doc.production_plan_item) {
            frappe.call({
                method: 'flowjet_valves.public.py.work_order.get_custom_priority_from_pp_items',
                args: {
                    item_type: "main",
                    item_name: frm.doc.production_plan_item
                },
                callback(res) {
                    if (res.message) {
                        frm.set_value('custom_priority', res.message);
                        frm.save(ignore_permissions = true);
                    }
                }
            });
        } else if (frm.doc.production_plan_sub_assembly_item) {
            frappe.call({
                method: 'flowjet_valves.public.py.work_order.get_custom_priority_from_pp_items',
                args: {
                    item_type: "sub",
                    item_name: frm.doc.production_plan_sub_assembly_item
                },
                callback(res) {
                    if (res.message) {
                        frm.set_value('custom_priority', res.message);
                        frm.save(ignore_permissions = true);
                    }
                }
            });
        }
    },
    custom_priority(frm) {
        // frappe.msgprint("Updating Job Card: ");
        job_cards = frappe.get_list("Job Card", filters={"work_order": frm.doc.name}, pluck="name")
        if (job_cards) {
            job_cards.forEach(job_card => {
                frappe.msgprint("Updating Job Card: " + job_card);
                frappe.db.set_value("Job Card", job_card, "custom_priority", frm.doc.custom_priority);
            });
        }
    }
});
