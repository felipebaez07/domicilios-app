const IEventoService = require('../../domain/services/IEventoService')

/**
 * Adaptador de eventos — publica en RabbitMQ
 */
class RabbitMQEventoService extends IEventoService {
  constructor(channel) {
    super()
    this.channel = channel
    this.queue   = 'pedidos_eventos'
  }

  async publicar(tipo, datos) {
    if (!this.channel) return
    try {
      this.channel.sendToQueue(
        this.queue,
        Buffer.from(JSON.stringify({ tipo, ...datos }))
      )
    } catch (e) { console.error('RabbitMQ error:', e.message) }
  }
}

module.exports = RabbitMQEventoService