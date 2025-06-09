import frappe
from frappe.model.mapper import get_mapped_doc
from erpnext.buying.doctype.purchase_order.purchase_order import set_missing_values


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


@frappe.whitelist()
def make_new_po_from_remaining(source_name):
    def update_item(source_doc, target_doc, source_parent):
        # Only include items with remaining qty
        qty_diff = source_doc.qty - source_doc.received_qty
        if qty_diff > 0:
            target_doc.qty = qty_diff
            target_doc.schedule_date = source_doc.schedule_date
        else:
            target_doc.idx = None  # this will be dropped

    doc = get_mapped_doc(
        "Purchase Order",
        source_name,
        {
            "Purchase Order": {
                "doctype": "Purchase Order",
                "field_map": {
                    "supplier": "supplier",
                    "schedule_date": "schedule_date"
                },
                "validation": {"docstatus": ["=", 1]}
            },
            "Purchase Order Item": {
                "doctype": "Purchase Order Item",
                "field_map": {
                    "name": "prevdoc_detail_docname",
                    "parent": "prevdoc_docname"
                },
                "condition": lambda d: d.qty > d.received_qty,
                "postprocess": update_item,
            }
        },
        target_doc=None,
        postprocess=set_missing_values
    )
    doc.supplier = ''
    doc.supplier_name = ''

    return doc


@frappe.whitelist()
def make_mold_stock_entry(po_name):
    po = frappe.get_doc("Purchase Order", po_name)

    se = frappe.new_doc("Stock Entry")
    se.stock_entry_type = "Material Transfer"
    se.purchase_order = po.name
    se.company = po.company
    se.supplier = po.supplier

    # Optional: fetch supplier warehouse from Supplier master
    supplier_doc = frappe.get_doc("Supplier", po.supplier)
    supplier_warehouse = supplier_doc.custom_warehouse or ""  # custom field

    for mold in po.custom_mold_items:
        se.append("items", {
            "item_code": mold.item_code,
            "item_name": mold.item_name,
            "qty": mold.qty,
            "s_warehouse": mold.source_warehouse,
            "t_warehouse": supplier_warehouse,
        })

    se.insert(ignore_permissions=True)
    # def is_palindrome(text):
    #     """
    #     Checks if a given string is a palindrome.

    #     Args:
    #         text: The string to check.

    #     Returns:
    #         True if the string is a palindrome, False otherwise.
    #     """
    #     processed_text = text.lower().replace(" ", "")  # Optional: Normalize the input (lower case, remove spaces)

    #     return processed_text == processed_text[::-1]

    # # Example usage:
    # string1 = "madam"
    # string2 = "hello"

    # if is_palindrome(string1):
    #     print(f"{string1} is a palindrome")
    # else:
    #     print(f"{string1} is not a palindrome")

    # if is_palindrome(string2):
    #     print(f"{string2} is a palindrome")
    # else:
    #     print(f"{string2} is not a palindrome")

    # # Example with spaces and capitalization
    # string3 = "Race Car"
    # if is_palindrome(string3):
    #     print(f"{string3} is a palindrome")
    # else:
    #     print(f"{string3} is not a palindrome")
    return se.name



