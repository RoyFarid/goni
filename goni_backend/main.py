"""
main.py  –  EasyPattern FastAPI Backend
────────────────────────────────────────
Run with:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routes.auth_routes import router as auth_router
from routes.profiles_routes import router as profiles_router
from routes.patterns_routes import router as patterns_router

settings = get_settings()

app = FastAPI(
    title="EasyPattern API",
    description="Backend for the EasyPattern CAD tool",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(patterns_router)


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "service": "EasyPattern API v1.0"}
