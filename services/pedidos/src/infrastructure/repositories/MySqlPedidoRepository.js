const { randomUUID } = require('crypto')
const IPedidoRepository = require('../../domain/repositories/IPedidoRepository')
const { Pedido } = require('../../domain/entities/Pedido')

class MySqlPedidoRepository extends IPedidoRepository {
  constructor(pool) {
    super()
    this.pool = pool
  }

  async findById(id) {
    const [rows] = await this.pool.query('SELECT * FROM pedidos WHERE id = ? LIMIT 1', [id])
    if (!rows[0]) return null
    return this._toEntity(rows[0])
  }

  async findByDistribuidor(distribuidorId) {
    const [rows] = await this.pool.query(
      'SELECT * FROM pedidos WHERE distribuidor_id = ? ORDER BY created_at DESC', [distribuidorId]
    )
    return rows.map(p => this._toEntity(p))
  }

  async findByDomiciliario(domiciliarioId) {
    const [rows] = await this.pool.query(
      'SELECT * FROM pedidos WHERE domiciliario_id = ? ORDER BY created_at DESC', [domiciliarioId]
    )
    return rows.map(p => this._toEntity(p))
  }

  async findByCliente(clienteId) {
    const [rows] = await this.pool.query(
      'SELECT * FROM pedidos WHERE cliente_id = ? ORDER BY created_at DESC', [clienteId]
    )
    return rows.map(p => this._toEntity(p))
  }

  async findByEmpresa(empresaId) {
    const [rows] = await this.pool.query(
      'SELECT * FROM pedidos WHERE empresa_id = ? ORDER BY created_at DESC', [empresaId]
    )
    return rows.map(p => this._toEntity(p))
  }

  async findAll() {
    const [rows] = await this.pool.query('SELECT * FROM pedidos ORDER BY created_at DESC')
    return rows.map(p => this._toEntity(p))
  }

  async create(datos) {
    const id = randomUUID()
    await this.pool.query(
      `INSERT INTO pedidos (id, empresa_id, distribuidor_id, cliente_id, domiciliario_id,
         descripcion, cliente_nombre, telefono, direccion_origen, direccion_destino, direccion_entrega,
         lat_origen, lng_origen, lat_destino, lng_destino, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, datos.empresa_id ?? null, datos.distribuidor_id ?? null, datos.cliente_id ?? null, datos.domiciliario_id ?? null,
        datos.descripcion ?? null, datos.cliente_nombre ?? null, datos.telefono ?? null,
        datos.direccion_origen ?? null, datos.direccion_destino ?? null, datos.direccion_entrega ?? null,
        datos.lat_origen ?? null, datos.lng_origen ?? null, datos.lat_destino ?? null, datos.lng_destino ?? null,
        datos.estado || 'pendiente',
      ]
    )
    return this.findById(id)
  }

  async updateEstado(id, estado) {
    await this.pool.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id])
    return this.findById(id)
  }

  async asignarDomiciliario(id, domiciliarioId) {
    await this.pool.query(
      "UPDATE pedidos SET domiciliario_id = ?, estado = 'asignado' WHERE id = ?",
      [domiciliarioId, id]
    )
    return this.findById(id)
  }

  _toEntity(row) {
    return new Pedido(row)
  }
}

module.exports = MySqlPedidoRepository
