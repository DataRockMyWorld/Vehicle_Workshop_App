from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from Customers.models import Customer
from Customers.views import WALKIN_PHONE
from accounts.permissions import IsCEOOrSuperuser, IsReadOnlyForHQ
from core.messaging import send_sms

from .models import Promotion, SMSBlast
from .serializers import PromotionSerializer, SMSBlastSerializer


class ActivePromotionListView(generics.ListAPIView):
    """List promotions that are currently active (start_date <= today <= end_date)."""

    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        today = timezone.now().date()
        return Promotion.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
        ).order_by("-start_date")


class PromotionListCreateView(generics.ListCreateAPIView):
    """List all promotions or create one. CEO only."""

    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, IsCEOOrSuperuser]
    queryset = Promotion.objects.all().order_by("-start_date")


class PromotionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a promotion. CEO only."""

    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, IsCEOOrSuperuser]
    queryset = Promotion.objects.all()


def _get_sms_blast_recipients(audience: str, site_id=None):
    """Return queryset of customers to receive SMS (excludes walk-in)."""
    base = Customer.objects.exclude(phone_number=WALKIN_PHONE).exclude(
        phone_number=""
    ).filter(phone_number__isnull=False)
    if audience == SMSBlast.AUDIENCE_OPT_IN:
        return base.filter(receive_service_reminders=True)
    if audience == SMSBlast.AUDIENCE_SITE and site_id:
        return base.filter(servicerequest_set__site_id=site_id).distinct()
    return base


def _do_send_sms_blast(promotion, message, audience, site_id, user):
    """Send SMS to recipients, create SMSBlast record, return blast."""
    recipients = list(
        _get_sms_blast_recipients(audience, site_id).values_list("id", "phone_number", "first_name")
    )
    total = len(recipients)
    sent = 0
    for _cid, phone, first_name in recipients:
        personalized = message.replace("{first_name}", first_name or "").strip()
        if not personalized:
            personalized = message
        send_sms(phone, personalized, context="promo_blast")
        sent += 1
    blast = SMSBlast.objects.create(
        promotion=promotion,
        message=message,
        audience=audience,
        site_id=site_id or None,
        total_count=total,
        sent_count=sent,
        created_by=user,
    )
    return blast


class SmsBlastPreviewView(APIView):
    """GET promotions/<id>/sms-blast-preview/?audience=all&site_id=1 - Preview recipient count. CEO only."""

    permission_classes = [IsAuthenticated, IsCEOOrSuperuser]

    def get(self, request: Request, pk: int):
        try:
            Promotion.objects.get(pk=pk)
        except Promotion.DoesNotExist:
            return Response({"detail": "Promotion not found."}, status=status.HTTP_404_NOT_FOUND)
        audience = request.query_params.get("audience") or SMSBlast.AUDIENCE_ALL
        if audience not in [SMSBlast.AUDIENCE_ALL, SMSBlast.AUDIENCE_OPT_IN, SMSBlast.AUDIENCE_SITE]:
            return Response(
                {"audience": ["Must be 'all', 'opt_in', or 'site'."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        site_id = request.query_params.get("site_id")
        if audience == SMSBlast.AUDIENCE_SITE and not site_id:
            return Response(
                {"site_id": ["Required when audience is 'site'."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        recipients = _get_sms_blast_recipients(audience, site_id)
        return Response({"total_count": recipients.count()})


class SmsBlastView(APIView):
    """POST promotions/<id>/sms-blast/ - Send SMS to customers for a promotion. CEO only."""

    permission_classes = [IsAuthenticated, IsCEOOrSuperuser]

    def post(self, request: Request, pk: int):
        try:
            promotion = Promotion.objects.get(pk=pk)
        except Promotion.DoesNotExist:
            return Response({"detail": "Promotion not found."}, status=status.HTTP_404_NOT_FOUND)
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"message": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        audience = request.data.get("audience") or SMSBlast.AUDIENCE_ALL
        if audience not in [SMSBlast.AUDIENCE_ALL, SMSBlast.AUDIENCE_OPT_IN, SMSBlast.AUDIENCE_SITE]:
            return Response(
                {"audience": ["Must be 'all', 'opt_in', or 'site'."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        site_id = request.data.get("site_id")
        if audience == SMSBlast.AUDIENCE_SITE and not site_id:
            return Response(
                {"site_id": ["Required when audience is 'site'."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        blast = _do_send_sms_blast(promotion, message, audience, site_id, request.user)
        return Response(SMSBlastSerializer(blast).data, status=status.HTTP_201_CREATED)


class SmsBlastHistoryListView(generics.ListAPIView):
    """List SMS blast history. CEO only."""

    serializer_class = SMSBlastSerializer
    permission_classes = [IsAuthenticated, IsCEOOrSuperuser]
    queryset = SMSBlast.objects.select_related("promotion", "site", "created_by").order_by("-created_at")
