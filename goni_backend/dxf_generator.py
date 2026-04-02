"""
dxf_generator.py
─────────────────
Generates a DXF file from computed pattern points + path definitions.
Extends the logic from the original generator.py using ezdxf.

path_def example:
    {
        "path_name": "Side Seam",
        "node_sequence": ["P1", "P2", "P3"],
        "is_curve": False,
        "stroke_color": "#000000"
    }
"""

import io
import ezdxf
from ezdxf.colors import aci2rgb


# ACI (AutoCAD Color Index) approximations for hex colors
_COLOR_MAP = {
    "#000000": 7,   # white/black
    "#f43f5e": 1,   # red → ACI red
    "#0f172a": 7,
    "#6366f1": 5,   # blue
}


def _hex_to_aci(hex_color: str) -> int:
    return _COLOR_MAP.get(hex_color.lower(), 7)


def generate_dxf(
    points: list[dict],      # [{"name":"P1","x":0.0,"y":0.0}, ...]
    paths: list[dict],       # path_definitions rows
    template_name: str = "Pattern",
) -> bytes:
    """
    Returns the raw bytes of a DXF R2010 file.
    points: computed from drafting_engine.extract_points()
    paths:  from path_definitions table
    """
    doc = ezdxf.new("R2010")
    msp = doc.modelspace()

    # Build lookup: name → (x, y). We invert Y because SVG is +Y down, CAD is +Y up
    coord: dict[str, tuple[float, float]] = {
        p["name"]: (float(p["x"]), -float(p["y"])) for p in points
    }

    for path in paths:
        seq = path["node_sequence"]   # list of point names, e.g. ["P1","P2"]
        is_curve = path.get("is_curve", False)
        color = _hex_to_aci(path.get("stroke_color", "#000000"))

        # Resolve names to coordinates
        pts = []
        for name in seq:
            if name in coord:
                pts.append(coord[name])

        if len(pts) < 2:
            continue

        if not is_curve:
            msp.add_lwpolyline(pts, dxfattribs={"color": color})
        else:
            # Use spline (passes through all control points)
            # ezdxf spline needs at least 3 points
            if len(pts) >= 3:
                # Convert 2D → 3D for spline
                pts3d = [(x, y, 0) for x, y in pts]
                msp.add_spline(pts3d, dxfattribs={"color": color})
            else:
                msp.add_lwpolyline(pts, dxfattribs={"color": color})

    # Write to memory buffer
    buf = io.StringIO()
    doc.write(buf)
    return buf.getvalue().encode("utf-8")
