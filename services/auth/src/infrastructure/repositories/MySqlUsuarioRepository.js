const { randomUUID } = require('crypto')
const IUsuarioRepository = require('../../domain/repositories/IUsuarioRepository')
const Usuario = require('../../domain/entities/Usuario')

class MySqlUsuarioRepository extends IUsuarioRepository {
  constructor(pool) {
    super()
    this.pool = pool
  }

  async findByEmail(email) {
    const [rows] = await this.pool.query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email])
    if (!rows[0]) return null
    return this._toEntity(rows[0])
  }

  async findById(id) {
    const [rows] = await this.pool.query(
      'SELECT id, nombre, email, rol, empresa_id, telegram_chat_id, created_at FROM usuarios WHERE id = ? LIMIT 1',
      [id]
    )
    if (!rows[0]) return null
    return this._toEntity(rows[0])
  }

  async findByEmpresa(empresaId, rol = null) {
    let sql = 'SELECT id, nombre, email, rol, empresa_id, telegram_chat_id FROM usuarios WHERE empresa_id = ?'
    const params = [empresaId]
    if (rol) { sql += ' AND rol = ?'; params.push(rol) }
    sql += ' ORDER BY nombre'
    const [rows] = await this.pool.query(sql, params)
    return rows.map(u => this._toEntity(u))
  }

  async create({ nombre, email, passwordHash, rol, empresa_id, telefono }) {
    const id = randomUUID()
    await this.pool.query(
      'INSERT INTO usuarios (id, nombre, email, password, rol, empresa_id, telefono) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, nombre, email, passwordHash, rol, empresa_id || null, telefono || null]
    )
    return this.findById(id)
  }

  async updateTelegram(id, chatId) {
    await this.pool.query('UPDATE usuarios SET telegram_chat_id = ? WHERE id = ?', [chatId, id])
  }

  async listAll(filtros = {}) {
    let sql = 'SELECT id, nombre, email, rol, created_at, telegram_chat_id, empresa_id FROM usuarios WHERE 1=1'
    const params = []
    if (filtros.empresa_id) { sql += ' AND empresa_id = ?'; params.push(filtros.empresa_id) }
    if (filtros.rol)        { sql += ' AND rol = ?';        params.push(filtros.rol) }
    sql += ' ORDER BY created_at DESC'
    const [rows] = await this.pool.query(sql, params)
    return rows.map(u => this._toEntity(u))
  }

  // Convierte fila de BD → entidad del dominio
  _toEntity(row) {
    return new Usuario({
      id:               row.id,
      nombre:           row.nombre,
      email:            row.email,
      rol:              row.rol,
      empresa_id:       row.empresa_id,
      telegram_chat_id: row.telegram_chat_id,
    })
  }

  // Para login necesitamos el hash — método especial solo en infraestructura
  async findByEmailWithPassword(email) {
    const [rows] = await this.pool.query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email])
    if (!rows[0]) return null
    const usuario = this._toEntity(rows[0])
    usuario.passwordHash = rows[0].password // solo para Login use case
    return usuario
  }

  // Enriquece con datos de empresa
  async findByEmailWithEmpresa(email, empresaRepo) {
    const [rows] = await this.pool.query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email])
    if (!rows[0]) return null
    const data = rows[0]
    const usuario = this._toEntity(data)
    usuario.passwordHash = data.password

    if (data.empresa_id) {
      const empresa = await empresaRepo.findById(data.empresa_id)
      if (empresa) {
        usuario.empresa_nombre   = empresa.nombre
        usuario.empresa_color1   = empresa.color1
        usuario.empresa_color2   = empresa.color2
        usuario.empresa_emoji    = empresa.emoji
        usuario.empresa_logo_url = empresa.logo_url
      }
    }
    return usuario
  }
}

module.exports = MySqlUsuarioRepository
