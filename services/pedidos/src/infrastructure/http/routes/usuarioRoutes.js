const { Router } = require('express')
const verificarToken = require('../middlewares/verificarToken')

function usuarioRoutes(usuarioController) {
  const router = Router()
  router.get('/usuarios/domiciliarios', verificarToken, (req, res) => usuarioController.domiciliarios(req, res))
  return router
}

module.exports = usuarioRoutes