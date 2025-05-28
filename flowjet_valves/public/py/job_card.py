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
