import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.academic import Building, Classroom
from app.models.campus import CampusLocation, LocationType
from app.schemas.campus import (
    CampusMapOut,
    LocationCreate,
    LocationOut,
    LocationUpdate,
    MapBuildingOut,
    MapClassroomOut,
)

router = APIRouter(prefix="/campus", tags=["campus"])


def _get_or_404(db: Session, location_id: uuid.UUID) -> CampusLocation:
    location = db.query(CampusLocation).filter(CampusLocation.id == location_id).first()
    if location is None:
        raise HTTPException(status_code=404, detail="Punto de interés no encontrado")
    return location


@router.post("/locations", response_model=LocationOut, status_code=201)
def create_location(data: LocationCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if data.building_id and not db.query(Building).filter(Building.id == data.building_id).first():
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    obj = CampusLocation(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/locations", response_model=list[LocationOut])
def list_locations(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    tipo: LocationType | None = None,
):
    """Lista los puntos de interés (biblioteca, comedor, salas de estudio,
    oficinas, baños, etc.). Filtrable por tipo, ej: ?tipo=biblioteca"""
    query = db.query(CampusLocation)
    if tipo:
        query = query.filter(CampusLocation.tipo == tipo)
    return query.all()


@router.get("/locations/{location_id}", response_model=LocationOut)
def get_location(location_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Trae un punto de interés puntual — es lo que usaría el botón
    'Cómo llegar' del frontend para centrar el mapa y trazar la ruta con el
    SDK de mapas que se use (Google Maps, Mapbox, etc.) usando lat/long."""
    return _get_or_404(db, location_id)


@router.put("/locations/{location_id}", response_model=LocationOut)
def update_location(
    location_id: uuid.UUID, data: LocationUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    obj = _get_or_404(db, location_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/locations/{location_id}", status_code=204)
def delete_location(location_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = _get_or_404(db, location_id)
    db.delete(obj)
    db.commit()


@router.get("/map", response_model=CampusMapOut)
def get_campus_map(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Vista combinada para pintar el mapa completo en una sola llamada:
    edificios (con coordenadas y sus aulas) + todos los demás puntos de
    interés (biblioteca, comedor, salas de estudio, oficinas, baños)."""
    buildings = db.query(Building).all()
    buildings_out = []
    for b in buildings:
        classrooms = db.query(Classroom).filter(Classroom.building_id == b.id).all()
        buildings_out.append(
            MapBuildingOut(
                id=b.id,
                nombre=b.nombre,
                latitude=b.latitude,
                longitude=b.longitude,
                classrooms=[MapClassroomOut(id=c.id, codigo=c.codigo) for c in classrooms],
            )
        )

    locations = db.query(CampusLocation).all()
    return CampusMapOut(buildings=buildings_out, locations=locations)
