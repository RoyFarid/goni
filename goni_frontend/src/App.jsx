import { useState, useEffect, useMemo } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { patternsApi } from "./api/client";
import LeftPanel from "./components/LeftPanel";
import PatternCanvas from "./components/PatternCanvas";
import RightPanel from "./components/RightPanel";
import Library from "./components/Library";
import LoginPage from "./components/LoginPage";
import IconButton from "./components/IconButton";
import MobileBottomBar from "./components/MobileBottomBar";
import "./index.css";

// ─── Inner app (needs auth context) ──────────────────────────────────────────
function AppInner() {
  const { user, logout, sessionAlert, clearAlert } = useAuth();

  const [activeView, setActiveView] = useState("workspace"); // "workspace" | "library"
  // Mobile drawer state: which panel is open on small screens
  const [activeMobilePanel, setActiveMobilePanel] = useState(null); // "datos" | "exportar" | "biblioteca" | null
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => {
    const saved = localStorage.getItem("goni_selected_template");
    return saved ? Number(saved) : null;
  });
  const [selectedProfileId, setSelectedProfileId] = useState(() => {
    return localStorage.getItem("goni_selected_profile") || null;
  });
  const [pattern, setPattern] = useState(null); // PatternResponse from API
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  // Derived user: memorized to prevent unnecessary re-renders in children
  const activeUser = useMemo(() => {
    return user || (isGuest ? { id: "guest", full_name: "Invitado", tier: "guest" } : null);
  }, [user, isGuest]);


  // Load templates when user (or guest) enters
  useEffect(() => {
    if (!activeUser) {
      setTemplates([]);
      setSelectedTemplateId(null);
      return;
    }
    
    setTemplates([]); // Reset to show loading state if needed
    patternsApi.listTemplates().then((t) => {
      setTemplates(t);
      if (t.length > 0) {
          // If we already have a selection, keep it, otherwise take the first one
          if (!selectedTemplateId) setSelectedTemplateId(t[0].id);
      }
    }).catch(() => { });
  }, [activeUser]);

  // When template or profile changes, save them to localStorage
  useEffect(() => {
    if (selectedTemplateId) localStorage.setItem("goni_selected_template", selectedTemplateId);
  }, [selectedTemplateId]);

  useEffect(() => {
    if (selectedProfileId) localStorage.setItem("goni_selected_profile", selectedProfileId);
  }, [selectedProfileId]);

  // When session expires → open login modal automatically
  useEffect(() => {
    if (sessionAlert) setShowLogin(true);
  }, [sessionAlert]);

  // When a real user logs in, remove guest mode
  useEffect(() => {
    if (user) setIsGuest(false);
  }, [user]);

  // Jump from Library to Workspace with auto-compute
  const handleViewPattern = async (templateId, profileId) => {
    setActiveView("workspace");
    setSelectedTemplateId(templateId);
    setSelectedProfileId(profileId);

    // Auto-generate immediately
    try {
      const data = await patternsApi.compute(templateId, profileId);
      setPattern(data);
    } catch (err) {
      console.error("Auto-compute failed:", err);
    }
  };

  return (
    <div className="app-shell">
      {/* ── Session expired banner ─────────────────────────────────────────── */}
      {sessionAlert && (
        <div className="session-alert">
          <span className="material-symbols-outlined">warning</span>
          <span>{sessionAlert}</span>
          <button onClick={clearAlert} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="topnav">
        <div className="topnav-left">
          <span className="brand">GONI</span>
          <nav className="topnav-links">
            <button
              className={`nav-link ${activeView === "workspace" ? "active" : ""}`}
              onClick={() => setActiveView("workspace")}
            >
              Workspace
            </button>
            <button
              className={`nav-link ${activeView === "library" ? "active" : ""}`}
              onClick={() => setActiveView("library")}
            >
              Biblioteca
            </button>
          </nav>
        </div>

        <div className="topnav-right">
          {user && (
            <span className="tier-badge">
              {user.tier?.toUpperCase() || "GUEST"}
            </span>
          )}

          {user && (
            <IconButton
              icon="workspace_premium"
              text="Mejorar Plan"
              onClick={() => setShowPlansModal(true)}
            />
          )}

          {activeUser ? (
            <div className="user-menu" style={{ position: "relative" }}>
              {/* User name button – toggles dropdown */}
              <button
                id="user-menu-trigger"
                className="user-name-btn"
                onClick={() => setShowUserMenu((v) => !v)}
                aria-haspopup="true"
                aria-expanded={showUserMenu}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
                <span className="user-name-btn-text">{activeUser.full_name || activeUser.email || "Invitado"}</span>
                <span className="material-symbols-outlined user-name-chevron" style={{ fontSize: 16 }}>
                  {showUserMenu ? "expand_less" : "expand_more"}
                </span>
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <>
                  {/* Invisible backdrop to close on outside click */}
                  <div
                    className="user-menu-backdrop"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="user-dropdown" role="menu">
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-avatar">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                      <div>
                        <div className="user-dropdown-name">{activeUser.full_name || "Invitado"}</div>
                        {activeUser.email && <div className="user-dropdown-email">{activeUser.email}</div>}
                      </div>
                    </div>
                    <div className="user-dropdown-divider" />
                    {/* Future items go here */}
                    {!user ? (
                      <button
                        className="user-dropdown-item"
                        role="menuitem"
                        onClick={() => { setShowUserMenu(false); setShowLogin(true); }}
                      >
                        <span className="material-symbols-outlined">login</span>
                        Iniciar Sesión
                      </button>
                    ) : (
                      <button
                        className="user-dropdown-item user-dropdown-item--danger"
                        role="menuitem"
                        onClick={() => { setShowUserMenu(false); logout(); }}
                      >
                        <span className="material-symbols-outlined">logout</span>
                        Cerrar Sesión
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <button className="btn-secondary" onClick={() => setShowLogin(true)}>
              Iniciar Sesión
            </button>
          )}
        </div>
      </header>

      {/* ── Main 3-column layout or Library ──────────────────────────────────── */}
      <main className="main-layout bg-surface text-on-surface antialiased">
        {activeUser ? (
          activeView === "workspace" ? (
            <>
              {/* Desktop: always visible. Mobile: hidden by default */}
              <div className={`desktop-panel left-panel-wrapper ${activeMobilePanel === "datos" ? "mobile-panel-open" : ""}`}>
                <LeftPanel
                  user={activeUser}
                  templates={templates}
                  templateId={selectedTemplateId}
                  onTemplateChange={(newId) => {
                    setSelectedTemplateId(newId);
                    setPattern(null);
                  }}
                  selectedProfileId={selectedProfileId}
                  setProfileId={setSelectedProfileId}
                  onCompute={(data) => setPattern(data)}
                />
              </div>
              <PatternCanvas pattern={pattern} mobileZoomOut={activeMobilePanel !== null} />
              {/* Desktop: always visible. Mobile: hidden by default */}
              <div className={`desktop-panel right-panel-wrapper ${activeMobilePanel === "exportar" ? "mobile-panel-open" : ""}`}>
                <RightPanel
                  pattern={pattern}
                  templateId={selectedTemplateId}
                  profileId={selectedProfileId}
                  user={activeUser}
                />
              </div>
            </>
          ) : (
            <Library
              user={activeUser}
              selectedProfileId={selectedProfileId}
              setProfileId={setSelectedProfileId}
              onViewPattern={(tId, pId) => handleViewPattern(tId, pId)}
              mobileLibraryOpen={activeMobilePanel === "biblioteca"}
            />
          )
        ) : (
          <div className="not-logged">
            <div className="not-logged-card">
              <div className="brand-huge">G</div>
              <h1>GONI</h1>
              <p>Sistema de patronaje digital profesional</p>
              <div className="not-logged-actions">
                <IconButton
                  icon="login"
                  text="Iniciar Sesión"
                  onClick={() => setShowLogin(true)}
                  className="btn-primary large"
                />
                <IconButton
                  icon="person_outline"
                  text="Continuar como Invitado"
                  onClick={() => setIsGuest(true)}
                  className="btn-secondary large"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Mobile Bottom Navigation Bar ──────────────────────────────────── */}
      {activeUser && (
        <MobileBottomBar
          activePanel={activeMobilePanel}
          onToggle={(panel) =>
            setActiveMobilePanel((prev) => (prev === panel ? null : panel))
          }
          activeView={activeView}
          onLibrary={() => {
            // If biblioteca is already active → toggle back to workspace
            if (activeMobilePanel === "biblioteca") {
              setActiveView("workspace");
            } else {
              setActiveView("library");
            }
          }}
        />
      )}

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <footer className="statusbar">
        <div className="statusbar-left">
          <span className="ver-badge">v1.0.0-BETA</span>
          <span>{pattern ? `Proyecto: ${pattern.template_name}` : "Sin proyecto activo"}</span>
        </div>
        <div className="statusbar-right">
          <a href="#" className="statusbar-link">Documentación</a>
        </div>
      </footer>

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

            <div className="plans-grid">
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
                      <p>10 descargas y 10 impresiones mensuales</p>
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
                      <p>30 descargas y 30 impresiones mensuales</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>10 perfiles de medidas</p>
                    </div>
                    <div className="plan-feature-item">
                      <span className="material-symbols-outlined plan-check-icon">check_circle</span>
                      <p>Edición avanzada de curvas Catmull-Rom</p>
                    </div>
                  </div>
                  <button className="plan-btn plan-btn-primary">
                    Mejorar a Trace
                  </button>
                </div>
              </div>

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
                      <p>Descargas, impresiones y perfiles ilimitados</p>
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

      {/* ── Login Modal ───────────────────────────────────────────────────── */}
      {showLogin && (
        <LoginPage 
          onClose={() => { setShowLogin(false); clearAlert(); }} 
          onGuest={() => { setIsGuest(true); setShowLogin(false); }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}