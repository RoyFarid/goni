import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">EP</div>
          <h2>{mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}</h2>
          <p>EasyPattern CAD</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === "register" && (
            <div className="field-group">
              <label>Nombre completo</label>
              <input
                type="text"
                placeholder="Tu nombre"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
              />
            </div>
          )}

          <div className="field-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="usuario@correo.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Registrarse"}
          </button>
        </form>

        <div className="login-toggle">
          {mode === "login" ? (
            <>¿No tienes cuenta? <button onClick={() => setMode("register")}>Regístrate</button></>
          ) : (
            <>¿Ya tienes cuenta? <button onClick={() => setMode("login")}>Inicia sesión</button></>
          )}
        </div>
      </div>
    </div>
  );
}
