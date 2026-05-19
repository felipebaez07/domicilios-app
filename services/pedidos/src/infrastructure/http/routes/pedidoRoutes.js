const { Router } = require('express')
const verificarToken = require('../middlewares/verificarToken')

function pedidoRoutes(pedidoController) {
  const router = Router()

  router.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'pedidos' }))

  // Rutas específicas ANTES de /:id
  router.get('/pedidos/mis-pedidos', verificarToken, (req, res) => pedidoController.misPedidos(req, res))
  router.get('/pedidos/mis-entregas', verificarToken, (req, res) => pedidoController.misEntregas(req, res))
  router.get('/pedidos/todos',        verificarToken, (req, res) => pedidoController.todos(req, res))

  router.post('/pedidos',                    verificarToken, (req, res) => pedidoController.crear(req, res))
  router.get('/pedidos',                     verificarToken, (req, res) => pedidoController.listar(req, res))
  router.get('/pedidos/:id',                 verificarToken, (req, res) => pedidoController.porId(req, res))
  router.patch('/pedidos/:id/estado',        verificarToken, (req, res) => pedidoController.actualizarEstado(req, res))
  router.patch('/pedidos/:id/asignar',       verificarToken, (req, res) => pedidoController.asignar(req, res))

  return router
}

module.exports = pedidoRoutes