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
  const [pedidos, setPedidos] = useState([])
  const [socket, setSocket] = useState(null)
  const [activo, setActivo] = useState(false)
  const [posicion, setPosicion] = useState(null)

  useEffect(() => {
    cargarPedidos()

    const s = io(import.meta.env.VITE_TRACKING_URL, {
      auth: { token }
    })
    setSocket(s)

    return () => s.disconnect()
  }, [])

  useEffect(() => {
    if (!activo || !socket) return

    const intervalo = setInterval(() => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords
        setPosicion([latitude, longitude])
        socket.emit('actualizar_ubicacion', {
          lat: latitude,
          lng: longitude
        })
      })
    }, 5000)

    return () => clearInterval(intervalo)
  }, [activo, socket])

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

  const colores = {
    pendiente: '#f59e0b',
    asignado: '#3b82f6',
    en_camino: '#8b5cf6',
    entregado: '#10b981',
    cancelado: '#ef4444'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22 }}>Panel Domiciliario</h1>
        <div>
          <span style={{ marginRight: 16, color: '#666' }}>{usuario.nombre}</span>
          <button onClick={logout} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>Salir</button>
        </div>
      </div>

      <div style={{ background: activo ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: 16, marginBottom: 24, border: `1px solid ${activo ? '#bbf7d0' : '#fecaca'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontWeight: 500, color: activo ? '#16a34a' : '#dc2626' }}>
            {activo ? '🟢 Activo — enviando ubicación' : '🔴 Inactivo'}
          </p>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            {posicion ? `${posicion[0].toFixed(4)}, ${posicion[1].toFixed(4)}` : 'Sin ubicación aún'}
          </p>
        </div>
        <button
          onClick={() => setActivo(!activo)}
          style={{ padding: '10px 20px', background: activo ? '#dc2626' : '#16a34a', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          {activo ? 'Desconectarme' : 'Activarme'}
        </button>
      </div>

      {posicion && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Mi ubicación actual</h2>
          <MapContainer center={posicion} zoom={15} style={{ height: 250, borderRadius: 12 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={posicion}>
              <Popup>Tú estás aquí</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Mis pedidos asignados</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {pedidos.length === 0 && <p style={{ color: '#999' }}>No tienes pedidos asignados</p>}
        {pedidos.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 500 }}>{p.direccion_origen} → {p.direccion_destino}</p>
                <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{p.descripcion}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: colores[p.estado], color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{p.estado}</span>
                <select
                  value={p.estado}
                  onChange={e => cambiarEstado(p.id, e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
                >
                  <option value="asignado">Asignado</option>
                  <option value="en_camino">En camino</option>
                  <option value="entregado">Entregado</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}