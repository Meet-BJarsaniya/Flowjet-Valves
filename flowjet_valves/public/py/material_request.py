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


@frappe.whitelist()
def create_purchase_orders_by_custom_supplier(material_request):
	mr = frappe.get_doc("Material Request", material_request)

	if mr.get("custom_po_created"):
		frappe.throw("Purchase Orders have already been created for this Material Request.")

	supplier_items_map = {}

	# Group items by custom_suggested_supplier
	for item in mr.items:
		supplier = item.custom_suggested_supplier
		if not supplier:
			continue
		supplier_items_map.setdefault(supplier, []).append(item)

	created_pos = []

	for supplier, items in supplier_items_map.items():
		po = frappe.new_doc("Purchase Order")
		po.supplier = supplier
		po.set("items", [])

		for d in items:
			po.append("items", {
				"item_code": d.item_code,
				"qty": d.qty,
				"uom": d.uom,
				"warehouse": d.warehouse,
				"schedule_date": d.schedule_date,
				"material_request": mr.name,
				"material_request_item": d.name,
			})

		po.set_missing_values()
		po.insert()
		created_pos.append(po.name)

	# Mark MR as PO Created
	mr.db_set("custom_po_created", 1)

	return created_pos