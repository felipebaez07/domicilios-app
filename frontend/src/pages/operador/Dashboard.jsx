import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { io } from 'socket.io-client'
import axios from 'axios'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function Dashboard() {
  const { usuario, token, logout } = useAuth()
  const [domiciliarios, setDomiciliarios] = useState({})
  const [pedidos, setPedidos] = useState([])

  useEffect(() => {
    cargarPedidos()

    const s = io(import.meta.env.VITE_TRACKING_URL, {
      auth: { token }
    })

    s.on('ubicacion_actualizada', (data) => {
      setDomiciliarios(prev => ({
        ...prev,
        [data.domiciliario_id]: data
      }))
    })

    s.on('domiciliario_desconectado', (data) => {
      setDomiciliarios(prev => {
        const nuevo = { ...prev }
        delete nuevo[data.id]
        return nuevo
      })
    })

    return () => s.disconnect()
  }, [])

  const cargarPedidos = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_PEDIDOS_URL}/pedidos`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPedidos(res.data)
    } catch (error) {
      console.error(error)
    }
  }

  const cambiarEstado = async (pedidoId, estado) => {
    try {
      await axios.patch(
        `${import.meta.env.VITE_PEDIDOS_URL}/pedidos/${pedidoId}/estado`,
        { estado },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      cargarPedidos()
    } catch (error) {
      console.error(error)
    }
  }

  const activos = Object.values(domiciliarios)

  const colores = {
    pendiente: '#f59e0b',
    asignado: '#3b82f6',
    en_camino: '#8b5cf6',
    entregado: '#10b981',
    cancelado: '#ef4444'
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22 }}>Panel Operador</h1>
        <div>
          <span style={{ marginRight: 16, color: '#666' }}>{usuario.nombre}</span>
          <button onClick={logout} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>Salir</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, border: '1px solid #bbf7d0' }}>
          <p style={{ fontSize: 12, color: '#16a34a', marginBottom: 4 }}>DOMICILIARIOS ACTIVOS</p>
          <p style={{ fontSize: 28, fontWeight: 500, color: '#15803d' }}>{activos.length}</p>
        </div>
        <div style={{ background: '#eff6ff', borderRadius: 10, padding: 16, border: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: 12, color: '#2563eb', marginBottom: 4 }}>PEDIDOS TOTALES</p>
          <p style={{ fontSize: 28, fontWeight: 500, color: '#1d4ed8' }}>{pedidos.length}</p>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Mapa en vivo</h2>
        <MapContainer center={[4.4389, -75.2322]} zoom={13} style={{ height: 350, borderRadius: 12 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {activos.map(d => (
            <Marker key={d.domiciliario_id} position={[d.lat, d.lng]}>
              <Popup>{d.email}</Popup>
            </Marker>
          ))}
        </MapContainer>
        {activos.length === 0 && (
          <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>No hay domiciliarios activos</p>
        )}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Gestión de pedidos</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {pedidos.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 500 }}>{p.direccion_origen} → {p.direccion_destino}</p>
              <p style={{ color: '#666', fontSize: 13 }}>{p.descripcion}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: colores[p.estado], color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{p.estado}</span>
              <select
                value={p.estado}
                onChange={e => cambiarEstado(p.id, e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
              >
                <option value="pendiente">Pendiente</option>
                <option value="asignado">Asignado</option>
                <option value="en_camino">En camino</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}