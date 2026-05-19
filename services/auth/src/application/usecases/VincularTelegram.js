/**
 * Caso de uso: VincularTelegram
 */
class VincularTelegram {
  constructor({ usuarioRepository, notificacionService }) {
    this.usuarioRepo       = usuarioRepository
    this.notificacionSvc   = notificacionService
  }

  async execute({ telegram_chat_id }, usuario) {
    if (!telegram_chat_id) throw new Error('chat_id requerido')

    await this.usuarioRepo.updateTelegram(usuario.id, String(telegram_chat_id))

    await this.notificacionSvc.enviar(
      telegram_chat_id,
      `✅ <b>¡Telegram vinculado!</b>\n\nHola <b>${usuario.nombre}</b>, recibirás notificaciones de RAVEN aquí.\n\n🚀 ¡Listo para trabajar!`
    )

    return { ok: true, telegram_chat_id }
  }
}

module.exports = VincularTelegram