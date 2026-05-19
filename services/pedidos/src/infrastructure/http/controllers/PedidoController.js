const CrearPedido        = require('../../../application/usecases/CrearPedido')
const AsignarDomiciliario = require('../../../application/usecases/AsignarDomiciliario')
const ActualizarEstado   = require('../../../application/usecases/ActualizarEstado')
const ListarPedidos      = require('../../../application/usecases/ListarPedidos')

class PedidoController {
  constructor({ pedidoRepository, usuarioRepository, notificacionService, eventoService }) {
    this.crearUC     = new CrearPedido({ pedidoRepository, usuarioRepository, notificacionService, eventoService })
    this.asignarUC   = new AsignarDomiciliario({ pedidoRepository, notificacionService, eventoService })
    this.estadoUC    = new ActualizarEstado({ pedidoRepository, notificacionService, eventoService })
    this.listarUC    = new ListarPedidos({ pedidoRepository })
    this.pedidoRepo  = pedidoRepository
  }

  async crear(req, res) {
    try {
      const pedido = await this.crearUC.execute(req.body, req.usuario)
      res.status(201).json(pedido)
    } catch (e) { res.status(400).json({ error: e.message }) }
  }

  async listar(req, res) {
    try {
      const pedidos = await this.listarUC.execute(req.usuario, req.query)
      res.json(pedidos)
    } catch (e) { res.status(403).json({ error: e.message }) }
  }

  async misPedidos(req, res) {
    try {
      const pedidos = await this.listarUC.execute({ ...req.usuario, rol: 'distribuidor' })
      res.json(pedidos)
    } catch (e) { res.status(500).json({ error: e.message }) }
  }

  async misEntregas(req, res) {
    try {
      const pedidos = await this.listarUC.execute({ ...req.usuario, rol: 'domiciliario' })
      res.json(pedidos)
    } catch (e) { res.status(500).json({ error: e.message }) }
  }

  async todos(req, res) {
    try {
      const pedidos = await this.listarUC.execute(req.usuario)
      res.json(pedidos)
    } catch (e) { res.status(403).json({ error: e.message }) }
  }

  async porId(req, res) {
    try {
      const pedido = await this.pedidoRepo.findById(req.params.id)
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })
      res.json(pedido.toJSON())
    } catch (e) { res.status(500).json({ error: e.message }) }
  }

  async actualizarEstado(req, res) {
    try {
      const pedido = await this.estadoUC.execute({ pedido_id: req.params.id, estado: req.body.estado })
      res.json(pedido)
    } catch (e) { res.status(400).json({ error: e.message }) }
  }

  async asignar(req, res) {
    try {
      const pedido = await this.asignarUC.execute(
        { pedido_id: req.params.id, domiciliario_id: req.body.domiciliario_id },
        req.usuario
      )
      res.json(pedido)
    } catch (e) { res.status(403).json({ error: e.message }) }
  }
}

module.exports = PedidoController