"""
routes/profiles_routes.py
──────────────────────────
CRUD for measurement_profiles and their body_measurements.

GET    /api/profiles               – list user's profiles
POST   /api/profiles               – create profile
GET    /api/profiles/{id}          – get profile + measurements
DELETE /api/profiles/{id}          – delete profile

PUT    /api/profiles/{id}/measurements  – upsert body measurements for a profile
"""

from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_db, dict_cursor
from schemas import MeasurementProfileCreate, MeasurementProfileUpdate, BodyMeasurementsUpsert

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("")
def list_profiles(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            """
            SELECT id, profile_name, remarks,
                   to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
            FROM measurement_profiles
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (current_user["id"],),
        )
        rows = [dict(r) for r in cur.fetchall()]
    return rows


@router.post("", status_code=201)
def create_profile(body: MeasurementProfileCreate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            """
            INSERT INTO measurement_profiles (user_id, profile_name, remarks)
            VALUES (%s, %s, %s)
            RETURNING id, profile_name, remarks,
                      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
            """,
            (current_user["id"], body.profile_name, body.remarks),
        )
        row = dict(cur.fetchone())
    return row

@router.put("/{profile_id}")
def update_profile(profile_id: str, body: MeasurementProfileUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            """
            UPDATE measurement_profiles
            SET profile_name = %s, remarks = %s
            WHERE id = %s AND user_id = %s
            RETURNING id, profile_name, remarks,
                      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
            """,
            (body.profile_name, body.remarks, profile_id, current_user["id"]),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Perfil no encontrado o sin permisos")
        return dict(row)


@router.get("/{profile_id}")
def get_profile(profile_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            "SELECT * FROM measurement_profiles WHERE id = %s AND user_id = %s",
            (profile_id, current_user["id"]),
        )
        profile = cur.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Perfil no encontrado")

        cur.execute(
            """
            SELECT bm.id, bm.template_id, bm.measurement_key, bm.value_cm
            FROM body_measurements bm
            WHERE bm.profile_id = %s
            ORDER BY bm.measurement_key
            """,
            (profile_id,),
        )
        measurements = [dict(r) for r in cur.fetchall()]

    return {**dict(profile), "measurements": measurements}


@router.delete("/{profile_id}", status_code=204)
def delete_profile(profile_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            "DELETE FROM measurement_profiles WHERE id = %s AND user_id = %s",
            (profile_id, current_user["id"]),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Perfil no encontrado")


@router.put("/{profile_id}/measurements")
def upsert_measurements(
    profile_id: str,
    body: BodyMeasurementsUpsert,
    current_user: dict = Depends(get_current_user),
):
    """
    Replaces all body_measurements for (profile_id, template_id) with the
    provided list. Uses INSERT ... ON CONFLICT DO UPDATE for idempotency.
    """
    with get_db() as conn:
        cur = dict_cursor(conn)
        # Verify ownership
        cur.execute(
            "SELECT id FROM measurement_profiles WHERE id = %s AND user_id = %s",
            (profile_id, current_user["id"]),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Perfil no encontrado")

        # Delete existing measurements for this (profile, template) pair
        cur.execute(
            "DELETE FROM body_measurements WHERE profile_id = %s AND template_id = %s",
            (profile_id, body.template_id),
        )

        # Insert new
        for item in body.measurements:
            cur.execute(
                """
                INSERT INTO body_measurements (profile_id, template_id, measurement_key, value_cm)
                VALUES (%s, %s, %s, %s)
                """,
                (profile_id, body.template_id, item.measurement_key, item.value_cm),
            )

    return {"message": "Medidas guardadas", "count": len(body.measurements)}
