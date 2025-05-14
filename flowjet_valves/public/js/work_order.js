
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
        frappe.msgprint("Updating Job Card: ");
        job_cards = frappe.get_list("Job Card", filters={"work_order": frm.doc.name}, pluck="name")
        if (job_cards) {
            job_cards.forEach(job_card => {
                frappe.msgprint("Updating Job Card: " + job_card);
                frappe.db.set_value("Job Card", job_card, "custom_priority", frm.doc.custom_priority);
            });
        }
    }
});
