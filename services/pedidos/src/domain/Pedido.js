/**
 * Entidad Pedido — dominio puro
 * Contiene las reglas de negocio del ciclo de vida de un pedido
 */

const ESTADOS_VALIDOS = ['pendiente', 'asignado', 'en_camino', 'entregado', 'cancelado']

const TRANSICIONES_VALIDAS = {
  pendiente:  ['asignado', 'cancelado'],
  asignado:   ['en_camino', 'cancelado'],
  en_camino:  ['entregado', 'cancelado'],
  entregado:  [],
  cancelado:  [],
}

class Pedido {
  constructor({
    id, empresa_id, distribuidor_id, cliente_id, domiciliario_id,
    descripcion, cliente_nombre, telefono,
    direccion_origen, direccion_destino, direccion_entrega,
    lat_origen, lng_origen, lat_destino, lng_destino,
    estado, created_at, updated_at,
  }) {
    this.id               = id
    this.empresa_id       = empresa_id       || null
    this.distribuidor_id  = distribuidor_id  || null
    this.cliente_id       = cliente_id       || null
    this.domiciliario_id  = domiciliario_id  || null
    this.descripcion      = descripcion      || null
    this.cliente_nombre   = cliente_nombre   || descripcion || 'Sin nombre'
    this.telefono         = telefono         || null
    this.direccion_origen  = direccion_origen  || null
    this.direccion_destino = direccion_destino || null
    this.direccion_entrega = direccion_entrega || direccion_destino || direccion_origen
    this.lat_origen  = lat_origen  || null
    this.lng_origen  = lng_origen  || null
    this.lat_destino = lat_destino || null
    this.lng_destino = lng_destino || null
    this.estado      = estado      || 'pendiente'
    this.created_at  = created_at  || null
    this.updated_at  = updated_at  || null
  }

  // Reglas de negocio
  puedeTransicionarA(nuevoEstado) {
    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) return false
    return TRANSICIONES_VALIDAS[this.estado]?.includes(nuevoEstado) ?? false
  }

  estaPendiente()  { return this.estado === 'pendiente' }
  estaAsignado()   { return this.estado === 'asignado' }
  estaEnCamino()   { return this.estado === 'en_camino' }
  estaEntregado()  { return this.estado === 'entregado' }
  estaCancelado()  { return this.estado === 'cancelado' }
  estaActivo()     { return !this.estaEntregado() && !this.estaCancelado() }

  tieneCoordenadas() {
    return !!(this.lat_origen && this.lng_origen && this.lat_destino && this.lng_destino)
  }

  toJSON() {
    return {
      id:                this.id,
      empresa_id:        this.empresa_id,
      distribuidor_id:   this.distribuidor_id,
      cliente_id:        this.cliente_id,
      domiciliario_id:   this.domiciliario_id,
      descripcion:       this.descripcion,
      cliente_nombre:    this.cliente_nombre,
      telefono:          this.telefono,
      direccion_origen:  this.direccion_origen,
      direccion_destino: this.direccion_destino,
      direccion_entrega: this.direccion_entrega,
      lat_origen:        this.lat_origen,
      lng_origen:        this.lng_origen,
      lat_destino:       this.lat_destino,
      lng_destino:       this.lng_destino,
      estado:            this.estado,
      created_at:        this.created_at,
      updated_at:        this.updated_at,
    }
  }
}

module.exports = { Pedido, ESTADOS_VALIDOS }