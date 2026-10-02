from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.schemas.push import PushPublicKey, PushSubscriptionIn

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/public-key", response_model=PushPublicKey)
def get_public_key():
    return PushPublicKey(public_key=settings.VAPID_PUBLIC_KEY)


@router.post("/subscribe", status_code=204)
def subscribe(
    data: PushSubscriptionIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="Las notificaciones push todavía no están configuradas")
    endpoint = str(data.endpoint)
    subscription = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
    if subscription:
        subscription.user_id = user.id
        subscription.p256dh = data.keys.p256dh
        subscription.auth = data.keys.auth
    else:
        db.add(PushSubscription(
            user_id=user.id,
            endpoint=endpoint,
            p256dh=data.keys.p256dh,
            auth=data.keys.auth,
        ))
    db.commit()


@router.delete("/subscribe", status_code=204)
def unsubscribe(
    endpoint: str = Query(min_length=1, max_length=2048),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(PushSubscription).filter(
        PushSubscription.user_id == user.id, PushSubscription.endpoint == endpoint
    ).delete(synchronize_session=False)
    db.commit()
