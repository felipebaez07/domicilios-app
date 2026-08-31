/**
 * Caso de uso: ObtenerRanking
 * Ranking de domiciliarios de una empresa por entregas completadas
 */
class ObtenerRanking {
  constructor({ pedidoRepository }) {
    this.pedidoRepo = pedidoRepository
  }

  async execute(empresaId) {
    return this.pedidoRepo.getRanking(empresaId)
  }
}

module.exports = ObtenerRanking
