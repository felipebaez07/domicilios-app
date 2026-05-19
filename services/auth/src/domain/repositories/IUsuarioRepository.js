/**
 * Puerto de salida — IUsuarioRepository
 * Define el contrato que debe cumplir cualquier implementación
 * El dominio solo conoce esta interfaz, no Supabase ni ninguna BD
 */
class IUsuarioRepository {
  async findByEmail(email)           { throw new Error('Not implemented') }
  async findById(id)                 { throw new Error('Not implemented') }
  async findByEmpresa(empresaId, rol){ throw new Error('Not implemented') }
  async create(datos)                { throw new Error('Not implemented') }
  async updateTelegram(id, chatId)   { throw new Error('Not implemented') }
  async listAll(filtros)             { throw new Error('Not implemented') }
}

module.exports = IUsuarioRepository