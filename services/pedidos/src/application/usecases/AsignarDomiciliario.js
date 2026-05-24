/**
 * Caso de uso: AsignarDomiciliario
 */
class AsignarDomiciliario {
  constructor({ pedidoRepository, notificacionService, eventoService }) {
    this.pedidoRepo      = pedidoRepository
    this.notificacionSvc = notificacionService
    this.eventoSvc       = eventoService
  }

  async execute({ pedido_id, domiciliario_id }, solicitante) {
    if (!['operador', 'admin'].includes(solicitante.rol))
      throw new Error('Sin permisos para asignar domiciliarios')

    const pedido = await this.pedidoRepo.asignarDomiciliario(pedido_id, domiciliario_id)

    // Notificación síncrona directa al domiciliario
    const msg = `🛵 <b>¡Nuevo pedido asignado!</b>\n\n📦 ${pedido.descripcion || 'Sin descripción'}\n👤 ${pedido.cliente_nombre}\n${pedido.telefono ? '📞 ' + pedido.telefono + '\n' : ''}📍 Recogida: ${pedido.direccion_origen}\n🏠 Entrega: ${pedido.direccion_entrega || pedido.direccion_destino}\n\n¡Abre RAVEN para navegar! 🗺️`
    await this.notificacionSvc.notificarUsuario(domiciliario_id, msg)

    // Publicar evento enriquecido a RabbitMQ
    await this.eventoSvc.publicar('pedido_asignado', {
      pedido_id:         pedido.id,
      domiciliario_id,
      descripcion:       pedido.descripcion,
      cliente_nombre:    pedido.cliente_nombre,
      direccion_origen:  pedido.direccion_origen,
      direccion_entrega: pedido.direccion_entrega || pedido.direccion_destino,
    })

    return pedido.toJSON()
  }
}

module.exports = AsignarDomiciliario