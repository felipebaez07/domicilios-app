const CrearEmpresa          = require('../../../application/usecases/CrearEmpresa')
const AgregarUsuarioEmpresa = require('../../../application/usecases/AgregarUsuarioEmpresa')
const PersonalizarEmpresa   = require('../../../application/usecases/PersonalizarEmpresa')

class EmpresaController {
  constructor({ usuarioRepository, empresaRepository, passwordService, tokenService }) {
    this.empresaRepo  = empresaRepository
    this.usuarioRepo  = usuarioRepository

    this.crearUC      = new CrearEmpresa({ empresaRepository, usuarioRepository, passwordService })
    this.agregarUC    = new AgregarUsuarioEmpresa({ usuarioRepository, passwordService, tokenService })
    this.personalizarUC = new PersonalizarEmpresa({ empresaRepository })
  }

  async listar(req, res) {
    try {
      if (!req.usuario.esSuperadmin()) return res.status(403).json({ error: 'Solo superadmin' })
      const empresas = await this.empresaRepo.findAll()
      res.json(empresas.map(e => e.toJSON()))
    } catch (e) { res.status(500).json({ error: e.message }) }
  }

  async listarPublicas(req, res) {
    try {
      const empresas = await this.empresaRepo.findAllPublicas()
      res.json(empresas.map(e => e.toJSON()))
    } catch (e) { res.status(500).json({ error: e.message }) }
  }

  async crear(req, res) {
    try {
      const result = await this.crearUC.execute(req.body, req.usuario)
      res.status(201).json(result)
    } catch (e) { res.status(403).json({ error: e.message }) }
  }

  async toggleActiva(req, res) {
    try {
      if (!req.usuario.esSuperadmin()) return res.status(403).json({ error: 'Solo superadmin' })
      const { activa } = req.body
      const empresa = await this.empresaRepo.update(req.params.id, { activa })
      res.json(empresa.toJSON())
    } catch (e) { res.status(500).json({ error: e.message }) }
  }

  async personalizar(req, res) {
    try {
      const result = await this.personalizarUC.execute(
        { empresa_id: req.params.id, ...req.body },
        req.usuario
      )
      res.json(result)
    } catch (e) { res.status(403).json({ error: e.message }) }
  }

  async agregarUsuario(req, res) {
    try {
      const result = await this.agregarUC.execute(
        { ...req.body, empresa_id: req.params.id },
        req.usuario
      )
      res.status(201).json(result)
    } catch (e) { res.status(400).json({ error: e.message }) }
  }

  async listarUsuarios(req, res) {
    try {
      if (!['operador', 'admin', 'superadmin'].includes(req.usuario.rol))
        return res.status(403).json({ error: 'Sin permisos' })
      const filtros = {}
      if (!req.usuario.esSuperadmin() && req.usuario.empresa_id)
        filtros.empresa_id = req.usuario.empresa_id
      if (req.query.rol) filtros.rol = req.query.rol
      const usuarios = await this.usuarioRepo.listAll(filtros)
      res.json(usuarios.map(u => u.toJSON()))
    } catch (e) { res.status(500).json({ error: e.message }) }
  }
}

module.exports = EmpresaController