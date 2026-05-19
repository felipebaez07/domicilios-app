/**
 * Caso de uso: EnviarMensaje
 * Crea y persiste un mensaje de chat
 */
const Mensaje = require('../../domain/entities/Mensaje')

class EnviarMensaje {
  constructor({ historialService }) {
    this.historialSvc = historialService
  }

  async execute(datos) {
    const mensaje = new Mensaje(datos)
    const roomId  = mensaje.getRoomId()
    await this.historialSvc.guardarMensaje(roomId, mensaje)
    return { mensaje, roomId }
  }
}

module.exports = EnviarMensaje