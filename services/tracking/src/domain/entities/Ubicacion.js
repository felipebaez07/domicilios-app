/**
 * Entidad Ubicacion — dominio puro
 */
class Ubicacion {
  constructor({ domiciliario_id, pedido_id, lat, lng, nombre, timestamp }) {
    this.domiciliario_id = domiciliario_id
    this.pedido_id       = pedido_id || null
    this.lat             = lat
    this.lng             = lng
    this.nombre          = nombre || 'Domiciliario'
    this.timestamp       = timestamp || new Date().toISOString()
  }

  esValida() {
    return !!(this.domiciliario_id && this.lat && this.lng)
  }

  toJSON() {
    return {
      domiciliario_id: this.domiciliario_id,
      pedido_id:       this.pedido_id,
      lat:             this.lat,
      lng:             this.lng,
      nombre:          this.nombre,
      timestamp:       this.timestamp,
    }
  }
}

module.exports = Ubicacion