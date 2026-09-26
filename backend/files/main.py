from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, students

app = FastAPI(title="Campus Inteligente API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restringir a los dominios reales en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# A partir de la Etapa 2, las tablas se crean y actualizan con Alembic
# (ver carpeta alembic/ y las instrucciones de "alembic upgrade head"),
# ya no con Base.metadata.create_all().

app.include_router(auth.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok"}
