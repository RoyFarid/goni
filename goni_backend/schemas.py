from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import uuid


# ─── Auth ─────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("La contraseña no puede superar los 72 caracteres")
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: Optional[str]
    membership_tier: str


# ─── Measurement Profiles ──────────────────────────────────────────────────────
class MeasurementProfileCreate(BaseModel):
    profile_name: str
    remarks: Optional[str] = None

class MeasurementProfileUpdate(BaseModel):
    profile_name: str
    remarks: Optional[str] = None


class MeasurementProfileOut(BaseModel):
    id: str
    profile_name: str
    remarks: Optional[str]
    created_at: str


# ─── Body Measurements ────────────────────────────────────────────────────────
class BodyMeasurementItem(BaseModel):
    measurement_key: str   # e.g. 'bust_circ'
    value_cm: float


class BodyMeasurementsUpsert(BaseModel):
    template_id: int
    measurements: list[BodyMeasurementItem]


# ─── Pattern ──────────────────────────────────────────────────────────────────
class ComputedPoint(BaseModel):
    name: str     # e.g. "P1"
    x: float
    y: float


class PathDef(BaseModel):
    path_name: str
    node_sequence: list[str]   # ["P1","P2","P3"]
    is_curve: bool
    stroke_color: str


class PatternResponse(BaseModel):
    template_id: int
    template_name: str
    points: list[ComputedPoint]
    paths: list[PathDef]
    technicals: dict   # intermediate values for debug panel

class GuestComputeRequest(BaseModel):
    guest_id: str
    measurements: list[BodyMeasurementItem]
