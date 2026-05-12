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

const ROLES = ['distribuidor', 'cliente', 'domiciliario', 'operador', 'admin', 'superadmin']

const verificarToken = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Token requerido' })
  try {
    req.usuario = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET)
    next()
  } catch { res.status(401).json({ error: 'Token inválido' }) }
}

async function enviarTelegram(chatId, mensaje) {
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'HTML' })
    })
  } catch (e) { console.error('Telegram error:', e.message) }
}

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'auth' }))

// ── REGISTRO ──
app.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, rol, empresa_id } = req.body
    if (!ROLES.includes(rol)) return res.status(400).json({ error: 'Rol inválido' })
    if (['admin','operador','domiciliario','distribuidor'].includes(rol) && !empresa_id)
      return res.status(400).json({ error: 'empresa_id requerido para este rol' })
    const { data: existe } = await supabase.from('usuarios').select('id').eq('email', email).single()
    if (existe) return res.status(400).json({ error: 'Email ya registrado' })
    const hash = await bcrypt.hash(password, 10)
    const insertar = { nombre, email, password: hash, rol }
    if (empresa_id) insertar.empresa_id = empresa_id
    const { data: usuario, error } = await supabase.from('usuarios').insert([insertar]).select().single()
    if (error) throw error
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre, empresa_id: usuario.empresa_id },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    )
    res.status(201).json({ token, usuario: { id: usuario.id, nombre, email, rol, empresa_id: usuario.empresa_id } })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// ── LOGIN ──
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const { data: usuario, error } = await supabase.from('usuarios').select('*').eq('email', email).single()
    if (error || !usuario) return res.status(401).json({ error: 'Credenciales inválidas' })
    const valido = await bcrypt.compare(password, usuario.password)
    if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' })

    // Cargar datos de la empresa si tiene
    let empresa = null
    if (usuario.empresa_id) {
      const { data: emp } = await supabase.from('empresas')
        .select('id, nombre, color1, color2, emoji, logo_url')
        .eq('id', usuario.empresa_id).single()
      empresa = emp
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre, empresa_id: usuario.empresa_id },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    )
    res.json({
      token,
      usuario: {
        id: usuario.id, nombre: usuario.nombre, email: usuario.email,
        rol: usuario.rol, empresa_id: usuario.empresa_id,
        empresa_nombre: empresa?.nombre,
        empresa_color1: empresa?.color1 || '#667eea',
        empresa_color2: empresa?.color2 || '#764ba2',
        empresa_emoji:  empresa?.emoji  || '🏢',
      }
    })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// ── VERIFICAR TOKEN ──
app.post('/verificar', (req, res) => {
  try {
    const decoded = jwt.verify(req.body.token, process.env.JWT_SECRET)
    res.json({ valido: true, usuario: decoded })
  } catch { res.status(401).json({ valido: false, error: 'Token inválido' }) }
})

// ── PERFIL ──
app.get('/perfil', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('usuarios')
      .select('id, nombre, email, rol, created_at, telegram_chat_id, empresa_id')
      .eq('id', req.usuario.id).single()
    if (error) throw error
    res.json(data)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// ── USUARIOS (filtrado por empresa) ──
app.get('/usuarios', verificarToken, async (req, res) => {
  try {
    if (!['operador', 'admin', 'superadmin'].includes(req.usuario.rol))
      return res.status(403).json({ error: 'Sin permisos' })
    let query = supabase.from('usuarios').select('id, nombre, email, rol, created_at, telegram_chat_id, empresa_id')
    if (req.usuario.rol !== 'superadmin' && req.usuario.empresa_id)
      query = query.eq('empresa_id', req.usuario.empresa_id)
    if (req.query.rol) query = query.eq('rol', req.query.rol)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// ── TELEGRAM: vincular ──
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
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// ── TELEGRAM: notificar ──
app.post('/telegram/notify', async (req, res) => {
  try {
    const { user_id, mensaje } = req.body
    if (!user_id || !mensaje) return res.status(400).json({ error: 'Faltan datos' })
    const { data: usuario } = await supabase.from('usuarios').select('telegram_chat_id').eq('id', user_id).single()
    if (usuario?.telegram_chat_id) {
      await enviarTelegram(usuario.telegram_chat_id, mensaje)
      res.json({ ok: true, enviado: true })
    } else {
      res.json({ ok: true, enviado: false })
    }
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// ── TELEGRAM: webhook ──
app.post('/telegram/webhook', async (req, res) => {
  res.sendStatus(200)
  const msg = req.body?.message
  if (!msg) return
  const chatId = msg.chat.id
  if ((msg.text || '').startsWith('/start')) {
    await enviarTelegram(chatId,
      `👋 ¡Hola! Soy el bot de <b>RAVEN Domicilios</b> 🚀\n\nTu <b>Chat ID</b> es:\n\n<code>${chatId}</code>\n\n📋 Cópialo y pégalo en tu perfil de RAVEN para activar notificaciones 🔔`
    )
  }
})

// ══════════════════════════════════════
// EMPRESAS
// ══════════════════════════════════════

// GET /empresas — todas (superadmin)
app.get('/empresas', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'superadmin') return res.status(403).json({ error: 'Solo superadmin' })
    const { data, error } = await supabase.from('empresas').select('*').order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// GET /empresas/publicas — activas (para cliente)
app.get('/empresas/publicas', async (req, res) => {
  try {
    const { data, error } = await supabase.from('empresas')
      .select('id, nombre, logo_url, emoji, color1, color2')
      .eq('activa', true).order('nombre')
    if (error) throw error
    res.json(data)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// POST /empresas — crear empresa + admin (superadmin)
app.post('/empresas', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'superadmin') return res.status(403).json({ error: 'Solo superadmin' })
    const { nombre, admin_nombre, admin_email, admin_password } = req.body
    if (!nombre || !admin_email || !admin_password) return res.status(400).json({ error: 'Faltan datos' })
    const { data: empresa, error: errEmp } = await supabase.from('empresas').insert([{ nombre }]).select().single()
    if (errEmp) throw errEmp
    const hash = await bcrypt.hash(admin_password, 10)
    const { data: admin, error: errAdmin } = await supabase.from('usuarios').insert([{
      nombre: admin_nombre || `Admin ${nombre}`,
      email: admin_email, password: hash, rol: 'admin', empresa_id: empresa.id,
    }]).select().single()
    if (errAdmin) throw errAdmin
    res.status(201).json({ empresa, admin: { id: admin.id, nombre: admin.nombre, email: admin.email } })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// PATCH /empresas/:id — activar/desactivar (superadmin)
app.patch('/empresas/:id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'superadmin') return res.status(403).json({ error: 'Solo superadmin' })
    const { activa } = req.body
    const { data, error } = await supabase.from('empresas').update({ activa }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json(data)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// PATCH /empresas/:id/personalizar — colores y nombre (admin de la empresa)
app.patch('/empresas/:id/personalizar', verificarToken, async (req, res) => {
  try {
    const empresaId = req.params.id
    if (req.usuario.rol !== 'superadmin' && (req.usuario.rol !== 'admin' || req.usuario.empresa_id !== empresaId))
      return res.status(403).json({ error: 'Sin permisos' })
    const { color1, color2, emoji, nombre } = req.body
    const update = {}
    if (color1) update.color1 = color1
    if (color2) update.color2 = color2
    if (emoji)  update.emoji  = emoji
    if (nombre) update.nombre = nombre
    const { data, error } = await supabase.from('empresas').update(update).eq('id', empresaId).select().single()
    if (error) throw error
    res.json(data)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

// POST /empresas/:id/usuarios — agregar usuario a empresa (admin)
app.post('/empresas/:id/usuarios', verificarToken, async (req, res) => {
  try {
    const empresaId = req.params.id
    if (req.usuario.rol !== 'superadmin' && (req.usuario.rol !== 'admin' || req.usuario.empresa_id !== empresaId))
      return res.status(403).json({ error: 'Sin permisos' })
    const { nombre, email, password, rol } = req.body
    if (!['operador','domiciliario','distribuidor'].includes(rol))
      return res.status(400).json({ error: 'Rol inválido para empresa' })
    const { data: existe } = await supabase.from('usuarios').select('id').eq('email', email).single()
    if (existe) return res.status(400).json({ error: 'Email ya registrado' })
    const hash = await bcrypt.hash(password, 10)
    const { data: usuario, error } = await supabase.from('usuarios').insert([{
      nombre, email, password: hash, rol, empresa_id: empresaId
    }]).select().single()
    if (error) throw error
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre, empresa_id: empresaId },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    )
    res.status(201).json({ token, usuario: { id: usuario.id, nombre, email, rol, empresa_id: empresaId } })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }) }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, async () => {
  console.log(`Auth service corriendo en puerto ${PORT}`)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.AUTH_URL) {
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `${process.env.AUTH_URL}/telegram/webhook` })
      })
      console.log('Telegram webhook registrado')
    } catch (e) { console.error('Webhook error:', e.message) }
  }
})