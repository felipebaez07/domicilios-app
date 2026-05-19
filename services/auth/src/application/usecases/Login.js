/**
 * Caso de uso: Login
 * Orquesta el dominio — no sabe nada de Express ni Supabase
 */
class Login {
  constructor({ usuarioRepository, tokenService, passwordService }) {
    this.usuarioRepo   = usuarioRepository
    this.tokenService  = tokenService
    this.passwordSvc   = passwordService
  }

  async execute({ email, password }) {
    // 1. Buscar usuario
    const usuario = await this.usuarioRepo.findByEmail(email)
    if (!usuario) throw new Error('Credenciales inválidas')

    // 2. Validar contraseña
    const valido = await this.passwordSvc.compare(password, usuario.passwordHash)
    if (!valido) throw new Error('Credenciales inválidas')

    // 3. Generar token
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

module.exports = Login