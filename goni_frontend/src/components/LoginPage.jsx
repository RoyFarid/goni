import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import IconButton from "./IconButton";

export default function LoginPage({ onGuest }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isRegister = mode === "register";
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.full_name);
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── Left: brand panel ───────────────────────────────────────── */}
      <div className="auth-brand-panel">
          <svg className="auth-brand-grid" width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <pattern id="authDotGrid" width="18" height="18" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#ffffff"></circle>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#authDotGrid)"></rect>
          </svg>

          <svg className="auth-brand-tape" width="220" height="220" viewBox="0 0 260 260">
            <line x1="10" y1="250" x2="250" y2="10" stroke="#ffffff" strokeWidth="10" strokeLinecap="round"></line>
            <line x1="40" y1="240" x2="60" y2="220" stroke="#ffffff" strokeWidth="6" strokeLinecap="round"></line>
            <line x1="70" y1="210" x2="90" y2="190" stroke="#ffffff" strokeWidth="6" strokeLinecap="round"></line>
            <line x1="100" y1="180" x2="120" y2="160" stroke="#ffffff" strokeWidth="6" strokeLinecap="round"></line>
            <line x1="130" y1="150" x2="150" y2="130" stroke="#ffffff" strokeWidth="6" strokeLinecap="round"></line>
            <line x1="160" y1="120" x2="180" y2="100" stroke="#ffffff" strokeWidth="6" strokeLinecap="round"></line>
            <line x1="190" y1="90" x2="210" y2="70" stroke="#ffffff" strokeWidth="6" strokeLinecap="round"></line>
          </svg>

          <div className="auth-brand-top">
            <img src="/brand/logo_goni.png" alt="" />
            <span>GONI</span>
          </div>

          <div className="auth-brand-mid">
            <img src="/brand/logo_goni.png" alt="" className="auth-brand-mark" />
            <h1>Tu molde, listo<br />para imprimir.</h1>
            <p>Ingresa tus medidas y obtén el patrón de costura al instante, a escala real y listo para tu taller.</p>
          </div>

          <div className="auth-features">
            <div className="auth-feature-row">
              <span className="material-symbols-outlined">straighten</span>
              <span>Moldes básicos desde tus medidas</span>
            </div>
            <div className="auth-feature-row">
              <span className="material-symbols-outlined">picture_as_pdf</span>
              <span>PDF a escala 1:1, dividido en hojas</span>
            </div>
            <div className="auth-feature-row">
              <span className="material-symbols-outlined">architecture</span>
              <span>Exportación DXF para CAD industrial</span>
            </div>
          </div>
        </div>

      {/* ── Right: form panel ───────────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          {/* Mobile-only: the brand panel is hidden on small screens, so show
              the logo here — otherwise there's no indication of what app this is. */}
          <div className="auth-mobile-brand">
            <img src="/brand/logo_completo_goni.png" alt="Goni" />
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${!isRegister ? "active" : ""}`}
              onClick={() => setMode("login")}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              className={`auth-tab ${isRegister ? "active" : ""}`}
              onClick={() => setMode("register")}
            >
              Crear Cuenta
            </button>
          </div>

          <div className="auth-header">
            <h2>{isRegister ? "Crear Cuenta" : "Iniciar Sesión"}</h2>
            <p>{isRegister ? "Crea tu perfil y guarda tus moldes" : "Ingresa a tu taller digital"}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <div className="auth-field">
                <label>Nombre completo</label>
                <div className="auth-field-input">
                  <span className="material-symbols-outlined icon-lead">person</span>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label>Email</label>
              <div className="auth-field-input">
                <span className="material-symbols-outlined icon-lead">mail</span>
                <input
                  type="email"
                  placeholder="usuario@correo.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Contraseña</label>
              <div className="auth-field-input has-trailing">
                <span className="material-symbols-outlined icon-lead">lock</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <span className="material-symbols-outlined">{showPassword ? "visibility" : "visibility_off"}</span>
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              <span>{loading ? "Procesando..." : isRegister ? "Registrarse" : "Ingresar"}</span>
              {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          </form>

          <div className="auth-toggle">
            {isRegister ? (
              <>¿Ya tienes cuenta? <button onClick={() => setMode("login")}>Inicia sesión</button></>
            ) : (
              <>¿No tienes cuenta? <button onClick={() => setMode("register")}>Regístrate</button></>
            )}
          </div>

          {!isRegister && onGuest && (
            <div className="auth-guest-section">
              <div className="auth-divider">O también</div>
              <IconButton
                icon="launch"
                text="Continuar como Invitado"
                onClick={onGuest}
                className="btn-secondary w-full"
              />
            </div>
          )}

          {/* Mobile-only footer note (desktop already carries the brand panel) */}
          <p className="auth-copyright">© {new Date().getFullYear()} GONI. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
