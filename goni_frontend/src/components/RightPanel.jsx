import { useState } from "react";
import { patternsApi } from "../api/client";
import IconButton from "./IconButton";

/**
 * Right panel: export options (PDF print, DXF download).
 *
 * Props:
 *   pattern     – current PatternResponse | null
 *   templateId  – number
 *   profileId   – string
 *   user        – current user object
 */
export default function RightPanel({ pattern, templateId, profileId, user }) {
  const [dxfLoading, setDxfLoading] = useState(false);
  const [dxfError, setDxfError] = useState(null);
  const [showPlansModal, setShowPlansModal] = useState(false);

  const handleDxf = async () => {
    if (!templateId || !profileId) return;
    setDxfLoading(true);
    setDxfError(null);
    try {
      if (user?.tier === "guest") {
        // Guest Flow: Fetch measurements from localStorage
        const local = JSON.parse(localStorage.getItem("goni_guest_profiles") || "[]");
        const current = local.find(p => p.id === profileId);
        const measurements = (current?.measurements || [])
          .filter(m => m.template_id === templateId)
          .map(m => ({ measurement_key: m.measurement_key, value_cm: m.value_cm }));
        
        await patternsApi.downloadDxfGuest(templateId, measurements, pattern?.template_name);
      } else {
        // Authenticated Flow
        await patternsApi.downloadDxf(templateId, profileId, pattern?.template_name);
      }
    } catch (err) {
      setDxfError(err.message);
    } finally {
      setDxfLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <aside className="right-panel">
        {/* Export */}
        <div className="panel-section flex-1">
          <div className="section-label">Exportar Molde</div>

          {/* PDF print */}
          <div className="export-card">
            <div className="export-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </div>
            <div className="export-card-info" style={{ flex: 1 }}>
              <div className="export-card-title">Imprimir PDF</div>
              <div className="export-card-desc">Escala 1:1 para patronaje directo</div>
            </div>
            <IconButton 
              icon="print"
              disabled={!pattern}
              onClick={handlePrint}
              title="Imprimir Molde"
            />
          </div>

          {/* DXF download */}
          <div className="export-card">
            <div className="export-card-icon" style={{ background: "linear-gradient(135deg,#9e3d00,#c64f00)" }}>
              <span className="material-symbols-outlined">architecture</span>
            </div>
            <div className="export-card-info" style={{ flex: 1 }}>
              <div className="export-card-title">Descargar DXF</div>
              <div className="export-card-desc">Formato CAD industrial (AutoCAD)</div>
            </div>
            <IconButton 
              icon={dxfLoading ? "hourglass_empty" : "download"}
              disabled={!pattern || !templateId || !profileId || dxfLoading}
              onClick={handleDxf}
              title="Descargar DXF"
            />
          </div>

          {dxfError && <div className="status-msg err">{dxfError}</div>}

          {/* Pro nesting feature callout */}
          <div className="pro-callout">
            <div className="pro-callout-title">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
              Pro: Nesting automático
            </div>
            <p className="pro-callout-desc">
              Optimiza el layout en la tela y reduce desperdicios hasta un 22%.
            </p>
            <button className="btn-outline w-full" disabled>
              Próximamente
            </button>
          </div>
        </div>

        {/* Pattern stats */}
        {pattern && (
          <div className="panel-section border-t-panel">
            <div className="section-label">Estadísticas</div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{pattern.points.length}</div>
                <div className="stat-label">Puntos</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{pattern.paths.length}</div>
                <div className="stat-label">Trazos</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{Object.keys(pattern.technicals || {}).length}</div>
                <div className="stat-label">Técnicas</div>
              </div>
            </div>
          </div>
        )}

      </aside>
    </>
  );
}
