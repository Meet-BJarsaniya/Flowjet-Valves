frappe.pages['sales-order-tracking'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Sales Order Tracking',
		single_column: true
	});

    // Define the fields for the filters with default values
    let filter_fields = [
        {
            label: 'From Date',
            fieldtype: 'Date',
            fieldname: 'from',
            default: frappe.datetime.nowdate() // Default to current date
        },
        {
            label: 'To Date',
            fieldtype: 'Date',
            fieldname: 'to',
            default: frappe.datetime.add_months(frappe.datetime.nowdate(), 6) // Default to 6 month after
        },
        {
            label: 'Priority',
            fieldtype: 'Select',
            fieldname: 'priority',
            options: ['Urgent', 'High', 'Medium', 'Low'],
        },
    ];

	// Append container for data
	const $data_container = $('<div id="so_summary" style="margin-top: 16px;"></div>').appendTo(page.body);
	
    let filter_values = {};
	// Add filter fields
	filter_fields.forEach(field => {
		const field_input = page.add_field(field);
		field_input.set_input(field.default || '');

		filter_values[field.fieldname] = field.default || '';

		field_input.$input.on('change blur', function () {
			console.log(filter_values)
			filter_values[field.fieldname] = field_input.get_value();

			if (filter_values.from && filter_values.to) {
				fetch_and_render_data({
					from: filter_values.from,
					to: filter_values.to,
					priority: filter_values.priority
				});
			}
		});
	});

	// Initial call on page load
	fetch_and_render_data({
		from: filter_values.from,
		to: filter_values.to,
		priority: filter_values.priority
	});


	function fetch_and_render_data(filters) {
		let sales_data = [];

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Sales Order",
				filters: [
					["docstatus", "=", 0],
					["delivery_date", ">=", filters.from],
					["delivery_date", "<=", filters.to],
					filters.priority ? ["custom_priority", "=", filters.priority] : null
				].filter(Boolean),
				fields: ["name"],
				limit: 100
			},
			callback: function (r) {
				if (r.message) {
					let so_names = r.message.map(so => so.name);
					let remaining = so_names.length;

					if (remaining === 0) {
						document.getElementById("so_summary").innerHTML = `<div>No Sales Orders found.</div>`;
						return;
					}

					so_names.forEach(so_name => {
						frappe.call({
							method: "frappe.client.get",
							args: {
								doctype: "Sales Order",
								name: so_name
							},
							callback: function (res) {
								if (res.message) {
									const doc = res.message;

									let so_entry = {
										name: doc.name,
										customer: doc.customer,
										transaction_date: frappe.format(doc.transaction_date, { fieldtype: "Date" }),
										delivery_date: frappe.format(doc.delivery_date, { fieldtype: "Date" }),
										custom_priority: doc.custom_priority,
										items: []
									};

									doc.items.forEach(item => {
										// If priority filter is set, skip items that don't match
										if (filters.priority && item.custom_priority !== filters.priority) return;

										so_entry.items.push({
											item_code: item.item_code,
											item_name: item.item_name,
											qty: item.qty,
											uom: item.uom,
											rate: format_currency(item.base_rate),
											custom_priority: item.custom_priority,
											delivery_date: frappe.format(item.delivery_date, { fieldtype: "Date" }),
											lead_days: item.lead_days || ''
										});
									});
									sales_data.push(so_entry);
								}

								remaining--;
								if (remaining === 0) {
									render_sales_data(sales_data);
								}
							}
						});
					});
				}
			}
		});
	}

	function render_sales_data(sales_data) {
		let container = document.getElementById("so_summary");
		container.innerHTML = ''; // clear previous data

		let html = `
			<div class="container" style="font-weight: bold;">
				<div style="width: 100%; height: 8px; border-top: 2px dashed gray; margin-top: 8px;"></div>
				<div class="container">
					<div class="row" style="margin-bottom: 8px;">
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
						<span style="width: 10%;">Del. Date</span>
						<span style="width: 10%; padding-left: 32px;">Qty.</span>
						<span style="width: 7%;">UOM</span>
						<span style="width: 13%; text-align: center;">Rate</span>
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
							<span style="width: 10%;">${item.delivery_date || ''}</span>
							<span style="width: 10%; text-align: right; padding-right: 56px;">${item.qty}</span>
							<span style="width: 7%;">${item.uom}</span>
							<span style="width: 13%; text-align: right; padding-right: 40px;">${item.rate}</span>
							<span style="width: 8%;">${item.lead_days}</span>
						</div>
					</div>
				`;
			});
		});

		html += `<div style="width: 100%; height: 18px; border-top: 2px dashed gray; margin-top: 18px;"></div></div>`;
		container.innerHTML = html;
	}
};