from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, students, qr, devices, academic, teachers, admin, campus

app = FastAPI(title="Campus Inteligente API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(qr.router, prefix="/api/v1")
app.include_router(devices.router, prefix="/api/v1")
app.include_router(academic.router, prefix="/api/v1")
app.include_router(teachers.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(campus.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok"}
