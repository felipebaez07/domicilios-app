/**
 * Entidad Mensaje de chat — dominio puro
 */
class Mensaje {
  constructor({ id, from_id, from_nombre, from_rol, to_user_id, mensaje, timestamp }) {
    this.id          = id || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    this.from_id     = from_id
    this.from_nombre = from_nombre || 'Usuario'
    this.from_rol    = from_rol    || 'desconocido'
    this.to_user_id  = to_user_id
    this.mensaje     = mensaje
    this.timestamp   = timestamp || new Date().toISOString()
  }

  getRoomId() {
    return [this.from_id, this.to_user_id].sort().join(':')
  }

  toJSON() {
    return {
      id:          this.id,
      from_id:     this.from_id,
      from_nombre: this.from_nombre,
      from_rol:    this.from_rol,
      to_user_id:  this.to_user_id,
      mensaje:     this.mensaje,
      timestamp:   this.timestamp,
    }
  }
}

module.exports = Mensaje