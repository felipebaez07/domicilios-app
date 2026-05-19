const bcrypt = require('bcryptjs')

class PasswordService {
  async hash(plain)           { return bcrypt.hash(plain, 10) }
  async compare(plain, hash)  { return bcrypt.compare(plain, hash) }
}

module.exports = new PasswordService()