# Copyright (c) 2025, Sanskar Technolab pvt ltd and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
	columns = [
		{"label": _('<b>Date</b>'), "fieldtype":"Date", "fieldname":"posting_date" },
		{"label": _('<b>Stock Entry</b>'), "fieldtype":"Link", "options":"Stock Entry", "fieldname":"stock_entry" },
		{"label": _('<b>Mold Item</b>'), "fieldtype":"Link", "options":"Item", "fieldname":"item_code" },
		{"label": _('<b>Transferred Qty</b>'), "fieldtype":"Data", "fieldname":"transferred_qty" },
		{"label": _('<b>Source</b>'), "fieldtype":"Data", "fieldname":"source" },
		{"label": _('<b>Target</b>'), "fieldtype":"Data", "fieldname":"target" },
		{"label": _('<b>Voucher</b>'), "fieldtype":"Link", "options":"Purchase Order", "fieldname":"purchase_order" },
		{"label": _('<b>Remarks</b>'), "fieldtype":"Data", "fieldname":"remarks" },
	]

	sql = f"""
		SELECT
			SE.posting_date,
			SE.name AS stock_entry,
			SEI.item_code,
			SEI.qty AS transferred_qty,
			SEI.S_warehouse AS source,
			SEI.t_warehouse AS target,
			PO.name AS purchase_order,
			SEI.custom_remarks
		FROM `tabStock Entry` AS SE
		JOIN `tabStock Entry Detail` AS SEI ON SE.name = SEI.parent
		JOIN `tabItem` AS I ON I.name = SEI.item_code AND I.custom_is_mold = 1
		JOIN `tabPurchase Order` AS PO ON PO.name = SE.purchase_order
		WHERE SE.docstatus = 1
		"""

	if filters.get('from_date') and filters.get('to_date'):
		sql += f"AND SE.posting_date BETWEEN '{filters.get('from_date')}' AND '{filters.get('to_date')}'"

	if filters.get('item_code'):
		sql += f"AND SEI.item_code  = '{filters.get('item_code')}'"

	sql += f"\n	ORDER BY SE.posting_date"

	data = frappe.db.sql(sql,as_dict = True)
	return columns, data
