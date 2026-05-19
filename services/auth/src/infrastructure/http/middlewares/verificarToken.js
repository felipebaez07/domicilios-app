const tokenService = require('../../config/jwt')
const Usuario = require('../../../domain/entities/Usuario')

function verificarToken(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Token requerido' })
  try {
    const payload = tokenService.verify(auth.split(' ')[1])
    req.usuario = new Usuario(payload)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

module.exports = verificarToken