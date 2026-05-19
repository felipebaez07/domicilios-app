const jwt = require('jsonwebtoken')

module.exports = {
  verify: (token) => jwt.verify(token, process.env.JWT_SECRET)
}