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
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
import io
from usage_service import log_usage, get_usage_count, get_plan_limits
from schemas import PatternResponse, GuestComputeRequest

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

    # Filter out Python builtins / math funcs we expose + global fashion variables
    SAFE_NAMES = {"sqrt", "ceil", "floor", "round", "abs", "min", "max", "pi", "seam", "ease"}
    measurement_keys = sorted(referenced - SAFE_NAMES)
    return {"template_id": template_id, "measurement_keys": measurement_keys}


# ─── Compute Pattern ──────────────────────────────────────────────────────────
def _get_template_data(template_id: int):
    with get_db() as conn:
        cur = dict_cursor(conn)
        
        # Template and logic
        cur.execute("SELECT template_name, ease_slim_cm, ease_regular_cm, ease_loose_cm FROM pattern_templates WHERE id = %s", (template_id,))
        tpl = cur.fetchone()
        if not tpl: raise HTTPException(status_code=404, detail="Template not found")
        
        cur.execute("SELECT variable_name, formula, calculation_order, object_type FROM drafting_logic WHERE template_id = %s ORDER BY calculation_order", (template_id,))
        logic_rows = [dict(r) for r in cur.fetchall()]
        
        cur.execute("SELECT path_name, node_sequence, is_curve, stroke_color FROM path_definitions WHERE template_id = %s", (template_id,))
        path_rows = [dict(r) for r in cur.fetchall()]
        
    return dict(tpl), logic_rows, path_rows

def _run_computation(logic_rows, body_meas, path_rows, template_name):
    if not logic_rows:
        raise HTTPException(status_code=404, detail="No logic found for template")
        
    # Evaluate math engine
    namespace = evaluate_drafting_logic(logic_rows, body_meas)
    points = extract_points(namespace)
    technicals = extract_technicals(namespace, logic_rows)
    
    # Process paths
    paths = []
    for pr in path_rows:
        seq = pr["node_sequence"]
        if isinstance(seq, str): seq = json.loads(seq)
        paths.append({
            "path_name": pr["path_name"] or "",
            "node_sequence": seq,
            "is_curve": pr["is_curve"],
            "stroke_color": pr["stroke_color"] or "#000000",
        })
    return template_name, points, paths, technicals

def _load_and_compute(
    template_id: int, 
    profile_id: str, 
    user_id: str, 
    fabric_id: int = None,
    custom_seam: float = None,
    custom_ease: float = None,
    ease_type: str = "regular"
):
    with get_db() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT id FROM measurement_profiles WHERE id = %s AND user_id = %s", (profile_id, user_id))
        if not cur.fetchone(): raise HTTPException(status_code=404, detail="Perfil not found")
        
        cur.execute("SELECT measurement_key, value_cm FROM body_measurements WHERE profile_id = %s AND template_id = %s", (profile_id, template_id))
        body_meas = {r["measurement_key"]: float(r["value_cm"]) for r in cur.fetchall()}
        
        # 1. Fetch Template info (presets)
        tpl, logic, paths = _get_template_data(template_id)

        # 2. Fabric Logic & Defaults
        resolved_seam = 1.0 # Standard fallback
        resolved_ease_type = ease_type or "regular"

        # Inject fabric modifiers
        body_meas["fabric_stretch_h"] = 1.0
        body_meas["fabric_stretch_v"] = 1.0
        body_meas["fabric_shrinkage_warp"] = 1.0
        body_meas["fabric_shrinkage_weft"] = 1.0
        
        if fabric_id:
            cur.execute("SELECT stretch_horizontal, stretch_vertical, shrinkage_warp, shrinkage_weft, default_seam_cm FROM fabrics WHERE id = %s AND (user_id IS NULL OR user_id = %s)", (fabric_id, user_id))
            fab = cur.fetchone()
            if fab:
                # Elongation reduces pattern size (1 - X%)
                body_meas["fabric_stretch_h"] = 1.0 - (float(fab["stretch_horizontal"] or 0) / 100.0)
                body_meas["fabric_stretch_v"] = 1.0 - (float(fab["stretch_vertical"] or 0) / 100.0)
                # Shrinkage increases pattern size (1 + X%)
                body_meas["fabric_shrinkage_warp"] = 1.0 + (float(fab["shrinkage_warp"] or 0) / 100.0)
                body_meas["fabric_shrinkage_weft"] = 1.0 + (float(fab["shrinkage_weft"] or 0) / 100.0)
                resolved_seam = float(fab["default_seam_cm"] or 1.0)

            # Check for Expert Rules (fabric_pattern_config)
            cur.execute("SELECT suggested_seam, suggested_ease_type FROM fabric_pattern_config WHERE fabric_id = %s AND template_id = %s", (fabric_id, template_id))
            config = cur.fetchone()
            if config:
                if config["suggested_seam"] is not None:
                    resolved_seam = float(config["suggested_seam"])
                if not ease_type and config["suggested_ease_type"]:
                    resolved_ease_type = config["suggested_ease_type"]

        # 3. Final overrides (from parameters)
        # Costura
        if custom_seam is not None:
            resolved_seam = custom_seam
        
        # Holgura
        if custom_ease is not None:
            resolved_ease = custom_ease
        else:
            # Look up preset in template
            preset_key = f"ease_{resolved_ease_type}_cm"
            resolved_ease = float(tpl.get(preset_key, 2.0))

        # Inject into formula context
        body_meas["seam"] = resolved_seam
        body_meas["ease"] = resolved_ease

    return _run_computation(logic, body_meas, paths, tpl["template_name"])


@router.get("/patterns/{template_id}/compute/{profile_id}", response_model=PatternResponse)
def compute_pattern(
    template_id: int,
    profile_id: str,
    request: Request,
    fabric_id: int = None,
    custom_seam: float = None,
    custom_ease: float = None,
    ease_type: str = "regular",
    current_user: dict = Depends(get_current_user),
):
    template_name, points, paths, technicals = _load_and_compute(
        template_id, profile_id, current_user["id"], 
        fabric_id, custom_seam, custom_ease, ease_type
    )
    
    # Registro de uso (Registrado - compute)
    log_usage(
        action_type="compute",
        user_id=current_user["id"],
        template_id=template_id,
        user_agent=request.headers.get("user-agent")
    )
    
    return PatternResponse(
        template_id=template_id,
        template_name=template_name,
        points=points,
        paths=paths,
        technicals=technicals,
    )


@router.get("/patterns/{template_id}/compute/{profile_id}/dxf")
def export_dxf(
    template_id: int, 
    profile_id: str, 
    fabric_id: int = None,
    custom_seam: float = None,
    custom_ease: float = None,
    ease_type: str = "regular",
    user: dict = Depends(get_current_user),
    request: Request = None
):
    # Dynamic Limit Check
    plan_id = user.get("tier", "node")
    limits = get_plan_limits(plan_id)
    limit = limits["max_downloads_month"] if limits else 10
    
    count = get_usage_count(action_type="export_dxf", user_id=user["id"])
    if count >= limit:
        raise HTTPException(status_code=403, detail=f"Has alcanzado tu límite de {limit} descargas mensuales.")
    
    name, points, paths, _ = _load_and_compute(
        template_id, profile_id, user["id"], 
        fabric_id, custom_seam, custom_ease, ease_type
    )
    
    # Registro de uso (Registrado - export_dxf)
    log_usage(
        action_type="export_dxf",
        user_id=user["id"],
        template_id=template_id,
        user_agent=request.headers.get("user-agent")
    )
    
    dxf_bytes = generate_dxf(points, paths, name)
    filename = f"{name.replace(' ', '_')}.dxf"
    return StreamingResponse(
        io.BytesIO(dxf_bytes),
        media_type="application/dxf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── Guest Routes ─────────────────────────────────────────────────────────────

@router.post("/patterns/{template_id}/compute-guest", response_model=PatternResponse)
def compute_guest(template_id: int, data: GuestComputeRequest, request: Request):
    tpl, logic, paths = _get_template_data(template_id)
    body_meas = {m.measurement_key: m.value_cm for m in data.measurements}
    
    # Resolve holgura/costura for guest (simplified)
    body_meas["seam"] = data.custom_seam if data.custom_seam is not None else 1.0
    
    if data.custom_ease is not None:
        body_meas["ease"] = data.custom_ease
    else:
        preset_key = f"ease_{data.ease_type or 'regular'}_cm"
        body_meas["ease"] = float(tpl.get(preset_key, 2.0))
    
    res_name, points, res_paths, technicals = _run_computation(logic, body_meas, paths, tpl["template_name"])
    
    # Log (Unlimited compute)
    log_usage(action_type="compute", guest_id=data.guest_id, template_id=template_id, user_agent=request.headers.get("user-agent"))
    
    return PatternResponse(
        template_id=template_id,
        template_name=res_name,
        points=points,
        paths=res_paths,
        technicals=technicals
    )

@router.post("/patterns/{template_id}/export-guest/dxf")
def export_dxf_guest(template_id: int, data: GuestComputeRequest, request: Request):
    # Dynamic Limit Check (Guest Plan)
    limits = get_plan_limits("guest")
    limit = limits["max_downloads_month"] if limits else 10
    
    count = get_usage_count(action_type="export_dxf", guest_id=data.guest_id)
    if count >= limit:
        raise HTTPException(status_code=403, detail=f"Has alcanzado el límite de {limit} descargas gratuitas.")
    
    name, logic, paths = _get_template_data(template_id)
    body_meas = {m.measurement_key: m.value_cm for m in data.measurements}
    res_name, points, res_paths, _ = _run_computation(logic, body_meas, paths, name)
    
    # Log
    log_usage(action_type="export_dxf", guest_id=data.guest_id, template_id=template_id, user_agent=request.headers.get("user-agent"))
    
    dxf_bytes = generate_dxf(points, res_paths, res_name)
    filename = f"{res_name.replace(' ', '_')}.dxf"
    return StreamingResponse(
        io.BytesIO(dxf_bytes),
        media_type="application/dxf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
