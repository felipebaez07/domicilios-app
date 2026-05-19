/**
 * Caso de uso: ActualizarEstado
 * Valida la transición de estado en el dominio
 */
const { ESTADOS_VALIDOS } = require('../../domain/entities/Pedido')

class ActualizarEstado {
  constructor({ pedidoRepository, notificacionService, eventoService }) {
    this.pedidoRepo      = pedidoRepository
    this.notificacionSvc = notificacionService
    this.eventoSvc       = eventoService
  }

  async execute({ pedido_id, estado }) {
    if (!ESTADOS_VALIDOS.includes(estado))
      throw new Error('Estado inválido')

    // Obtener pedido actual para validar transición
    const pedidoActual = await this.pedidoRepo.findById(pedido_id)
    if (!pedidoActual) throw new Error('Pedido no encontrado')

    if (!pedidoActual.puedeTransicionarA(estado))
      throw new Error(`No se puede cambiar de ${pedidoActual.estado} a ${estado}`)

    const pedido = await this.pedidoRepo.updateEstado(pedido_id, estado)

    await this.eventoSvc.publicar('estado_actualizado', { pedido_id: pedido.id, estado })

    // Notificaciones según el nuevo estado
    if (estado === 'entregado' && pedido.distribuidor_id) {
      await this.notificacionSvc.notificarUsuario(pedido.distribuidor_id,
        `✅ <b>¡Pedido entregado!</b>\n\n📦 ${pedido.descripcion || ''}\n🏠 ${pedido.direccion_entrega || pedido.direccion_destino}\n\n¡Tu envío llegó exitosamente! 🎉`)
    }
    if (estado === 'en_camino' && pedido.distribuidor_id) {
      await this.notificacionSvc.notificarUsuario(pedido.distribuidor_id,
        `🛵 <b>¡En camino!</b>\n\nTu pedido está siendo entregado.\n📦 ${pedido.descripcion || ''}`)
    }

    return pedido.toJSON()
  }
}

module.exports = ActualizarEstado