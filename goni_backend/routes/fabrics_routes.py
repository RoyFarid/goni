from fastapi import APIRouter, Depends, HTTPException
from typing import List
from database import get_db, dict_cursor
from auth import get_current_user
from schemas import FabricCreate

router = APIRouter(prefix="/api/fabrics", tags=["fabrics"])

@router.get("")
def list_fabrics(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = dict_cursor(conn)
        # We can list global fabrics (user_id IS NULL) and user's fabrics
        cur.execute(
            """
            SELECT * FROM fabrics 
            WHERE user_id IS NULL OR user_id = %s
            ORDER BY name
            """,
            (current_user["id"],)
        )
        return [dict(r) for r in cur.fetchall()]

@router.get("/public")
def list_public_fabrics():
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT * FROM fabrics WHERE user_id IS NULL ORDER BY name")
        return [dict(r) for r in cur.fetchall()]

@router.post("")
def create_fabric(fabric: FabricCreate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            """
            INSERT INTO fabrics
            (name, material, width_cm, weight_gsm, stretch_horizontal, stretch_vertical, shrinkage_warp, shrinkage_weft, inclination, user_id, color_hex, default_seam_cm)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                fabric.name, fabric.material, fabric.width_cm, fabric.weight_gsm,
                fabric.stretch_horizontal, fabric.stretch_vertical, fabric.shrinkage_warp,
                fabric.shrinkage_weft, fabric.inclination, current_user["id"],
                fabric.color_hex, fabric.default_seam_cm
            )
        )
        new_fabric = dict(cur.fetchone())
        return new_fabric


@router.delete("/{fabric_id}", status_code=204)
def delete_fabric(fabric_id: int, current_user: dict = Depends(get_current_user)):
    """Only the owner can delete their own fabric. Global fabrics (user_id IS NULL) can't be deleted here."""
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            "DELETE FROM fabrics WHERE id = %s AND user_id = %s",
            (fabric_id, current_user["id"]),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tela no encontrada o sin permisos")
