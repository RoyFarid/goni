import { useState, useEffect } from "react";
import { profilesApi, patternsApi } from "../api/client";

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
  const [measurements, setMeasurements] = useState({}); // key → value string
  const [status, setStatus] = useState(null); // {type:'ok'|'err', msg}
  const [loading, setLoading] = useState(false);

  // Load profiles whenever the logged-in user changes
  useEffect(() => {
    if (!user) {
      setProfiles([]);
      return;
    }
    profilesApi.list().then((p) => {
      setProfiles(p);
      // Auto-select first if none selected
      if (p.length > 0 && !selectedProfileId) setProfileId(p[0].id);
    }).catch(() => {});
  }, [user]);

  // When template changes, fetch required measurement keys
  useEffect(() => {
    if (!templateId) return;
    patternsApi.requiredMeasurements(templateId).then((data) => {
      setRequiredKeys(data.measurement_keys);
    }).catch(() => {});
  }, [templateId]);

  // When profile or template changes, load its existing measurements
  useEffect(() => {
    if (!selectedProfileId || !templateId) return;
    profilesApi.get(selectedProfileId).then((data) => {
      const map = {};
      (data.measurements || [])
        .filter((m) => m.template_id === templateId)
        .forEach((m) => { map[m.measurement_key] = String(m.value_cm); });
      setMeasurements(map);
    }).catch(() => {});
  }, [selectedProfileId, templateId]);

  const setMeasure = (key, val) => setMeasurements((m) => ({ ...m, [key]: val }));

  const handleSaveAndCompute = async () => {
    if (!selectedProfileId || !templateId) return;
    setLoading(true);
    setStatus(null);
    try {
      const items = requiredKeys
        .filter((k) => measurements[k] !== undefined && measurements[k] !== "")
        .map((k) => ({ measurement_key: k, value_cm: parseFloat(measurements[k]) }));

      await profilesApi.saveMeasurements(selectedProfileId, templateId, items);
      const pattern = await patternsApi.compute(templateId, selectedProfileId);
      onCompute(pattern, selectedProfileId);
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
    <aside className="left-panel">
      <div className="panel-section" style={{ paddingBottom: 0 }}>
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
      </div>

      {/* Body measurements */}
      <div className="panel-section flex-1 overflow-y-auto" style={{ paddingTop: '10px' }}>
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
