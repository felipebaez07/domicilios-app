import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('dom_token') || null);
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('dom_user')) || null; }
    catch { return null; }
  });

  function login(newToken, userData) {
    localStorage.setItem('dom_token', newToken);
    localStorage.setItem('dom_user',  JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('dom_token');
    localStorage.removeItem('dom_user');
    localStorage.removeItem('dom_gps_active');
    localStorage.removeItem('dom_last_pos');
    setToken(null);
    setUser(null);
  }

  // Verifica si el token JWT ha expirado
  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expMs   = payload.exp * 1000;
      if (Date.now() >= expMs) { logout(); return; }
      // Auto-logout cuando expire
      const ms = expMs - Date.now();
      const t  = setTimeout(logout, ms);
      return () => clearTimeout(t);
    } catch { logout(); }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}