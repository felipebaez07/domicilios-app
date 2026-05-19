const { verify } = require('../../config/jwt')

function verificarToken(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Token requerido' })
  try {
    req.usuario = verify(auth.split(' ')[1])
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

module.exports = verificarToken