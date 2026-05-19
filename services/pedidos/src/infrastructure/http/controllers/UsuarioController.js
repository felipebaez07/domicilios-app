class UsuarioController {
  constructor({ usuarioRepository }) {
    this.usuarioRepo = usuarioRepository
  }

  async domiciliarios(req, res) {
    try {
      if (!['operador', 'admin', 'superadmin'].includes(req.usuario.rol))
        return res.status(403).json({ error: 'Sin permisos' })
      const empresaId = req.usuario.empresa_id
      if (!empresaId) return res.json([])
      const domis = await this.usuarioRepo.findDomiciliariosByEmpresa(empresaId)
      res.json(domis)
    } catch (e) { res.status(500).json({ error: e.message }) }
  }
}

module.exports = UsuarioController