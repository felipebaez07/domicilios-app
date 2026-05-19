/**
 * Puerto de salida — IEmpresaRepository
 */
class IEmpresaRepository {
  async findAll()              { throw new Error('Not implemented') }
  async findAllPublicas()      { throw new Error('Not implemented') }
  async findById(id)           { throw new Error('Not implemented') }
  async create(datos)          { throw new Error('Not implemented') }
  async update(id, datos)      { throw new Error('Not implemented') }
}

module.exports = IEmpresaRepository