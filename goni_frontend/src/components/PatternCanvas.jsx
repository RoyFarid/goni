import { useState, useRef, useEffect } from "react";

/**
 * PatternCanvas – renders SVG from computed pattern data.
 *
 * Props:
 *   pattern      – PatternResponse from API { points, paths, technicals, template_name }
 *   mobileZoomOut – boolean hint to zoom out when a panel is open
 */
export default function PatternCanvas({ pattern, mobileZoomOut }) {
  const SCALE = 10; // 1 cm = 10 SVG units
  const PADDING = 40;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState([]); // up to 2 {name,x,y}
  const svgRef = useRef(null);

  // Touch gesture state kept in a ref to avoid stale closure issues in event handlers
  const touchState = useRef({
    lastDist: null,    // last pinch distance (null when no pinch)
    lastMid: null,     // last pinch midpoint
    lastPan: null,     // pan snapshot at pinch start
    lastZoom: null,    // zoom snapshot at pinch start
    singleStart: null, // {x, y} offset for single-finger drag
  });

  // Reset pan/zoom when pattern changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMeasurePts([]);
  }, [pattern]);

  if (!pattern) {
    return (
      <section className="canvas-section">
        <div className="canvas-empty">
          <span className="material-symbols-outlined canvas-empty-icon">texture</span>
          <p>Ingresa las medidas y genera el molde</p>
          <p className="hint-text">El trazado se calculará en tiempo real</p>
        </div>
      </section>
    );
  }

  const { points, paths, technicals, template_name } = pattern;

  // Build point lookup: name → {x, y} in SVG units
  const ptMap = {};
  points.forEach((p) => {
    ptMap[p.name] = { x: p.x * SCALE + PADDING, y: p.y * SCALE + PADDING };
  });

  // ViewBox auto-fit
  const xs = Object.values(ptMap).map((p) => p.x);
  const ys = Object.values(ptMap).map((p) => p.y);
  const minX = Math.min(...xs, 0) - PADDING;
  const minY = Math.min(...ys, 0) - PADDING;
  const maxX = Math.max(...xs, 0) + PADDING;
  const maxY = Math.max(...ys, 0) + PADDING;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  // ── Catmull-Rom curve helper ───────────────────────────────────────────────
  const catmullRomPath = (ptList) => {
    if (ptList.length < 2) return "";
    if (ptList.length === 2) {
      const a = ptList[0], b = ptList[1];
      return `M ${a.x},${a.y} L ${b.x},${b.y}`;
    }
    let d = `M ${ptList[0].x},${ptList[0].y}`;
    for (let i = 0; i < ptList.length - 1; i++) {
      const p0 = ptList[Math.max(0, i - 1)];
      const p1 = ptList[i];
      const p2 = ptList[i + 1];
      const p3 = ptList[Math.min(ptList.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const buildPath = (path) => {
    const ptList = path.node_sequence.map((n) => ptMap[n]).filter(Boolean);
    if (ptList.length < 2) return null;
    if (path.is_curve) return catmullRomPath(ptList);
    return `M ${ptList.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  };

  // ── Zoom button controls ───────────────────────────────────────────────────
  const zoomIn    = () => setZoom((z) => Math.min(z + 0.25, 5));
  const zoomOut   = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // ── Mouse: pan ────────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (measureMode) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onMouseMove = (e) => {
    if (!dragging || !dragStart) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  // ── Mouse wheel: zoom ─────────────────────────────────────────────────────
  const onWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(0.25, z - e.deltaY * 0.001)));
  };

  // ── Touch helpers ─────────────────────────────────────────────────────────
  const getTouchDist = (t1, t2) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const getTouchMid = (t1, t2) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  // ── Touch: single-finger pan + two-finger pinch-to-zoom ───────────────────
  const onTouchStart = (e) => {
    if (measureMode) return;

    if (e.touches.length === 2) {
      // Pinch start – snapshot current state
      touchState.current.lastDist = getTouchDist(e.touches[0], e.touches[1]);
      touchState.current.lastMid  = getTouchMid(e.touches[0], e.touches[1]);
      touchState.current.lastPan  = { ...pan };
      touchState.current.lastZoom = zoom;
      touchState.current.singleStart = null; // cancel single-finger mode
    } else if (e.touches.length === 1) {
      // Single-finger pan start
      touchState.current.singleStart = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
      touchState.current.lastDist = null;
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault(); // block browser scroll / overscroll

    if (e.touches.length === 2 && touchState.current.lastDist !== null) {
      // ── Two-finger pinch ──────────────────────────────────────────────────
      const newDist  = getTouchDist(e.touches[0], e.touches[1]);
      const scale    = newDist / touchState.current.lastDist;
      const newZoom  = Math.min(5, Math.max(0.25, touchState.current.lastZoom * scale));

      // Pan tracks midpoint movement so the pinch center stays fixed
      const mid    = getTouchMid(e.touches[0], e.touches[1]);
      const prevMid = touchState.current.lastMid;
      const newPan  = {
        x: touchState.current.lastPan.x + (mid.x - prevMid.x),
        y: touchState.current.lastPan.y + (mid.y - prevMid.y),
      };

      setZoom(newZoom);
      setPan(newPan);

    } else if (e.touches.length === 1 && touchState.current.singleStart) {
      // ── Single-finger pan ─────────────────────────────────────────────────
      setPan({
        x: e.touches[0].clientX - touchState.current.singleStart.x,
        y: e.touches[0].clientY - touchState.current.singleStart.y,
      });
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) touchState.current.lastDist = null;
    if (e.touches.length === 0) touchState.current.singleStart = null;
  };

  // ── Measure mode ──────────────────────────────────────────────────────────
  const handlePointClick = (pt) => {
    if (!measureMode) return;
    setMeasurePts((prev) => {
      if (prev.length >= 2) return [pt];
      return [...prev, pt];
    });
  };

  const measureDistance = () => {
    if (measurePts.length < 2) return null;
    const dx = measurePts[1].x - measurePts[0].x;
    const dy = measurePts[1].y - measurePts[0].y;
    return (Math.sqrt(dx * dx + dy * dy) / SCALE).toFixed(2);
  };

  return (
    <section className="canvas-section">
      {/* Toolbar */}
      <div className="canvas-toolbar">
        <button className="tool-btn" onClick={zoomIn} title="Acercar">
          <span className="material-symbols-outlined">zoom_in</span>
        </button>
        <button className="tool-btn" onClick={zoomOut} title="Alejar">
          <span className="material-symbols-outlined">zoom_out</span>
        </button>
        <button className="tool-btn" onClick={zoomReset} title="Restablecer vista">
          <span className="material-symbols-outlined">fit_screen</span>
        </button>
        <div className="toolbar-divider" />
        <button
          className={`tool-btn ${measureMode ? "active" : ""}`}
          onClick={() => { setMeasureMode((m) => !m); setMeasurePts([]); }}
          title="Medir entre puntos"
        >
          <span className="material-symbols-outlined">square_foot</span>
        </button>
        <button className="tool-btn" title="Grilla">
          <span className="material-symbols-outlined">grid_on</span>
        </button>
        <div className="zoom-indicator">{Math.round(zoom * 100)}%</div>
      </div>

      {/* SVG Canvas */}
      <div
        className="canvas-area"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          cursor: measureMode ? "crosshair" : dragging ? "grabbing" : "grab",
          touchAction: "none", // hand over all touch control to our handlers
        }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.1s ease",
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
            width={vbW}
            height={vbH}
            style={{ display: "block" }}
          >
            {/* Dotted grid background */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="0.5" cy="0.5" r="0.5" fill="#c1c6d7" opacity="0.5" />
              </pattern>
            </defs>
            <rect x={minX} y={minY} width={vbW} height={vbH} fill="url(#grid)" />

            {/* Paths */}
            {paths.map((path, i) => {
              const d = buildPath(path);
              if (!d) return null;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={path.is_curve ? "#f43f5e" : "#0f172a"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Measure line */}
            {measurePts.length === 2 && (
              <line
                x1={measurePts[0].x} y1={measurePts[0].y}
                x2={measurePts[1].x} y2={measurePts[1].y}
                stroke="var(--primary)" strokeWidth="1" strokeDasharray="3 2"
              />
            )}

            {/* Points */}
            {points.map((p) => {
              const sv = ptMap[p.name];
              if (!sv) return null;
              const isMeasured = measurePts.some((mp) => mp.name === p.name);
              return (
                <g
                  key={p.name}
                  style={{ cursor: measureMode ? "pointer" : "default" }}
                  onClick={() => handlePointClick({ name: p.name, ...sv })}
                >
                  <circle
                    cx={sv.x} cy={sv.y} r={measureMode ? 5 : 3}
                    fill={isMeasured ? "var(--primary)" : "var(--primary-container)"}
                    stroke="white" strokeWidth="1"
                  />
                  <text
                    x={sv.x + 6} y={sv.y + 4}
                    fontSize="7" fill="#44474a" fontFamily="monospace" fontWeight="bold"
                  >
                    {p.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="canvas-footer">
        <span className="font-semibold text-primary">{template_name}</span>
        <span>{points.length} puntos · {paths.length} trazos</span>
        {measureMode && (
          <span className="measure-result">
            {measurePts.length < 2
              ? `📐 Clic en ${measurePts.length === 0 ? "punto A" : "punto B"}`
              : `📐 Distancia: ${measureDistance()} cm`}
          </span>
        )}
      </div>

      {/* Live Specs overlay */}
      {technicals && Object.keys(technicals).length > 0 && (
        <div className="live-specs-card">
          <div className="live-specs-header">
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--primary)" }}>analytics</span>
            <span>Live Specs</span>
          </div>
          {Object.entries(technicals).slice(0, 6).map(([k, v]) => (
            <div key={k} className="live-spec-row">
              <span>{k.replace(/_/g, " ")}</span>
              <span className="font-bold">{Number(v).toFixed(1)} cm</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
