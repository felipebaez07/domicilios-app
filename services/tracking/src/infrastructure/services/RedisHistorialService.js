const IHistorialService = require('../../domain/services/IHistorialService')

class RedisHistorialService extends IHistorialService {
  constructor(redis) {
    super()
    this.redis    = redis
    this.maxMsgs  = 100
  }

  async guardarMensaje(roomId, mensaje) {
    try {
      const key = `chat:${roomId}`
      await this.redis.pipeline()
        .lpush(key, JSON.stringify(mensaje.toJSON()))
        .ltrim(key, 0, this.maxMsgs - 1)
        .exec()
    } catch (e) { console.error('Redis error:', e.message) }
  }

  async obtenerHistorial(roomId) {
    try {
      const key  = `chat:${roomId}`
      const data = await this.redis.lrange(key, 0, -1)
      return data.map(m => typeof m === 'string' ? JSON.parse(m) : m).reverse()
    } catch (e) {
      console.error('Redis error:', e.message)
      return []
    }
  }
}

module.exports = RedisHistorialService