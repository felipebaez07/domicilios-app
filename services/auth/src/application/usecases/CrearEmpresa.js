/**
 * Caso de uso: CrearEmpresa
 * Solo superadmin puede crear empresas
 */
class CrearEmpresa {
  constructor({ empresaRepository, usuarioRepository, passwordService }) {
    this.empresaRepo  = empresaRepository
    this.usuarioRepo  = usuarioRepository
    this.passwordSvc  = passwordService
  }

  async execute({ nombre, admin_nombre, admin_email, admin_password }, solicitante) {
    // 1. Verificar permisos
    if (!solicitante.esSuperadmin())
      throw new Error('Solo superadmin puede crear empresas')

    // 2. Crear empresa
    const empresa = await this.empresaRepo.create({ nombre })

    // 3. Crear admin de la empresa
    const passwordHash = await this.passwordSvc.hash(admin_password)
    const admin = await this.usuarioRepo.create({
      nombre:     admin_nombre || `Admin ${nombre}`,
      email:      admin_email,
      passwordHash,
      rol:        'admin',
      empresa_id: empresa.id,
    })

    return { empresa: empresa.toJSON(), admin: { id: admin.id, nombre: admin.nombre, email: admin.email } }
  }
}

module.exports = CrearEmpresa