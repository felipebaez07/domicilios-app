require('dotenv').config()
const express = require('express')
const cors    = require('cors')

// ── Infraestructura: config
const pool          = require('./src/infrastructure/config/mysql')
const tokenService  = require('./src/infrastructure/config/jwt')
const passwordService = require('./src/infrastructure/config/password')

// ── Infraestructura: repositorios (adaptadores de salida)
const MySqlUsuarioRepository = require('./src/infrastructure/repositories/MySqlUsuarioRepository')
const MySqlEmpresaRepository = require('./src/infrastructure/repositories/MySqlEmpresaRepository')

// ── Infraestructura: servicios externos (adaptadores de salida)
const TelegramNotificacionService = require('./src/infrastructure/services/TelegramNotificacionService')

// ── Infraestructura: HTTP (adaptadores de entrada)
const AuthController    = require('./src/infrastructure/http/controllers/AuthController')
const EmpresaController = require('./src/infrastructure/http/controllers/EmpresaController')
const authRoutes        = require('./src/infrastructure/http/routes/authRoutes')
const empresaRoutes     = require('./src/infrastructure/http/routes/empresaRoutes')

// ── Ensamblar dependencias (Dependency Injection manual)
const usuarioRepository    = new MySqlUsuarioRepository(pool)
const empresaRepository    = new MySqlEmpresaRepository(pool)
const notificacionService  = new TelegramNotificacionService(usuarioRepository)

const authController = new AuthController({
  usuarioRepository,
  empresaRepository,
  tokenService,
  passwordService,
  notificacionService,
})
// Inyectar tokenService para el verify
authController.tokenService = tokenService
authController.notificacionService = notificacionService

const empresaController = new EmpresaController({
  usuarioRepository,
  empresaRepository,
  passwordService,
  tokenService,
})

// ── Express app
const app = express()
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }))
// Limite mas alto que el default (100kb): el logo de la empresa viaja
// como base64 dentro del body de /empresas/:id/personalizar.
app.use(express.json({ limit: '3mb' }))
// Nunca cachear respuestas de la API: un proxy delante que ignore
// Authorization podria servirle a un usuario la respuesta de otro.
app.use((req, res, next) => { res.set('Cache-Control', 'no-store, private'); next() })

// ── Rutas
app.use('/', authRoutes(authController))
app.use('/', empresaRoutes(empresaController))

// ── Arrancar
const PORT = process.env.PORT || 3001
app.listen(PORT, async () => {
  console.log(`Auth service (Hexagonal) corriendo en puerto ${PORT}`)

  // logo_url se guardaba como URL corta (Supabase Storage); ahora tiene
  // que caber una imagen en base64. Ensanchar la columna es seguro de
  // repetir en cada arranque (no hay como correr una migracion aparte
  // sin acceso directo al servidor).
  try {
    await pool.query('ALTER TABLE empresas MODIFY COLUMN logo_url MEDIUMTEXT')
    console.log('Columna empresas.logo_url verificada (MEDIUMTEXT)')
  } catch (e) { console.error('No se pudo verificar empresas.logo_url:', e.message) }

  // Registrar webhook de Telegram
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.AUTH_URL) {
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `${process.env.AUTH_URL}/telegram/webhook` })
      })
      console.log('Telegram webhook registrado')
    } catch (e) { console.error('Webhook error:', e.message) }
  }
})