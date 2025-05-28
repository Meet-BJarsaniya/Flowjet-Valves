frappe.ui.form.on('Job Card', {
    onload: function(frm) {
        if (frm.doc.docstatus == 0 && !frm.doc.custom_job_type) {
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
                    description: 'Total Qty To Manufacture: ' + frm.doc.for_quantity,
                },
            ], function(values) {
                // Check required condition manually
                if (values.custom_job_type === 'Sub Contract' && (!values.custom_qty_to_subcontract || 0 > values.custom_qty_to_subcontract || values.custom_qty_to_subcontract > frm.doc.for_quantity)) {
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
        }
    },
});
