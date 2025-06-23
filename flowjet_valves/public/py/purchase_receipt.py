import frappe
# from erpnext.stock.doctype.stock_ledger_entry.stock_ledger_entry import validate_serial_batch_no_bundle

@frappe.whitelist()
def validate_pr_items_serial_batch_bundle(purchase_receipt):
    doc = frappe.get_doc("Purchase Receipt", purchase_receipt)
    doc.validate_serial_batch_no_bundle()

    return {"status": "OK"}
