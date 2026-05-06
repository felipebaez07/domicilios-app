import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

export default function Dashboard() {
  const { usuario, token, logout } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    en_camino: 0,
    entregados: 0,
    cancelados: 0
  })

  const headers = { Authorization: `Bearer ${token}` }

  const cargarDatos = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_PEDIDOS_URL}/pedidos`, { headers })
      const data = res.data
      setPedidos(data)
      setStats({
        total: data.length,
        pendientes: data.filter(p => p.estado === 'pendiente').length,
        en_camino: data.filter(p => p.estado === 'en_camino').length,
        entregados: data.filter(p => p.estado === 'entregado').length,
        cancelados: data.filter(p => p.estado === 'cancelado').length
      })
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    cargarDatos()
    const intervalo = setInterval(cargarDatos, 10000)
    return () => clearInterval(intervalo)
  }, [])

  const colores = {
    pendiente: '#f59e0b',
    asignado: '#3b82f6',
    en_camino: '#8b5cf6',
    entregado: '#10b981',
    cancelado: '#ef4444'
  }

  const tarjetas = [
    { label: 'TOTAL PEDIDOS', valor: stats.total, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'PENDIENTES', valor: stats.pendientes, color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    { label: 'EN CAMINO', valor: stats.en_camino, color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
    { label: 'ENTREGADOS', valor: stats.entregados, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'CANCELADOS', valor: stats.cancelados, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22 }}>Panel Administrador</h1>
        <div>
          <span style={{ marginRight: 16, color: '#666' }}>{usuario.nombre}</span>
          <button onClick={logout} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>Salir</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
        {tarjetas.map(t => (
          <div key={t.label} style={{ background: t.bg, borderRadius: 10, padding: 16, border: `1px solid ${t.border}` }}>
            <p style={{ fontSize: 11, color: t.color, marginBottom: 4, fontWeight: 500 }}>{t.label}</p>
            <p style={{ fontSize: 28, fontWeight: 500, color: t.color }}>{t.valor}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Todos los pedidos</h2>
      <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: '#666', fontWeight: 500 }}>ORIGEN → DESTINO</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: '#666', fontWeight: 500 }}>DESCRIPCIÓN</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: '#666', fontWeight: 500 }}>ESTADO</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: '#666', fontWeight: 500 }}>FECHA</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.direccion_origen} → {p.direccion_destino}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{p.descripcion}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: colores[p.estado], color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>{p.estado}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#999' }}>{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pedidos.length === 0 && <p style={{ textAlign: 'center', padding: 24, color: '#999' }}>No hay pedidos</p>}
      </div>
    </div>
  )
}