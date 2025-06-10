frappe.pages['sales-order-tracking'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Sales Order Tracking',
		single_column: true
	});

	let sales_data = [];

	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Sales Order",
			filters: {
				docstatus: 0,
			},
			fields: ["name"],
		},
		callback: function(r) {
			if (r.message) {
				let so_names = r.message.map(so => so.name);
				let remaining = so_names.length;

				so_names.forEach(so_name => {
					frappe.call({
						method: "frappe.client.get",
						args: {
							doctype: "Sales Order",
							name: so_name
						},
						callback: function(res) {
							if (res.message) {
								let doc = res.message;

								let so_entry = {
									name: doc.name,
									customer: doc.customer,
									transaction_date: frappe.format(doc.transaction_date, {"fieldtype": "Date"}),
									delivery_date: frappe.format(doc.delivery_date, {"fieldtype": "Date"}),
									custom_priority: doc.custom_priority,
									items: []
								};

								doc.items.forEach(item => {
									so_entry.items.push({
										item_code: item.item_code,
										item_name: item.item_name,
										qty: item.qty,
										uom: item.uom,
										rate: format_currency(item.base_rate),
										custom_priority: item.custom_priority,
										delivery_date: frappe.format(item.delivery_date, {"fieldtype": "Date"}),
									});
								});

								sales_data.push(so_entry);
							}

							remaining--;
							if (remaining === 0) {
								// All done! Now render HTML
								// Step 1: Create the container if it doesn't exist
								let container = document.createElement("div");
								document.body.appendChild(container);
								
								// Step 2: Generate your HTML
								let html = `
									<div class="container" style="">
										<div style="width: 100%; height: 8px; border-top: 2px dashed gray; margin-top: 8px;"></div>
										<div class="container">
											<div class="row" style="margin-bottom: 8px; font-weight:bold;">
												<span style="width: 18%;">Draft SO ID</span>
												<span style="width: 10%;">Doc Dt.</span>
												<span style="width: 8%;">Priority</span>
												<span style="width: 10%;">Delivery Date</span>
												<span style="width: 50%;">Customer</span>
											</div>
										</div>
										<div class="container" style="margin-bottom: 8px;">
											<div class="row">
												<span style="width: 10%;"></span>
												<span style="width: 33%;">Item Name</span>
												<span style="width: 9%;">Priority</span>
												<span style="width: 9%;">Del. Date</span>
												<span style="width: 9%; padding-left: 32px;">Qty.</span>
												<span style="width: 9%;">UOM</span>
												<span style="width: 9%;">Rate</span>
												<span style="width: 8%;">Lead Days</span>
											</div>
										</div>
								`;

								sales_data.forEach(so => {
									html += `
										<div style="width: 100%; height: 18px; border-top: 2px dashed gray; margin-top: 18px;"></div>
										<div class="container">
											<div class="row" style="margin-bottom: 4px; font-weight:bold;">
												<span style="width: 18%;"><a href="/app/sales-order/${so.name}">${so.name}</a></span>
												<span style="width: 10%;">${so.transaction_date}</span>
												<span style="width: 8%;">${so.custom_priority || ''}</span>
												<span style="width: 10%;">${so.delivery_date || ''}</span>
												<span style="width: 50%;">${so.customer}</span>
											</div>
										</div>
									`;

									so.items.forEach(item => {
										html += `
											<div class="container">
												<div class="row">
													<span style="width: 10%;"></span>
													<span style="width: 33%;"><a href="/app/item/${item.item_code}">${item.item_name}</a></span>
													<span style="width: 9%;">${item.custom_priority || ''}</span>
													<span style="width: 9%;">${item.delivery_date || ''}</span>
													<span style="width: 9%; text-align: right; padding-right: 56px;">${item.qty}</span>
													<span style="width: 8%;">${item.uom}</span>
													<span style="width: 9%; text-align: right; padding-right: 32px;">${item.rate}</span>
													<span style="width: 8%;">${item.lead_days || ''}</span>
												</div>
											</div>
										`;
									});
								});

								html += `<div style="width: 100%; height: 18px; border-top: 2px dashed gray; margin-top: 18px;"></div></div>`;

								// Step 3: Inject
								container.innerHTML = html;

							}
						}
					});
				});
			}
		}
	});
}