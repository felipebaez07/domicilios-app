const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const ws = require('ws')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const app = express()
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"] }))
app.use(express.json())

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  realtime: { transport: ws }
})

const ROLES = ['distribuidor', 'cliente', 'domiciliario', 'operador', 'admin']

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

// ── TELEGRAM ──
async function enviarTelegram(chatId, mensaje) {
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'HTML' })
    })
  } catch (e) { console.error('Telegram error:', e.message) }
}

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'auth' }))

app.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body
    if (!ROLES.includes(rol)) return res.status(400).json({ error: 'Rol inválido' })
    const { data: existe } = await supabase.from('usuarios').select('id').eq('email', email).single()
    if (existe) return res.status(400).json({ error: 'Email ya registrado' })
    const hash = await bcrypt.hash(password, 10)
    const { data: usuario, error } = await supabase.from('usuarios').insert([{ nombre, email, password: hash, rol }]).select().single()
    if (error) throw error
    const token = jwt.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({ token, usuario: { id: usuario.id, nombre, email, rol } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const { data: usuario, error } = await supabase.from('usuarios').select('*').eq('email', email).single()
    if (error || !usuario) return res.status(401).json({ error: 'Credenciales inválidas' })
    const valido = await bcrypt.compare(password, usuario.password)
    if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' })
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

app.post('/verificar', (req, res) => {
  try {
    const { token } = req.body
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    res.json({ valido: true, usuario: decoded })
  } catch {
    res.status(401).json({ valido: false, error: 'Token inválido' })
  }
})

// GET /usuarios
app.get('/usuarios', verificarToken, async (req, res) => {
  try {
    if (!['operador', 'admin'].includes(req.usuario.rol))
      return res.status(403).json({ error: 'Sin permisos' })
    let query = supabase.from('usuarios').select('id, nombre, email, rol, created_at, telegram_chat_id')
    if (req.query.rol) query = query.eq('rol', req.query.rol)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

// GET /perfil
app.get('/perfil', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('usuarios')
      .select('id, nombre, email, rol, created_at, telegram_chat_id')
      .eq('id', req.usuario.id).single()
    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

// PATCH /perfil/telegram
app.patch('/perfil/telegram', verificarToken, async (req, res) => {
  try {
    const { telegram_chat_id } = req.body
    if (!telegram_chat_id) return res.status(400).json({ error: 'chat_id requerido' })
    const { data, error } = await supabase.from('usuarios')
      .update({ telegram_chat_id: String(telegram_chat_id) })
      .eq('id', req.usuario.id).select().single()
    if (error) throw error
    await enviarTelegram(telegram_chat_id,
      `✅ <b>¡Telegram vinculado!</b>\n\nHola <b>${req.usuario.nombre}</b>, recibirás notificaciones de RAVEN aquí.\n\n🚀 ¡Listo para trabajar!`
    )
    res.json({ ok: true, telegram_chat_id: data.telegram_chat_id })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

// POST /telegram/notify — pedidos service llama esto para notificar
app.post('/telegram/notify', async (req, res) => {
  try {
    const { user_id, mensaje } = req.body
    if (!user_id || !mensaje) return res.status(400).json({ error: 'Faltan datos' })
    const { data: usuario } = await supabase.from('usuarios')
      .select('telegram_chat_id').eq('id', user_id).single()
    if (usuario?.telegram_chat_id) {
      await enviarTelegram(usuario.telegram_chat_id, mensaje)
      res.json({ ok: true, enviado: true })
    } else {
      res.json({ ok: true, enviado: false, motivo: 'Sin telegram vinculado' })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

// POST /telegram/webhook — Telegram llama esto cuando el usuario escribe /start
app.post('/telegram/webhook', async (req, res) => {
  res.sendStatus(200)
  const msg = req.body?.message
  if (!msg) return
  const chatId = msg.chat.id
  const text = msg.text || ''
  if (text.startsWith('/start')) {
    await enviarTelegram(chatId,
      `👋 ¡Hola! Soy el bot de <b>RAVEN Domicilios</b> 🚀\n\n` +
      `Tu <b>Chat ID</b> es:\n\n<code>${chatId}</code>\n\n` +
      `📋 Cópialo y pégalo en tu perfil de RAVEN para activar notificaciones 🔔`
    )
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, async () => {
  console.log(`Auth service corriendo en puerto ${PORT}`)
  // Registrar webhook de Telegram automáticamente
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