import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/auth/Login';

import DistribuidorDashboard from './pages/distribuidor/Dashboard';
import DistribuidorNuevo     from './pages/distribuidor/NuevoPedido';
import DistribuidorHistorial from './pages/distribuidor/Historial';

import ClienteDashboard  from './pages/cliente/Dashboard';
import ClienteRastreo    from './pages/cliente/Rastreo';
import ClienteHistorial  from './pages/cliente/Historial';

import DomiciliarioDashboard from './pages/domiciliario/Dashboard';
import DomiciliarioRuta      from './pages/domiciliario/Ruta';
import DomiciliarioHistorial from './pages/domiciliario/Historial';
import DomiciliarioPerfil    from './pages/domiciliario/Perfil';

import OperadorDashboard     from './pages/operador/Dashboard';
import OperadorPedidos       from './pages/operador/Pedidos';
import OperadorDomiciliarios from './pages/operador/Domiciliarios';

import AdminDashboard from './pages/admin/Dashboard';
import AdminPedidos   from './pages/admin/Pedidos';
import AdminUsuarios  from './pages/admin/Usuarios';
import AdminEquipo    from './pages/admin/Equipo';

import SuperadminDashboard from './pages/superadmin/Dashboard';

function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && user?.rol !== allowedRole) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user?.rol) return <Navigate to={`/${user.rol}`} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      <Route path="/distribuidor"           element={<ProtectedRoute allowedRole="distribuidor"><DistribuidorDashboard /></ProtectedRoute>} />
      <Route path="/distribuidor/nuevo"     element={<ProtectedRoute allowedRole="distribuidor"><DistribuidorNuevo /></ProtectedRoute>} />
      <Route path="/distribuidor/historial" element={<ProtectedRoute allowedRole="distribuidor"><DistribuidorHistorial /></ProtectedRoute>} />

      <Route path="/cliente"           element={<ProtectedRoute allowedRole="cliente"><ClienteDashboard /></ProtectedRoute>} />
      <Route path="/cliente/rastreo"   element={<ProtectedRoute allowedRole="cliente"><ClienteRastreo /></ProtectedRoute>} />
      <Route path="/cliente/historial" element={<ProtectedRoute allowedRole="cliente"><ClienteHistorial /></ProtectedRoute>} />

      <Route path="/domiciliario"           element={<ProtectedRoute allowedRole="domiciliario"><DomiciliarioDashboard /></ProtectedRoute>} />
      <Route path="/domiciliario/ruta"      element={<ProtectedRoute allowedRole="domiciliario"><DomiciliarioRuta /></ProtectedRoute>} />
      <Route path="/domiciliario/historial" element={<ProtectedRoute allowedRole="domiciliario"><DomiciliarioHistorial /></ProtectedRoute>} />
      <Route path="/domiciliario/perfil"    element={<ProtectedRoute allowedRole="domiciliario"><DomiciliarioPerfil /></ProtectedRoute>} />

      <Route path="/operador"               element={<ProtectedRoute allowedRole="operador"><OperadorDashboard /></ProtectedRoute>} />
      <Route path="/operador/pedidos"       element={<ProtectedRoute allowedRole="operador"><OperadorPedidos /></ProtectedRoute>} />
      <Route path="/operador/domiciliarios" element={<ProtectedRoute allowedRole="operador"><OperadorDomiciliarios /></ProtectedRoute>} />

      <Route path="/admin"          element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/pedidos"  element={<ProtectedRoute allowedRole="admin"><AdminPedidos /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute allowedRole="admin"><AdminUsuarios /></ProtectedRoute>} />
      <Route path="/admin/equipo"   element={<ProtectedRoute allowedRole="admin"><AdminEquipo /></ProtectedRoute>} />

      <Route path="/superadmin"     element={<ProtectedRoute allowedRole="superadmin"><SuperadminDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}