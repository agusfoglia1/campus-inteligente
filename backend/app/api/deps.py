from fastapi import Depends, HTTPException

from app.api.v1.auth import get_current_user
from app.models.user import User, UserRole


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo un administrador puede hacer esto")
    return current_user
