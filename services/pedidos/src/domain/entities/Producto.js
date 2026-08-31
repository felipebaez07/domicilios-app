/**
 * Entidad Producto — un ítem del menú de una empresa (restaurante)
 */
class Producto {
  constructor({ id, empresa_id, nombre, precio, categoria, foto_url, disponible, created_at }) {
    this.id         = id
    this.empresa_id = empresa_id
    this.nombre     = nombre
    this.precio     = Number(precio) || 0
    this.categoria  = categoria || null
    this.foto_url   = foto_url  || null
    this.disponible = disponible !== undefined && disponible !== null ? !!disponible : true
    this.created_at = created_at || null
  }

  toJSON() {
    return {
      id:         this.id,
      empresa_id: this.empresa_id,
      nombre:     this.nombre,
      precio:     this.precio,
      categoria:  this.categoria,
      foto_url:   this.foto_url,
      disponible: this.disponible,
      created_at: this.created_at,
    }
  }
}

module.exports = Producto
