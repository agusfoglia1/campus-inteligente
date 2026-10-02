from pydantic import BaseModel, Field, HttpUrl


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=256)
    auth: str = Field(min_length=1, max_length=256)


class PushSubscriptionIn(BaseModel):
    endpoint: HttpUrl
    keys: PushKeys


class PushPublicKey(BaseModel):
    public_key: str
