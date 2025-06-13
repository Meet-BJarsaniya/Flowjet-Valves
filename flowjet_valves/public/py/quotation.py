import frappe
from frappe import _
from frappe.model.mapper import get_mapped_doc

# @frappe.whitelist()
# def get_last_item_rate(party_name, item_code):
#     if not (party_name and item_code):
#         return None

#     quotation_names = frappe.get_all("Quotation", filters={
#         "party_name": party_name,
#         "docstatus": 1
#     }, fields=["name"], order_by="transaction_date desc", limit=5)

#     if not quotation_names:
#         return None

#     names = [q.name for q in quotation_names]

#     item = frappe.get_all("Quotation Item", filters={
#         "parent": ["in", names],
#         "item_code": item_code
#     }, fields=["base_rate"], order_by="creation desc", limit=1)

#     return item[0]["base_rate"] if item else None


# Make RFQ from Quotation
@frappe.whitelist()
def make_rfq_from_quotation(quotation):
    # Check for existing Draft RFQ to avoid duplication
    existing_rfq = frappe.db.exists(
        "Request for Quotation",
        {
            "custom_quotation": quotation,
            "docstatus": ["in", [0, 1]],  # Draft
            # "docstatus": 0  # Draft
        }
    )

    if existing_rfq:
        rfq_link = f'<a href="/app/request-for-quotation/{existing_rfq}" target="_blank">{existing_rfq}</a>'
        frappe.throw(f'Request for Quotation already exists — {rfq_link}', title='Duplicate RFQ')

    rfq = get_mapped_doc(
        "Quotation",
        quotation,
        {
            "Quotation": {
                "doctype": "Request for Quotation",
                "field_map": {
                    # "transaction_date": "transaction_date",
                    "company": "company",
                    "schedule_date": "schedule_date"
                },
                # "postprocess": lambda source_doc, target_doc: setattr(target_doc, "quotation", source_doc.name)
            },
            "Quotation Item": {
                "doctype": "Request for Quotation Item",
                "field_map": {
                    "item_code": "item_code",
                    "qty": "qty",
                    "uom": "uom"
                }
            }
        },
        target_doc=None
    )
    return rfq

