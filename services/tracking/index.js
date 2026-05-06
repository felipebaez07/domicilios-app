const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { Redis } = require('@upstash/redis')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
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
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', servicio: 'tracking' })
})

app.get('/ubicacion/:domiciliario_id', verificarToken, async (req, res) => {
  try {
    const data = await redis.get(`ubicacion:${req.params.domiciliario_id}`)
    if (!data) return res.status(404).json({ error: 'Domiciliario no encontrado' })
    res.json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
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
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Token requerido'))
    socket.usuario = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    next(new Error('Token inválido'))
  }
})

io.on('connection', (socket) => {
  console.log(`Conectado: ${socket.usuario.email} (${socket.usuario.rol})`)

  if (socket.usuario.rol === 'operador' || socket.usuario.rol === 'admin') {
    socket.join('operadores')
  }

  socket.on('actualizar_ubicacion', async (data) => {
    if (socket.usuario.rol !== 'domiciliario') return

    const ubicacion = {
      domiciliario_id: socket.usuario.id,
      email: socket.usuario.email,
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString()
    }

    await redis.setex(`ubicacion:${socket.usuario.id}`, 300, JSON.stringify(ubicacion))
    io.to('operadores').emit('ubicacion_actualizada', ubicacion)

    if (data.pedido_id) {
      socket.to(`pedido:${data.pedido_id}`).emit('domiciliario_ubicacion', ubicacion)
    }
  })

  socket.on('seguir_pedido', (pedido_id) => {
    socket.join(`pedido:${pedido_id}`)
  })

  socket.on('disconnect', async () => {
    if (socket.usuario.rol === 'domiciliario') {
      await redis.del(`ubicacion:${socket.usuario.id}`)
      io.to('operadores').emit('domiciliario_desconectado', { id: socket.usuario.id })
    }
    console.log(`Desconectado: ${socket.usuario.email}`)
  })
})

const PORT = process.env.PORT || 3003
httpServer.listen(PORT, () => console.log(`Tracking service corriendo en puerto ${PORT}`))