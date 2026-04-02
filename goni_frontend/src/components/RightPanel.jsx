import { useState } from "react";
import { patternsApi } from "../api/client";

/**
 * Right panel: export options (PDF print, DXF download).
 *
 * Props:
 *   pattern     – current PatternResponse | null
 *   templateId  – number
 *   profileId   – string
 */
export default function RightPanel({ pattern, templateId, profileId }) {
  const [dxfLoading, setDxfLoading] = useState(false);
  const [dxfError, setDxfError] = useState(null);

  const handleDxf = async () => {
    if (!templateId || !profileId) return;
    setDxfLoading(true);
    setDxfError(null);
    try {
      await patternsApi.downloadDxf(templateId, profileId, pattern?.template_name);
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
    <aside className="right-panel">
      {/* Workspace info */}
      <div className="panel-section border-b-panel">
        <div className="workspace-header">
          <div className="workspace-avatar">G</div>
          <div>
            <div className="workspace-title">Goni</div>
            <div className="workspace-sub">Workspace activo</div>
          </div>
        </div>
        {pattern && (
          <div className="info-chip">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>checkroom</span>
            {pattern.template_name}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="panel-section flex-1">
        <div className="section-label">Exportar Molde</div>

        {/* PDF print */}
        <div className="export-card">
          <div className="export-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
            <span className="material-symbols-outlined">picture_as_pdf</span>
          </div>
          <div className="export-card-info">
            <div className="export-card-title">Imprimir PDF</div>
            <div className="export-card-desc">Escala 1:1 para patronaje directo</div>
          </div>
          <button
            className="btn-export"
            onClick={handlePrint}
            disabled={!pattern}
            title="Imprimir"
          >
            <span className="material-symbols-outlined">print</span>
          </button>
        </div>

        {/* DXF download */}
        <div className="export-card">
          <div className="export-card-icon" style={{ background: "linear-gradient(135deg,#9e3d00,#c64f00)" }}>
            <span className="material-symbols-outlined">architecture</span>
          </div>
          <div className="export-card-info">
            <div className="export-card-title">Descargar DXF</div>
            <div className="export-card-desc">Formato CAD industrial (AutoCAD)</div>
          </div>
          <button
            className="btn-export"
            onClick={handleDxf}
            disabled={!pattern || !templateId || !profileId || dxfLoading}
            title="Descargar DXF"
          >
            <span className="material-symbols-outlined">
              {dxfLoading ? "hourglass_empty" : "download"}
            </span>
          </button>
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
  );
}
