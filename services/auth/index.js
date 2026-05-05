const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', servicio: 'auth' })
})

app.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body

    const roles = ['distribuidor', 'cliente', 'domiciliario', 'operador', 'admin']
    if (!roles.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' })
    }

    const { data: existe } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single()

    if (existe) {
      return res.status(400).json({ error: 'Email ya registrado' })
    }

    const hash = await bcrypt.hash(password, 10)

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert([{ nombre, email, password: hash, rol }])
      .select()
      .single()

    if (error) throw error

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ token, usuario: { id: usuario.id, nombre, email, rol } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const valido = await bcrypt.compare(password, usuario.password)
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
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
  } catch (error) {
    res.status(401).json({ valido: false, error: 'Token inválido' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Auth service corriendo en puerto ${PORT}`))