const INotificacionService = require('../../domain/services/INotificacionService')

/**
 * Adaptador de notificaciones — llama al auth service via HTTP
 * El dominio no sabe que existe Telegram ni HTTP
 */
class HttpNotificacionService extends INotificacionService {
  constructor() {
    super()
    this.authUrl = process.env.AUTH_URL || 'https://raven-auth.onrender.com'
  }

  async notificarUsuario(userId, mensaje) {
    if (!userId) return
    try {
      await fetch(`${this.authUrl}/telegram/notify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: userId, mensaje })
      })
    } catch (e) { console.error('Notif error:', e.message) }
  }
}

module.exports = HttpNotificacionService