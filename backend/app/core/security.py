from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

QR_TOKEN_TYPE = "qr_access"
QR_TOKEN_TTL_SECONDS = 25


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def create_qr_access_token(student_user_id: str) -> tuple[str, str, int]:
    """Genera el token de corta duración que se muestra como QR en el celular.

    Devuelve (token, jti, ttl_seconds). El 'jti' es el identificador único
    que se usa para anti-replay (evitar que el mismo token se use 2 veces).
    Es un token DISTINTO del JWT de sesión: tiene su propio 'type' y expira
    en segundos, no en minutos/horas.
    """
    jti = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(seconds=QR_TOKEN_TTL_SECONDS)
    payload = {
        "sub": student_user_id,
        "type": QR_TOKEN_TYPE,
        "jti": jti,
        "exp": expire,
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, jti, QR_TOKEN_TTL_SECONDS


def decode_qr_access_token(token: str) -> Optional[dict]:
    """Decodifica un token QR y valida que sea del tipo correcto
    (para que no se pueda usar un JWT de sesión normal como si fuera un QR)."""
    payload = decode_access_token(token)
    if payload is None:
        return None
    if payload.get("type") != QR_TOKEN_TYPE:
        return None
    return payload


def generate_device_api_key() -> str:
    """Genera una API key legible en texto plano, para mostrar UNA vez al
    crear el dispositivo. Se guarda solo su hash en la base."""
    return secrets.token_urlsafe(32)


def hash_api_key(api_key: str) -> str:
    return pwd_context.hash(api_key)


def verify_api_key(plain_api_key: str, hashed_api_key: str) -> bool:
    return pwd_context.verify(plain_api_key, hashed_api_key)
