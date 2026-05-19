/**
 * Entidad Usuario — dominio puro, sin dependencias externas
 * Representa un usuario del sistema con sus reglas de negocio
 */
class Usuario {
  constructor({ id, nombre, email, rol, empresa_id, telegram_chat_id, empresa_nombre, empresa_color1, empresa_color2, empresa_emoji }) {
    this.id               = id
    this.nombre           = nombre
    this.email            = email
    this.rol              = rol
    this.empresa_id       = empresa_id       || null
    this.telegram_chat_id = telegram_chat_id || null
    this.empresa_nombre   = empresa_nombre   || null
    this.empresa_color1   = empresa_color1   || '#667eea'
    this.empresa_color2   = empresa_color2   || '#764ba2'
    this.empresa_emoji    = empresa_emoji    || '🏢'
  }

  perteneceAEmpresa(empresaId) {
    return this.empresa_id === empresaId
  }

  esSuperadmin() {
    return this.rol === 'superadmin'
  }

  esAdmin() {
    return this.rol === 'admin'
  }

  puedeGestionarEmpresa(empresaId) {
    return this.esSuperadmin() || (this.esAdmin() && this.perteneceAEmpresa(empresaId))
  }

  requiereEmpresa() {
    return ['admin', 'operador', 'domiciliario', 'distribuidor'].includes(this.rol)
  }

  tieneTelegram() {
    return !!this.telegram_chat_id
  }

  toJSON() {
    return {
      id:             this.id,
      nombre:         this.nombre,
      email:          this.email,
      rol:            this.rol,
      empresa_id:     this.empresa_id,
      empresa_nombre: this.empresa_nombre,
      empresa_color1: this.empresa_color1,
      empresa_color2: this.empresa_color2,
      empresa_emoji:  this.empresa_emoji,
    }
  }
}

module.exports = Usuario