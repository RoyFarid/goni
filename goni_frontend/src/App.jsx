import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { patternsApi } from "./api/client";
import LeftPanel from "./components/LeftPanel";
import PatternCanvas from "./components/PatternCanvas";
import RightPanel from "./components/RightPanel";
import LoginPage from "./components/LoginPage";
import "./index.css";

// ─── Inner app (needs auth context) ──────────────────────────────────────────
function AppInner() {
  const { user, logout } = useAuth();

  const [showLogin, setShowLogin] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [pattern, setPattern] = useState(null); // PatternResponse from API

  // Load templates when user logs in
  useEffect(() => {
    if (!user) return;
    patternsApi.listTemplates().then((t) => {
      setTemplates(t);
      if (t.length > 0) setSelectedTemplateId(t[0].id);
    }).catch(() => { });
  }, [user]);

  // Wrap LeftPanel compute so RightPanel knows the current profile
  const handleCompute = (patternData, profileId) => {
    setPattern(patternData);
    if (profileId) setSelectedProfileId(profileId);
  };

  return (
    <div className="app-shell">
      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="topnav">
        <div className="topnav-left">
          <span className="brand">Goni</span>
          <nav className="topnav-links">
            <a href="#" className="nav-link active">Workspace</a>
            <a href="#" className="nav-link">Biblioteca</a>
            <a href="#" className="nav-link">Comunidad</a>
          </nav>
        </div>

        <div className="topnav-right">
          {/* Template selector */}
          {user && templates.length > 0 && (
            <select
              className="template-select"
              value={selectedTemplateId || ""}
              onChange={(e) => {
                setSelectedTemplateId(Number(e.target.value));
                setPattern(null);
              }}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>
          )}

          <span className="tier-badge">
            {user ? user.tier?.toUpperCase() : "GUEST"}
          </span>

          {user ? (
            <div className="user-menu">
              <span className="user-name">{user.full_name || user.email}</span>
              <button className="btn-secondary" onClick={logout}>Salir</button>
            </div>
          ) : (
            <button className="btn-secondary" onClick={() => setShowLogin(true)}>
              Iniciar Sesión
            </button>
          )}
        </div>
      </header>

      {/* ── Main 3-column layout ──────────────────────────────────────────── */}
      <main className="main-layout">
        {user ? (
          <>
            <LeftPanel
              templateId={selectedTemplateId}
              onCompute={(data, profileId) => handleCompute(data, profileId)}
            />
            <PatternCanvas pattern={pattern} />
            <RightPanel
              pattern={pattern}
              templateId={selectedTemplateId}
              profileId={selectedProfileId}
            />
          </>
        ) : (
          <div className="not-logged">
            <div className="not-logged-card">
              <div className="brand-huge">G</div>
              <h1>Goni</h1>
              <p>Sistema de patronaje digital profesional</p>
              <button className="btn-primary large" onClick={() => setShowLogin(true)}>
                <span className="material-symbols-outlined">login</span>
                Comenzar
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <footer className="statusbar">
        <div className="statusbar-left">
          <span className="ver-badge">v1.0.0-BETA</span>
          <span>{pattern ? `Proyecto: ${pattern.template_name}` : "Sin proyecto activo"}</span>
        </div>
        <div className="statusbar-right">
          <a href="#" className="statusbar-link">Documentación</a>
          <a href="#" className="statusbar-link">API: Saludable</a>
        </div>
      </footer>

      {/* ── Login Modal ───────────────────────────────────────────────────── */}
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
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