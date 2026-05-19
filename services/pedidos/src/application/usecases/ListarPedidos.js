/**
 * Caso de uso: ListarPedidos
 * Filtra según el rol del solicitante
 */
class ListarPedidos {
  constructor({ pedidoRepository }) {
    this.pedidoRepo = pedidoRepository
  }

  async execute(solicitante, filtros = {}) {
    let pedidos = []

    switch (solicitante.rol) {
      case 'distribuidor':
        pedidos = await this.pedidoRepo.findByDistribuidor(solicitante.id)
        break
      case 'domiciliario':
        pedidos = await this.pedidoRepo.findByDomiciliario(solicitante.id)
        break
      case 'cliente':
        pedidos = await this.pedidoRepo.findByCliente(solicitante.id)
        break
      case 'admin':
      case 'operador':
        pedidos = await this.pedidoRepo.findByEmpresa(solicitante.empresa_id)
        break
      case 'superadmin':
        pedidos = await this.pedidoRepo.findAll()
        break
      default:
        throw new Error('Rol no autorizado para listar pedidos')
    }

    // Filtro adicional por estado si viene en filtros
    if (filtros.estado) pedidos = pedidos.filter(p => p.estado === filtros.estado)

    return pedidos.map(p => p.toJSON())
  }
}

module.exports = ListarPedidos