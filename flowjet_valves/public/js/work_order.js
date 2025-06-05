frappe.ui.form.on('Work Order', {
    refresh(frm) {
        if (frm.doc.docstatus == 0 && frm.doc.custom_work_type != 'Brought Out') {
            frm.add_custom_button(__('Brought Out'), function() {
                frappe.prompt([
                    {
                        label: 'Work Type',
                        fieldname: 'custom_work_type',
                        fieldtype: 'Read Only',
                        default: 'Brought Out',
                    },
                    {
                        label: 'Qty To Buy',
                        fieldname: 'custom_qty_to_buy',
                        fieldtype: 'Float',
                        reqd: 1,
                        depends_on: "eval:doc.custom_work_type === 'Brought Out'",
                        description: 'Total Qty: ' + frm.doc.qty,
                    },
                ], function(values) {
                    if (values.custom_work_type === 'Brought Out' && (!values.custom_qty_to_buy || 0 > values.custom_qty_to_buy || values.custom_qty_to_buy > frm.doc.qty)) {
                        frappe.msgprint(__('Please enter a valid quantity'));
                        return;
                    }
                    frm.set_value('custom_work_type', 'Brought Out');
                    frm.set_value('custom_qty_to_buy', values.custom_qty_to_buy);
                    frm.set_value('custom_total_wo_qty', frm.doc.qty);
                    frm.set_value('qty', frm.doc.custom_total_wo_qty - frm.doc.custom_qty_to_buy);
                    frm.save();
                }, 'Select Work Type', 'Set');
            }, __('Make Work Type to'));
        }
        
        if (frm.doc.docstatus == 0 && frm.doc.custom_work_type === 'Brought Out') {         
            frm.add_custom_button(__('Brought Out PO'), function() {
                frappe.prompt([
                    {
                        label: 'Supplier',
                        fieldname: 'supplier',
                        fieldtype: 'Link',
                        options: 'Supplier',
                        reqd: 1,
                    },
                ], function(values) {
                    // Check required condition manually
                    let supplier = values.supplier;
    
                    frappe.call({
                        method: "frappe.client.insert",
                        args: {
                            doc: {
                                doctype: "Purchase Order",
                                supplier: supplier,
                                schedule_date: frappe.datetime.nowdate(),
                                items: [
                                    {
                                        item_code: frm.doc.production_item,
                                        qty: frm.doc.custom_qty_to_buy - frm.doc.custom_po_qty,
                                        warehouse: frm.doc.fg_warehouse || "",
                                        conversion_factor: 1,
                                        uom: frm.doc.stock_uom || "Nos"
                                    }
                                ]
                            }
                        },
                        callback: function (r) {
                            if (!r.exc) {
                                const po_name = r.message.name;
    
                                let row = frm.add_child("custom_brought_out_details");
                                row.subcontract_po = po_name;
    
                                frm.refresh_field("custom_brought_out_details");
                                frm.save();
    
                                // Navigate to PO
                                frappe.set_route("Form", "Purchase Order", po_name);
    
                            }
                        }
                    });
                }, 'Select Supplier', 'Set');
            }, __('Create'));

            if (frm.doc.custom_brought_out_details && frm.doc.custom_brought_out_details.length) {
                let promises = frm.doc.custom_brought_out_details.map(bo => {
                    if (bo.subcontract_po) {
                        return frappe.db.get_value('Purchase Order', bo.subcontract_po, ['docstatus', 'total_qty', 'per_received'])
                            .then(res => {
                                if (res.message && res.message.docstatus == 1) {
                                    bo.po_qty = res.message.total_qty;
                                    bo.received_qty = res.message.per_received / 100 * bo.po_qty;
                                    return {
                                        po_qty: bo.po_qty,
                                        received_qty: bo.received_qty
                                    };
                                }
                                return { po_qty: 0, received_qty: 0 };
                            });
                    } else {
                        return Promise.resolve({ po_qty: 0, received_qty: 0 });
                    }
                });

                Promise.all(promises).then(results => {
                    let total_po_qty = 0;
                    let total_received_qty = 0;

                    results.forEach(r => {
                        total_po_qty += r.po_qty;
                        total_received_qty += r.received_qty;
                    });

                    frm.set_value('custom_po_qty', total_po_qty);
                    if (total_po_qty > frm.doc.custom_qty_to_buy) {
                        frm.set_value('custom_qty_to_buy', total_po_qty);
                        if (total_po_qty > frm.doc.custom_total_wo_qty) {
                            frm.set_value('custom_total_wo_qty', total_po_qty);
                        }
                    }
                    frm.set_value('custom_received_qty', total_received_qty);

                    frm.refresh_field('custom_brought_out_details');
                    frm.save();
                });
            }
        }

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
        job_cards = frappe.get_list("Job Card", filters={"work_order": frm.doc.name}, pluck="name")
        if (job_cards) {
            job_cards.forEach(job_card => {
                frappe.msgprint("Updating Job Card: " + job_card);
                frappe.db.set_value("Job Card", job_card, "custom_priority", frm.doc.custom_priority);
            });
        }
    },

    validate : function (frm) {
        if (frm.doc.custom_qty_to_buy < frm.doc.custom_po_qty || frm.doc.custom_qty_to_buy > frm.doc.custom_total_wo_qty) {
            frappe.throw(__('Brought-Out quantity must be between ' + frm.doc.custom_po_qty + ' and ' + (frm.doc.custom_total_wo_qty)));
        }
        if (frm.doc.custom_qty_to_buy) {
            frm.set_value('qty', frm.doc.custom_total_wo_qty - frm.doc.custom_qty_to_buy);
        }
    },

    before_submit: function (frm) {
        if (frm.doc.custom_qty_to_buy !== frm.doc.custom_po_qty) {
            frappe.throw(__('PO quantity must be equal to Brought-Out quantity'));
        }
        if (frm.doc.custom_work_type == 'Sub Contract' && frm.doc.custom_total_wo_qty !== frm.doc.custom_qty_to_buy + frm.doc.qty) {
            frappe.throw(__('Total WO Qty must be equal to Brought-Out quantity + Qty To Manufacture'));
        } 
    },
});
