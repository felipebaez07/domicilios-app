const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

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
  res.json({ status: 'ok', servicio: 'pedidos' })
})

app.post('/pedidos', verificarToken, async (req, res) => {
  try {
    const { direccion_origen, direccion_destino, descripcion, lat_origen, lng_origen, lat_destino, lng_destino } = req.body

    const { data, error } = await supabase
      .from('pedidos')
      .insert([{
        distribuidor_id: req.usuario.id,
        direccion_origen,
        direccion_destino,
        descripcion,
        lat_origen,
        lng_origen,
        lat_destino,
        lng_destino,
        estado: 'pendiente'
      }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

app.get('/pedidos', verificarToken, async (req, res) => {
  try {
    let query = supabase.from('pedidos').select('*').order('created_at', { ascending: false })

    if (req.usuario.rol === 'distribuidor') {
      query = query.eq('distribuidor_id', req.usuario.id)
    }
    if (req.usuario.rol === 'domiciliario') {
      query = query.eq('domiciliario_id', req.usuario.id)
    }

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

app.patch('/pedidos/:id/estado', verificarToken, async (req, res) => {
  try {
    const { estado } = req.body
    const estados = ['pendiente', 'asignado', 'en_camino', 'entregado', 'cancelado']

    if (!estados.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const { data, error } = await supabase
      .from('pedidos')
      .update({ estado, updated_at: new Date() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

app.get('/pedidos/:id', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno' })
  }
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => console.log(`Pedidos service corriendo en puerto ${PORT}`))