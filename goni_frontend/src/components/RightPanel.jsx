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
  const [showPlansModal, setShowPlansModal] = useState(false);

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

        {/* Upgrade Plan button */}
        <div className="panel-section" style={{ paddingTop: 12, paddingBottom: 16 }}>
          <button
            className="upgrade-plan-btn"
            onClick={() => setShowPlansModal(true)}
            id="btn-upgrade-plan"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>workspace_premium</span>
            Mejorar Plan
          </button>
        </div>
      </aside>

      {/* Membership Modal */}
      {showPlansModal && (
        <div
          className="plans-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowPlansModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Planes de membresía"
        >
          <div className="plans-modal">
            {/* Modal header */}
            <div className="plans-modal-header">
              <div>
                <div className="plans-modal-title">Elige tu plan</div>
                <div className="plans-modal-subtitle">
                  Selecciona la membresía que mejor se adapte a tu flujo de trabajo
                </div>
              </div>
              <button
                className="plans-modal-close"
                onClick={() => setShowPlansModal(false)}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Pricing grid */}
            <div className="plans-grid">
              {/* Tier 1: GONI NODE */}
              <div className="plan-card">
                <div className="plan-card-inner">
                  <div className="plan-tier-row">
                    <span className="plan-tier-name">NODE</span>
                    <span className="plan-tier-dot" />
                    <span className="plan-tier-level">Básico</span>
                  </div>
                  <h2 className="plan-name">GONI NODE</h2>
                  <p className="plan-tagline">"Prueba el poder de la creación de patrones digitales"</p>
                  <div className="plan-price-row">
                    <span className="plan-price">$0</span>
                    <span className="plan-price-period">/ mo</span>
                  </div>
                  <p className="plan-price-desc">Perfecto para Estudiantes y Hobbistas.</p>
                  <div className="plan-features">
                    <p className="plan-features-label">Capacidades</p>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Solo moldes básicos</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>10 descargas mensuales</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>2 perfiles de medidas</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Motor paramétrico estándar</p>
                    </div>
                  </div>
                  <button className="plan-btn plan-btn-secondary">
                    Comenzar Gratis
                  </button>
                </div>
              </div>

              {/* Tier 2: GONI TRACE (Recommended) */}
              <div className="plan-card plan-card--featured">
                <div className="plan-card-inner">
                  <div className="plan-badge">Más Popular</div>
                  <div className="plan-tier-row">
                    <span className="plan-tier-name" style={{ color: "var(--primary)" }}>TRACE</span>
                    <span className="plan-tier-dot plan-tier-dot--primary" />
                    <span className="plan-tier-level">Profesional</span>
                  </div>
                  <h2 className="plan-name">GONI TRACE</h2>
                  <p className="plan-tagline">"Digitaliza tu taller con acceso completo"</p>
                  <div className="plan-price-row">
                    <span className="plan-price">$5</span>
                    <span className="plan-price-period">/ mo</span>
                  </div>
                  <p className="plan-price-desc">Patronistas independientes y sastres.</p>
                  <div className="plan-features">
                    <p className="plan-features-label">Core Tech</p>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Biblioteca completa (Vestidos, Blazers, etc.)</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>30 descargas mensuales</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>10 perfiles de medidas</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Edición avanzada de curvas Catmull-Rom</p>
                    </div>
                    <div className="plan-feature-item" style={{ opacity: 0.6 }}>
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Sincronización en la nube</p>
                    </div>
                  </div>
                  <button className="plan-btn plan-btn-primary">
                    Mejorar a Trace
                  </button>
                </div>
              </div>

              {/* Tier 3: GONI BLOCK */}
              <div className="plan-card">
                <div className="plan-card-inner">
                  <div className="plan-tier-row">
                    <span className="plan-tier-name">BLOCK</span>
                    <span className="plan-tier-dot" />
                    <span className="plan-tier-level">Industrial</span>
                  </div>
                  <h2 className="plan-name">GONI BLOCK</h2>
                  <p className="plan-tagline">"La herramienta definitiva para producción industrial"</p>
                  <div className="plan-price-row">
                    <span className="plan-price">$25</span>
                    <span className="plan-price-period">/ mo</span>
                  </div>
                  <p className="plan-price-desc">Fábricas y producción en alto volumen.</p>
                  <div className="plan-features">
                    <p className="plan-features-label">Suite Enterprise</p>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Biblioteca completa + Acceso anticipado</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Descargas y perfiles ilimitados</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Auto-Nesting y Automatización de Grading</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Soporte prioritario y acceso API</p>
                    </div>
                  </div>
                  <button className="plan-btn plan-btn-secondary">
                    Mejorar a Block
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
