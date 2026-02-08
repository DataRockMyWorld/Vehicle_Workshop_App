import io
from datetime import datetime

from django.conf import settings
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, portrait
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.permissions import IsReadOnlyForHQ, user_site_id
from .models import Invoice, PaymentMethod
from .serializers import InvoiceSerializer


def _business_config():
    return getattr(settings, "FEELING_AUTOPART", {}) or {}


def _generate_receipt_pdf(invoice, request=None):
    """
    Generate POS thermal receipt PDF (80mm width). Monochrome, high contrast,
    optimized for thermal printers. Feeling Autopart standard.
    """
    from ServiceRequests.models import ProductUsage

    invoice = Invoice.objects.select_related(
        "service_request",
        "service_request__customer",
        "service_request__vehicle",
        "service_request__site",
        "service_request__assigned_mechanic",
    ).get(pk=invoice.pk)
    sr = invoice.service_request
    customer = sr.customer
    vehicle = sr.vehicle
    site = sr.site
    cfg = _business_config()
    biz_name = cfg.get("BUSINESS_NAME", "Feeling Autopart")
    tin = cfg.get("TIN", "") or ""
    vat_rate = float(cfg.get("VAT_RATE") or 0)
    website = cfg.get("WEBSITE", "") or cfg.get("SUPPORT_EMAIL", "")

    # 80mm width, ~400mm height (thermal continuous)
    w_pt = 80 * mm
    h_pt = 400 * mm
    receipt_size = (w_pt, h_pt)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=receipt_size,
        leftMargin=3 * mm,
        rightMargin=3 * mm,
        topMargin=4 * mm,
        bottomMargin=4 * mm,
    )
    styles = getSampleStyleSheet()
    elements = []

    # ---- Header ----
    elements.append(
        Paragraph(
            f"<b><font size='12'>{biz_name}</font></b>",
            styles["Normal"],
        )
    )
    elements.append(Paragraph(f"<font size='8'>{site.name}</font>", styles["Normal"]))
    if site.location:
        elements.append(
            Paragraph(f"<font size='7'>{site.location}</font>", styles["Normal"])
        )
    if site.contact_number:
        elements.append(
            Paragraph(f"<font size='7'>Tel: {site.contact_number}</font>", styles["Normal"])
        )
    if website:
        elements.append(
            Paragraph(f"<font size='7'>{website}</font>", styles["Normal"])
        )
    if tin:
        elements.append(
            Paragraph(f"<font size='7'>TIN/VAT: {tin}</font>", styles["Normal"])
        )
    elements.append(Spacer(1, 3 * mm))

    # ---- Transaction details ----
    dt = invoice.created_at or datetime.now()
    dt_str = dt.strftime("%d/%m/%Y - %H:%M")
    cashier = getattr(request.user, "email", "—") if request and hasattr(request, "user") else "—"
    terminal_id = site.id  # Use site as terminal for now

    elements.append(
        Paragraph(
            "<font size='8'>" + "─" * 28 + "</font>",
            styles["Normal"],
        )
    )
    elements.append(
        Paragraph(f"<font size='8'><b>RECEIPT</b> #{invoice.id}</font>", styles["Normal"])
    )
    elements.append(
        Paragraph(f"<font size='7'>Invoice #{invoice.id} | {dt_str}</font>", styles["Normal"])
    )
    elements.append(
        Paragraph(f"<font size='7'>Cashier: {cashier} | POS: {terminal_id}</font>", styles["Normal"])
    )
    elements.append(
        Paragraph("<font size='8'>" + "─" * 28 + "</font>", styles["Normal"])
    )
    elements.append(Spacer(1, 2 * mm))

    # ---- Itemized section ----
    usages = list(ProductUsage.objects.filter(service_request=sr).select_related("product"))
    data = [["Description", "Qty", "Price", "Total"]]
    for u in usages:
        price = float(u.product.unit_price)
        qty = u.quantity_used
        line_total = price * qty
        desc = u.product.name[:24] + ".." if len(u.product.name) > 26 else u.product.name
        sku = (u.product.sku or u.product.part_number or "")[:12]
        compat = ""
        if u.product.application:
            compat = u.product.application.split(",")[0].strip()[:20] if u.product.application else ""
        if sku:
            desc = f"{desc}\n{sku}"
        if compat:
            desc = f"{desc}\n({compat})"
        data.append([
            Paragraph(f"<font size='7'>{desc}</font>", styles["Normal"]),
            str(qty),
            f"{price:,.2f}",
            f"{line_total:,.2f}",
        ])

    labor_pdf = float(getattr(sr, "labor_cost", 0) or 0)
    if labor_pdf > 0:
        data.append(["Labor/Workmanship", "1", f"{labor_pdf:,.2f}", f"{labor_pdf:,.2f}"])

    col_widths = [90, 18, 30, 38]  # pts for ~80mm
    t = Table(data, colWidths=col_widths)
    t.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("FONTSIZE", (0, 1), (-1, -1), 7),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("LINEBELOW", (0, 0), (-1, 0), 1, colors.black),
            ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.black),
        ])
    )
    elements.append(t)
    elements.append(Spacer(1, 2 * mm))

    # ---- Totals ----
    subtotal = float(invoice.subtotal)
    discount = float(invoice.discount_amount)
    total = float(invoice.total_cost)
    vat_amt = 0.0
    if vat_rate > 0:
        vat_amt = round(subtotal * vat_rate / 100, 2)

    totals_data = [["Subtotal:", f"GH₵{subtotal:,.2f}"]]
    if discount > 0:
        totals_data.append(["Discount:", f"-GH₵{discount:,.2f}"])
    if vat_amt > 0:
        totals_data.append([f"VAT ({vat_rate}%):", f"GH₵{vat_amt:,.2f}"])
    totals_data.append(["<b>TOTAL PAYABLE</b>", f"<b>GH₵{total:,.2f}</b>"])
    totals_data.append([" ", " "])

    method_label = "—"
    if invoice.paid and invoice.payment_method:
        method_label = dict(PaymentMethod.choices).get(
            invoice.payment_method, invoice.payment_method
        )
    totals_data.append(["Payment:", method_label])
    totals_data.append(["Amount paid:", f"GH₵{total:,.2f}" if invoice.paid else "—"])
    totals_data.append(["Change/Balance:", "GH₵0.00" if invoice.paid else f"GH₵{total:,.2f}"])

    tt = Table(totals_data, colWidths=[90, 86])
    tt.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("FONTNAME", (0, -6), (-1, -4), "Helvetica-Bold"),
            ("FONTSIZE", (0, -6), (-1, -4), 10),
            ("FONTSIZE", (0, 0), (-1, -7), 8),
            ("FONTSIZE", (0, -3), (-1, -1), 7),
        ])
    )
    elements.append(tt)
    elements.append(Spacer(1, 4 * mm))

    # ---- Footer ----
    elements.append(
        Paragraph("<font size='8'>" + "─" * 28 + "</font>", styles["Normal"])
    )
    elements.append(
        Paragraph(
            "<font size='8'><b>Thank you for your purchase</b></font>",
            styles["Normal"],
        )
    )
    elements.append(
        Paragraph(
            "<font size='6'>Electrical parts not returnable after installation. "
            "Keep this receipt for warranty claims.</font>",
            styles["Normal"],
        )
    )
    elements.append(
        Paragraph(
            f"<font size='6'>Verify: Invoice #{invoice.id}</font>",
            styles["Normal"],
        )
    )
    elements.append(
        Paragraph(
            "<font size='6'>Tax compliance: This is your proof of purchase.</font>",
            styles["Normal"],
        )
    )

    doc.build(elements)
    return buffer.getvalue()


def _generate_invoice_pdf(invoice):
    """
    Generate international-standard A4 invoice PDF. Full color, print-ready,
    suitable for PDF export and digital sharing. Feeling Autopart.
    """
    from ServiceRequests.models import ProductUsage

    invoice = Invoice.objects.select_related(
        "service_request",
        "service_request__customer",
        "service_request__vehicle",
        "service_request__site",
        "service_request__assigned_mechanic",
        "service_request__service_type",
        "service_request__service_type__category",
    ).get(pk=invoice.pk)
    sr = invoice.service_request
    customer = sr.customer
    vehicle = sr.vehicle
    site = sr.site
    cfg = _business_config()
    biz_name = cfg.get("BUSINESS_NAME", "Feeling Autopart")
    tin = cfg.get("TIN", "") or ""
    vat_rate = float(cfg.get("VAT_RATE") or 0)
    website = cfg.get("WEBSITE", "") or ""
    support_email = cfg.get("SUPPORT_EMAIL", "") or ""

    accent = colors.HexColor("#0d9488")
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=portrait(A4),
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )
    styles = getSampleStyleSheet()
    elements = []

    # ---- Header: Logo area + Business info ----
    header_left = (
        f"<b><font size='16' color='#0d9488'>{biz_name}</font></b><br/>"
        f"<font size='9' color='#5c6370'>Auto Parts & Service</font><br/><br/>"
        f"<font size='9'><b>Registered address:</b><br/>{site.location or '—'}</font><br/>"
        f"<font size='9'>Tel: {site.contact_number or '—'}</font><br/>"
    )
    if support_email:
        header_left += f"<font size='9'>Email: {support_email}</font><br/>"
    if website:
        header_left += f"<font size='9'>Web: {website}</font><br/>"
    if tin:
        header_left += f"<font size='9'>TIN/VAT ID: {tin}</font>"

    dt = invoice.created_at
    due_date = dt  # Same as invoice date for immediate payment
    header_right = (
        f"<b><font size='14'>INVOICE</font></b><br/>"
        f"<font size='11'>#{invoice.id}</font><br/><br/>"
        f"<font size='9'>Invoice date: {dt.strftime('%d/%m/%Y')}</font><br/>"
        f"<font size='9'>Due date: {due_date.strftime('%d/%m/%Y')}</font><br/>"
        f"<font size='9'>Job ref: SR#{sr.id}</font>"
    )

    header_data = [[Paragraph(header_left, styles["Normal"]), Paragraph(header_right, styles["Normal"])]]
    header_table = Table(header_data, colWidths=[3.5 * inch, 2.5 * inch])
    header_table.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LINEBELOW", (0, 0), (-1, 0), 2, accent),
        ])
    )
    elements.append(header_table)
    elements.append(Spacer(1, 0.35 * inch))

    # ---- Customer info ----
    cust_name = f"{customer.first_name} {customer.last_name}"
    bill_to = (
        f"<b>Bill to</b><br/>"
        f"<font size='10'>{cust_name}</font><br/>"
        f"<font size='9'>Phone: {customer.phone_number or '—'}</font><br/>"
    )
    if customer.email:
        bill_to += f"<font size='9'>Email: {customer.email}</font><br/>"
    bill_to += f"<font size='9'>Customer TIN: —</font>"  # Placeholder for corporate

    vehicle_info = "—"
    if vehicle:
        vehicle_info = f"{vehicle.make} {vehicle.model} ({vehicle.license_plate})"
    job_info = (
        f"<b>Vehicle / Job</b><br/>"
        f"<font size='9'>{vehicle_info}</font><br/>"
        f"<font size='9'>Branch: {site.name}</font>"
    )

    info_data = [[Paragraph(bill_to, styles["Normal"]), Paragraph(job_info, styles["Normal"])]]
    info_table = Table(info_data, colWidths=[2.8 * inch, 2.8 * inch])
    info_table.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee1e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    elements.append(info_table)
    elements.append(Spacer(1, 0.3 * inch))

    # ---- Line items ----
    usages = list(ProductUsage.objects.filter(service_request=sr).select_related("product"))
    data = [["Description", "Part #", "Vehicle", "Qty", "Unit price", "VAT", "Amount"]]
    for u in usages:
        price = float(u.product.unit_price)
        qty = u.quantity_used
        vat_amt = 0.0
        if vat_rate > 0:
            vat_amt = round(price * qty * vat_rate / 100, 2)
        line_total = price * qty
        desc = u.product.name
        sku = u.product.sku or u.product.part_number or "—"
        compat = (u.product.application or "").split(",")[0].strip()[:30] or "—"
        data.append([
            desc[:40],
            sku[:15],
            compat,
            str(qty),
            f"GH₵{price:,.2f}",
            f"GH₵{vat_amt:,.2f}" if vat_amt else "—",
            f"GH₵{line_total:,.2f}",
        ])

    labor_pdf = float(getattr(sr, "labor_cost", 0) or 0)
    if labor_pdf > 0:
        data.append([
            "Labor / Workmanship",
            "—",
            "—",
            "1",
            f"GH₵{labor_pdf:,.2f}",
            "—",
            f"GH₵{labor_pdf:,.2f}",
        ])

    t = Table(data, colWidths=[1.5 * inch, 0.8 * inch, 1.2 * inch, 0.4 * inch, 0.8 * inch, 0.6 * inch, 0.9 * inch])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), accent),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ALIGN", (3, 0), (3, -1), "CENTER"),
            ("ALIGN", (4, 0), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee1e6")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    elements.append(t)
    elements.append(Spacer(1, 0.3 * inch))

    # ---- Financial summary ----
    subtotal = float(invoice.subtotal)
    discount = float(invoice.discount_amount)
    total = float(invoice.total_cost)
    vat_total = 0.0
    if vat_rate > 0:
        vat_total = round(subtotal * vat_rate / 100, 2)

    totals = [["Subtotal", f"GH₵{subtotal:,.2f}"]]
    if discount > 0:
        totals.append(["Discount", f"-GH₵{discount:,.2f}"])
    if vat_total > 0:
        totals.append([f"VAT ({vat_rate}%)", f"GH₵{vat_total:,.2f}"])
    totals.append(["<b>TOTAL AMOUNT DUE</b>", f"<b>GH₵{total:,.2f}</b>"])

    tt = Table(totals, colWidths=[1.2 * inch, 1.5 * inch])
    tt.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, -1), (-1, -1), 12),
            ("LINEABOVE", (0, -1), (-1, -1), 2, accent),
            ("TOPPADDING", (0, -1), (-1, -1), 10),
        ])
    )
    elements.append(tt)
    elements.append(Spacer(1, 0.2 * inch))

    # ---- Payment section ----
    method_label = "—"
    if invoice.paid and invoice.payment_method:
        method_label = dict(PaymentMethod.choices).get(invoice.payment_method, invoice.payment_method)
    payment_text = (
        f"<b>Payment:</b> {method_label}<br/>"
        f"<font size='9'>Terms: Immediate</font><br/>"
        f"<font size='9'>Bank / MoMo details: As displayed at branch</font>"
    )
    elements.append(Paragraph(payment_text, styles["Normal"]))
    elements.append(Spacer(1, 0.4 * inch))

    # ---- Footer ----
    status = "PAID" if invoice.paid else "BALANCE DUE"
    status_color = "#50b478" if invoice.paid else "#5c6370"
    elements.append(
        Paragraph(
            f"<font size='8' color='#5c6370'>"
            "Notes: Electrical parts not returnable after installation. "
            "Warranty per manufacturer. Keep this invoice for records."
            "</font>",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(
        Paragraph(
            f"<b>Status: <font color='{status_color}'>{status}</font></b>",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 0.5 * inch))
    # Signature / stamp area
    sig_data = [
        [Paragraph("<font size='8'>Authorized signature</font>", styles["Normal"]), ""],
        ["_", "_" * 25],
        ["", Paragraph("<font size='8'>Company stamp</font>", styles["Normal"])],
    ]
    sig_table = Table(sig_data, colWidths=[2 * inch, 2 * inch])
    elements.append(sig_table)

    doc.build(elements)
    return buffer.getvalue()


class InvoicePdfView(APIView):
    """GET /invoices/{id}/pdf/ — download A4 invoice PDF."""

    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get(self, request, pk):
        qs = Invoice.objects.select_related("service_request__site").all()
        sid = user_site_id(request.user)
        if sid is not None:
            qs = qs.filter(service_request__site_id=sid)
        invoice = qs.filter(pk=pk).first()
        if not invoice:
            from rest_framework.exceptions import NotFound
            raise NotFound()
        pdf_bytes = _generate_invoice_pdf(invoice)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="feeling-autopart-invoice-{pk}.pdf"'
        return response


class InvoiceReceiptView(APIView):
    """GET /invoices/{id}/receipt/ — download 80mm thermal receipt PDF."""

    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get(self, request, pk):
        qs = Invoice.objects.select_related("service_request__site").all()
        sid = user_site_id(request.user)
        if sid is not None:
            qs = qs.filter(service_request__site_id=sid)
        invoice = qs.filter(pk=pk).first()
        if not invoice:
            from rest_framework.exceptions import NotFound
            raise NotFound()
        pdf_bytes = _generate_receipt_pdf(invoice, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="receipt-{pk}.pdf"'
        return response


def _invoice_queryset(user):
    qs = Invoice.objects.select_related(
        "service_request",
        "service_request__customer",
        "service_request__vehicle",
        "service_request__site",
    ).all().order_by("-created_at")
    sid = user_site_id(user)
    if sid is not None:
        qs = qs.filter(service_request__site_id=sid)
    return qs


class InvoiceListCreateView(generics.ListCreateAPIView):
    queryset = Invoice.objects.select_related(
        "service_request",
        "service_request__customer",
        "service_request__vehicle",
        "service_request__site",
    ).all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return _invoice_queryset(self.request.user)

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            sr = serializer.validated_data.get("service_request")
            if sr:
                site_id = user_site_id(self.request.user)
                if site_id is not None and sr.site_id != site_id:
                    raise PermissionDenied("You can only create invoices for your site's service requests.")
        data = serializer.validated_data
        save_kw = {}
        if (data.get("subtotal") or 0) == 0 and data.get("total_cost"):
            save_kw["subtotal"] = data["total_cost"]
            save_kw["discount_amount"] = data.get("discount_amount") or 0
        serializer.save(**save_kw)


class InvoiceDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update an invoice (e.g. mark as paid with payment method)."""
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return _invoice_queryset(self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        was_paid = instance.paid
        serializer.save()
        if not was_paid and serializer.instance.paid:
            from .tasks import notify_customer_of_receipt
            try:
                notify_customer_of_receipt.delay(serializer.instance.id)
            except Exception:
                notify_customer_of_receipt(serializer.instance.id)
