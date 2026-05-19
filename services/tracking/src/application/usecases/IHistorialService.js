/**
 * Puerto de salida — IHistorialService
 * Abstrae el almacenamiento del historial de chat (Redis)
 */
class IHistorialService {
  async guardarMensaje(roomId, mensaje) { throw new Error('Not implemented') }
  async obtenerHistorial(roomId)        { throw new Error('Not implemented') }
}

module.exports = IHistorialService