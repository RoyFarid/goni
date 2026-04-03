"""
routes/auth_routes.py
──────────────────────
POST /api/auth/register  – create new user
POST /api/auth/login     – returns JWT (OAuth2 password flow)
GET  /api/auth/me        – returns current user info (protected)
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm

from database import get_db, dict_cursor
from auth import hash_password, verify_password, create_access_token, get_current_user
from schemas import RegisterRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(body: RegisterRequest):
    with get_db() as conn:
        cur = dict_cursor(conn)
        # Check email uniqueness
        cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Email ya registrado")

        hashed = hash_password(body.password)
        cur.execute(
            """
            INSERT INTO users (email, password_hash, full_name, plan_id)
            VALUES (%s, %s, %s, 'node')
            RETURNING id, email, full_name, plan_id AS membership_tier, created_at
            """,
            (body.email, hashed, body.full_name),
        )
        user = dict(cur.fetchone())

        # Crear perfil de medidas por defecto
        cur.execute(
            """
            INSERT INTO measurement_profiles (user_id, profile_name, remarks)
            VALUES (%s, 'Defecto', 'Perfil creado automáticamente al registrarse')
            """,
            (user["id"],)
        )

    return {"message": "Usuario creado", "user_id": str(user["id"])}


@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            """
            SELECT u.id, u.email, u.password_hash, u.full_name, 
                   u.plan_id AS membership_tier, m.name AS plan_name
            FROM users u
            LEFT JOIN membership_plans m ON u.plan_id = m.plan_id
            WHERE u.email = %s
            """,
            (form_data.username,),
        )
        user = cur.fetchone()

    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token(
        data={
            "sub": str(user["id"]),
            "email": user["email"],
            "tier": user["membership_tier"],
        }
    )
    return LoginResponse(
        access_token=token,
        user_id=str(user["id"]),
        email=user["email"],
        full_name=user["full_name"],
        membership_tier=user["membership_tier"],
        plan_name=user["plan_name"],
    )


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    """Returns the authenticated user's basic info from the token."""
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            """
            SELECT u.id, u.email, u.full_name, u.plan_id AS membership_tier, 
                   m.name AS plan_name, u.created_at 
            FROM users u
            LEFT JOIN membership_plans m ON u.plan_id = m.plan_id
            WHERE u.id = %s
            """,
            (current_user["id"],),
        )
        user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return dict(user)
