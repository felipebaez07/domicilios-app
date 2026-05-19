/**
 * Caso de uso: Register
 * Solo permite registro de clientes y distribuidores (registro público)
 */
const ROLES_PUBLICOS = ['cliente', 'distribuidor']

class Register {
  constructor({ usuarioRepository, passwordService, tokenService }) {
    this.usuarioRepo  = usuarioRepository
    this.passwordSvc  = passwordService
    this.tokenService = tokenService
  }

  async execute({ nombre, email, password, rol, telefono }) {
    // 1. Validar rol público
    if (!ROLES_PUBLICOS.includes(rol))
      throw new Error('Este rol no puede registrarse públicamente')

    // 2. Verificar que el email no exista
    const existe = await this.usuarioRepo.findByEmail(email)
    if (existe) throw new Error('Email ya registrado')

    // 3. Hashear contraseña
    const passwordHash = await this.passwordSvc.hash(password)

    // 4. Crear usuario
    const usuario = await this.usuarioRepo.create({ nombre, email, passwordHash, rol, telefono })

    // 5. Generar token
    const token = this.tokenService.sign({
      id:         usuario.id,
      email:      usuario.email,
      rol:        usuario.rol,
      nombre:     usuario.nombre,
      empresa_id: usuario.empresa_id,
    })

    return { token, usuario: usuario.toJSON() }
  }
}

module.exports = Register