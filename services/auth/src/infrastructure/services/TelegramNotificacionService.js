const INotificacionService = require('../../domain/services/INotificacionService')

class TelegramNotificacionService extends INotificacionService {
  constructor(usuarioRepository) {
    super()
    this.usuarioRepository = usuarioRepository
    this.token = process.env.TELEGRAM_BOT_TOKEN
  }

  async enviar(chatId, mensaje) {
    if (!chatId || !this.token) return
    try {
      await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'HTML' })
      })
    } catch (e) { console.error('Telegram error:', e.message) }
  }

  async enviarAUsuario(userId, mensaje) {
    const usuario = await this.usuarioRepository.findById(userId)
    if (usuario?.telegram_chat_id) await this.enviar(usuario.telegram_chat_id, mensaje)
  }
}

module.exports = TelegramNotificacionService