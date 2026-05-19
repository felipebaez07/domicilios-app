/**
 * Caso de uso: ActualizarUbicacion
 * Procesa y emite la ubicación GPS del domiciliario
 */
const Ubicacion = require('../../domain/entities/Ubicacion')

class ActualizarUbicacion {
  execute(datos) {
    const ubicacion = new Ubicacion(datos)
    if (!ubicacion.esValida()) throw new Error('Ubicación inválida')
    return ubicacion
  }
}

module.exports = ActualizarUbicacion