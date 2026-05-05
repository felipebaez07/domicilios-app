import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import DashboardDistribuidor from './pages/distribuidor/Dashboard'
import DashboardCliente from './pages/cliente/Dashboard'
import DashboardDomiciliario from './pages/domiciliario/Dashboard'
import DashboardOperador from './pages/operador/Dashboard'
import DashboardAdmin from './pages/admin/Dashboard'
import { useAuth } from './context/AuthContext'

function App() {
  const { usuario } = useAuth()

  if (!usuario) return <Routes><Route path="*" element={<Login />} /></Routes>

  const dashboards = {
    distribuidor: <DashboardDistribuidor />,
    cliente: <DashboardCliente />,
    domiciliario: <DashboardDomiciliario />,
    operador: <DashboardOperador />,
    admin: <DashboardAdmin />
  }

  return (
    <Routes>
      <Route path="/" element={dashboards[usuario.rol] || <Login />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App