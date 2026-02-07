import io

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A5, portrait
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.permissions import IsReadOnlyForHQ, user_site_id
from .models import Invoice, PaymentMethod
from .serializers import InvoiceSerializer


def _generate_invoice_pdf(invoice):
    """Generate a professional PDF for the invoice. Returns bytes."""
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

    buffer = io.BytesIO()
    # A5 (148 x 210 mm) - standard receipt size
    doc = SimpleDocTemplate(
        buffer,
        pagesize=portrait(A5),
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=0.4 * inch,
        bottomMargin=0.4 * inch,
    )
    styles = getSampleStyleSheet()
    elements = []

    # Teal accent for workshop branding
    accent = colors.HexColor("#0d9488")

    # Header: Workshop name + Invoice badge
    header_data = [
        [
            Paragraph(
                "<b>Workshop</b><br/><font size='8' color='#5c6370'>Auto Service & Repairs</font>",
                styles["Normal"],
            ),
            Paragraph(
                f"<b>INVOICE</b><br/><font size='9'>#{invoice.id}</font>",
                styles["Normal"],
            ),
        ]
    ]
    header_table = Table(header_data, colWidths=[3.2 * inch, 1.8 * inch])
    header_table.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    elements.append(header_table)
    elements.append(Spacer(1, 0.25 * inch))

    # Bill to & Vehicle/Details in two columns
    bill_to = (
        f"<b>Bill to</b><br/>"
        f"{customer.first_name} {customer.last_name}<br/>"
        f"{customer.email or '—'}<br/>"
        f"{customer.phone_number or '—'}"
    )
    if vehicle:
        right_col = (
            f"<b>Vehicle</b><br/>"
            f"{vehicle.make} {vehicle.model} ({vehicle.license_plate})<br/>"
            f"Site: {site.name}<br/>"
            f"Invoice date: {invoice.created_at.strftime('%d %b %Y')}"
        )
    else:
        right_col = (
            f"<b>Type</b> Parts sale<br/>"
            f"Site: {site.name}<br/>"
            f"Invoice date: {invoice.created_at.strftime('%d %b %Y')}"
        )
    info_data = [[Paragraph(bill_to, styles["Normal"]), Paragraph(right_col, styles["Normal"])]]
    info_table = Table(info_data, colWidths=[2.6 * inch, 2.6 * inch])
    info_table.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (0, -1), 0.5, colors.HexColor("#dee1e6")),
            ("BOX", (1, 0), (1, -1), 0.5, colors.HexColor("#dee1e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ])
    )
    elements.append(info_table)
    elements.append(Spacer(1, 0.3 * inch))

    # Line items table
    usages = list(ProductUsage.objects.filter(service_request=sr).select_related("product"))
    data = [["Description", "Qty", "Unit price", "Amount"]]
    for u in usages:
        line_total = float(u.product.unit_price) * u.quantity_used
        desc = f"{u.product.name}"
        if u.product.sku:
            desc += f" ({u.product.sku})"
        data.append([desc, str(u.quantity_used), f"GH₵{float(u.product.unit_price):,.2f}", f"GH₵{line_total:,.2f}"])

    labor_pdf = float(getattr(sr, "labor_cost", 0) or 0)
    if labor_pdf > 0:
        data.append(["Labor / Workmanship", "1", f"GH₵{labor_pdf:,.2f}", f"GH₵{labor_pdf:,.2f}"])

    t = Table(data, colWidths=[2.2 * inch, 0.5 * inch, 1 * inch, 1 * inch])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), accent),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            ("TOPPADDING", (0, 0), (-1, 0), 10),
            ("TOPPADDING", (0, 1), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee1e6")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
        ])
    )
    elements.append(t)
    elements.append(Spacer(1, 0.25 * inch))

    # Totals
    parts_total_pdf = sum(float(u.product.unit_price) * u.quantity_used for u in usages)
    subtotal = float(invoice.subtotal)
    discount = float(invoice.discount_amount)
    total = float(invoice.total_cost)
    totals = [["Subtotal", f"GH₵{subtotal:,.2f}"]]
    if discount > 0:
        totals.append(["Discount", f"-GH₵{discount:,.2f}"])
    totals.append(["<b>TOTAL DUE</b>", f"<b>GH₵{total:,.2f}</b>"])

    tt = Table(totals, colWidths=[0.8 * inch, 1.2 * inch])
    tt.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, -1), (-1, -1), 11),
            ("LINEABOVE", (0, -1), (-1, -1), 1.5, accent),
            ("TOPPADDING", (0, -1), (-1, -1), 10),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
        ])
    )
    elements.append(tt)
    elements.append(Spacer(1, 0.3 * inch))

    # Footer
    paid_text = "PAID" if invoice.paid else "BALANCE DUE"
    status_hex = "#50b478" if invoice.paid else "#5c6370"
    payment_info = ""
    if invoice.paid and invoice.payment_method:
        method_label = dict(PaymentMethod.choices).get(invoice.payment_method, invoice.payment_method)
        payment_info = f"<br/><b>Payment method: </b>{method_label}"
    footer_para = Paragraph(
        f"<font color='#5c6370' size='8'>Thank you for your business. "
        f"Please make payment to complete this transaction.</font><br/><br/>"
        f"<b>Status: </b><font color='{status_hex}'>{paid_text}</font>{payment_info}",
        styles["Normal"],
    )
    elements.append(footer_para)

    doc.build(elements)
    return buffer.getvalue()


class InvoicePdfView(APIView):
    """GET /invoices/{id}/pdf/ — download invoice as PDF."""

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
        response["Content-Disposition"] = f'attachment; filename="invoice-{pk}.pdf"'
        return response


def _invoice_queryset(user):
    qs = Invoice.objects.select_related("service_request", "service_request__site").all()
    sid = user_site_id(user)
    if sid is not None:
        qs = qs.filter(service_request__site_id=sid)
    return qs


class InvoiceListCreateView(generics.ListCreateAPIView):
    queryset = Invoice.objects.select_related("service_request", "service_request__site").all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return _invoice_queryset(self.request.user)

    def perform_create(self, serializer):
        # Invoices are normally created by completing a service request, not manually.
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
        # Send receipt notification when invoice is first marked as paid
        if not was_paid and serializer.instance.paid:
            from .tasks import notify_customer_of_receipt
            try:
                notify_customer_of_receipt.delay(serializer.instance.id)
            except Exception:
                notify_customer_of_receipt(serializer.instance.id)  # Run inline if Celery unavailable