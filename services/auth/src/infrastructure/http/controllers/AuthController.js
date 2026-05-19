const Login                 = require('../../../application/usecases/Login')
const Register              = require('../../../application/usecases/Register')
const VincularTelegram      = require('../../../application/usecases/VincularTelegram')

class AuthController {
  constructor({ usuarioRepository, empresaRepository, tokenService, passwordService, notificacionService }) {
    this.loginUC      = new Login({ usuarioRepository: { findByEmail: (e) => usuarioRepository.findByEmailWithEmpresa(e, empresaRepository) }, tokenService, passwordService })
    this.registerUC   = new Register({ usuarioRepository, passwordService, tokenService })
    this.vincularUC   = new VincularTelegram({ usuarioRepository, notificacionService })
  }

  async login(req, res) {
    try {
      const result = await this.loginUC.execute(req.body)
      res.json(result)
    } catch (e) { res.status(401).json({ error: e.message }) }
  }

  async register(req, res) {
    try {
      const result = await this.registerUC.execute(req.body)
      res.status(201).json(result)
    } catch (e) {
      const status = e.message === 'Email ya registrado' ? 400 : 400
      res.status(status).json({ error: e.message })
    }
  }

  async verificar(req, res) {
    try {
      const { tokenService } = this
      const decoded = tokenService.verify(req.body.token)
      res.json({ valido: true, usuario: decoded })
    } catch { res.status(401).json({ valido: false, error: 'Token inválido' }) }
  }

  async perfil(req, res) {
    try {
      res.json(req.usuario.toJSON())
    } catch (e) { res.status(500).json({ error: 'Error interno' }) }
  }

  async vincularTelegram(req, res) {
    try {
      const result = await this.vincularUC.execute(req.body, req.usuario)
      res.json(result)
    } catch (e) { res.status(400).json({ error: e.message }) }
  }

  async notificarTelegram(req, res) {
    try {
      const { user_id, mensaje } = req.body
      await this.notificacionService.enviarAUsuario(user_id, mensaje)
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: e.message }) }
  }

  async telegramWebhook(req, res) {
    res.sendStatus(200)
    const msg = req.body?.message
    if (!msg) return
    const chatId = msg.chat.id
    if ((msg.text || '').startsWith('/start')) {
      await this.notificacionService.enviar(chatId,
        `👋 ¡Hola! Soy el bot de <b>RAVEN Domicilios</b> 🚀\n\nTu <b>Chat ID</b> es:\n\n<code>${chatId}</code>\n\n📋 Cópialo y pégalo en tu perfil de RAVEN para activar notificaciones 🔔`
      )
    }
  }
}

module.exports = AuthController