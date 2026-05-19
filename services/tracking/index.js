require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const { Server } = require('socket.io')

// ── Infraestructura: config
const redis = require('./src/infrastructure/config/redis')

// ── Infraestructura: servicios
const RedisHistorialService = require('./src/infrastructure/services/RedisHistorialService')

// ── Infraestructura: socket
const TrackingSocket = require('./src/infrastructure/socket/TrackingSocket')

// ── Infraestructura: HTTP
const TrackingController = require('./src/infrastructure/http/controllers/TrackingController')
const trackingRoutes     = require('./src/infrastructure/http/routes/trackingRoutes')

// ── Ensamblar dependencias
const historialService    = new RedisHistorialService(redis)
const trackingController  = new TrackingController({ historialService })

// ── Express + Socket.io
const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['polling', 'websocket'],
})

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }))
app.use(express.json())
app.use('/', trackingRoutes(trackingController))

// ── Inicializar socket
const trackingSocket = new TrackingSocket(io, { historialService })
trackingSocket.init()

// ── Arrancar
const PORT = process.env.PORT || 3003
server.listen(PORT, () => {
  console.log(`Tracking service (Hexagonal) corriendo en puerto ${PORT}`)
})