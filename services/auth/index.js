require('dotenv').config()
const express = require('express')
const cors    = require('cors')

// ── Infraestructura: config
const supabase      = require('./src/infrastructure/config/supabase')
const tokenService  = require('./src/infrastructure/config/jwt')
const passwordService = require('./src/infrastructure/config/password')

// ── Infraestructura: repositorios (adaptadores de salida)
const SupabaseUsuarioRepository = require('./src/infrastructure/repositories/SupabaseUsuarioRepository')
const SupabaseEmpresaRepository = require('./src/infrastructure/repositories/SupabaseEmpresaRepository')

// ── Infraestructura: servicios externos (adaptadores de salida)
const TelegramNotificacionService = require('./src/infrastructure/services/TelegramNotificacionService')

// ── Infraestructura: HTTP (adaptadores de entrada)
const AuthController    = require('./src/infrastructure/http/controllers/AuthController')
const EmpresaController = require('./src/infrastructure/http/controllers/EmpresaController')
const authRoutes        = require('./src/infrastructure/http/routes/authRoutes')
const empresaRoutes     = require('./src/infrastructure/http/routes/empresaRoutes')

// ── Ensamblar dependencias (Dependency Injection manual)
const usuarioRepository    = new SupabaseUsuarioRepository(supabase)
const empresaRepository    = new SupabaseEmpresaRepository(supabase)
const notificacionService  = new TelegramNotificacionService(supabase)

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
app.use(express.json())

// ── Rutas
app.use('/', authRoutes(authController))
app.use('/', empresaRoutes(empresaController))

// ── Arrancar
const PORT = process.env.PORT || 3001
app.listen(PORT, async () => {
  console.log(`Auth service (Hexagonal) corriendo en puerto ${PORT}`)

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