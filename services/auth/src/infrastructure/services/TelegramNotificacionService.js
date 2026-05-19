const INotificacionService = require('../../domain/services/INotificacionService')

class TelegramNotificacionService extends INotificacionService {
  constructor(supabase) {
    super()
    this.supabase = supabase
    this.token    = process.env.TELEGRAM_BOT_TOKEN
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
    const { data } = await this.supabase
      .from('usuarios').select('telegram_chat_id').eq('id', userId).single()
    if (data?.telegram_chat_id) await this.enviar(data.telegram_chat_id, mensaje)
  }
}

module.exports = TelegramNotificacionService