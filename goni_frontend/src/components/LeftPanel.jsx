import { useState, useEffect } from "react";
import { profilesApi, patternsApi, fabricsApi } from "../api/client";

/**
 * Left panel: measurement profile selector + body measurement inputs.
 *
 * Props:
 *   user          – current authenticated user (reload profiles when changes)
 *   templateId    – currently selected template
 *   onCompute(patternData, profileId) - called when user clicks "Generar Molde"
 */
export default function LeftPanel({ user, templates, templateId, onTemplateChange, selectedProfileId, setProfileId, onCompute }) {
  const [profiles, setProfiles] = useState([]);
  const [requiredKeys, setRequiredKeys] = useState([]);
  const [measurements, setMeasurements] = useState({});
  const [status, setStatus] = useState(null); // {type:'ok'|'err', msg}
  const [loading, setLoading] = useState(false);

  // Fabric State
  const [fabrics, setFabrics] = useState([]);
  const [selectedFabricId, setSelectedFabricId] = useState(() => {
    return localStorage.getItem("goni_selected_fabric") || "";
  });

  // Fashion Adjustments State
  const [easeType, setEaseType] = useState("regular"); // 'slim', 'regular', 'loose'
  const [customEase, setCustomEase] = useState(""); 
  const [customSeam, setCustomSeam] = useState("");


  useEffect(() => {
    if (selectedFabricId) localStorage.setItem("goni_selected_fabric", selectedFabricId);
  }, [selectedFabricId]);

  // Load profiles whenever the logged-in user (or guest) changes
  useEffect(() => {
    if (!user) {
      setProfiles([]);
      return;
    }

    if (user.tier === "guest") {
      // Local management for guests
      const local = JSON.parse(localStorage.getItem("goni_guest_profiles") || "[]");
      if (local.length === 0) {
        const defaultProfile = { id: "guest-p1", profile_name: "Perfil Temporal", measurements: [] };
        local.push(defaultProfile);
        localStorage.setItem("goni_guest_profiles", JSON.stringify(local));
      }
      setProfiles(local);
      
      const currentIsGuest = String(selectedProfileId || "").startsWith("guest-");
      if (!selectedProfileId || !currentIsGuest) setProfileId(local[0].id);

      // Cargar telas publicas (Guests)
      fabricsApi.listPublic().then(setFabrics).catch(() => { });
    } else {
      // API management for registered users
      profilesApi.list().then((p) => {
        setProfiles(p);
        const currentIsGuest = String(selectedProfileId || "").startsWith("guest-");
        if (p.length > 0 && (!selectedProfileId || currentIsGuest)) setProfileId(p[0].id);
      }).catch(() => { });

      // Cargar telas del usuario
      fabricsApi.list().then(setFabrics).catch(() => { });
    }
  }, [user, selectedProfileId, setProfileId]);

  // When template changes, fetch required measurement keys
  useEffect(() => {
    if (!templateId) return;
    patternsApi.requiredMeasurements(templateId).then((data) => {
      setRequiredKeys(data.measurement_keys);
    }).catch(() => { });
  }, [templateId]);

  // When profile or template changes, load its existing measurements
  useEffect(() => {
    if (!selectedProfileId || !templateId) return;

    if (user?.tier === "guest") {
      const local = JSON.parse(localStorage.getItem("goni_guest_profiles") || "[]");
      const current = local.find(p => p.id === selectedProfileId);
      const map = {};
      if (current) {
        (current.measurements || [])
          .filter((m) => m.template_id === templateId)
          .forEach((m) => { map[m.measurement_key] = String(m.value_cm); });
      }
      setMeasurements(map);
    } else {
      profilesApi.get(selectedProfileId).then((data) => {
        const map = {};
        (data.measurements || [])
          .filter((m) => m.template_id === templateId)
          .forEach((m) => { map[m.measurement_key] = String(m.value_cm); });
        setMeasurements(map);
      }).catch(() => { });
    }
  }, [selectedProfileId, templateId, user]);

  const setMeasure = (key, val) => setMeasurements((m) => ({ ...m, [key]: val }));

  const handleSaveAndCompute = async () => {
    if (!selectedProfileId || !templateId) return;
    setLoading(true);
    setStatus(null);
    try {
      const items = requiredKeys
        .filter((k) => measurements[k] !== undefined && measurements[k] !== "")
        .map((k) => ({ measurement_key: k, value_cm: parseFloat(measurements[k]) }));

      let pattern;
      if (user?.tier === "guest") {
        // 1. Save locally
        const local = JSON.parse(localStorage.getItem("goni_guest_profiles") || "[]");
        const idx = local.findIndex(p => p.id === selectedProfileId);
        if (idx !== -1) {
          // Remove old measurements for this template
          const otherMeas = (local[idx].measurements || []).filter(m => m.template_id !== templateId);
          local[idx].measurements = [...otherMeas, ...items.map(it => ({ ...it, template_id: templateId }))];
          localStorage.setItem("goni_guest_profiles", JSON.stringify(local));
          setProfiles([...local]);
        }
        // 2. Compute via guest endpoint
        pattern = await patternsApi.computeGuest(
          templateId, 
          items, 
          selectedFabricId ? Number(selectedFabricId) : null, 
          customSeam !== "" ? parseFloat(customSeam) : null,
          customEase !== "" ? parseFloat(customEase) : null,
          easeType
        );
      } else {
        // Regular flow
        await profilesApi.saveMeasurements(selectedProfileId, templateId, items);
        pattern = await patternsApi.compute(
          templateId, 
          selectedProfileId, 
          selectedFabricId,
          customSeam,
          customEase,
          easeType
        );
      }

      onCompute(pattern, selectedProfileId, selectedFabricId, { customSeam, customEase, easeType });

      setStatus({ type: "ok", msg: "Molde generado ✓" });
    } catch (err) {
      setStatus({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const LABEL_MAP = {
    bust_circ: "Contorno de Busto",
    waist_circ: "Contorno de Cintura",
    hip_circ: "Contorno de Cadera",
    hps_to_waist: "HPS a Cintura",
    waist_to_hip: "Cintura a Cadera",
    garment_length: "Largo de Prenda",
    shoulder_width: "Ancho de Hombro",
    sleeve_length: "Largo de Manga",
    neck_circ: "Contorno de Cuello",
    armhole_depth: "Profundidad de Sisa",
  };

  return (
    <aside className="left-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        <div className="panel-section" style={{ paddingBottom: 10 }}>

        <div className="section-label">Perfil de Medidas</div>

        {/* Profile selector */}
        <div className="field-group">
          <select
            value={selectedProfileId || ""}
            onChange={(e) => setProfileId(e.target.value)}
          >
            <option value="" disabled>Seleccionar perfil…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.profile_name}</option>
            ))}
          </select>
        </div>

        <div className="section-label">Plantilla de Patrón</div>

        {/* Template selector */}
        <div className="field-group">
          <select
            value={templateId || ""}
            onChange={(e) => onTemplateChange(Number(e.target.value))}
          >
            <option value="" disabled>Seleccionar patrón…</option>
            {templates?.map((t) => (
              <option key={t.id} value={t.id}>{t.template_name}</option>
            ))}
          </select>
        </div>

        <div className="section-label">Tela del Proyecto</div>

        {/* Fabric selector */}
        <div className="field-group">
          <select
            value={selectedFabricId}
            onChange={(e) => setSelectedFabricId(e.target.value)}
          >
            <option value="" disabled>Seleccionar tela (Opc.: Tela base)…</option>
            {fabrics.map((f) => (
              <option key={f.id} value={f.id}>{f.name} {f.material ? `(${f.material})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Fabric Specs Pill */}
        {selectedFabricId && fabrics.find(f => f.id === Number(selectedFabricId)) && (() => {
          const f = fabrics.find(fab => fab.id === Number(selectedFabricId));
          return (
            <div style={{
              marginTop: "8px",
              padding: "10px",
              background: "var(--surface-white)",
              border: "1px solid var(--outline-variant)",
              borderRadius: "6px",
              borderLeft: "3px solid var(--primary)",
              boxShadow: "var(--shadow-sm)"
            }}>
              <div style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "800", color: "var(--outline)", marginBottom: "4px" }}>
                Factor de Elasticidad
              </div>
              <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--primary)" }}>swap_horiz</span>
                  <span style={{ fontSize: "11px", fontWeight: "800" }}>{f.stretch_horizontal || 0}%</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--primary)" }}>swap_vert</span>
                  <span style={{ fontSize: "11px", fontWeight: "800" }}>{f.stretch_vertical || 0}%</span>
                </div>
              </div>

              <div style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "800", color: "var(--outline)", marginBottom: "4px" }}>
                Encogimiento
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <span style={{ fontSize: "10px", fontWeight: "600", color: "var(--secondary)" }}>Urdimbre: {f.shrinkage_warp || 0}%</span>
                <span style={{ fontSize: "10px", fontWeight: "600", color: "var(--secondary)" }}>Trama: {f.shrinkage_weft || 0}%</span>
              </div>
            </div>
          );
        })()}

        <div className="section-label" style={{ marginTop: '16px' }}>Ajustes de Confección</div>

        
        {/* Fit Selector (Ease Type) */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--outline)", textTransform: "uppercase", marginBottom: "6px" }}>
            Tipo de Holgura (Fit)
          </div>
          <div style={{ display: "flex", background: "var(--surface-container-low)", padding: "2px", borderRadius: "8px", gap: "2px" }}>
            {['slim', 'regular', 'loose'].map((type) => (
              <button
                key={type}
                onClick={() => { setEaseType(type); setCustomEase(""); }}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: "11px",
                  fontWeight: "700",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: easeType === type && !customEase ? "var(--primary)" : "transparent",
                  color: easeType === type && !customEase ? "white" : "var(--on-surface-variant)",
                  transition: "all 0.2s"
                }}
              >
                {type === 'slim' ? 'Entallado' : type === 'regular' ? 'Normal' : 'Holgado'}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Overrides */}
        <div style={{ display: "flex", gap: "8px" }}>
          <div className="field-group" style={{ flex: 1, marginBottom: 0 }}>
            <label style={{ fontSize: "10px", fontWeight: "700", color: "var(--outline)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
              Holgura (cm)
            </label>
            <div className="meas-input-wrap" style={{ height: "32px" }}>
              <input
                type="number"
                step="0.1"
                placeholder="Auto"
                value={customEase}
                onChange={(e) => setCustomEase(e.target.value)}
                style={{ fontSize: "12px" }}
              />
              <span className="meas-unit" style={{ fontSize: "10px" }}>cm</span>
            </div>
          </div>
          <div className="field-group" style={{ flex: 1, marginBottom: 0 }}>
            <label style={{ fontSize: "10px", fontWeight: "700", color: "var(--outline)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
              Costura (cm)
            </label>
            <div className="meas-input-wrap" style={{ height: "32px" }}>
              <input
                type="number"
                step="0.1"
                placeholder="1.0"
                value={customSeam}
                onChange={(e) => setCustomSeam(e.target.value)}
                style={{ fontSize: "12px" }}
              />
              <span className="meas-unit" style={{ fontSize: "10px" }}>cm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body measurements */}
      <div className="panel-section" style={{ paddingTop: '10px', borderTop: '1px solid var(--outline-variant)' }}>
        <div className="section-label">
          <span>Medidas Corporales</span>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>straighten</span>
        </div>

        {requiredKeys.length === 0 && (
          <p className="hint-text">Selecciona un perfil y tipo de prenda para ver las medidas.</p>
        )}

        <div className="measurements-list">
          {requiredKeys.map((key) => (
            <div className="measurement-row" key={key}>
              <span className="meas-label">
                {LABEL_MAP[key] || key.replace(/_/g, " ")}
              </span>
              <div className="meas-input-wrap">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={measurements[key] ?? ""}
                  onChange={(e) => setMeasure(key, e.target.value)}
                  placeholder="0.0"
                />
                <span className="meas-unit">cm</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Action */}
    <div className="panel-section">
      {status && (
        <div className={`status-msg ${status.type}`}>{status.msg}</div>
      )}
      <button
        className="btn-primary w-full"
        onClick={handleSaveAndCompute}
        disabled={loading || !selectedProfileId}
      >
        <span className="material-symbols-outlined">auto_awesome</span>
        {loading ? "Generando…" : "Generar Molde"}
      </button>
    </div>
  </aside>
);
}
