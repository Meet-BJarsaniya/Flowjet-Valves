import frappe
from erpnext.stock.doctype.item.item import get_item_defaults
from erpnext.stock.doctype.material_request.material_request import set_missing_values, update_item
import erpnext.stock.doctype.material_request.material_request as MaterialRequest
from frappe.model.mapper import get_mapped_doc
 
@frappe.whitelist()
def custom_make_purchase_order(source_name, target_doc=None, args=None, supplier=None, filtered_children=None):
    print("\n\nSOURCE:", source_name)
    print("\n\nARGS from frappe.flags:", frappe.flags.args)
 
    # Step 1: Normalize args
    if args is None and hasattr(frappe.flags, "args"):
        args = frappe.flags.args
    if isinstance(args, str):
        import json
        args = json.loads(args)
 
    filtered_items = args.get("filtered_children", []) if args else []
    print("\n\nFiltered Children (final):", filtered_items)
 
    def postprocess(source, target_doc):
        print("Inside postprocess")
        if args.get("supplier"):
            target_doc.supplier = args["supplier"]
        set_missing_values(source, target_doc)
        # target_doc.custom_purchase_organisation_ = source.custom_purchase_organizations
 
    def select_item(d):
        print("Checking item:", d.item_code)
        print("Allowed list:", filtered_items)
        child_filter = d.name in filtered_items if filtered_items else True
        qty = d.received_qty or d.ordered_qty
        return qty < d.stock_qty and child_filter
 
    doclist = get_mapped_doc(
        "Material Request",
        source_name,
        {
            "Material Request": {
                "doctype": "Purchase Order",
                "validation": {
                    "docstatus": ["=", 1],
                    "material_request_type": ["=", "Purchase"],
                },
            },
            "Material Request Item": {
                "doctype": "Purchase Order Item",
                "field_map": [
                    ["name", "material_request_item"],
                    ["parent", "material_request"],
                    ["uom", "stock_uom"],
                    ["uom", "uom"],
                    ["sales_order", "sales_order"],
                    ["sales_order_item", "sales_order_item"],
                    ["wip_composite_asset", "wip_composite_asset"],
                ],
                "postprocess": update_item,
                "condition": select_item,
            },
        },
        target_doc,
        postprocess,
    )
 
    doclist.set_onload("load_after_mapping", False)
    return doclist
 
MaterialRequest.make_purchase_order = custom_make_purchase_order