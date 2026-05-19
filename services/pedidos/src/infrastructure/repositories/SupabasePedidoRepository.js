const IPedidoRepository = require('../../domain/repositories/IPedidoRepository')
const { Pedido } = require('../../domain/entities/Pedido')

class SupabasePedidoRepository extends IPedidoRepository {
  constructor(supabase) {
    super()
    this.supabase = supabase
  }

  async findById(id) {
    const { data, error } = await this.supabase.from('pedidos').select('*').eq('id', id).single()
    if (error || !data) return null
    return this._toEntity(data)
  }

  async findByDistribuidor(distribuidorId) {
    const { data, error } = await this.supabase.from('pedidos').select('*')
      .eq('distribuidor_id', distribuidorId).order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(p => this._toEntity(p))
  }

  async findByDomiciliario(domiciliarioId) {
    const { data, error } = await this.supabase.from('pedidos').select('*')
      .eq('domiciliario_id', domiciliarioId).order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(p => this._toEntity(p))
  }

  async findByCliente(clienteId) {
    const { data, error } = await this.supabase.from('pedidos').select('*')
      .eq('cliente_id', clienteId).order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(p => this._toEntity(p))
  }

  async findByEmpresa(empresaId) {
    const { data, error } = await this.supabase.from('pedidos').select('*')
      .eq('empresa_id', empresaId).order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(p => this._toEntity(p))
  }

  async findAll() {
    const { data, error } = await this.supabase.from('pedidos').select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(p => this._toEntity(p))
  }

  async create(datos) {
    const { data, error } = await this.supabase.from('pedidos').insert([datos]).select().single()
    if (error) throw error
    return this._toEntity(data)
  }

  async updateEstado(id, estado) {
    const { data, error } = await this.supabase.from('pedidos')
      .update({ estado, updated_at: new Date() }).eq('id', id).select().single()
    if (error) throw error
    return this._toEntity(data)
  }

  async asignarDomiciliario(id, domiciliarioId) {
    const { data, error } = await this.supabase.from('pedidos')
      .update({ domiciliario_id: domiciliarioId, estado: 'asignado', updated_at: new Date() })
      .eq('id', id).select().single()
    if (error) throw error
    return this._toEntity(data)
  }

  _toEntity(row) {
    return new Pedido(row)
  }
}

module.exports = SupabasePedidoRepository