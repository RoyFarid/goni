import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authApi.currentUser());
  const [sessionAlert, setSessionAlert] = useState(null);

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
