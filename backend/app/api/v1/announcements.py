import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementOut, AnnouncementUpdate

router = APIRouter(prefix="/announcements", tags=["announcements"])


def _out(item: Announcement) -> AnnouncementOut:
    return AnnouncementOut(
        id=item.id,
        titulo=item.titulo,
        contenido=item.contenido,
        publicado=item.publicado,
        autor_nombre=item.autor.full_name if item.autor else None,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=list[AnnouncementOut])
def list_published_announcements(
    _: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    rows = (
        db.query(Announcement)
        .filter(Announcement.publicado.is_(True))
        .order_by(Announcement.created_at.desc())
        .all()
    )
    return [_out(row) for row in rows]


@router.get("/admin", response_model=list[AnnouncementOut])
def list_all_announcements(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    return [_out(row) for row in rows]


@router.post("/admin", response_model=AnnouncementOut, status_code=201)
def create_announcement(
    data: AnnouncementCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = Announcement(**data.model_dump(), autor_id=admin.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _out(item)


@router.put("/admin/{announcement_id}", response_model=AnnouncementOut)
def update_announcement(
    announcement_id: uuid.UUID,
    data: AnnouncementUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Comunicado no encontrado")
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _out(item)
