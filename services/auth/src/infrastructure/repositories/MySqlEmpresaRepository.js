const { randomUUID } = require('crypto')
const IEmpresaRepository = require('../../domain/repositories/IEmpresaRepository')
const Empresa = require('../../domain/entities/Empresa')

const COLUMNAS_ACTUALIZABLES = ['nombre', 'color1', 'color2', 'emoji', 'logo_url', 'activa']

class MySqlEmpresaRepository extends IEmpresaRepository {
  constructor(pool) {
    super()
    this.pool = pool
  }

  async findAll() {
    const [rows] = await this.pool.query('SELECT * FROM empresas ORDER BY created_at DESC')
    return rows.map(e => this._toEntity(e))
  }

  async findAllPublicas() {
    const [rows] = await this.pool.query(
      'SELECT id, nombre, logo_url, emoji, color1, color2 FROM empresas WHERE activa = true ORDER BY nombre'
    )
    return rows.map(e => this._toEntity(e))
  }

  async findById(id) {
    const [rows] = await this.pool.query('SELECT * FROM empresas WHERE id = ? LIMIT 1', [id])
    if (!rows[0]) return null
    return this._toEntity(rows[0])
  }

  async create({ nombre }) {
    const id = randomUUID()
    await this.pool.query('INSERT INTO empresas (id, nombre) VALUES (?, ?)', [id, nombre])
    return this.findById(id)
  }

  async update(id, datos) {
    const campos = Object.keys(datos).filter(k => COLUMNAS_ACTUALIZABLES.includes(k))
    if (campos.length) {
      const set = campos.map(c => `${c} = ?`).join(', ')
      await this.pool.query(`UPDATE empresas SET ${set} WHERE id = ?`, [...campos.map(c => datos[c]), id])
    }
    return this.findById(id)
  }

  _toEntity(row) {
    return new Empresa({
      id:       row.id,
      nombre:   row.nombre,
      color1:   row.color1,
      color2:   row.color2,
      emoji:    row.emoji,
      logo_url: row.logo_url,
      activa:   !!row.activa,
    })
  }
}

module.exports = MySqlEmpresaRepository
