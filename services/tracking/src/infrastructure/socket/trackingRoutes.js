const { Router } = require('express')

function trackingRoutes(trackingController) {
  const router = Router()
  router.get('/health',       (req, res) => res.json({ status: 'ok', servicio: 'tracking' }))
  router.get('/chat/:room',   (req, res) => trackingController.historialChat(req, res))
  return router
}

module.exports = trackingRoutes