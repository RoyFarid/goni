"""
main.py  –  EasyPattern FastAPI Backend
────────────────────────────────────────
Run with:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import get_settings
from rate_limit import limiter
from routes.auth_routes import router as auth_router
from routes.profiles_routes import router as profiles_router
from routes.patterns_routes import router as patterns_router
from routes.fabrics_routes import router as fabrics_router

settings = get_settings()

# Solo se exponen /docs y /redoc fuera de producción, para no regalarle el mapa
# completo de la API a cualquiera una vez el repo (y el deploy) sean públicos.
is_dev = settings.environment.lower() != "production"

app = FastAPI(
    title="EasyPattern API",
    description="Backend for the EasyPattern CAD tool",
    version="1.0.0",
    docs_url="/docs" if is_dev else None,
    redoc_url="/redoc" if is_dev else None,
    openapi_url="/openapi.json" if is_dev else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite conexión desde cualquier lado (ideal para Railway)
    allow_credentials=False, # Requerido apagarlo si usamos "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(patterns_router)
app.include_router(fabrics_router)


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "service": "EasyPattern API v1.0"}
