const { Router } = require('express')
const verificarToken = require('../middlewares/verificarToken')

function trackingRoutes(trackingController) {
  const router = Router()
  router.get('/health',       (req, res) => res.json({ status: 'ok', servicio: 'tracking' }))
  router.get('/chat/:room',   verificarToken, (req, res) => trackingController.historialChat(req, res))
  return router
}

module.exports = trackingRoutes