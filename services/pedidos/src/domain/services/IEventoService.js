/**
 * Puerto de salida — IEventoService (RabbitMQ)
 */
class IEventoService {
  async publicar(tipo, datos) { throw new Error('Not implemented') }
}

module.exports = IEventoService