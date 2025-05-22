import frappe

def copy_custom_fields(doc, method):

    for item in doc.items:
        if not item.production_plan:
            return
        
        plan_item = frappe.db.get_value(
            "Material Request Plan Item",
            {
                "parent": item.production_plan,
                "item_code": item.item_code,
                "warehouse": item.warehouse,
            },
            ["custom_remarks", "custom_priority"],
            as_dict=True
        )
        if plan_item and plan_item.custom_remarks:
            item.custom_remarks = plan_item.custom_remarks

        if plan_item and plan_item.custom_priority:
            item.custom_priority = plan_item.custom_priority