import { useAuth } from '../../context/AuthContext'
export default function Dashboard() {
  const { usuario, logout } = useAuth()
  return <div><h1>Dashboard Admin</h1><p>{usuario.nombre}</p><button onClick={logout}>Salir</button></div>
}