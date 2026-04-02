import { createContext, useContext, useState, useCallback } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authApi.currentUser());

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setUser(authApi.currentUser());
    return data;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const register = useCallback(async (email, password, full_name) => {
    return authApi.register(email, password, full_name);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
