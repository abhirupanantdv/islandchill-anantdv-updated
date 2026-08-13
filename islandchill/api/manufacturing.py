import frappe
from frappe import _

WORK_ORDER_FINAL_STATUSES = {"Completed", "Closed", "Stopped", "Cancelled"}


def _force_work_order_in_progress(work_order):
    if not work_order:
        return None

    if not frappe.db.exists("Work Order", work_order):
        frappe.throw(_("Work Order {0} not found").format(work_order))

    current_status = frappe.db.get_value("Work Order", work_order, "status")

    if current_status in WORK_ORDER_FINAL_STATUSES:
        return current_status

    if current_status != "In Process":
        frappe.db.set_value(
            "Work Order",
            work_order,
            "status",
            "In Process",
            update_modified=True,
        )
        frappe.db.commit()
        return "In Process"

    return current_status


@frappe.whitelist()
def force_work_order_in_progress(work_order):
    status = _force_work_order_in_progress(work_order)
    return {
        "success": True,
        "work_order": work_order,
        "work_order_status": status,
    }


@frappe.whitelist()
def get_stock_entry_for_work_order(work_order):
    if not work_order:
        frappe.throw(_("Work Order is required"))

    stock_entries = frappe.get_all(
        "Stock Entry",
        filters={
            "work_order": work_order,
            "stock_entry_type": "Material Transfer for Manufacture",
            "docstatus": 0,
        },
        fields=["name"],
        order_by="modified desc",
        limit=1,
    )

    if not stock_entries:
        return None

    doc = frappe.get_doc("Stock Entry", stock_entries[0].name)
    return doc.as_dict()


@frappe.whitelist()
def save_stock_entry_draft(work_order, company, posting_date, posting_time=None, items=None, stock_entry_name=None):
    if isinstance(items, str):
        items = frappe.parse_json(items)

    if not work_order:
        frappe.throw(_("Work Order is required"))

    if not company:
        frappe.throw(_("Company is required"))

    if not posting_date:
        frappe.throw(_("Posting Date is required"))

    if not items:
        frappe.throw(_("Stock Entry items are required"))

    if stock_entry_name:
        doc = frappe.get_doc("Stock Entry", stock_entry_name)

        if doc.docstatus != 0:
            frappe.throw(_("Only Draft Stock Entry can be edited"))

        doc.set("items", [])
    else:
        doc = frappe.new_doc("Stock Entry")
        doc.stock_entry_type = "Material Transfer for Manufacture"
        doc.purpose = "Material Transfer for Manufacture"
        doc.work_order = work_order

    doc.company = company
    doc.posting_date = posting_date
    doc.set_posting_time = 1

    if posting_time:
        doc.posting_time = posting_time

    for row in items:
        item_code = row.get("code") or row.get("item_code")
        qty = float(row.get("qty") or row.get("transfer_qty") or 0)

        if not item_code or qty <= 0:
            continue

        doc.append("items", {
            "item_code": item_code,
            "qty": qty,
            "transfer_qty": qty,
            "uom": row.get("unit") or row.get("uom"),
            "s_warehouse": row.get("sourceWarehouse") or row.get("s_warehouse"),
            "t_warehouse": row.get("targetWarehouse") or row.get("t_warehouse"),
        })

    if not doc.items:
        frappe.throw(_("No valid Stock Entry items found"))

    doc.save(ignore_permissions=False)
    frappe.db.commit()

    return {
        "success": True,
        "name": doc.name,
        "docstatus": doc.docstatus,
        "doc": doc.as_dict(),
    }


@frappe.whitelist()
def submit_stock_entry(stock_entry_name):
    if not stock_entry_name:
        frappe.throw(_("Stock Entry name is required"))

    doc = frappe.get_doc("Stock Entry", stock_entry_name)

    if doc.docstatus == 1:
        work_order_status = None
        if doc.work_order:
            work_order_status = _force_work_order_in_progress(doc.work_order)

        return {
            "success": True,
            "name": doc.name,
            "docstatus": doc.docstatus,
            "work_order": doc.work_order,
            "work_order_status": work_order_status,
            "message": "Stock Entry already submitted. Work Order status checked.",
        }

    if doc.docstatus != 0:
        frappe.throw(_("Only Draft Stock Entry can be submitted"))

    doc.submit()
    frappe.db.commit()

    work_order_status = None
    if doc.work_order:
        work_order_status = _force_work_order_in_progress(doc.work_order)

    return {
        "success": True,
        "name": doc.name,
        "docstatus": doc.docstatus,
        "work_order": doc.work_order,
        "work_order_status": work_order_status,
    }


def _resolve_employee(employee):
    if not employee:
        frappe.throw(_("Employee / Operator is required"))

    employee = str(employee).strip()

    if frappe.db.exists("Employee", employee):
        return employee

    match = frappe.db.get_value("Employee", {"employee_name": employee}, "name")
    if match:
        return match

    matches = frappe.get_all(
        "Employee",
        filters={"employee_name": ["like", f"%{employee}%"]},
        fields=["name"],
        limit=1,
    )
    if matches:
        return matches[0].name

    frappe.throw(_("Employee {0} not found").format(employee))


def _clean_html_error(message):
    if not message:
        return ""
    import re
    message = str(message)
    message = re.sub(r'<a\\b[^>]*>(.*?)</a>', r'\\1', message, flags=re.I | re.S)
    message = re.sub(r'<strong\\b[^>]*>(.*?)</strong>', r'\\1', message, flags=re.I | re.S)
    message = re.sub(r'<[^>]+>', '', message)
    return ' '.join(message.split())


def _now_or(value):
    if value:
        return str(value).replace("T", " ")
    return frappe.utils.now_datetime()


def _append_job_card_comment(doc, text):
    if not text:
        return
    doc.add_comment("Comment", _clean_html_error(text))


def _wrap_job_card_action(action):
    try:
        frappe.flags.ignore_permissions = True
        return action()
    except Exception as exc:
        frappe.throw(_clean_html_error(getattr(exc, "message", None) or str(exc)))
    finally:
        frappe.flags.ignore_permissions = False


def _get_job_card(job_card):
    if not job_card:
        frappe.throw(_("Job Card is required"))

    if not frappe.db.exists("Job Card", job_card):
        frappe.throw(_("Job Card {0} not found").format(job_card))

    doc = frappe.get_doc("Job Card", job_card)
    doc.flags.ignore_permissions = True
    return doc


def _job_card_response(doc):
    doc.reload()
    return {
        "success": True,
        "name": doc.name,
        "status": doc.status,
        "docstatus": doc.docstatus,
        "work_order": doc.work_order,
        "is_paused": getattr(doc, "is_paused", 0),
        "time_logs": [row.as_dict() for row in (doc.time_logs or [])],
    }


def _wrap_job_card_action(action):
    try:
        return action()
    except Exception as exc:
        frappe.throw(_clean_html_error(getattr(exc, "message", None) or str(exc)))


@frappe.whitelist()
def start_job_card(job_card, employee, remarks=None, actual_start_time=None):
    def _action():
        doc = _get_job_card(job_card)

        if doc.docstatus == 1 or doc.status == "Completed":
            frappe.throw(_("Job Card {0} is already completed/submitted").format(doc.name))

        for row in doc.get("time_logs") or []:
            if not row.to_time:
                frappe.throw(_("Job Card {0} timer is already running").format(doc.name))

        employee_id = _resolve_employee(employee)
        start_time = _now_or(actual_start_time)

        doc.start_timer(
            start_time=start_time,
            employees=[{"employee": employee_id}],
        )

        if remarks:
            doc.reload()
            _append_job_card_comment(doc, remarks)

        if doc.work_order:
            _force_work_order_in_progress(doc.work_order)

        frappe.db.commit()
        return _job_card_response(doc)

    return _wrap_job_card_action(_action)


@frappe.whitelist()
def pause_job_card(job_card, remarks=None, actual_end_time=None):
    def _action():
        doc = _get_job_card(job_card)

        if doc.docstatus == 1 or doc.status == "Completed":
            frappe.throw(_("Completed Job Card {0} cannot be paused").format(doc.name))

        running_logs = [row for row in doc.get("time_logs") or [] if not row.to_time]
        if not running_logs:
            frappe.throw(_("Job Card {0} is already paused").format(doc.name))

        end_time = _now_or(actual_end_time)
        doc.pause_job(end_time=end_time)

        if remarks:
            doc.reload()
            _append_job_card_comment(doc, remarks)

        frappe.db.commit()
        return _job_card_response(doc)

    return _wrap_job_card_action(_action)


@frappe.whitelist()
def resume_job_card(job_card, remarks=None, actual_start_time=None):
    def _action():
        doc = _get_job_card(job_card)

        if doc.docstatus == 1 or doc.status == "Completed":
            frappe.throw(_("Completed Job Card {0} cannot be resumed").format(doc.name))

        for row in doc.get("time_logs") or []:
            if not row.to_time:
                frappe.throw(_("Job Card {0} timer is already running").format(doc.name))

        start_time = _now_or(actual_start_time)
        doc.resume_job(start_time=start_time)

        if remarks:
            doc.reload()
            _append_job_card_comment(doc, remarks)

        if doc.work_order:
            _force_work_order_in_progress(doc.work_order)

        frappe.db.commit()
        return _job_card_response(doc)

    return _wrap_job_card_action(_action)


@frappe.whitelist()
def submit_job_card(
    job_card,
    remarks=None,
    actual_end_time=None,
    qty=None,
    for_quantity=None,
    loose_qty=0,
    process_loss_qty=0,
):
    def _action():
        doc = _get_job_card(job_card)

        if doc.docstatus == 1 or doc.status == "Completed":
            return _job_card_response(doc)

        end_time = _now_or(actual_end_time)
        target_for_quantity = frappe.utils.flt(for_quantity or doc.for_quantity or 0)
        completed_qty = frappe.utils.flt(qty if qty is not None else target_for_quantity)

        if completed_qty <= 0:
            frappe.throw(_("Completed Quantity must be greater than 0"))

        doc.complete_job_card(
            qty=completed_qty,
            for_quantity=target_for_quantity,
            end_time=end_time,
            loose_qty=frappe.utils.flt(loose_qty or 0),
            process_loss_qty=frappe.utils.flt(process_loss_qty or 0),
            auto_submit=1,
        )

        if remarks:
            doc.reload()
            _append_job_card_comment(doc, remarks)

        if doc.work_order:
            status = frappe.db.get_value("Work Order", doc.work_order, "status")
            if status not in WORK_ORDER_FINAL_STATUSES:
                _force_work_order_in_progress(doc.work_order)

        frappe.db.commit()
        return _job_card_response(doc)

    return _wrap_job_card_action(_action)


@frappe.whitelist()
def add_job_card_comment(job_card, content, operator=None):
    def _action():
        doc = _get_job_card(job_card)
        clean_content = _clean_html_error(content)
        if not clean_content:
            frappe.throw(_("Comment is required"))

        timestamp = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")
        clean_op = (operator or frappe.session.user or "Operator").strip()

        new_remark = "[{0}] {1}: {2}".format(timestamp, clean_op, clean_content.strip())

        if doc.remarks:
            doc.remarks = "{0}{1}{2}".format(doc.remarks.strip(), chr(10), new_remark)
        else:
            doc.remarks = new_remark

        if doc.docstatus == 1:
            frappe.db.set_value("Job Card", doc.name, "remarks", doc.remarks, update_modified=True)
        else:
            doc.save(ignore_permissions=True)

        try:
            doc.add_comment("Comment", "({0}): {1}".format(clean_op, clean_content.strip()))
            if doc.work_order:
                wo_doc = frappe.get_doc("Work Order", doc.work_order)
                wo_doc.add_comment("Comment", "({0}) [{1}]: {2}".format(clean_op, doc.operation, clean_content.strip()))
        except Exception:
            pass

        frappe.db.commit()

        return {
            "success": True,
            "job_card": doc.name,
            "remarks": doc.remarks,
            "remarksList": parse_remarks_list(doc.remarks)
        }

    return _wrap_job_card_action(_action)


@frappe.whitelist()
def get_job_card_comments(job_card):
    doc = _get_job_card(job_card)
    return {
        "success": True,
        "job_card": doc.name,
        "comments": parse_remarks_list(doc.remarks or ""),
    }


@frappe.whitelist()
def get_job_card_completion_defaults(job_card):
    doc = _get_job_card(job_card)
    for_quantity = frappe.utils.flt(doc.for_quantity or 0)
    total_completed_qty = frappe.utils.flt(doc.total_completed_qty or 0)
    completed_default = total_completed_qty if total_completed_qty > 0 else for_quantity
    process_loss_default = max(0, for_quantity - completed_default)

    return {
        "success": True,
        "job_card": doc.name,
        "work_order": doc.work_order,
        "for_quantity": for_quantity,
        "total_completed_qty": total_completed_qty,
        "completed_qty_default": completed_default,
        "process_loss_qty_default": process_loss_default,
        "status": doc.status,
        "docstatus": doc.docstatus,
    }


def _get_last_submitted_job_card_details(work_order):
    operations = frappe.get_all(
        "Work Order Operation",
        filters={"parent": work_order},
        fields=["name", "operation", "idx"],
        order_by="idx desc",
        limit=1,
    )

    filters = {"work_order": work_order, "docstatus": 1}
    if operations:
        filters["operation_id"] = operations[0].name

    cards = frappe.get_all(
        "Job Card",
        filters=filters,
        fields=["name", "for_quantity", "total_completed_qty", "process_loss_qty"],
        order_by="modified desc",
        limit=1,
    )

    if not cards:
        return frappe._dict({})

    return frappe._dict(cards[0])


@frappe.whitelist()
def finish_work_order(work_order, qty=None, process_loss_qty=None, scrap_items=None, company=None, submit=1, posting_date=None, posting_time=None, extra_qty=None, extra_uom=None):
    def _action():
        if not work_order:
            frappe.throw(_("Work Order is required"))

        wo = frappe.get_doc("Work Order", work_order)
        wo.check_permission("write")

        running_cards = frappe.get_all(
            "Job Card",
            filters={
                "work_order": work_order,
                "docstatus": 0,
                "status": ["in", ["Open", "Work In Progress", "On Hold", "Material Transferred"]],
            },
            pluck="name",
        )
        if running_cards:
            frappe.throw(_("Complete all Job Cards before finishing Work Order. Pending: {0}").format(", ".join(running_cards)))

        last_jc = _get_last_submitted_job_card_details(work_order)
        qty_to_manufacture = frappe.utils.flt(qty) if qty not in (None, "", "null") else frappe.utils.flt(last_jc.get("total_completed_qty") or wo.qty - wo.produced_qty)

        target_run_qty = frappe.utils.flt(wo.qty - wo.produced_qty)
        e_qty = frappe.utils.flt(extra_qty)
        extra_qty_base = 0.0

        if e_qty > 0 and extra_uom:
            conversion_factor = frappe.db.get_value(
                "UOM Conversion Detail",
                {"parent": wo.production_item, "uom": extra_uom},
                "conversion_factor"
            ) or 1.0
            if extra_uom == (wo.get("stock_uom") or "Box"):
                conversion_factor = 1.0
            extra_qty_base = frappe.utils.flt(e_qty * conversion_factor)

        # Auto-calculate process loss: target - (good qty + extra qty in base UOM)
        if e_qty > 0:
            process_loss = target_run_qty - (qty_to_manufacture + extra_qty_base)
            process_loss = max(0.0, frappe.utils.flt(process_loss, 6))
        elif process_loss_qty not in (None, "", "null"):
            process_loss = frappe.utils.flt(process_loss_qty)
        else:
            process_loss = max(0.0, frappe.utils.flt(target_run_qty - qty_to_manufacture, 6))

        # Update Work Order Operations with the calculated process loss to prevent Stock Entry from resetting it to 0.0
        for op in wo.operations:
            frappe.db.set_value("Work Order Operation", op.name, "process_loss_qty", process_loss)
        wo.reload()

        from erpnext.manufacturing.doctype.work_order.work_order import make_stock_entry

        try:
            stock_entry_dict = make_stock_entry(
                work_order_id=work_order,
                purpose="Manufacture",
                qty=qty_to_manufacture,
                extra_goods_qty=e_qty,
                process_loss_qty=process_loss,
                extra_goods_uom=extra_uom,
            )
        except TypeError:
            stock_entry_dict = make_stock_entry(
                work_order_id=work_order,
                purpose="Manufacture",
                qty=qty_to_manufacture,
            )

        stock_entry = frappe.get_doc(stock_entry_dict)
        if company:
            stock_entry.company = company
        if process_loss and stock_entry.meta.has_field("process_loss_qty"):
            stock_entry.process_loss_qty = process_loss
        if posting_date:
            stock_entry.posting_date = posting_date
        if posting_time:
            stock_entry.posting_time = posting_time
            stock_entry.use_posting_time = 1

        if scrap_items:
            items_list = scrap_items
            if isinstance(items_list, str):
                items_list = frappe.parse_json(items_list)
            
            stock_entry.set("scrap_items", [])
            for row in items_list:
                item_code = row.get("item_code") or row.get("item")
                item_qty = frappe.utils.flt(row.get("qty") or row.get("quantity") or 0)
                if item_code and item_qty > 0:
                    # Use the WO's scrap warehouse; fall back to the item's own warehouse or nothing
                    scrap_wh = row.get("t_warehouse") or row.get("warehouse") or wo.get("scrap_warehouse") or ""
                    stock_entry.append("scrap_items", {
                        "item_code": item_code,
                        "qty": item_qty,
                        "t_warehouse": scrap_wh
                    })

        for item in stock_entry.get("items") or []:
            # Only allow zero valuation rate for raw materials, not finished goods/extra goods
            if not item.is_finished_item:
                item.allow_zero_valuation_rate = 1
        for item in stock_entry.get("scrap_items") or []:
            item.allow_zero_valuation_rate = 1

        stock_entry.insert(ignore_permissions=False)

        # After insertion, calculate and set correct rates for the extra goods row
        main_fg = None
        extra_fg = None
        for item in stock_entry.items:
            if item.is_finished_item:
                if item.get("custom_is_extra_goods_row"):
                    extra_fg = item
                else:
                    main_fg = item

        if main_fg and extra_fg:
            item_cf = frappe.db.get_value(
                "UOM Conversion Detail",
                {"parent": wo.production_item, "uom": extra_fg.uom},
                "conversion_factor"
            ) or 1.0
            unit_rate = frappe.utils.flt(main_fg.basic_rate * item_cf, 9)
            extra_fg.basic_rate = unit_rate
            extra_fg.valuation_rate = unit_rate
            extra_fg.amount = frappe.utils.flt(extra_fg.qty * unit_rate, 2)
            extra_fg.basic_amount = frappe.utils.flt(extra_fg.qty * unit_rate, 2)
            extra_fg.allow_zero_valuation_rate = 1  # Keep check enabled for stock ledger post
            
            # Recalculate totals for the Stock Entry header
            stock_entry.total_incoming_value = sum(frappe.utils.flt(d.basic_amount) for d in stock_entry.items if d.is_finished_item)
            stock_entry.value_difference = frappe.utils.flt(stock_entry.total_incoming_value - stock_entry.total_outgoing_value, 2)
            stock_entry.db_update()
            for item in stock_entry.items:
                item.db_update()

        if frappe.utils.cint(submit):
            stock_entry.submit()

        wo.reload()
        wo.update_status()
        if frappe.utils.cint(submit) and wo.status != "Completed":
            wo.db_set("status", "Completed")
            wo.reload()
        frappe.db.commit()

        return {
            "success": True,
            "work_order": work_order,
            "stock_entry": stock_entry.name,
            "stock_entry_docstatus": stock_entry.docstatus,
            "status": wo.status,
            "produced_qty": wo.produced_qty,
            "process_loss_qty": wo.process_loss_qty,
        }

    return _wrap_job_card_action(_action)


@frappe.whitelist()
def get_all_cleaning_records():
    doctypes = [
        'Cleaning of Toilets',
        'Cleaning of Dining Room',
        'Factory Floor',
        'Cleaning of Lab and Office',
        'Incubator Temperature Record',
        'Balance Check or Callibration',
        'equipment sanitation and cip'
    ]
    all_records = []
    for dt in doctypes:
        if frappe.db.exists("DocType", dt):
            records = frappe.get_all(dt, fields=["*"], order_by="creation desc", limit=200, ignore_permissions=True)
            for r in records:
                all_records.append({
                    "id": r.name,
                    "name": r.name,
                    "type": dt,
                    "timestamp": str(r.creation or r.modified or ""),
                    "status": r.get("sanitation_result") or r.get("status") or "Clean",
                    "cleaner": r.get("duties_performed_by") or r.get("performed_by_operator") or r.get("checked_by") or "Staff",
                    "supervisor": r.get("checked_by") or r.get("verified_by_supervisor") or r.get("verified_by") or "",
                    "posting_date": str(r.get("date") or (str(r.creation).split(" ")[0] if r.creation else "")),
                    "posting_time": str(r.get("time") or (str(r.creation).split(" ")[1] if r.creation else "")),
                    "details": r
                })
    all_records.sort(key=lambda x: x["timestamp"], reverse=True)
    return all_records


@frappe.whitelist()
def create_cleaning_sanitation_log(doctype, payload=None):
    if isinstance(payload, str):
        payload = frappe.parse_json(payload)
    if not payload:
        payload = frappe.form_dict.get("payload") or {}
        if isinstance(payload, str):
            payload = frappe.parse_json(payload)

    allowed_doctypes = {
        'Cleaning of Toilets',
        'Cleaning of Dining Room',
        'Factory Floor',
        'Cleaning of Lab and Office',
        'Incubator Temperature Record',
        'Balance Check or Callibration',
        'equipment sanitation and cip',
        'Toilet Cleaning purpose',
        'Dining Room Cleaning Purpose',
        'Factory Floor Cleaning Purpose',
        'Lab and Office Cleaning Purpose'
    }

    if doctype not in allowed_doctypes:
        frappe.throw(_("Invalid Cleaning & Sanitation DocType {0}").format(doctype))

    # Auto-ensure purpose link records exist to avoid LinkValidationError
    purpose_doctype_map = {
        'Cleaning of Toilets': ('table_hcqa', 'Toilet Cleaning purpose'),
        'Cleaning of Dining Room': ('table_knse', 'Dining Room Cleaning Purpose'),
        'Factory Floor': ('table_oftv', 'Factory Floor Cleaning Purpose'),
        'Cleaning of Lab and Office': ('table_ntim', 'Lab and Office Cleaning Purpose')
    }

    if doctype in purpose_doctype_map and isinstance(payload, dict):
        table_field, purpose_dt = purpose_doctype_map[doctype]
        table_rows = payload.get(table_field) or []
        for row in table_rows:
            if isinstance(row, dict) and row.get("cleaning_purpose"):
                p_name = row["cleaning_purpose"]
                if not frappe.db.exists(purpose_dt, p_name):
                    try:
                        p_doc = frappe.new_doc(purpose_dt)
                        p_doc.cleaning_purpose = p_name
                        p_doc.flags.ignore_permissions = True
                        p_doc.insert(ignore_permissions=True)
                    except Exception as pe:
                        frappe.log_error(f"Auto-create purpose {p_name} failed: {str(pe)}")

    doc = frappe.new_doc(doctype)
    doc.update(payload)
    doc.flags.ignore_permissions = True
    doc.insert(ignore_permissions=True)
    doc.flags.ignore_permissions = True
    doc.submit()
    frappe.db.commit()

    return {"success": True, "name": doc.name, "doc": doc.as_dict()}


@frappe.whitelist()
def change_work_order_status(work_order, status):
    def _action():
        if not work_order:
            frappe.throw(_("Work Order is required"))

        if status not in {"Closed", "Stopped", "Resumed"}:
            frappe.throw(_("Invalid Work Order status action {0}").format(status))

        if status == "Closed":
            from erpnext.manufacturing.doctype.work_order.work_order import close_work_order
            new_status = close_work_order(work_order, "Closed")
        else:
            from erpnext.manufacturing.doctype.work_order.work_order import stop_unstop
            new_status = stop_unstop(work_order, status)

        frappe.db.commit()
        return {
            "success": True,
            "work_order": work_order,
            "status": new_status,
        }

    return _wrap_job_card_action(_action)


@frappe.whitelist(allow_guest=True)
def get_work_order_dashboard(limit=20, start=0, company=None, status=None):
    limit = frappe.utils.cint(limit) or 20
    start = frappe.utils.cint(start) or 0

    filters = [
        ["creation", ">=", "2026-06-01 00:00:00"]
    ]
    if company:
        filters.append(["company", "=", company])

    if status and status != 'All':
        filters.append(["status", "=", status])

    wo_list = frappe.get_all(
        "Work Order",
        filters=filters,
        fields=[
            "name", "production_item", "item_name",
            "qty", "produced_qty", "planned_start_date",
            "status", "bom_no", "company",
            "source_warehouse", "wip_warehouse", "fg_warehouse",
            "scrap_warehouse", "custom_extra_goods_warehouse", "process_loss_qty",
        ],
        order_by="creation desc",
        limit_page_length=limit,
        limit_start=start,
        ignore_permissions=True
    )

    total_count = frappe.db.count("Work Order", filters=filters)

    if wo_list:
        wo_names = [w.name for w in wo_list]
        jc_list = frappe.get_all(
            "Job Card",
            filters=[["work_order", "in", wo_names]],
            fields=[
                "name", "work_order", "operation", "workstation",
                "status", "remarks", "for_quantity",
                "total_completed_qty", "process_loss_qty", "is_paused",
            ],
            order_by="idx asc",
            limit_page_length=500,
            ignore_permissions=True
        )
        maint_schedules = frappe.get_all(
            "Daily Preventative Maintenance Schedule",
            filters=[["work_order", "in", wo_names], ["docstatus", "=", 1]],
            fields=["work_order", "equipment"],
            ignore_permissions=True
        )
    else:
        jc_list = []
        maint_schedules = []

    maint_by_wo = {}
    for s in maint_schedules:
        wo_n = s.get("work_order")
        if wo_n:
            if wo_n not in maint_by_wo:
                maint_by_wo[wo_n] = set()
            maint_by_wo[wo_n].add(s.get("equipment"))

    jc_by_wo = {}
    for jc in jc_list:
        wo_name = jc.work_order
        if wo_name not in jc_by_wo:
            jc_by_wo[wo_name] = []

        app_status = jc.status or "Open"
        if app_status == "Work in Progress":
            app_status = "Work In Progress"

        jc_by_wo[wo_name].append({
            "id": jc.name,
            "operation": jc.operation or "",
            "station": jc.workstation or "",
            "status": app_status,
            "operator": "",
            "remarks": jc.remarks or "",
            "forQuantity": frappe.utils.flt(jc.for_quantity or 0),
            "totalCompletedQty": frappe.utils.flt(jc.total_completed_qty or 0),
            "processLossQty": frappe.utils.flt(jc.process_loss_qty or 0),
            "is_paused": frappe.utils.cint(jc.is_paused or 0),
            "remarksList": parse_remarks_list(jc.remarks or ""),
        })

    data = []
    for wo in wo_list:
        status = wo.status or "Draft"
        if status == "Not Started":
            status = "Not Started"

        completed_eqs = len(maint_by_wo.get(wo.name, set()))
        maint_all_done = (completed_eqs >= 10)

        data.append({
            "id": wo.name,
            "product": wo.production_item or "",
            "productName": wo.item_name or wo.production_item or "",
            "item": wo.production_item or "",
            "quantity": frappe.utils.flt(wo.qty or 0),
            "produced": frappe.utils.flt(wo.produced_qty or 0),
            "plannedStart": str(wo.planned_start_date or ""),
            "status": status,
            "bomNo": wo.bom_no or "",
            "lineNo": "Filling Line 1",
            "company": wo.company or "",
            "sourceWarehouse": wo.source_warehouse or "",
            "wipWarehouse": wo.wip_warehouse or "",
            "fgWarehouse": wo.fg_warehouse or "",
            "scrapWarehouse": wo.scrap_warehouse or "",
            "extraGoodsWarehouse": wo.custom_extra_goods_warehouse or "",
            "process_loss_qty": frappe.utils.flt(wo.process_loss_qty or 0),
            "jobCards": jc_by_wo.get(wo.name, []),
            "maintCompletedCount": completed_eqs,
            "maintTotalCount": 10,
            "maintAllCompleted": maint_all_done,
        })

    return {
        "data": data,
        "count": total_count,
    }


def parse_remarks_list(remarks_str):
    if not remarks_str:
        return []

    lines = remarks_str.split(chr(92) + "n")
    actual_lines = []
    for line in lines:
        actual_lines.extend(line.split(chr(10)))

    remarks_list = []
    for line in actual_lines:
        if not line.strip():
            continue

        is_reply = False
        stripped = line.strip()
        if stripped.startswith("↳") or "↳ Reply" in line:
            is_reply = True

        try:
            start_bracket = line.find("[")
            end_bracket = line.find("]")
            if start_bracket != -1 and end_bracket != -1:
                timestamp = line[start_bracket + 1 : end_bracket]
                after_bracket = line[end_bracket + 1 :].strip()

                if ":" in after_bracket:
                    operator, text = after_bracket.split(":", 1)
                    operator = operator.strip()
                    text = text.strip()
                else:
                    operator = "Operator"
                    text = after_bracket.strip()

                log_entry = {
                    "timestamp": timestamp,
                    "operator": operator,
                    "text": text
                }

                if is_reply:
                    log_entry["is_reply"] = True
                    if remarks_list:
                        if "replies" not in remarks_list[-1]:
                            remarks_list[-1]["replies"] = []
                        remarks_list[-1]["replies"].append(log_entry)
                else:
                    log_entry["replies"] = []
                    remarks_list.append(log_entry)
            else:
                remarks_list.append({
                    "timestamp": "",
                    "operator": "Observation / Prior Log",
                    "text": line.strip(),
                    "replies": []
                })
        except Exception:
            remarks_list.append({
                "timestamp": "",
                "operator": "Observation / Prior Log",
                "text": line.strip(),
                "replies": []
            })

    return remarks_list


@frappe.whitelist(allow_guest=True)
def get_item_uoms(item_code):
    item = frappe.get_doc("Item", item_code)
    uoms = [{
        "uom": item.stock_uom,
        "conversion_factor": 1.0,
        "is_stock_uom": 1,
        "custom_min_stock_uom": frappe.db.get_value("UOM", item.stock_uom, "custom_min_stock_uom") or 0
    }]
    for u in item.uoms:
        if u.uom != item.stock_uom:
            uoms.append({
                "uom": u.uom,
                "conversion_factor": frappe.utils.flt(u.conversion_factor or 1.0),
                "is_stock_uom": 0,
                "custom_min_stock_uom": frappe.db.get_value("UOM", u.uom, "custom_min_stock_uom") or 0
            })
    return uoms


@frappe.whitelist(allow_guest=True)
def get_work_order_maintenance_checklists(work_order):
    if not work_order:
        frappe.throw(_("Work Order ID is required"))

    # Fetch all equipment masters from Maintenance Checklist Master
    masters = frappe.get_all("Maintenance Checklist Master", fields=["name", "equipment", "area"], order_by="name asc", ignore_permissions=True)

    if not masters:
        masters = [
            {"equipment": "Air Compressor - 1", "area": "Utilities"},
            {"equipment": "Boiler", "area": "Utilities"},
            {"equipment": "Syrup and CIP Equipment", "area": "Utilities"},
            {"equipment": "Glycol Chilling Plant & Grasso Refrigerator", "area": "Utilities"},
            {"equipment": "Data Coder", "area": "CSD / RTD Line"},
            {"equipment": "Conveyors", "area": "CSD / RTD Line"},
            {"equipment": "CO2 Mixer", "area": "CSD / RTD Line"},
            {"equipment": "Bottle / Can Washer", "area": "CSD / RTD Line"},
            {"equipment": "De-Palletizer", "area": "RTD Line"},
            {"equipment": "CSD / RTD Filler", "area": "Bottling Line"}
        ]

    # Query submitted Daily Preventative Maintenance Schedule records linked to this work order
    submitted_schedules = frappe.get_all(
        "Daily Preventative Maintenance Schedule",
        filters={
            "work_order": work_order,
            "docstatus": 1
        },
        fields=["name", "equipment", "area", "creation", "workflow_state"],
        ignore_permissions=True
    )

    completed_equipment_map = {s["equipment"]: s for s in submitted_schedules}

    checklist_status = []
    completed_count = 0

    for m in masters:
        eq = m.get("equipment")
        sub = completed_equipment_map.get(eq)
        if sub:
            completed_count += 1
            checklist_status.append({
                "equipment": eq,
                "area": m.get("area"),
                "completed": True,
                "schedule_name": sub.get("name"),
                "submitted_at": str(sub.get("creation"))
            })
        else:
            checklist_status.append({
                "equipment": eq,
                "area": m.get("area"),
                "completed": False,
                "schedule_name": None,
                "submitted_at": None
            })

    total_count = len(masters)
    all_completed = (completed_count >= total_count)

    return {
        "work_order": work_order,
        "all_completed": all_completed,
        "completed_count": completed_count,
        "total_count": total_count,
        "checklists": checklist_status
    }


@frappe.whitelist(allow_guest=True)
def get_all_boms_list(limit=100, start=0):
    limit = frappe.utils.cint(limit) or 100
    start = frappe.utils.cint(start) or 0
    boms = frappe.get_all(
        "BOM",
        filters={"is_active": 1, "docstatus": 1},
        fields=["name", "item", "item_name", "is_active", "is_default", "quantity", "uom"],
        order_by="is_default desc, creation desc",
        limit_page_length=limit,
        limit_start=start,
        ignore_permissions=True
    )
    return [{
        "id": b.name,
        "name": b.name,
        "productName": b.item_name or b.item,
        "item": b.item,
        "itemCode": b.item,
        "active": b.is_active or 1,
        "isDefault": bool(b.is_default),
        "quantity": frappe.utils.flt(b.quantity or 1),
        "unit": b.uom or "Nos",
        "materials": []
    } for b in boms]


@frappe.whitelist(allow_guest=True)
def get_bom_details_data(bom_id):
    if not bom_id:
        return []
    doc = frappe.get_doc("BOM", bom_id)
    items = []
    for item in doc.items:
        items.append({
            "item_code": item.item_code,
            "item_name": item.item_name or item.item_code,
            "code": item.item_code,
            "name": item.item_name or item.item_code,
            "qty": frappe.utils.flt(item.qty or 0),
            "uom": item.uom or "Qty",
            "unit": item.uom or "Qty",
            "rate": frappe.utils.flt(item.rate or 0),
            "amount": frappe.utils.flt(item.amount or 0)
        })
    return items


@frappe.whitelist(allow_guest=True)
def get_all_inventory_items(limit=200):
    limit = frappe.utils.cint(limit) or 200
    items = frappe.get_all(
        "Item",
        fields=["name", "item_code", "item_name", "stock_uom", "item_group", "safety_stock"],
        limit_page_length=limit,
        order_by="item_name asc",
        ignore_permissions=True
    )
    bins = frappe.get_all(
        "Bin",
        fields=["item_code", "warehouse", "actual_qty", "reserved_qty"],
        limit_page_length=1000,
        ignore_permissions=True
    )
    bin_map = {}
    for b in bins:
        ic = b.item_code
        if ic not in bin_map:
            bin_map[ic] = 0.0
        bin_map[ic] += frappe.utils.flt(b.actual_qty or 0)

    result = []
    for i in items:
        tot_qty = bin_map.get(i.item_code, 0.0)
        result.append({
            "id": i.item_code,
            "code": i.item_code,
            "name": i.item_name or i.item_code,
            "item_code": i.item_code,
            "item_name": i.item_name or i.item_code,
            "category": i.item_group or "Standard",
            "unit": i.stock_uom or "Nos",
            "stock_uom": i.stock_uom or "Nos",
            "qty": tot_qty,
            "minLevel": frappe.utils.flt(i.safety_stock or 0)
        })
    return result


@frappe.whitelist(allow_guest=True)
def create_daily_pm_schedule(equipment, area, work_order, operator, supervisor,
                              overall_remarks, maintenance_details, week_no=None,
                              from_date=None, to_date=None):
    """Create a Daily Preventative Maintenance Schedule and submit it."""
    import json
    if isinstance(maintenance_details, str):
        maintenance_details = json.loads(maintenance_details)

    doc = frappe.new_doc("Daily Preventative Maintenance Schedule")
    doc.equipment = equipment
    doc.area = area
    doc.work_order = work_order or ""
    doc.sign_of_the_operator = operator or "Administrator"
    doc.sign_of_supervisor = supervisor or "Administrator"
    doc.overall_remarks = overall_remarks or ""

    if week_no:
        try:
            doc.week_no = frappe.utils.cint(week_no)
        except Exception:
            pass

    if from_date:
        doc.from_date = from_date
    if to_date:
        doc.to_date = to_date

    for item in (maintenance_details or []):
        row = doc.append("maintenance_details", {})
        row.description = item.get("description") or item.get("desc") or ""
        row.standard_time_mins = frappe.utils.cint(item.get("standard_time_mins") or item.get("std") or 0)
        row.pass__fail = item.get("pass__fail") or ("Pass" if item.get("completed") else "Fail")
        row.remarks = item.get("remarks") or ""
        if from_date:
            row.date = from_date
        else:
            row.date = frappe.utils.nowdate()

    doc.insert(ignore_permissions=True)
    doc.submit()
    frappe.db.commit()

    return {"success": True, "name": doc.name, "equipment": doc.equipment}


@frappe.whitelist(allow_guest=True)
def get_maintenance_dashboard_stats(work_order=None):
    """Return dashboard statistics for the Maintenance tab, optionally filtered by work order."""
    filters = {"docstatus": 1}
    if work_order:
        filters["work_order"] = work_order

    records = frappe.get_all(
        "Daily Preventative Maintenance Schedule",
        filters=filters,
        fields=["name", "equipment", "work_order", "creation"],
        order_by="creation desc",
        ignore_permissions=True
    )

    total_task_checks = 0
    for rec in records:
        try:
            details = frappe.get_all(
                "Daily PM Schedule Item",
                filters={"parent": rec["name"], "pass__fail": "Pass"},
                fields=["name"],
                ignore_permissions=True
            )
            total_task_checks += len(details)
        except Exception:
            pass

    unique_equipment = list({r["equipment"] for r in records if r.get("equipment")})
    last_activity = str(records[0]["creation"]).split(" ")[0] if records else None

    return {
        "total_checklists": len(records),
        "equipment_monitored": len(unique_equipment),
        "total_task_checks": total_task_checks,
        "last_activity": last_activity,
        "work_order": work_order or "all"
    }


@frappe.whitelist(allow_guest=True)
def get_maintenance_log_history(work_order=None, limit=50, start=0):
    """Return submitted Daily PM Schedule records for the Checklist Log History table."""
    limit = frappe.utils.cint(limit) or 50
    start = frappe.utils.cint(start) or 0
    filters = {"docstatus": 1}
    if work_order and work_order != "all":
        filters["work_order"] = work_order

    records = frappe.get_all(
        "Daily Preventative Maintenance Schedule",
        filters=filters,
        fields=["name", "equipment", "area", "work_order",
                "sign_of_the_operator", "sign_of_supervisor",
                "overall_remarks", "creation", "modified"],
        order_by="creation desc",
        limit_page_length=limit,
        limit_start=start,
        ignore_permissions=True
    )
    return records


@frappe.whitelist(allow_guest=True)
def get_companies_list():
    """Return companies ignoring permissions."""
    return frappe.get_all("Company", fields=["name", "company_name"], limit=100, ignore_permissions=True)


@frappe.whitelist(allow_guest=True)
def get_warehouses_list(company=None):
    """Return warehouses ignoring permissions."""
    filters = {"is_group": 0}
    if company:
        filters["company"] = company
    return frappe.get_all("Warehouse", filters=filters, fields=["name", "warehouse_name", "company", "is_group"], limit=200, ignore_permissions=True)


@frappe.whitelist(allow_guest=True)
def get_employees_list(search_term=None, limit=50):
    """Return employees ignoring permissions."""
    filters = []
    if search_term:
        filters.append(["employee_name", "like", f"%{search_term}%"])
    return frappe.get_all(
        "Employee",
        fields=["name", "employee_name", "gender", "designation", "status", "department"],
        filters=filters,
        limit_page_length=frappe.utils.cint(limit) or 50,
        ignore_permissions=True
    )


@frappe.whitelist(allow_guest=True)
def get_maintenance_schedules_list(limit=100, start=0):
    """Return Daily Preventative Maintenance Schedule list ignoring permissions."""
    return frappe.get_all(
        "Daily Preventative Maintenance Schedule",
        fields=["*"],
        limit_page_length=frappe.utils.cint(limit) or 100,
        limit_start=frappe.utils.cint(start) or 0,
        order_by="creation desc",
        ignore_permissions=True
    )


@frappe.whitelist(allow_guest=True)
def get_bin_quantities(item_codes=None):
    """Return Bin quantities ignoring permissions."""
    import json
    if isinstance(item_codes, str):
        try:
            item_codes = json.loads(item_codes)
        except Exception:
            item_codes = [item_codes]

    filters = []
    if item_codes:
        filters.append(["item_code", "in", item_codes])

    return frappe.get_all(
        "Bin",
        filters=filters,
        fields=["item_code", "warehouse", "actual_qty"],
        limit_page_length=1000,
        ignore_permissions=True
    )


@frappe.whitelist(allow_guest=True)
def get_boms_for_item(item_code, limit=100):
    """Return active submitted BOMs for an item code ignoring permissions."""
    if not item_code:
        return []
    boms = frappe.get_all(
        "BOM",
        filters={"item": item_code, "is_active": 1, "docstatus": 1},
        fields=["name", "item", "item_name", "is_active", "is_default", "quantity", "uom"],
        order_by="is_default desc, modified desc",
        limit_page_length=frappe.utils.cint(limit) or 100,
        ignore_permissions=True
    )
    return [{
        "id": b.name,
        "name": b.name,
        "productName": b.item_name or b.item,
        "item": b.item,
        "itemCode": b.item,
        "active": b.is_active or 1,
        "isDefault": bool(b.is_default),
        "quantity": frappe.utils.flt(b.quantity or 1),
        "unit": b.uom or "Nos"
    } for b in boms]


@frappe.whitelist(allow_guest=True)
def get_job_cards_for_work_order(work_order):
    """Return Job Cards for a Work Order ignoring permissions."""
    if not work_order:
        return []
    jcs = frappe.get_all(
        "Job Card",
        filters={"work_order": work_order},
        fields=["name", "operation", "workstation", "status", "remarks", "for_quantity", "total_completed_qty", "is_paused"],
        order_by="idx asc",
        limit_page_length=100,
        ignore_permissions=True
    )
    result = []
    for jc in jcs:
        app_status = jc.status or "Open"
        if app_status == "Work in Progress":
            app_status = "Work In Progress"
        result.append({
            "id": jc.name,
            "operation": jc.operation or "",
            "station": jc.workstation or "",
            "status": app_status,
            "operator": "",
            "remarks": jc.remarks or "",
            "forQuantity": frappe.utils.flt(jc.for_quantity or 0),
            "totalCompletedQty": frappe.utils.flt(jc.total_completed_qty or 0),
            "is_paused": jc.is_paused or 0
        })
    return result


@frappe.whitelist(allow_guest=True)
def cancel_work_order(work_order):
    """Cancel a Work Order with ignore_permissions=True so job cards can be deleted/cleaned up without permission errors."""
    if not work_order:
        frappe.throw(_("Work Order is required"))

    doc = frappe.get_doc("Work Order", work_order)
    doc.flags.ignore_permissions = True
    frappe.flags.ignore_permissions = True
    try:
        doc.cancel()
        frappe.db.commit()
        return {"success": True, "name": doc.name, "status": doc.status}
    finally:
        frappe.flags.ignore_permissions = False


@frappe.whitelist(allow_guest=True)
def cancel_stock_entry(stock_entry):
    """Cancel a Stock Entry with ignore_permissions=True."""
    if not stock_entry:
        frappe.throw(_("Stock Entry is required"))

    doc = frappe.get_doc("Stock Entry", stock_entry)
    doc.flags.ignore_permissions = True
    frappe.flags.ignore_permissions = True
    try:
        doc.cancel()
        frappe.db.commit()
        return {"success": True, "name": doc.name, "status": doc.status}
    finally:
        frappe.flags.ignore_permissions = False
