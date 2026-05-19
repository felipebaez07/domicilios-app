/**
 * Caso de uso: AgregarUsuarioEmpresa
 * Admin agrega domiciliarios/operadores/distribuidores a su empresa
 */
const ROLES_EMPRESA = ['operador', 'domiciliario', 'distribuidor']

class AgregarUsuarioEmpresa {
  constructor({ usuarioRepository, passwordService, tokenService }) {
    this.usuarioRepo  = usuarioRepository
    this.passwordSvc  = passwordService
    this.tokenService = tokenService
  }

  async execute({ nombre, email, password, rol, empresa_id }, solicitante) {
    // 1. Verificar permisos
    if (!solicitante.puedeGestionarEmpresa(empresa_id))
      throw new Error('Sin permisos para gestionar esta empresa')

    // 2. Validar rol
    if (!ROLES_EMPRESA.includes(rol))
      throw new Error('Rol inválido para empresa')

    // 3. Verificar email
    const existe = await this.usuarioRepo.findByEmail(email)
    if (existe) throw new Error('Email ya registrado')

    // 4. Crear usuario
    const passwordHash = await this.passwordSvc.hash(password)
    const usuario = await this.usuarioRepo.create({ nombre, email, passwordHash, rol, empresa_id })

    // 5. Token
    const token = this.tokenService.sign({
      id: usuario.id, email: usuario.email,
      rol: usuario.rol, nombre: usuario.nombre, empresa_id,
    })

    return { token, usuario: usuario.toJSON() }
  }
}

module.exports = AgregarUsuarioEmpresa