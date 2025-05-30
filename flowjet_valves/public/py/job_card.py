# import frappe

# def update_pending_qty(doc, event):
#     if doc.total_completed_qty == 0:
#         frappe.db.sql("""
#             UPDATE `tabJob Card`
#             SET process_loss_qty = for_quantity - total_completed_qty
#             WHERE docstatus < 2
#         """, ())
#         frappe.db.commit()

#     frappe.msgprint(str(doc.for_quantity))
#     frappe.msgprint(str(doc.total_completed_qty))
#     frappe.msgprint(str(doc.process_loss_qty))
#     # doc.save()

import frappe
from frappe.utils import flt

def update_totals(doc, method):
    """Update total_completed_qty and process_loss_qty with PO-based values"""

    # Sum completed_qty from time_logs
    time_log_completed = sum(flt(row.completed_qty or 0) for row in doc.get("time_logs") or [])

    # Sum received_qty from child table `custom_subcontract_details`
    received_qty = sum(flt(row.received_qty or 0) for row in doc.get("custom_subcontract_details") or [])

    total_completed = flt(time_log_completed) + flt(received_qty)
    doc.total_completed_qty = total_completed
    doc.custom_total_completed_inhouse_qty = flt(time_log_completed)

    # Calculate process loss
    doc.process_loss_qty = flt(doc.for_quantity or 0) - total_completed
