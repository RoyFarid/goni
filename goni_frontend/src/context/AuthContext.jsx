import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authApi.currentUser());
  const [sessionAlert, setSessionAlert] = useState(null);

  // ── Refresca el plan/tier desde el backend al abrir la app ──────────────
  // El token puede vivir varias horas; si el plan del usuario cambió mientras
  // tanto (p. ej. un upgrade aplicado manualmente en la BD), esto evita que
  // se quede mostrando el tier viejo hasta el próximo login.
  useEffect(() => {
    if (!authApi.currentUser()) return;
    authApi.me().then((data) => {
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, tier: data.membership_tier, plan_name: data.plan_name, full_name: data.full_name };
        localStorage.setItem("ep_user", JSON.stringify(updated));
        return updated;
      });
    }).catch(() => { });
  }, []);

  // ── Escucha 401s globales del API client ────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      setUser(null);
      setSessionAlert(e.detail || "Sesión expirada. Por favor inicia sesión de nuevo.");
    };
    window.addEventListener("goni:unauthorized", handler);
    return () => window.removeEventListener("goni:unauthorized", handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setUser(authApi.currentUser());
    setSessionAlert(null);
    return data;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setSessionAlert(null);
  }, []);

  const register = useCallback(async (email, password, full_name) => {
    return authApi.register(email, password, full_name);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, register, sessionAlert, clearAlert: () => setSessionAlert(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
