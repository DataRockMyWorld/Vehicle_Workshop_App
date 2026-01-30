"""
Audit signals for key models. Connect in audit/apps.py ready().
"""
import json
import logging

from django.db.models.signals import pre_save, post_save, post_delete

from .models import AuditLog
from .utils import get_audit_user

logger = logging.getLogger(__name__)

AUDITED_MODEL_NAMES = {"servicerequest", "customer", "vehicle", "invoice", "appointment", "inventory"}


def _get_model_label(instance):
    return f"{instance._meta.app_label}.{instance._meta.model_name}"


def _serialize_value(v):
    if v is None:
        return None
    if hasattr(v, "pk"):
        return str(v.pk)
    return str(v)


def _should_audit(instance):
    return instance._meta.model_name in AUDITED_MODEL_NAMES


_pre_save_state = {}


def _capture_pre_save(sender, instance, **kwargs):
    if not _should_audit(instance):
        return
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            state = {}
            for f in instance._meta.fields:
                if f.name == "password":
                    continue
                state[f.name] = _serialize_value(getattr(old, f.name, None))
            _pre_save_state[id(instance)] = state
        except sender.DoesNotExist:
            pass


def log_create(sender, instance, created, **kwargs):
    if not created:
        return
    if not _should_audit(instance):
        return
    user = get_audit_user()
    AuditLog.objects.create(
        action="create",
        model_label=_get_model_label(instance),
        object_id=str(instance.pk),
        object_repr=str(instance)[:200],
        changes_json=json.dumps({"created": True}),
        user_id=user.id if user else None,
    )


def log_update(sender, instance, created, **kwargs):
    if created:
        return
    if not _should_audit(instance):
        return
    state_key = id(instance)
    old_state = _pre_save_state.pop(state_key, None)
    if not old_state:
        return
    changes = {}
    for f in instance._meta.fields:
        if f.name in ("password",) or f.related_model:
            continue
        new_v = _serialize_value(getattr(instance, f.name, None))
        old_v = old_state.get(f.name)
        if old_v != new_v:
            changes[f.name] = {"old": old_v, "new": new_v}
    if not changes:
        return
    user = get_audit_user()
    AuditLog.objects.create(
        action="update",
        model_label=_get_model_label(instance),
        object_id=str(instance.pk),
        object_repr=str(instance)[:200],
        changes_json=json.dumps(changes),
        user_id=user.id if user else None,
    )


def log_delete(sender, instance, **kwargs):
    if not _should_audit(instance):
        return
    user = get_audit_user()
    AuditLog.objects.create(
        action="delete",
        model_label=_get_model_label(instance),
        object_id=str(instance.pk),
        object_repr=str(instance)[:200],
        changes_json=json.dumps({"deleted": True}),
        user_id=user.id if user else None,
    )
