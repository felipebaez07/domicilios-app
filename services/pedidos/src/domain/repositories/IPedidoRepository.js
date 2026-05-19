/**
 * Puerto de salida — IPedidoRepository
 */
class IPedidoRepository {
  async findById(id)                        { throw new Error('Not implemented') }
  async findByDistribuidor(distribuidorId)  { throw new Error('Not implemented') }
  async findByDomiciliario(domiciliarioId)  { throw new Error('Not implemented') }
  async findByCliente(clienteId)            { throw new Error('Not implemented') }
  async findByEmpresa(empresaId)            { throw new Error('Not implemented') }
  async findAll()                           { throw new Error('Not implemented') }
  async create(datos)                       { throw new Error('Not implemented') }
  async updateEstado(id, estado)            { throw new Error('Not implemented') }
  async asignarDomiciliario(id, domId)      { throw new Error('Not implemented') }
}

module.exports = IPedidoRepository