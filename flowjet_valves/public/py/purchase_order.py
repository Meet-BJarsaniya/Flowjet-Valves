import frappe

@frappe.whitelist()
def update_item_history(po_name, items_data):
    doc = frappe.get_doc("Purchase Order", po_name)

    # Allow changes to submitted doc
    doc.ignore_submit = True

    doc.append("custom_items_history", {
        "date": frappe.utils.now_datetime(),
        "user": frappe.session.user,
        "details": items_data
    })

    doc.save()
    return "Items Updated successfully"
