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
  const [pedidoActivo, setPedidoActivo] = useState(null)
  const [ubicacionDomiciliario, setUbicacionDomiciliario] = useState(null)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    cargarPedidos()
    const s = io(import.meta.env.VITE_TRACKING_URL, {
      auth: { token }
    })
    setSocket(s)
    s.on('domiciliario_ubicacion', (data) => {
      setUbicacionDomiciliario(data)
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

  const seguirPedido = (pedido) => {
    setPedidoActivo(pedido)
    if (socket) socket.emit('seguir_pedido', pedido.id)
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
        <h1 style={{ fontSize: 22 }}>Mis pedidos</h1>
        <div>
          <span style={{ marginRight: 16, color: '#666' }}>{usuario.nombre}</span>
          <button onClick={logout} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>Salir</button>
        </div>
      </div>

      {pedidoActivo && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Tracking en vivo — {pedidoActivo.direccion_destino}</h2>
          <MapContainer
            center={ubicacionDomiciliario ? [ubicacionDomiciliario.lat, ubicacionDomiciliario.lng] : [4.4389, -75.2322]}
            zoom={14}
            style={{ height: 350, borderRadius: 12 }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {ubicacionDomiciliario && (
              <Marker position={[ubicacionDomiciliario.lat, ubicacionDomiciliario.lng]}>
                <Popup>Domiciliario en camino</Popup>
              </Marker>
            )}
            {pedidoActivo.lat_destino && (
              <Marker position={[pedidoActivo.lat_destino, pedidoActivo.lng_destino]}>
                <Popup>Destino</Popup>
              </Marker>
            )}
          </MapContainer>
          {!ubicacionDomiciliario && (
            <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>Esperando ubicación del domiciliario...</p>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {pedidos.length === 0 && <p style={{ color: '#999' }}>No tienes pedidos aún</p>}
        {pedidos.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>{p.direccion_origen} → {p.direccion_destino}</span>
              <span style={{ background: colores[p.estado], color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{p.estado}</span>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginTop: 6 }}>{p.descripcion}</p>
            <button
              onClick={() => seguirPedido(p)}
              style={{ marginTop: 10, padding: '6px 14px', background: '#3b82f6', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              Ver en mapa
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}