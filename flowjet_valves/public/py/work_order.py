import frappe

@frappe.whitelist()
def get_custom_priority_from_pp_items(item_type, item_name):
    if item_type == "main":
        return frappe.db.get_value('Production Plan Item', item_name, 'custom_priority')
    
    elif item_type == "sub":
        # Get parent item code from sub-assembly item
        parent_item_code = frappe.db.get_value('Production Plan Sub Assembly Item', item_name, 'parent_item_code')

        if not parent_item_code:
            return None

        # Now get custom_priority from the Production Plan Item with matching item_code
        result = frappe.db.get_value('Production Plan Item', {'item_code': parent_item_code}, 'custom_priority')
        return result

    return None
