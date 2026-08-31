const { randomUUID } = require('crypto')
const IPedidoRepository = require('../../domain/repositories/IPedidoRepository')
const { Pedido } = require('../../domain/entities/Pedido')

const SELECT_CON_DOMICILIARIO = `
  SELECT p.*, dom.nombre AS domiciliario_nombre
  FROM pedidos p
  LEFT JOIN usuarios dom ON dom.id = p.domiciliario_id
`

class MySqlPedidoRepository extends IPedidoRepository {
  constructor(pool) {
    super()
    this.pool = pool
  }

  async findById(id) {
    const [rows] = await this.pool.query(`${SELECT_CON_DOMICILIARIO} WHERE p.id = ? LIMIT 1`, [id])
    if (!rows[0]) return null
    return this._toEntity(rows[0])
  }

  async findByDistribuidor(distribuidorId) {
    const [rows] = await this.pool.query(
      `${SELECT_CON_DOMICILIARIO} WHERE p.distribuidor_id = ? ORDER BY p.created_at DESC`, [distribuidorId]
    )
    return rows.map(p => this._toEntity(p))
  }

  async findByDomiciliario(domiciliarioId) {
    const [rows] = await this.pool.query(
      `${SELECT_CON_DOMICILIARIO} WHERE p.domiciliario_id = ? ORDER BY p.created_at DESC`, [domiciliarioId]
    )
    return rows.map(p => this._toEntity(p))
  }

  async findByCliente(clienteId) {
    const [rows] = await this.pool.query(
      `${SELECT_CON_DOMICILIARIO} WHERE p.cliente_id = ? ORDER BY p.created_at DESC`, [clienteId]
    )
    return rows.map(p => this._toEntity(p))
  }

  async findByEmpresa(empresaId) {
    const [rows] = await this.pool.query(
      `${SELECT_CON_DOMICILIARIO} WHERE p.empresa_id = ? ORDER BY p.created_at DESC`, [empresaId]
    )
    return rows.map(p => this._toEntity(p))
  }

  async findAll() {
    const [rows] = await this.pool.query(`${SELECT_CON_DOMICILIARIO} ORDER BY p.created_at DESC`)
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

  async getRanking(empresaId) {
    const [rows] = await this.pool.query(
      `SELECT u.id, u.nombre, COUNT(p.id) AS entregas
       FROM usuarios u
       LEFT JOIN pedidos p ON p.domiciliario_id = u.id AND p.estado = 'entregado'
       WHERE u.rol = 'domiciliario' AND u.empresa_id = ?
       GROUP BY u.id, u.nombre
       ORDER BY entregas DESC
       LIMIT 20`,
      [empresaId]
    )
    return rows.map(r => ({ id: r.id, nombre: r.nombre, entregas: r.entregas, xp: r.entregas * 10 }))
  }

  _toEntity(row) {
    return new Pedido(row)
  }
}

module.exports = MySqlPedidoRepository
