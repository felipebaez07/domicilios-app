/**
 * Entidad Empresa — dominio puro
 */
class Empresa {
  constructor({ id, nombre, color1, color2, emoji, logo_url, activa }) {
    this.id       = id
    this.nombre   = nombre
    this.color1   = color1   || '#667eea'
    this.color2   = color2   || '#764ba2'
    this.emoji    = emoji    || '🏢'
    this.logo_url = logo_url || null
    this.activa   = activa   !== undefined ? activa : true
  }

  estaActiva() {
    return this.activa === true
  }

  toJSON() {
    return {
      id:       this.id,
      nombre:   this.nombre,
      color1:   this.color1,
      color2:   this.color2,
      emoji:    this.emoji,
      logo_url: this.logo_url,
      activa:   this.activa,
    }
  }
}

module.exports = Empresa