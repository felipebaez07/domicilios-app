/**
 * Caso de uso: CrearPedido
 */
const { Pedido } = require('../../domain/entities/Pedido')

class CrearPedido {
  constructor({ pedidoRepository, usuarioRepository, notificacionService, eventoService }) {
    this.pedidoRepo        = pedidoRepository
    this.usuarioRepo       = usuarioRepository
    this.notificacionSvc   = notificacionService
    this.eventoSvc         = eventoService
  }

  async execute(datos, solicitante) {
    const {
      descripcion, cliente_nombre, telefono,
      direccion_origen, direccion_destino, direccion_entrega,
      lat_origen, lng_origen, lat_destino, lng_destino,
      empresa_id,
    } = datos

    const pedido = await this.pedidoRepo.create({
      distribuidor_id:   solicitante.rol === 'distribuidor' ? solicitante.id : null,
      cliente_id:        solicitante.rol === 'cliente'      ? solicitante.id : null,
      empresa_id:        empresa_id || solicitante.empresa_id || null,
      descripcion,
      cliente_nombre:    cliente_nombre || solicitante.nombre,
      telefono,
      direccion_origen:  direccion_origen  || direccion_entrega || 'No especificado',
      direccion_destino: direccion_destino || direccion_entrega || 'No especificado',
      direccion_entrega: direccion_entrega || direccion_destino,
      lat_origen, lng_origen, lat_destino, lng_destino,
      estado: 'pendiente',
    })

    // Obtener operadores de la empresa para notificarlos
    let operador_ids = []
    if (pedido.empresa_id) {
      const operadores = await this.usuarioRepo.findOperadoresByEmpresa(pedido.empresa_id)
      operador_ids = operadores.map(op => op.id)

      // Notificación síncrona directa (Telegram via auth)
      const msg = `📦 <b>Nuevo pedido</b>\n\n👤 Cliente: <b>${pedido.cliente_nombre}</b>\n📍 Recogida: ${pedido.direccion_origen}\n🏠 Entrega: ${pedido.direccion_destino}\n\n⚡ Asígnalo en RAVEN`
      for (const op of operadores) await this.notificacionSvc.notificarUsuario(op.id, msg)
    }

    // Publicar evento enriquecido a RabbitMQ (para el servicio de notificaciones)
    await this.eventoSvc.publicar('pedido_creado', {
      pedido_id:        pedido.id,
      empresa_id:       pedido.empresa_id,
      cliente_nombre:   pedido.cliente_nombre,
      direccion_origen:  pedido.direccion_origen,
      direccion_destino: pedido.direccion_destino,
      operador_ids,          // ← quién debe recibir la notificación async
    })

    return pedido.toJSON()
  }
}

module.exports = CrearPedido