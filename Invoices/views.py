import io

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.permissions import IsReadOnlyForHQ, user_site_id
from .models import Invoice
from .serializers import InvoiceSerializer


def _generate_invoice_pdf(invoice):
    """Generate a PDF for the invoice. Returns bytes."""
    invoice = Invoice.objects.select_related(
        "service_request",
        "service_request__customer",
        "service_request__vehicle",
        "service_request__site",
    ).get(pk=invoice.pk)
    sr = invoice.service_request
    customer = sr.customer
    vehicle = sr.vehicle
    site = sr.site

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=inch, leftMargin=inch)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("INVOICE", styles["Title"]))
    elements.append(Spacer(1, 0.25 * inch))
    elements.append(Paragraph(f"Invoice # {invoice.id}", styles["Heading2"]))
    elements.append(Paragraph(f"Date: {invoice.created_at.strftime('%Y-%m-%d')}", styles["Normal"]))
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph("Bill To:", styles["Heading3"]))
    elements.append(Paragraph(f"{customer.first_name} {customer.last_name}", styles["Normal"]))
    elements.append(Paragraph(customer.email or "—", styles["Normal"]))
    elements.append(Paragraph(customer.phone_number or "—", styles["Normal"]))
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph("Vehicle:", styles["Heading3"]))
    elements.append(Paragraph(f"{vehicle.make} {vehicle.model} ({vehicle.license_plate})", styles["Normal"]))
    elements.append(Paragraph(f"Site: {site.name}", styles["Normal"]))
    elements.append(Spacer(1, 0.4 * inch))

    from ServiceRequests.models import ProductUsage

    usages = list(
        ProductUsage.objects.filter(service_request=sr).select_related("product")
    )
    data = [["Item", "Qty", "Unit Price", "Total"]]
    parts_total_pdf = 0.0
    for u in usages:
        line_total = float(u.product.unit_price) * u.quantity_used
        parts_total_pdf += line_total
        data.append([u.product.name, str(u.quantity_used), f"GH₵{u.product.unit_price}", f"GH₵{line_total:.2f}"])

    labor_pdf = float(getattr(sr, "labor_cost", 0) or 0)
    if labor_pdf > 0:
        data.append(["", "", "Labor / Workmanship", f"GH₵{labor_pdf:.2f}"])

    t = Table(data)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 0.3 * inch))

    parts_total_pdf = sum(float(u.product.unit_price) * u.quantity_used for u in usages)
    labor_pdf = float(getattr(sr, "labor_cost", 0) or 0)
    subtotal = float(invoice.subtotal)
    discount = float(invoice.discount_amount)
    total = float(invoice.total_cost)
    totals = []
    if labor_pdf > 0:
        totals.append(["Parts", f"GH₵{parts_total_pdf:.2f}"])
        totals.append(["Labor / Workmanship", f"GH₵{labor_pdf:.2f}"])
    totals.append(["Subtotal", f"GH₵{subtotal:.2f}"])
    if discount > 0:
        totals.append(["Discount", f"-GH₵{discount:.2f}"])
    totals.append(["Total", f"GH₵{total:.2f}"])
    tt = Table(totals, colWidths=[4 * inch, 1.5 * inch])
    tt.setStyle(TableStyle([
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(tt)
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph("Thank you for your business.", styles["Normal"]))

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


class InvoiceListCreateView(generics.ListCreateAPIView):
    queryset = Invoice.objects.select_related("service_request", "service_request__site").all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        qs = super().get_queryset()
        sid = user_site_id(self.request.user)
        if sid is None:
            return qs
        return qs.filter(service_request__site_id=sid)

    def perform_create(self, serializer):
        # Invoices are normally created by completing a service request, not manually.
        # If manual create is allowed, enforce site access.
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