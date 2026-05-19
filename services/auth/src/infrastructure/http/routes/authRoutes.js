
const { Router } = require('express')
const verificarToken = require('../middlewares/verificarToken')

function authRoutes(authController) {
  const router = Router()

  router.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'auth' }))

  router.post('/register',          (req, res) => authController.register(req, res))
  router.post('/login',             (req, res) => authController.login(req, res))
  router.post('/verificar',         (req, res) => authController.verificar(req, res))
  router.get('/perfil',             verificarToken, (req, res) => authController.perfil(req, res))
  router.patch('/perfil/telegram',  verificarToken, (req, res) => authController.vincularTelegram(req, res))
  router.post('/telegram/notify',   (req, res) => authController.notificarTelegram(req, res))
  router.post('/telegram/webhook',  (req, res) => authController.telegramWebhook(req, res))

  return router
}

module.exports = authRoutes