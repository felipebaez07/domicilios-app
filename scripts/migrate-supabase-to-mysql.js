// Migración única: copia empresas/usuarios/pedidos de Supabase (Postgres) a MySQL (cPanel).
// Uso: node migrate-supabase-to-mysql.js
// Requiere variables de entorno: SUPABASE_URL, SUPABASE_KEY, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const mysql = require('mysql2/promise')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  await migrarEmpresas(pool)
  await migrarUsuarios(pool)
  await migrarPedidos(pool)

  await pool.end()
}

async function migrarEmpresas(pool) {
  const { data, error } = await supabase.from('empresas').select('*')
  if (error) throw error
  for (const e of data) {
    await pool.query(
      `INSERT INTO empresas (id, nombre, logo_url, activa, created_at, color1, color2, emoji)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), logo_url=VALUES(logo_url),
         activa=VALUES(activa), color1=VALUES(color1), color2=VALUES(color2), emoji=VALUES(emoji)`,
      [e.id, e.nombre, e.logo_url, e.activa, toMysqlDate(e.created_at), e.color1, e.color2, e.emoji]
    )
  }
  console.log(`empresas: ${data.length} filas procesadas`)
}

async function migrarUsuarios(pool) {
  const { data, error } = await supabase.from('usuarios').select('*')
  if (error) throw error
  for (const u of data) {
    await pool.query(
      `INSERT INTO usuarios (id, nombre, email, password, rol, created_at, telegram_chat_id, empresa_id, telefono)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), email=VALUES(email), password=VALUES(password),
         rol=VALUES(rol), telegram_chat_id=VALUES(telegram_chat_id), empresa_id=VALUES(empresa_id), telefono=VALUES(telefono)`,
      [u.id, u.nombre, u.email, u.password, u.rol, toMysqlDate(u.created_at), u.telegram_chat_id, u.empresa_id, u.telefono]
    )
  }
  console.log(`usuarios: ${data.length} filas procesadas`)
}

async function migrarPedidos(pool) {
  const { data, error } = await supabase.from('pedidos').select('*')
  if (error) throw error
  for (const p of data) {
    await pool.query(
      `INSERT INTO pedidos (id, distribuidor_id, domiciliario_id, direccion_origen, direccion_destino,
         descripcion, lat_origen, lng_origen, lat_destino, lng_destino, estado, created_at, updated_at,
         cliente_nombre, telefono, direccion_entrega, empresa_id, cliente_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE distribuidor_id=VALUES(distribuidor_id), domiciliario_id=VALUES(domiciliario_id),
         direccion_origen=VALUES(direccion_origen), direccion_destino=VALUES(direccion_destino),
         descripcion=VALUES(descripcion), lat_origen=VALUES(lat_origen), lng_origen=VALUES(lng_origen),
         lat_destino=VALUES(lat_destino), lng_destino=VALUES(lng_destino), estado=VALUES(estado),
         updated_at=VALUES(updated_at), cliente_nombre=VALUES(cliente_nombre), telefono=VALUES(telefono),
         direccion_entrega=VALUES(direccion_entrega), empresa_id=VALUES(empresa_id), cliente_id=VALUES(cliente_id)`,
      [p.id, p.distribuidor_id, p.domiciliario_id, p.direccion_origen, p.direccion_destino,
       p.descripcion, p.lat_origen, p.lng_origen, p.lat_destino, p.lng_destino, p.estado,
       toMysqlDate(p.created_at), toMysqlDate(p.updated_at),
       p.cliente_nombre, p.telefono, p.direccion_entrega, p.empresa_id, p.cliente_id]
    )
  }
  console.log(`pedidos: ${data.length} filas procesadas`)
}

function toMysqlDate(iso) {
  if (!iso) return null
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ')
}

main().then(() => {
  console.log('Migración completa.')
  process.exit(0)
}).catch(err => {
  console.error('Error en migración:', err)
  process.exit(1)
})
