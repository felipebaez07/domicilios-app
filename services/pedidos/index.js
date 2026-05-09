const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')
const amqplib = require('amqplib')
const ws = require('ws')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  realtime: { transport: ws }
})

let channel = null

async function conectarRabbitMQ() {
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL)
    channel = await conn.createChannel()
    await channel.assertQueue('pedidos_eventos', { durable: true })
    console.log('RabbitMQ conectado en pedidos')
  } catch (error) {
    console.error('Error conectando RabbitMQ:', error)
    setTimeout(conectarRabbitMQ, 5000)
  }
}

const verificarToken = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Token requerido' })
  try {
    const token = auth.split(' ')[1]
    req.usuario = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'pedidos' }))

// ── RUTAS ESPECÍFICAS ANTES DE /:id ──

app.get('/pedidos/mis-pedidos', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pedidos').select('*')
      .eq('distribuidor_id', req.usuario.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    // Normalizar campos para el frontend
    res.json(data.map(normalizar))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

app.get('/pedidos/mis-entregas', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pedidos').select('*')
      .eq('domiciliario_id', req.usuario.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data.map(normalizar))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

app.get('/pedidos/todos', verificarToken, async (req, res) => {
  try {
    if (!['admin', 'operador'].includes(req.usuario.rol))
      return res.status(403).json({ error: 'Sin permisos' })
    const { data, error } = await supabase
      .from('pedidos').select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data.map(normalizar))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

app.get('/usuarios/domiciliarios', verificarToken, async (req, res) => {
  try {
    if (!['operador', 'admin'].includes(req.usuario.rol))
      return res.status(403).json({ error: 'Sin permisos' })
    // Consulta Supabase directamente — no depende del auth service
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol')
      .eq('rol', 'domiciliario')
      .order('nombre', { ascending: true })
    if (error) throw error
    res.json(data || [])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── NORMALIZAR: mapea columnas BD → campos que espera el frontend ──
function normalizar(p) {
  return {
    ...p,
    // El frontend usa estos nombres
    cliente_nombre:    p.cliente_nombre    || p.descripcion || 'Sin nombre',
    telefono:          p.telefono          || null,
    direccion_entrega: p.direccion_entrega || p.direccion_destino || p.direccion_origen,
  }
}

// ── CREAR PEDIDO ──
app.post('/pedidos', verificarToken, async (req, res) => {
  try {
    const {
      cliente_nombre,
      telefono,
      direccion_entrega,
      descripcion,
      // campos originales también aceptados
      direccion_origen,
      direccion_destino,
      lat_origen, lng_origen,
      lat_destino, lng_destino,
    } = req.body

    // Construir objeto solo con columnas que existen en la BD
    const insertar = {
      distribuidor_id:   req.usuario.id,
      descripcion:       descripcion || cliente_nombre || null,
      direccion_origen:  direccion_origen || direccion_entrega || 'No especificado',
      direccion_destino: direccion_destino || direccion_entrega || 'No especificado',
      lat_origen,
      lng_origen,
      lat_destino,
      lng_destino,
      estado: 'pendiente',
    }

    // Solo agregar columnas extra si existen (después de correr el ALTER TABLE)
    if (cliente_nombre !== undefined) insertar.cliente_nombre    = cliente_nombre
    if (telefono       !== undefined) insertar.telefono          = telefono
    if (direccion_entrega !== undefined) insertar.direccion_entrega = direccion_entrega

    const { data, error } = await supabase
      .from('pedidos').insert([insertar]).select().single()

    if (error) {
      // Si falla por columna inexistente, reintenta sin columnas extra
      if (error.code === 'PGRST204') {
        delete insertar.cliente_nombre
        delete insertar.telefono
        delete insertar.direccion_entrega
        const { data: data2, error: error2 } = await supabase
          .from('pedidos').insert([insertar]).select().single()
        if (error2) throw error2
        return res.status(201).json(normalizar(data2))
      }
      throw error
    }

    if (channel) channel.sendToQueue('pedidos_eventos',
      Buffer.from(JSON.stringify({ tipo: 'pedido_creado', pedido_id: data.id })))

    res.status(201).json(normalizar(data))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── LISTAR PEDIDOS ──
app.get('/pedidos', verificarToken, async (req, res) => {
  try {
    let query = supabase.from('pedidos').select('*').order('created_at', { ascending: false })
    if (req.usuario.rol === 'distribuidor') query = query.eq('distribuidor_id', req.usuario.id)
    else if (req.usuario.rol === 'domiciliario') query = query.eq('domiciliario_id', req.usuario.id)
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

    const { data, error } = await supabase
      .from('pedidos').update({ estado, updated_at: new Date() })
      .eq('id', req.params.id).select().single()

    if (error) throw error

    if (channel) channel.sendToQueue('pedidos_eventos',
      Buffer.from(JSON.stringify({ tipo: 'estado_actualizado', pedido_id: data.id, estado: data.estado })))

    res.json(normalizar(data))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── ASIGNAR DOMICILIARIO ──
app.patch('/pedidos/:id/asignar', verificarToken, async (req, res) => {
  try {
    if (!['operador','admin'].includes(req.usuario.rol))
      return res.status(403).json({ error: 'Sin permisos' })

    const { domiciliario_id } = req.body
    const { data, error } = await supabase
      .from('pedidos').update({ domiciliario_id, estado: 'asignado', updated_at: new Date() })
      .eq('id', req.params.id).select().single()

    if (error) throw error

    if (channel) channel.sendToQueue('pedidos_eventos',
      Buffer.from(JSON.stringify({ tipo: 'pedido_asignado', pedido_id: data.id, domiciliario_id })))

    res.json(normalizar(data))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

// ── PEDIDO POR ID (siempre al final) ──
app.get('/pedidos/:id', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pedidos').select('*').eq('id', req.params.id).single()
    if (error) throw error
    res.json(normalizar(data))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }) }
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`Pedidos service corriendo en puerto ${PORT}`)
  conectarRabbitMQ()
})