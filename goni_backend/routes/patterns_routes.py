"""
routes/patterns_routes.py
──────────────────────────
GET  /api/templates                              – list pattern templates
GET  /api/patterns/{template_id}/compute/{profile_id}
         – evaluate drafting_logic formulas → return points + paths
GET  /api/patterns/{template_id}/compute/{profile_id}/dxf
         – same computation but returns DXF file download
GET  /api/patterns/{template_id}/required-measurements
         – returns which measurement_keys this template needs
"""

import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
import io

from auth import get_current_user
from database import get_db, dict_cursor
from schemas import PatternResponse
from drafting_engine import evaluate_drafting_logic, extract_points, extract_technicals
from dxf_generator import generate_dxf

router = APIRouter(prefix="/api", tags=["patterns"])


# ─── Templates ────────────────────────────────────────────────────────────────
@router.get("/templates")
def list_templates():
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT id, template_name, description, garment_category FROM pattern_templates ORDER BY id")
        return [dict(r) for r in cur.fetchall()]


@router.get("/templates/{template_id}/required-measurements")
def required_measurements(template_id: int):
    """
    Returns unique measurement_keys referenced in the drafting_logic formulas
    for this template. The frontend uses this to render input fields.
    """
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            "SELECT variable_name, formula, object_type FROM drafting_logic WHERE template_id = %s",
            (template_id,),
        )
        rows = cur.fetchall()

    # The measurement keys are simply those that appear but are NOT defined as
    # a variable_name in drafting_logic (i.e., they come from body_measurements).
    defined = {r["variable_name"] for r in rows}

    import re
    identifier_re = re.compile(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\b")
    referenced: set[str] = set()
    for row in rows:
        for m in identifier_re.finditer(row["formula"]):
            name = m.group(1)
            if name not in defined and not name[0].isupper():
                referenced.add(name)

    # Filter out Python builtins / math funcs we expose
    SAFE_NAMES = {"sqrt", "ceil", "floor", "round", "abs", "min", "max", "pi"}
    measurement_keys = sorted(referenced - SAFE_NAMES)
    return {"template_id": template_id, "measurement_keys": measurement_keys}


# ─── Compute Pattern ──────────────────────────────────────────────────────────
def _load_and_compute(template_id: int, profile_id: str, user_id: str):
    with get_db() as conn:
        cur = dict_cursor(conn)

        # Verify profile ownership
        cur.execute(
            "SELECT id FROM measurement_profiles WHERE id = %s AND user_id = %s",
            (profile_id, user_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Perfil no encontrado")

        # Load body measurements
        cur.execute(
            """
            SELECT measurement_key, value_cm
            FROM body_measurements
            WHERE profile_id = %s AND template_id = %s
            """,
            (profile_id, template_id),
        )
        body_meas = {r["measurement_key"]: float(r["value_cm"]) for r in cur.fetchall()}

        # Load drafting logic
        cur.execute(
            """
            SELECT variable_name, formula, calculation_order, object_type
            FROM drafting_logic
            WHERE template_id = %s
            ORDER BY calculation_order
            """,
            (template_id,),
        )
        logic_rows = [dict(r) for r in cur.fetchall()]

        # Load path definitions
        cur.execute(
            """
            SELECT path_name, node_sequence, is_curve, stroke_color
            FROM path_definitions
            WHERE template_id = %s
            """,
            (template_id,),
        )
        path_rows = [dict(r) for r in cur.fetchall()]

        # Load template name
        cur.execute("SELECT template_name FROM pattern_templates WHERE id = %s", (template_id,))
        tpl = cur.fetchone()
        template_name = tpl["template_name"] if tpl else str(template_id)

    if not logic_rows:
        raise HTTPException(status_code=404, detail="No hay lógica de trazado para este template")

    # Run engine
    namespace = evaluate_drafting_logic(logic_rows, body_meas)
    points = extract_points(namespace)
    technicals = extract_technicals(namespace, logic_rows)

    # Parse path node_sequence (it's JSONB → already a Python list from psycopg2)
    paths = []
    for pr in path_rows:
        seq = pr["node_sequence"]
        if isinstance(seq, str):
            seq = json.loads(seq)
        paths.append({
            "path_name": pr["path_name"] or "",
            "node_sequence": seq,
            "is_curve": pr["is_curve"],
            "stroke_color": pr["stroke_color"] or "#000000",
        })

    return template_name, points, paths, technicals


@router.get("/patterns/{template_id}/compute/{profile_id}", response_model=PatternResponse)
def compute_pattern(
    template_id: int,
    profile_id: str,
    current_user: dict = Depends(get_current_user),
):
    template_name, points, paths, technicals = _load_and_compute(
        template_id, profile_id, current_user["id"]
    )
    return PatternResponse(
        template_id=template_id,
        template_name=template_name,
        points=points,
        paths=paths,
        technicals=technicals,
    )


@router.get("/patterns/{template_id}/compute/{profile_id}/dxf")
def download_dxf(
    template_id: int,
    profile_id: str,
    current_user: dict = Depends(get_current_user),
):
    template_name, points, paths, _ = _load_and_compute(
        template_id, profile_id, current_user["id"]
    )
    dxf_bytes = generate_dxf(points, paths, template_name)
    filename = f"{template_name.replace(' ', '_')}.dxf"
    return StreamingResponse(
        io.BytesIO(dxf_bytes),
        media_type="application/dxf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
