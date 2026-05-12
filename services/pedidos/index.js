const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')
const amqplib = require('amqplib')
const ws = require('ws')
require('dotenv').config()

const app = express()
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"] }))
app.use(express.json())

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  realtime: { transport: ws }
})

const AUTH_URL = process.env.AUTH_URL || 'https://domiciliosauth-pm6ljmtx.b4a.run'

async function notificar(user_id, mensaje) {
  if (!user_id) return
  try {
    await fetch(`${AUTH_URL}/telegram/notify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, mensaje })
    })
  } catch(e) { console.error('Notif error:', e.message) }
}

let channel = null
async function conectarRabbitMQ() {
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL)
    channel = await conn.createChannel()
    await channel.assertQueue('pedidos_eventos', { durable: true })
    console.log('RabbitMQ conectado')
  } catch (error) {
    console.error('RabbitMQ error:', error.message)
    setTimeout(conectarRabbitMQ, 5000)
  }
}

const verificarToken = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Token requerido' })
  try {
    req.usuario = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET)
    next()
  } catch { res.status(401).json({ error: 'Token inválido' }) }
}

function normalizar(p) {
  return {
    ...p,
    cliente_nombre:    p.cliente_nombre    || p.descripcion || 'Sin nombre',
    telefono:          p.telefono          || null,
    direccion_entrega: p.direccion_entrega || p.direccion_destino || p.direccion_origen,
  }
}

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'pedidos' }))

// ── MIS PEDIDOS (distribuidor) ──
app.get('/pedidos/mis-pedidos', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos').select('*')
      .eq('distribuidor_id', req.usuario.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data.map(normalizar))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── MIS ENTREGAS (domiciliario) ──
app.get('/pedidos/mis-entregas', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos').select('*')
      .eq('domiciliario_id', req.usuario.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data.map(normalizar))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── TODOS LOS PEDIDOS (admin/operador — filtrado por empresa) ──
app.get('/pedidos/todos', verificarToken, async (req, res) => {
  try {
    if (!['admin', 'operador', 'superadmin'].includes(req.usuario.rol))
      return res.status(403).json({ error: 'Sin permisos' })

    let query = supabase.from('pedidos').select('*').order('created_at', { ascending: false })

    // Filtrar por empresa excepto superadmin
    if (req.usuario.rol !== 'superadmin' && req.usuario.empresa_id)
      query = query.eq('empresa_id', req.usuario.empresa_id)

    const { data, error } = await query
    if (error) throw error
    res.json(data.map(normalizar))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── DOMICILIARIOS (filtrado por empresa) ──
app.get('/usuarios/domiciliarios', verificarToken, async (req, res) => {
  try {
    if (!['operador', 'admin', 'superadmin'].includes(req.usuario.rol))
      return res.status(403).json({ error: 'Sin permisos' })

    let query = supabase.from('usuarios').select('id, nombre, email, rol')
      .eq('rol', 'domiciliario')
      .order('nombre', { ascending: true })

    // Filtrar por empresa
    if (req.usuario.rol !== 'superadmin' && req.usuario.empresa_id)
      query = query.eq('empresa_id', req.usuario.empresa_id)

    const { data, error } = await query
    if (error) throw error
    res.json(data || [])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── PEDIDOS POR EMPRESA (para cliente que elige empresa) ──
app.get('/pedidos/empresa/:empresa_id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'cliente') return res.status(403).json({ error: 'Solo clientes' })
    const { data, error } = await supabase.from('pedidos').select('*')
      .eq('empresa_id', req.params.empresa_id)
      .eq('cliente_id', req.usuario.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data.map(normalizar))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── CREAR PEDIDO ──
app.post('/pedidos', verificarToken, async (req, res) => {
  try {
    const {
      cliente_nombre, telefono, direccion_entrega, descripcion,
      direccion_origen, direccion_destino,
      lat_origen, lng_origen, lat_destino, lng_destino,
      empresa_id, // cliente debe enviar la empresa elegida
    } = req.body

    const insertar = {
      distribuidor_id:   req.usuario.rol === 'distribuidor' ? req.usuario.id : null,
      cliente_id:        req.usuario.rol === 'cliente' ? req.usuario.id : null,
      descripcion:       descripcion || cliente_nombre || null,
      direccion_origen:  direccion_origen || direccion_entrega || 'No especificado',
      direccion_destino: direccion_destino || direccion_entrega || 'No especificado',
      lat_origen, lng_origen, lat_destino, lng_destino,
      estado: 'pendiente',
      empresa_id: empresa_id || req.usuario.empresa_id || null,
    }
    if (cliente_nombre !== undefined) insertar.cliente_nombre    = cliente_nombre
    if (telefono       !== undefined) insertar.telefono          = telefono
    if (direccion_entrega !== undefined) insertar.direccion_entrega = direccion_entrega

    const { data, error } = await supabase.from('pedidos').insert([insertar]).select().single()
    if (error) throw error

    if (channel) channel.sendToQueue('pedidos_eventos',
      Buffer.from(JSON.stringify({ tipo: 'pedido_creado', pedido_id: data.id })))

    // Notificar operadores de la misma empresa
    let opQuery = supabase.from('usuarios').select('id').eq('rol', 'operador')
    if (data.empresa_id) opQuery = opQuery.eq('empresa_id', data.empresa_id)
    const { data: operadores } = await opQuery
    const msg = `📦 <b>Nuevo pedido</b>\n\n👤 Cliente: <b>${data.cliente_nombre || data.descripcion || 'Sin nombre'}</b>\n📍 Recogida: ${data.direccion_origen}\n🏠 Entrega: ${data.direccion_destino}\n\n⚡ Asígnalo en RAVEN`
    for (const op of operadores || []) notificar(op.id, msg)

    res.status(201).json(normalizar(data))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── LISTAR PEDIDOS ──
app.get('/pedidos', verificarToken, async (req, res) => {
  try {
    let query = supabase.from('pedidos').select('*').order('created_at', { ascending: false })
    if (req.usuario.rol === 'distribuidor') query = query.eq('distribuidor_id', req.usuario.id)
    else if (req.usuario.rol === 'domiciliario') query = query.eq('domiciliario_id', req.usuario.id)
    else if (req.usuario.rol === 'cliente') query = query.eq('cliente_id', req.usuario.id)
    else if (['admin','operador'].includes(req.usuario.rol) && req.usuario.empresa_id)
      query = query.eq('empresa_id', req.usuario.empresa_id)
    const { data, error } = await query
    if (error) throw error
    res.json(data.map(normalizar))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── ACTUALIZAR ESTADO ──
app.patch('/pedidos/:id/estado', verificarToken, async (req, res) => {
  try {
    const { estado } = req.body
    if (!['pendiente','asignado','en_camino','entregado','cancelado'].includes(estado))
      return res.status(400).json({ error: 'Estado inválido' })
    const { data, error } = await supabase.from('pedidos')
      .update({ estado, updated_at: new Date() })
      .eq('id', req.params.id).select().single()
    if (error) throw error
    if (channel) channel.sendToQueue('pedidos_eventos',
      Buffer.from(JSON.stringify({ tipo: 'estado_actualizado', pedido_id: data.id, estado: data.estado })))
    if (data.estado === 'entregado' && data.distribuidor_id)
      notificar(data.distribuidor_id, `✅ <b>¡Pedido entregado!</b>\n\n📦 ${data.descripcion || ''}\n🏠 ${data.direccion_entrega || data.direccion_destino}\n\n¡Tu envío llegó exitosamente! 🎉`)
    if (data.estado === 'en_camino' && data.distribuidor_id)
      notificar(data.distribuidor_id, `🛵 <b>¡En camino!</b>\n\nTu pedido está siendo entregado.\n📦 ${data.descripcion || ''}`)
    res.json(normalizar(data))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── ASIGNAR DOMICILIARIO ──
app.patch('/pedidos/:id/asignar', verificarToken, async (req, res) => {
  try {
    if (!['operador','admin'].includes(req.usuario.rol))
      return res.status(403).json({ error: 'Sin permisos' })
    const { domiciliario_id } = req.body
    const { data, error } = await supabase.from('pedidos')
      .update({ domiciliario_id, estado: 'asignado', updated_at: new Date() })
      .eq('id', req.params.id).select().single()
    if (error) throw error
    if (channel) channel.sendToQueue('pedidos_eventos',
      Buffer.from(JSON.stringify({ tipo: 'pedido_asignado', pedido_id: data.id, domiciliario_id })))
    const msgDomi = `🛵 <b>¡Nuevo pedido asignado!</b>\n\n📦 ${data.descripcion || 'Sin descripción'}\n👤 ${data.cliente_nombre || 'Cliente'}\n${data.telefono ? '📞 ' + data.telefono + '\n' : ''}📍 Recogida: ${data.direccion_origen}\n🏠 Entrega: ${data.direccion_entrega || data.direccion_destino}\n\n¡Abre RAVEN para navegar! 🗺️`
    notificar(domiciliario_id, msgDomi)
    res.json(normalizar(data))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── PEDIDO POR ID ──
app.get('/pedidos/:id', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos').select('*').eq('id', req.params.id).single()
    if (error) throw error
    res.json(normalizar(data))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`Pedidos service corriendo en puerto ${PORT}`)
  conectarRabbitMQ()
})