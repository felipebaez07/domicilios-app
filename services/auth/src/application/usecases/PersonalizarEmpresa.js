/**
 * Caso de uso: PersonalizarEmpresa
 */
class PersonalizarEmpresa {
  constructor({ empresaRepository }) {
    this.empresaRepo = empresaRepository
  }

  async execute({ empresa_id, color1, color2, emoji, nombre }, solicitante) {
    if (!solicitante.puedeGestionarEmpresa(empresa_id))
      throw new Error('Sin permisos para personalizar esta empresa')

    const update = {}
    if (color1) update.color1 = color1
    if (color2) update.color2 = color2
    if (emoji)  update.emoji  = emoji
    if (nombre) update.nombre = nombre

    const empresa = await this.empresaRepo.update(empresa_id, update)
    return empresa.toJSON()
  }
}

module.exports = PersonalizarEmpresa