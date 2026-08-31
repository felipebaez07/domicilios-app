require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const amqplib  = require('amqplib')

// ── Infraestructura: config
const pool = require('./src/infrastructure/config/mysql')

// ── Infraestructura: repositorios
const MySqlPedidoRepository  = require('./src/infrastructure/repositories/MySqlPedidoRepository')
const MySqlUsuarioRepository = require('./src/infrastructure/repositories/MySqlUsuarioRepository')

// ── Infraestructura: servicios
const HttpNotificacionService  = require('./src/infrastructure/services/HttpNotificacionService')
const RabbitMQEventoService    = require('./src/infrastructure/services/RabbitMQEventoService')

// ── Infraestructura: HTTP
const PedidoController  = require('./src/infrastructure/http/controllers/PedidoController')
const UsuarioController = require('./src/infrastructure/http/controllers/UsuarioController')
const pedidoRoutes      = require('./src/infrastructure/http/routes/pedidoRoutes')
const usuarioRoutes     = require('./src/infrastructure/http/routes/usuarioRoutes')

// ── RabbitMQ
let rabbitChannel = null
async function conectarRabbitMQ() {
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL)
    rabbitChannel = await conn.createChannel()
    await rabbitChannel.assertQueue('pedidos_eventos', { durable: true })
    console.log('RabbitMQ conectado')
  } catch (e) {
    console.error('RabbitMQ error:', e.message)
    setTimeout(conectarRabbitMQ, 5000)
  }
}

// ── Ensamblar dependencias (Dependency Injection)
const pedidoRepository  = new MySqlPedidoRepository(pool)
const usuarioRepository = new MySqlUsuarioRepository(pool)
const notificacionService = new HttpNotificacionService()

// eventoService se inicializa después de conectar RabbitMQ
const eventoServiceProxy = {
  publicar: async (tipo, datos) => {
    const svc = new RabbitMQEventoService(rabbitChannel)
    return svc.publicar(tipo, datos)
  }
}

const pedidoController = new PedidoController({
  pedidoRepository,
  usuarioRepository,
  notificacionService,
  eventoService: eventoServiceProxy,
})

const usuarioController = new UsuarioController({ usuarioRepository })

// ── Express app
const app = express()
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }))
app.use(express.json())
// Nunca cachear respuestas de la API: un proxy delante que ignore
// Authorization podria servirle a un usuario la respuesta de otro.
app.use((req, res, next) => { res.set('Cache-Control', 'no-store, private'); next() })

app.use('/', pedidoRoutes(pedidoController))
app.use('/', usuarioRoutes(usuarioController))

// ── Arrancar
const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`Pedidos service (Hexagonal) corriendo en puerto ${PORT}`)
  conectarRabbitMQ()
})