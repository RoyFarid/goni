"""
pdf_generator.py
─────────────────
Generates a print-ready, true-to-scale (1:1) PDF from a computed pattern.

A body-sized pattern almost never fits on a single home sheet of paper, so
this splits it into a grid of tiles — one per physical page — each printed
at exactly 1cm (pattern) = 1cm (paper), with an overlap band between
neighboring tiles carrying alignment crosses so the sheets can be taped
together afterwards into the full-size molde.

Coordinate conventions:
  - Pattern points (from drafting_engine.extract_points) are in cm, with Y
    growing "downward" the body (same convention the frontend SVG canvas
    uses) — P1_Y=0 at the top (waist), larger Y towards the hem.
  - ReportLab's canvas is in points (1 cm = 28.3465 pt) with Y growing
    upward from the bottom of the page — so every pattern coordinate is
    run through `_transform()` before being drawn.
"""

import io
import math
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.colors import HexColor, black, grey

PT_PER_CM = 72 / 2.54

PAGE_SIZES_CM = {
    "A4": (21.0, 29.7),
    "A3": (29.7, 42.0),
    "LETTER": (21.59, 27.94),
    "LEGAL": (21.59, 35.56),
}

MARGIN_CM = 1.0      # unprintable border most home printers need
OVERLAP_CM = 2.5      # shared strip between adjacent tiles, for taping
ALIGN_GRID_CM = 5.0   # spacing of the alignment cross grid


def _catmull_rom_segments(pts):
    """Mirrors PatternCanvas.jsx's catmullRomPath: yields (p1, cp1, cp2, p2) cubic-bezier legs."""
    segments = []
    n = len(pts)
    for i in range(n - 1):
        p0 = pts[max(0, i - 1)]
        p1 = pts[i]
        p2 = pts[i + 1]
        p3 = pts[min(n - 1, i + 2)]
        cp1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        cp2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        segments.append((p1, cp1, cp2, p2))
    return segments


def _build_point_map(points):
    return {p["name"]: (float(p["x"]), float(p["y"])) for p in points}


def _pattern_bbox(ptmap):
    xs = [p[0] for p in ptmap.values()] or [0.0]
    ys = [p[1] for p in ptmap.values()] or [0.0]
    return min(xs), min(ys), max(xs), max(ys)


def _draw_pattern(c, paths, ptmap, transform, line_scale=1.0):
    """Draws every path + point marker through `transform(x_cm, y_cm) -> (pt_x, pt_y)`."""
    for path in paths:
        pts = [ptmap[n] for n in path["node_sequence"] if n in ptmap]
        if len(pts) < 2:
            continue

        color = HexColor(path.get("stroke_color") or "#000000")
        c.setStrokeColor(color)
        c.setLineWidth(1.1 * line_scale)
        c.setLineCap(1)

        if path.get("is_curve") and len(pts) >= 3:
            for p1, cp1, cp2, p2 in _catmull_rom_segments(pts):
                x1, y1 = transform(*p1)
                cx1, cy1 = transform(*cp1)
                cx2, cy2 = transform(*cp2)
                x2, y2 = transform(*p2)
                c.bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2)
        else:
            path_obj = c.beginPath()
            x0, y0 = transform(*pts[0])
            path_obj.moveTo(x0, y0)
            for p in pts[1:]:
                x, y = transform(*p)
                path_obj.lineTo(x, y)
            c.drawPath(path_obj, stroke=1, fill=0)

    # Point markers + labels (small, technical-drawing style)
    c.setFillColor(black)
    c.setFont("Helvetica", 6 * line_scale)
    for name, (px, py) in ptmap.items():
        x, y = transform(px, py)
        r = 1.6 * line_scale
        c.setFillColor(HexColor("#6366f1"))
        c.circle(x, y, r, stroke=0, fill=1)
        c.setFillColor(black)
        c.drawString(x + r + 1, y + r, name)


def _draw_alignment_grid(c, minx, miny, maxx, maxy, transform):
    """Small '+' registration crosses on a fixed pattern-space grid, so the same
    mark lands at the same physical spot on every tile that includes it — this
    is what lets two printed sheets be lined up correctly."""
    c.setStrokeColor(grey)
    c.setLineWidth(0.5)
    half = 0.25 * PT_PER_CM

    gx = math.floor(minx / ALIGN_GRID_CM) * ALIGN_GRID_CM
    while gx <= maxx:
        gy = math.floor(miny / ALIGN_GRID_CM) * ALIGN_GRID_CM
        while gy <= maxy:
            x, y = transform(gx, gy)
            c.line(x - half, y, x + half, y)
            c.line(x, y - half, x, y + half)
            gy += ALIGN_GRID_CM
        gx += ALIGN_GRID_CM


def generate_tiled_pdf(points, paths, template_name, page_size="A4"):
    page_size = (page_size or "A4").upper()
    page_w_cm, page_h_cm = PAGE_SIZES_CM.get(page_size, PAGE_SIZES_CM["A4"])

    printable_w = page_w_cm - 2 * MARGIN_CM
    printable_h = page_h_cm - 2 * MARGIN_CM
    overlap = min(OVERLAP_CM, printable_w / 3, printable_h / 3)
    step_w = printable_w - overlap
    step_h = printable_h - overlap

    ptmap = _build_point_map(points)
    minx, miny, maxx, maxy = _pattern_bbox(ptmap)
    pad = 0.4  # cm, keeps stroke width from being clipped right at the bbox edge
    minx, miny, maxx, maxy = minx - pad, miny - pad, maxx + pad, maxy + pad
    pattern_w = max(maxx - minx, 0.01)
    pattern_h = max(maxy - miny, 0.01)

    n_cols = max(1, math.ceil(pattern_w / step_w))
    n_rows = max(1, math.ceil(pattern_h / step_h))

    page_w_pt = page_w_cm * PT_PER_CM
    page_h_pt = page_h_cm * PT_PER_CM
    margin_pt = MARGIN_CM * PT_PER_CM

    buf = io.BytesIO()
    c = pdfcanvas.Canvas(buf, pagesize=(page_w_pt, page_h_pt))
    c.setTitle(template_name or "Molde Goni")

    # ── Cover page: overview diagram + assembly instructions ──────────────────
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin_pt, page_h_pt - margin_pt - 18, template_name or "Molde")
    c.setFont("Helvetica", 10)
    c.drawString(margin_pt, page_h_pt - margin_pt - 36,
                 f"Papel: {page_size}  ·  {n_rows * n_cols} hoja(s) ({n_rows} fila(s) x {n_cols} columna(s))  ·  Escala 1:1")

    instructions = [
        "Cómo armar tu molde:",
        "1. Imprime cada hoja en escala 100% / \"Tamaño real\" (NO uses \"Ajustar a página\" en el diálogo de impresión).",
        "2. Cada hoja indica su fila/columna en la esquina. Ordénalas según el diagrama de abajo.",
        "3. Las hojas vecinas comparten un margen con marcas cruz (+); superpón ese margen y alinea las cruces.",
        "4. Pega o une las hojas alineadas y corta el molde completo a tamaño real.",
    ]
    ty = page_h_pt - margin_pt - 60
    for line in instructions:
        c.drawString(margin_pt, ty, line)
        ty -= 14

    # Overview diagram, scaled to fit a box under the instructions
    box_w_pt = page_w_pt - 2 * margin_pt
    box_h_pt = ty - margin_pt - 20
    if box_w_pt > 20 and box_h_pt > 20:
        scale = min(box_w_pt / (pattern_w * PT_PER_CM), box_h_pt / (pattern_h * PT_PER_CM))
        box_x = margin_pt + (box_w_pt - pattern_w * PT_PER_CM * scale) / 2
        box_y = margin_pt + (box_h_pt - pattern_h * PT_PER_CM * scale) / 2

        def overview_transform(px, py, _scale=scale, _bx=box_x, _by=box_y):
            x = _bx + (px - minx) * PT_PER_CM * _scale
            y = _by + (maxy - py) * PT_PER_CM * _scale  # flip Y (pattern is top-down)
            return x, y

        c.saveState()
        _draw_pattern(c, paths, ptmap, overview_transform, line_scale=max(scale, 0.4))

        # Tile grid overlay with sheet numbers
        c.setStrokeColor(HexColor("#94a3b8"))
        c.setLineWidth(0.7)
        c.setFont("Helvetica-Bold", 7)
        for r in range(n_rows):
            for col in range(n_cols):
                x0 = minx + col * step_w
                y0 = miny + r * step_h
                gx0, gy0 = overview_transform(x0, y0 + printable_h)
                gx1, gy1 = overview_transform(x0 + printable_w, y0)
                c.rect(min(gx0, gx1), min(gy0, gy1), abs(gx1 - gx0), abs(gy1 - gy0), stroke=1, fill=0)
                c.setFillColor(HexColor("#475569"))
                c.drawString(min(gx0, gx1) + 3, max(gy0, gy1) - 10, f"H{r + 1}.{col + 1}")
        c.restoreState()

    c.showPage()

    # ── One page per tile, each printed at true 1:1 scale ──────────────────────
    for r in range(n_rows):
        for col in range(n_cols):
            tile_x = minx + col * step_w
            tile_y = miny + r * step_h

            def transform(px, py, _tx=tile_x, _ty=tile_y):
                x = (px - _tx + MARGIN_CM) * PT_PER_CM
                y = page_h_pt - (py - _ty + MARGIN_CM) * PT_PER_CM
                return x, y

            c.saveState()
            clip = c.beginPath()
            clip.rect(margin_pt, margin_pt, printable_w * PT_PER_CM, printable_h * PT_PER_CM)
            c.clipPath(clip, stroke=0, fill=0)

            _draw_alignment_grid(c, tile_x, tile_y, tile_x + printable_w, tile_y + printable_h, transform)
            _draw_pattern(c, paths, ptmap, transform)
            c.restoreState()

            c.setStrokeColor(HexColor("#cbd5e1"))
            c.setLineWidth(0.5)
            c.rect(margin_pt, margin_pt, printable_w * PT_PER_CM, printable_h * PT_PER_CM, stroke=1, fill=0)

            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(black)
            c.drawString(margin_pt, page_h_pt - margin_pt + 4,
                         f"{template_name or 'Molde'}  ·  Hoja fila {r + 1} / col {col + 1}  (de {n_rows}x{n_cols})  ·  {page_size}  ·  Escala 1:1")
            c.showPage()

    c.save()
    return buf.getvalue()
