from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.core.security import create_qr_access_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.device import QrTokenOut

router = APIRouter(prefix="/qr", tags=["qr"])


@router.post("/token", response_model=QrTokenOut)
def generate_qr_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """El estudiante pide un token de acceso de corta duración para mostrar
    como QR en su celular. Cada llamada genera un token NUEVO; el anterior
    sigue siendo válido hasta que expire o se use (no se invalida acá)."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Solo los estudiantes pueden generar un QR de acceso")

    token, _jti, ttl = create_qr_access_token(str(current_user.id))
    return QrTokenOut(token=token, expires_in=ttl)
