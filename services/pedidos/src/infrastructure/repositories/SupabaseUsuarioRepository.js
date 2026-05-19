const IUsuarioRepository = require('../../domain/repositories/IUsuarioRepository')

class SupabaseUsuarioRepository extends IUsuarioRepository {
  constructor(supabase) {
    super()
    this.supabase = supabase
  }

  async findDomiciliariosByEmpresa(empresaId) {
    const { data, error } = await this.supabase.from('usuarios')
      .select('id, nombre, email, rol').eq('rol', 'domiciliario').eq('empresa_id', empresaId)
      .order('nombre')
    if (error) throw error
    return data || []
  }

  async findOperadoresByEmpresa(empresaId) {
    const { data, error } = await this.supabase.from('usuarios')
      .select('id').eq('rol', 'operador').eq('empresa_id', empresaId)
    if (error) throw error
    return data || []
  }
}

module.exports = SupabaseUsuarioRepository