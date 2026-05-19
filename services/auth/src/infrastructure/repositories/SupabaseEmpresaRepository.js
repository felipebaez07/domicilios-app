const IEmpresaRepository = require('../../domain/repositories/IEmpresaRepository')
const Empresa = require('../../domain/entities/Empresa')

class SupabaseEmpresaRepository extends IEmpresaRepository {
  constructor(supabase) {
    super()
    this.supabase = supabase
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('empresas').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(e => this._toEntity(e))
  }

  async findAllPublicas() {
    const { data, error } = await this.supabase
      .from('empresas').select('id, nombre, logo_url, emoji, color1, color2')
      .eq('activa', true).order('nombre')
    if (error) throw error
    return (data || []).map(e => this._toEntity(e))
  }

  async findById(id) {
    const { data, error } = await this.supabase
      .from('empresas').select('*').eq('id', id).single()
    if (error || !data) return null
    return this._toEntity(data)
  }

  async create({ nombre }) {
    const { data, error } = await this.supabase
      .from('empresas').insert([{ nombre }]).select().single()
    if (error) throw error
    return this._toEntity(data)
  }

  async update(id, datos) {
    const { data, error } = await this.supabase
      .from('empresas').update(datos).eq('id', id).select().single()
    if (error) throw error
    return this._toEntity(data)
  }

  _toEntity(row) {
    return new Empresa({
      id:       row.id,
      nombre:   row.nombre,
      color1:   row.color1,
      color2:   row.color2,
      emoji:    row.emoji,
      logo_url: row.logo_url,
      activa:   row.activa,
    })
  }
}

module.exports = SupabaseEmpresaRepository