/**
 * Puerto de salida — IUsuarioRepository (para pedidos service)
 */
class IUsuarioRepository {
  async findDomiciliariosByEmpresa(empresaId) { throw new Error('Not implemented') }
  async findOperadoresByEmpresa(empresaId)    { throw new Error('Not implemented') }
}

module.exports = IUsuarioRepository