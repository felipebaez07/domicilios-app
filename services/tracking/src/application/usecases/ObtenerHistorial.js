/**
 * Caso de uso: ObtenerHistorial
 */
class ObtenerHistorial {
  constructor({ historialService }) {
    this.historialSvc = historialService
  }

  async execute(roomId) {
    if (!roomId) throw new Error('roomId requerido')
    return this.historialSvc.obtenerHistorial(roomId)
  }
}

module.exports = ObtenerHistorial