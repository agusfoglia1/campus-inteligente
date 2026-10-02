import json
import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.announcement import Announcement
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


def notify_announcement_subscribers(db: Session, announcement: Announcement) -> None:
    if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
        logger.info("Push skipped: VAPID keys are not configured")
        return

    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("Push skipped: install backend requirements to enable pywebpush")
        return

    payload = json.dumps({
        "title": announcement.titulo,
        "body": announcement.contenido[:180],
        "url": "/dashboard",
    })
    subscriptions = db.query(PushSubscription).all()
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_SUBJECT},
            )
        except WebPushException as exc:
            response = getattr(exc, "response", None)
            if response is not None and response.status_code in (404, 410):
                db.delete(subscription)
            else:
                logger.warning("Push delivery failed for subscription %s: %s", subscription.id, exc)
        except Exception:
            logger.exception("Unexpected push delivery failure for subscription %s", subscription.id)
    db.commit()
