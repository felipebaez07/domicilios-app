const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { Redis } = require('@upstash/redis')
require('dotenv').config()

const app = express()
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"] }))
app.options("(.*)", cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET","POST"], credentials: true }
})

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

const verificarToken = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Token requerido' })
  try {
    const token = auth.split(' ')[1]
    req.usuario = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch { res.status(401).json({ error: 'Token inválido' }) }
}

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'tracking' }))

app.get('/ubicacion/:domiciliario_id', verificarToken, async (req, res) => {
  try {
    const data = await redis.get(`ubicacion:${req.params.domiciliario_id}`)
    if (!data) return res.status(404).json({ error: 'No encontrado' })
    res.json(data)
  } catch { res.status(500).json({ error: 'Error interno' }) }
})

app.get('/domiciliarios/activos', verificarToken, async (req, res) => {
  try {
    const keys = await redis.keys('ubicacion:*')
    const activos = []
    for (const key of keys) {
      const data = await redis.get(key)
      if (data) activos.push(data)
    }
    res.json(activos)
  } catch { res.status(500).json({ error: 'Error interno' }) }
})

// Historial de chat
app.get('/chat/:room', verificarToken, async (req, res) => {
  try {
    const msgs = await redis.lrange(`chat:${req.params.room}`, 0, 49)
    res.json((msgs || []).map(m => typeof m === 'string' ? JSON.parse(m) : m).reverse())
  } catch { res.status(500).json({ error: 'Error interno' }) }
})

const usuarios = new Map()

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Token requerido'))
    socket.usuario = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch { next(new Error('Token inválido')) }
})

io.on('connection', (socket) => {
  const u = socket.usuario
  console.log(`Conectado: ${u.email} (${u.rol})`)

  usuarios.set(socket.id, { id: u.id, nombre: u.nombre || u.email, rol: u.rol, email: u.email })
  socket.join(`user:${u.id}`)
  if (u.rol === 'operador' || u.rol === 'admin') socket.join('operadores')

  io.emit('usuarios_conectados', Array.from(usuarios.values()))

  // GPS
  socket.on('location_update', async (data) => {
    const ubicacion = { domiciliario_id: data.domiciliario_id || u.id, nombre: data.nombre || u.nombre || u.email, lat: data.lat, lng: data.lng, pedido_id: data.pedido_id, timestamp: new Date().toISOString() }
    if (u.rol === 'domiciliario') await redis.setex(`ubicacion:${u.id}`, 300, JSON.stringify(ubicacion))
    io.to('operadores').emit('location_update', ubicacion)
    if (data.pedido_id) socket.to(`pedido:${data.pedido_id}`).emit('location_update', ubicacion)
  })

  socket.on('gps_off', async () => {
    if (u.rol === 'domiciliario') await redis.del(`ubicacion:${u.id}`)
    io.to('operadores').emit('gps_off', { domiciliario_id: u.id })
  })

  socket.on('join_pedido',   (data) => socket.join(`pedido:${data.pedido_id}`))
  socket.on('seguir_pedido', (id)   => socket.join(`pedido:${id}`))

  // CHAT
  socket.on('chat_mensaje', async (data) => {
    const msg = {
      id:          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from_id:     u.id,
      from_nombre: u.nombre || u.email.split('@')[0],
      from_rol:    u.rol,
      to_user_id:  data.to_user_id || null,
      mensaje:     String(data.mensaje).slice(0, 500),
      pedido_id:   data.pedido_id || null,
      timestamp:   new Date().toISOString(),
      room:        data.to_user_id ? [u.id, data.to_user_id].sort().join(':') : (data.to_room || 'general'),
    }

    await redis.lpush(`chat:${msg.room}`, JSON.stringify(msg))
    await redis.ltrim(`chat:${msg.room}`, 0, 49)

    if (data.to_user_id) {
      io.to(`user:${data.to_user_id}`).emit('chat_mensaje', msg)
    } else {
      io.to(msg.room).emit('chat_mensaje', msg)
    }
    socket.emit('chat_mensaje', msg)
  })

  socket.on('chat_escribiendo', (data) => {
    if (data.to_user_id) {
      socket.to(`user:${data.to_user_id}`).emit('chat_escribiendo', {
        from_id: u.id, from_nombre: u.nombre || u.email.split('@')[0], escribiendo: data.escribiendo,
      })
    }
  })

  socket.on('disconnect', async () => {
    usuarios.delete(socket.id)
    if (u.rol === 'domiciliario') {
      await redis.del(`ubicacion:${u.id}`)
      io.to('operadores').emit('domiciliario_desconectado', { id: u.id })
    }
    io.emit('usuarios_conectados', Array.from(usuarios.values()))
    console.log(`Desconectado: ${u.email}`)
  })
})

const PORT = process.env.PORT || 3003
httpServer.listen(PORT, () => console.log(`Tracking service corriendo en puerto ${PORT}`))