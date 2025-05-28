frappe.ui.form.on('Job Card', {
    refresh: function(frm) {
        if (frm.doc.docstatus == 0) {
            frappe.prompt([
                {
                    label: 'Job Type',
                    fieldname: 'custom_job_type',
                    fieldtype: 'Select',
                    options: ['In-house', 'Sub Contract'],
                    reqd: 1
                },
                {
                    label: 'Qty To Sub-Contract',
                    fieldname: 'custom_qty_to_subcontract',
                    fieldtype: 'Float',
                    depends_on: "eval:doc.custom_job_type === 'Sub Contract'",
                    description: frm.doc.total_completed_qty !== 0
                        ? 'Total Qty To Manufacture: ' + frm.doc.process_loss_qty
                        : 'Total Qty To Manufacture: ' + frm.doc.for_quantity
                },
            ], function(values) {
                // Check required condition manually
                let max_qty = frm.doc.total_completed_qty !== 0 ? frm.doc.process_loss_qty : frm.doc.for_quantity;
                if (values.custom_job_type === 'Sub Contract' && (!values.custom_qty_to_subcontract || 0 > values.custom_qty_to_subcontract || values.custom_qty_to_subcontract > max_qty)) {
                    frappe.msgprint(__('Please enter a valid quantity'));
                    return;
                }

                frm.set_value('custom_job_type', values.custom_job_type);

                if (values.custom_job_type === 'Sub Contract') {
                    frm.set_value('custom_qty_to_subcontract', values.custom_qty_to_subcontract);
                    frm.set_value('for_quantity', frm.doc.for_quantity - values.custom_qty_to_subcontract);
                }

                frm.save(); // Save the form
            }, 'Select Job Type', 'Set');
            if (frm.doc.custom_job_type === 'Sub Contract') {
                frm.add_custom_button(
                    __("Sub Contract PO"),
                    function () {
                        // frappe.model.open_mapped_doc({
                        //     method: "flowjet_valves.flowjet_valves.doctype.job_card.job_card.make_sub_contract",
                        //     frm: frm,
                        // });
                    },
                    __("Create"),
                )
            }
        }
    },
});
