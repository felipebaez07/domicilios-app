/**
 * Puerto de salida — INotificacionService
 * Abstrae el canal de notificación (Telegram, email, SMS, etc.)
 */
class INotificacionService {
  async enviar(chatId, mensaje) { throw new Error('Not implemented') }
  async enviarAUsuario(userId, mensaje) { throw new Error('Not implemented') }
}

module.exports = INotificacionService