const IUsuarioRepository = require('../../domain/repositories/IUsuarioRepository')

class MySqlUsuarioRepository extends IUsuarioRepository {
  constructor(pool) {
    super()
    this.pool = pool
  }

  async findDomiciliariosByEmpresa(empresaId) {
    const [rows] = await this.pool.query(
      "SELECT id, nombre, email, rol FROM usuarios WHERE rol = 'domiciliario' AND empresa_id = ? ORDER BY nombre",
      [empresaId]
    )
    return rows
  }

  async findOperadoresByEmpresa(empresaId) {
    const [rows] = await this.pool.query(
      "SELECT id FROM usuarios WHERE rol = 'operador' AND empresa_id = ?",
      [empresaId]
    )
    return rows
  }
}

module.exports = MySqlUsuarioRepository
