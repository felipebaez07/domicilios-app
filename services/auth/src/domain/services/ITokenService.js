/**
 * Puerto de salida — ITokenService
 * Abstrae la generación y verificación de tokens
 */
class ITokenService {
  sign(payload)   { throw new Error('Not implemented') }
  verify(token)   { throw new Error('Not implemented') }
}

module.exports = ITokenService