const ObtenerHistorial = require('../../../application/usecases/ObtenerHistorial')

class TrackingController {
  constructor({ historialService }) {
    this.obtenerHistorialUC = new ObtenerHistorial({ historialService })
  }

  async historialChat(req, res) {
    try {
      const historial = await this.obtenerHistorialUC.execute(req.params.room)
      res.json(historial)
    } catch (e) { res.status(400).json({ error: e.message }) }
  }
}

module.exports = TrackingController