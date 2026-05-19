const IUsuarioRepository = require('../../domain/repositories/IUsuarioRepository')
const Usuario = require('../../domain/entities/Usuario')

class SupabaseUsuarioRepository extends IUsuarioRepository {
  constructor(supabase) {
    super()
    this.supabase = supabase
  }

  async findByEmail(email) {
    const { data, error } = await this.supabase
      .from('usuarios').select('*').eq('email', email).single()
    if (error || !data) return null
    return this._toEntity(data)
  }

  async findById(id) {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('id, nombre, email, rol, empresa_id, telegram_chat_id, created_at')
      .eq('id', id).single()
    if (error || !data) return null
    return this._toEntity(data)
  }

  async findByEmpresa(empresaId, rol = null) {
    let query = this.supabase.from('usuarios')
      .select('id, nombre, email, rol, empresa_id, telegram_chat_id')
      .eq('empresa_id', empresaId)
    if (rol) query = query.eq('rol', rol)
    const { data, error } = await query.order('nombre')
    if (error) throw error
    return (data || []).map(u => this._toEntity(u))
  }

  async create({ nombre, email, passwordHash, rol, empresa_id, telefono }) {
    const insertar = { nombre, email, password: passwordHash, rol }
    if (empresa_id) insertar.empresa_id = empresa_id
    if (telefono)   insertar.telefono   = telefono

    const { data, error } = await this.supabase
      .from('usuarios').insert([insertar]).select().single()
    if (error) throw error
    return this._toEntity(data)
  }

  async updateTelegram(id, chatId) {
    const { error } = await this.supabase
      .from('usuarios').update({ telegram_chat_id: chatId }).eq('id', id)
    if (error) throw error
  }

  async listAll(filtros = {}) {
    let query = this.supabase.from('usuarios')
      .select('id, nombre, email, rol, created_at, telegram_chat_id, empresa_id')
    if (filtros.empresa_id) query = query.eq('empresa_id', filtros.empresa_id)
    if (filtros.rol)        query = query.eq('rol', filtros.rol)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(u => this._toEntity(u))
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
    const { data, error } = await this.supabase
      .from('usuarios').select('*').eq('email', email).single()
    if (error || !data) return null
    const usuario = this._toEntity(data)
    usuario.passwordHash = data.password // solo para Login use case
    return usuario
  }

  // Enriquece con datos de empresa
  async findByEmailWithEmpresa(email, empresaRepo) {
    const { data, error } = await this.supabase
      .from('usuarios').select('*').eq('email', email).single()
    if (error || !data) return null
    const usuario = this._toEntity(data)
    usuario.passwordHash = data.password

    if (data.empresa_id) {
      const empresa = await empresaRepo.findById(data.empresa_id)
      if (empresa) {
        usuario.empresa_nombre = empresa.nombre
        usuario.empresa_color1 = empresa.color1
        usuario.empresa_color2 = empresa.color2
        usuario.empresa_emoji  = empresa.emoji
      }
    }
    return usuario
  }
}

module.exports = SupabaseUsuarioRepository