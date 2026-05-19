const jwt = require('jsonwebtoken')
const ITokenService = require('../../domain/services/ITokenService')

class JwtTokenService extends ITokenService {
  sign(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })
  }
  verify(token) {
    return jwt.verify(token, process.env.JWT_SECRET)
  }
}

module.exports = new JwtTokenService()