import frappe
import json
from flowjet_valves.public.py.production_plan import get_items_for_material_requests
from erpnext.stock.doctype.item.item import get_item_defaults

@frappe.whitelist()
def update_manufacture_cycle(name, custom_priority=None, item_priority_map=None):
    if isinstance(item_priority_map, str):
        item_priority_map = json.loads(item_priority_map)

    # Step 1: Get related Production Plans from Sales Order
    production_plans = frappe.get_all(
        "Production Plan Sales Order",
        filters={"sales_order": name},
        fields=["parent"]
    )

    for plan in production_plans:
        production_plan = frappe.get_doc("Production Plan", plan.parent)
        
        # Skip cancelled Production Plans
        if production_plan.docstatus == 2:
            continue

        # Step 2: Update priority in Production Plan Sales Order table
        for row in production_plan.sales_orders:
            if row.sales_order == name:
                row.custom_priority = custom_priority

        # Step 3: Update custom_priority in Production Plan Item table
        for item in production_plan.po_items:
            if item.item_code in item_priority_map:
                item.custom_priority = item_priority_map[item.item_code]

                work_orders = frappe.get_list("Work Order", filters={"production_plan_item": item.name}, pluck="name")
                for wo_name in work_orders:
                    work_order = frappe.get_doc("Work Order", wo_name)
                    work_order.custom_priority = item.custom_priority
                    work_order.save(ignore_permissions=True)

                    job_cards = frappe.get_list("Job Card", filters={"work_order": wo_name}, pluck="name")
                    for jc_name in job_cards:
                        frappe.db.set_value("Job Card", jc_name, "custom_priority", item.custom_priority)


        # Step 4: Update custom_priority in Production Plan Sub Assembly Item table
        for item in production_plan.sub_assembly_items:
            if item.parent_item_code in item_priority_map:

                work_order_sub_assemblies = frappe.get_list("Work Order", filters={"production_plan_sub_assembly_item": item.name}, pluck="name")
                for wo_name in work_order_sub_assemblies:
                    work_order = frappe.get_doc("Work Order", wo_name)
                    work_order.custom_priority = item_priority_map[item.parent_item_code]
                    if work_order.docstatus == 1:
                        work_order.save(ignore_permissions=True)

                    job_cards = frappe.get_list("Job Card", filters={"work_order": wo_name}, pluck="name")
                    for jc_name in job_cards:
                        frappe.db.set_value("Job Card", jc_name, "custom_priority", item_priority_map[item.parent_item_code])

        production_plan.save(ignore_permissions=True)

        # Step 5: Update Material Request priorities via MR item generation
        items = get_items_for_material_requests(production_plan.as_dict())

        for item in items:
            item_code = item.get("item_code")
            priority = item.get("custom_priority")

            # Find matching Material Request Plan Item rows (you can narrow down further using production_plan or company if needed)
            mrp_items = frappe.get_all(
                "Material Request Plan Item",
                filters={
                    "item_code": item_code,
                    "parent": production_plan.name
                },
                fields=["name"]
            )

            for mrp_item in mrp_items:
                frappe.db.set_value("Material Request Plan Item", mrp_item.name, "custom_priority", priority)

            # Find matching Material Request Item rows (you can narrow down further using production_plan or company if needed)
            mr_items = frappe.get_all(
                "Material Request Item",
                filters={
                    "item_code": item_code,
                    "production_plan": production_plan.name,
                    "docstatus" : ["!=", 2],
                },
                fields=["name", "parent"]
            )

            for mr_item in mr_items:
                frappe.db.set_value("Material Request Item", mr_item.name, "custom_priority", priority)

                # Find matching RFQ Item rows
                rfq_items = frappe.get_all(
                    "Request for Quotation Item",
                    filters={
                        "item_code": item_code,
                        "material_request": mr_item.parent,
                        "docstatus" : ["!=", 2],
                    },
                    fields=["name"]
                )

                for rfq_item in rfq_items:
                    frappe.db.set_value("Request for Quotation Item", rfq_item.name, "custom_priority", priority)

                # Find matching SQ Item rows
                sq_items = frappe.get_all(
                    "Supplier Quotation Item",
                    filters={
                        "item_code": item_code,
                        "material_request": mr_item.parent,
                        "docstatus" : ["!=", 2],
                    },
                    fields=["name"]
                )

                for sq_item in sq_items:
                    frappe.db.set_value("Supplier Quotation Item", sq_item.name, "custom_priority", priority)

                # Find matching PO Item rows
                po_items = frappe.get_all(
                    "Purchase Order Item",
                    filters={
                        "item_code": item_code,
                        "material_request": mr_item.parent,
                        "docstatus" : ["!=", 2],
                    },
                    fields=["name", "parent"]
                )

                for po_item in po_items:
                    frappe.db.set_value("Purchase Order Item", po_item.name, "custom_priority", priority)

                    # Find matching PR Item rows
                    pr_items = frappe.get_all(
                        "Purchase Receipt Item",
                        filters={
                            "item_code": item_code,
                            "purchase_order": po_item.parent,
                            "docstatus" : ["!=", 2],
                        },
                        fields=["name"]
                    )

                    for pr_item in pr_items:
                        frappe.db.set_value("Purchase Receipt Item", pr_item.name, "custom_priority", priority)

                    # Find matching PI Item rows
                    pi_items = frappe.get_all(
                        "Purchase Invoice Item",
                        filters={
                            "item_code": item_code,
                            "purchase_order": po_item.parent,
                            "docstatus" : ["!=", 2],
                        },
                        fields=["name"]
                    )

                    for pi_item in pi_items:
                        frappe.db.set_value("Purchase Invoice Item", pi_item.name, "custom_priority", priority)


@frappe.whitelist()
def get_sales_order_items(sales_order):
    items = frappe.get_all(
        "Sales Order Item",
        filters={"parent": sales_order},
        fields=["name", "item_code", "item_name", "qty", "warehouse", "delivery_date", "actual_qty", "delivered_qty"]
    )
    filtered_items = []

    for item in items:
        submitted_dn = frappe.db.sql("""
            SELECT SUM(qty) FROM `tabDelivery Note Item`
            WHERE item_code = %s AND docstatus = 1
        """, item.item_code)[0][0] or 0

        remaining_qty = item.qty - submitted_dn

        # Set the submitted DN qty into custom_pending_for_po_qty
        # frappe.db.set_value("Sales Order Item", item.name, "custom_pending_for_po_qty", remaining_qty)

        if remaining_qty <= 0:
            continue

        # item["qty"] = remaining_qty

        item_defaults = get_item_defaults(
            item.item_code,
            frappe.db.get_value("Sales Order", sales_order, "company")
        )
        item["supplier"] = item_defaults.get("default_supplier")

        filtered_items.append(item)

    return filtered_items