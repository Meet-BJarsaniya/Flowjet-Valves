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

# @frappe.whitelist()
# def get_filtered_work_orders():
#     # 1. Fetch all sub-assembly Work Orders
#     sub_wos = frappe.get_all("Work Order", filters={
#         "docstatus": ["<", 2],
#         "production_plan_sub_assembly_item": ["!=", ""]
#     }, fields=["name"])

#     # 2. Fetch all finished Work Orders
#     finished_wos = frappe.get_all("Work Order", filters={
#         "docstatus": ["<", 2],
#         "production_plan_item": ["!=", ""]
#     }, fields=["name", "production_plan", "production_plan_item"])

#     allowed_finished = []

#     for wo in finished_wos:
#         # 3. Find sub_assembly_items in Production Plan linked to this po_item
#         sub_assembly_links = frappe.get_all(
#             "Production Plan Sub Assembly Item",
#             filters={
#                 "parent": wo.production_plan,
#                 "production_plan_item": wo.production_plan_item
#             },
#             fields=["name"]
#         )
#         frappe.msgprint(str(wo.name) + " " + str(sub_assembly_links))

#         if not sub_assembly_links:
#             # No sub-assemblies → allow
#             allowed_finished.append(wo.name)
#             continue

#         # 4. Get Work Orders linked to these sub_assembly_items
#         sub_assembly_wo_statuses = frappe.get_all(
#             "Work Order",
#             filters={
#                 "production_plan_sub_assembly_item": ["in", [row.name for row in sub_assembly_links]]
#             },
#             fields=["status"]
#         )

#         # 5. Allow only if all sub-assemblies are Completed
#         if sub_assembly_wo_statuses and all(wo.status == "Completed" for wo in sub_assembly_wo_statuses):
#             allowed_finished.append(wo.name)

#     # Combine: all sub-WOs + allowed finished WOs
#     visible_wo_names = [x.name for x in sub_wos] + allowed_finished

#     return visible_wo_names


@frappe.whitelist()
def get_excluded_work_orders():
    # Get all finished Work Orders (for finished goods)
    finished_wos = frappe.get_all("Work Order", filters={
        "docstatus": ["<", 2],
        "production_plan_item": ["!=", ""]
    }, fields=["name", "production_plan", "production_plan_item"])

    excluded_wo_names = []

    for wo in finished_wos:
        # Get related sub-assembly rows from Production Plan
        sub_assembly_links = frappe.get_all(
            "Production Plan Sub Assembly Item",
            filters={
                "parent": wo.production_plan,
                "production_plan_item": wo.production_plan_item
            },
            fields=["name"]
        )

        if not sub_assembly_links:
            # No sub-assemblies → allow (don't exclude)
            continue

        # Get statuses of Work Orders linked to these sub_assembly_items
        sub_assembly_wos = frappe.get_all(
            "Work Order",
            filters={
                "production_plan_sub_assembly_item": ["in", [row.name for row in sub_assembly_links]]
            },
            fields=["status"]
        )

        if any(s.status != "Completed" for s in sub_assembly_wos):
            # If any sub-assembly is NOT completed → EXCLUDE this finished WO
            excluded_wo_names.append(wo.name)

    return excluded_wo_names