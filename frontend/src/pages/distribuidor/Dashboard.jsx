import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

export default function Dashboard() {
  const { usuario, token, logout } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [form, setForm] = useState({
    direccion_origen: '',
    direccion_destino: '',
    descripcion: '',
    lat_origen: '',
    lng_origen: '',
    lat_destino: '',
    lng_destino: '',
    telefono_cliente: ''
  })
  const [mensaje, setMensaje] = useState('')

  const headers = { Authorization: `Bearer ${token}` }

  const cargarPedidos = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_PEDIDOS_URL}/pedidos`, { headers })
      setPedidos(res.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    cargarPedidos()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${import.meta.env.VITE_PEDIDOS_URL}/pedidos`, form, { headers })
      setMensaje('Pedido creado exitosamente')
      setForm({
        direccion_origen: '',
        direccion_destino: '',
        descripcion: '',
        lat_origen: '',
        lng_origen: '',
        lat_destino: '',
        lng_destino: '',
        telefono_cliente: ''
      })
      cargarPedidos()
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('Error creando pedido')
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
        <h1 style={{ fontSize: 22 }}>Dashboard Distribuidor</h1>
        <div>
          <span style={{ marginRight: 16, color: '#666' }}>{usuario.nombre}</span>
          <button onClick={logout} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>Salir</button>
        </div>
      </div>

      <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 24, marginBottom: 32, border: '1px solid #eee' }}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>Crear nuevo pedido</h2>
        {mensaje && <p style={{ color: mensaje.includes('Error') ? 'red' : 'green', marginBottom: 12 }}>{mensaje}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input
              placeholder="Dirección origen"
              value={form.direccion_origen}
              onChange={e => setForm({ ...form, direccion_origen: e.target.value })}
              required
              style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              placeholder="Dirección destino"
              value={form.direccion_destino}
              onChange={e => setForm({ ...form, direccion_destino: e.target.value })}
              required
              style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              placeholder="Lat origen (ej: 4.4389)"
              value={form.lat_origen}
              onChange={e => setForm({ ...form, lat_origen: e.target.value })}
              style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              placeholder="Lng origen (ej: -75.2322)"
              value={form.lng_origen}
              onChange={e => setForm({ ...form, lng_origen: e.target.value })}
              style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              placeholder="Lat destino"
              value={form.lat_destino}
              onChange={e => setForm({ ...form, lat_destino: e.target.value })}
              style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              placeholder="Lng destino"
              value={form.lng_destino}
              onChange={e => setForm({ ...form, lng_destino: e.target.value })}
              style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              placeholder="Teléfono cliente WhatsApp"
              value={form.telefono_cliente}
              onChange={e => setForm({ ...form, telefono_cliente: e.target.value })}
              style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              placeholder="Descripción del pedido"
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
            />
          </div>
          <button type="submit" style={{ padding: '10px 24px', background: '#333', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
            Crear pedido
          </button>
        </form>
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Mis pedidos</h2>
      {pedidos.length === 0 && <p style={{ color: '#999' }}>No hay pedidos aún</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {pedidos.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>{p.direccion_origen} → {p.direccion_destino}</span>
              <span style={{ background: colores[p.estado], color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{p.estado}</span>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginTop: 6 }}>{p.descripcion}</p>
            <p style={{ color: '#999', fontSize: 11, marginTop: 4 }}>{new Date(p.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}