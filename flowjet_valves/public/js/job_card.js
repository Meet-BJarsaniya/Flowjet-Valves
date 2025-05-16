frappe.ui.form.on('Job Card', {
    onload: function(frm) {
        if (frm.doc.docstatus == 0 && !frm.doc.custom_job_type) {
            frappe.prompt([
                {
                    label: 'Job Type',
                    fieldname: 'custom_job_type',
                    fieldtype: 'Select',
                    options: ['In-house', 'Sub Contract', 'Brought Out'],
                    reqd: 1
                }
            ], function(values) {
                frm.set_value('custom_job_type', values.custom_job_type);
                frm.save();  // Save the form automatically after setting the value
            }, 'Select Job Type', 'Set');
        }
    }
});
