const { Router } = require('express')
const verificarToken = require('../middlewares/verificarToken')

function empresaRoutes(empresaController) {
  const router = Router()

  router.get('/empresas/publicas',            (req, res) => empresaController.listarPublicas(req, res))
  router.get('/empresas',        verificarToken, (req, res) => empresaController.listar(req, res))
  router.post('/empresas',       verificarToken, (req, res) => empresaController.crear(req, res))
  router.patch('/empresas/:id',  verificarToken, (req, res) => empresaController.toggleActiva(req, res))
  router.patch('/empresas/:id/personalizar', verificarToken, (req, res) => empresaController.personalizar(req, res))
  router.post('/empresas/:id/usuarios',      verificarToken, (req, res) => empresaController.agregarUsuario(req, res))
  router.get('/usuarios',        verificarToken, (req, res) => empresaController.listarUsuarios(req, res))

  return router
}

module.exports = empresaRoutes