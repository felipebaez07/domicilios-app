const jwt               = require('jsonwebtoken')
const ActualizarUbicacion = require('../../application/usecases/ActualizarUbicacion')
const EnviarMensaje       = require('../../application/usecases/EnviarMensaje')

/**
 * Adaptador de entrada — Socket.io
 * Maneja GPS en tiempo real y chat
 */
class TrackingSocket {
  constructor(io, { historialService }) {
    this.io              = io
    this.usuarios        = new Map() // socketId → usuario
    this.actualizarUC    = new ActualizarUbicacion()
    this.enviarMensajeUC = new EnviarMensaje({ historialService })
  }

  init() {
    // Middleware de autenticación
    this.io.use((socket, next) => {
      try {
        const token   = socket.handshake.auth?.token
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        socket.usuario = payload
        next()
      } catch {
        next(new Error('Token inválido'))
      }
    })

    this.io.on('connection', (socket) => {
      const u = socket.usuario
      console.log(`Conectado: ${u.email} (${u.rol})`)

      // Registrar usuario conectado
      this.usuarios.set(socket.id, { id: u.id, nombre: u.nombre, rol: u.rol, email: u.email })
      socket.join(`user:${u.id}`)
      this._emitirUsuariosConectados()

      // ── GPS: actualizar ubicación ──
      socket.on('location_update', (datos) => {
        try {
          const ubicacion = this.actualizarUC.execute({
            ...datos,
            domiciliario_id: datos.domiciliario_id || u.id,
            nombre:          datos.nombre || u.nombre,
          })
          // Emitir a todos en la sala del pedido
          if (ubicacion.pedido_id) {
            socket.to(`pedido:${ubicacion.pedido_id}`).emit('location_update', ubicacion.toJSON())
          }
          // Emitir a sala de operadores
          this.io.emit('location_update', ubicacion.toJSON())
        } catch (e) { console.error('GPS error:', e.message) }
      })

      // ── GPS: apagar ──
      socket.on('gps_off', (datos) => {
        this.io.emit('gps_off', { domiciliario_id: datos.domiciliario_id || u.id })
      })

      // ── Chat: unirse a sala de pedido ──
      socket.on('join_pedido', ({ pedido_id }) => {
        if (pedido_id) socket.join(`pedido:${pedido_id}`)
      })

      // ── Chat: enviar mensaje ──
      socket.on('chat_mensaje', async ({ to_user_id, mensaje }) => {
        try {
          const { mensaje: msg, roomId } = await this.enviarMensajeUC.execute({
            from_id:     u.id,
            from_nombre: u.nombre,
            from_rol:    u.rol,
            to_user_id,
            mensaje,
          })
          const payload = msg.toJSON()
          // Emitir al destinatario y al remitente
          this.io.to(`user:${to_user_id}`).emit('chat_mensaje', payload)
          socket.emit('chat_mensaje', payload)
        } catch (e) { console.error('Chat error:', e.message) }
      })

      // ── Chat: indicador de escritura ──
      socket.on('chat_escribiendo', ({ to_user_id, escribiendo }) => {
        this.io.to(`user:${to_user_id}`).emit('chat_escribiendo', {
          from_id: u.id, escribiendo
        })
      })

      // ── Desconexión ──
      socket.on('disconnect', () => {
        console.log(`Desconectado: ${u.email}`)
        this.usuarios.delete(socket.id)
        this._emitirUsuariosConectados()
      })
    })
  }

  _emitirUsuariosConectados() {
    const lista = Array.from(this.usuarios.values())
    this.io.emit('usuarios_conectados', lista)
  }
}

module.exports = TrackingSocket