const express = require('express')
const amqplib = require('amqplib')
const axios = require('axios')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', servicio: 'notificaciones' })
})

async function conectarRabbitMQ() {
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL)
    const channel = await conn.createChannel()

    await channel.assertQueue('pedidos_eventos', { durable: true })
    await channel.assertQueue('notificaciones', { durable: true })

    console.log('RabbitMQ conectado, escuchando eventos...')

    channel.consume('pedidos_eventos', async (msg) => {
      if (!msg) return
      try {
        const evento = JSON.parse(msg.content.toString())
        console.log('Evento recibido:', evento)

        if (evento.tipo === 'pedido_creado') {
          await enviarWhatsApp(
            evento.telefono,
            `Nuevo pedido creado. ID: ${evento.pedido_id}. Estado: pendiente`
          )
        }

        if (evento.tipo === 'estado_actualizado') {
          await enviarWhatsApp(
            evento.telefono,
            `Tu pedido ${evento.pedido_id} cambió a: ${evento.estado}`
          )
        }

        channel.ack(msg)
      } catch (error) {
        console.error('Error procesando evento:', error)
        channel.nack(msg)
      }
    })
  } catch (error) {
    console.error('Error conectando RabbitMQ:', error)
    setTimeout(conectarRabbitMQ, 5000)
  }
}

async function enviarWhatsApp(telefono, mensaje) {
  try {
    if (!telefono || !process.env.CALLMEBOT_APIKEY) return
    const url = `https://api.callmebot.com/whatsapp.php?phone=${telefono}&text=${encodeURIComponent(mensaje)}&apikey=${process.env.CALLMEBOT_APIKEY}`
    await axios.get(url)
    console.log(`WhatsApp enviado a ${telefono}`)
  } catch (error) {
    console.error('Error enviando WhatsApp:', error)
  }
}

const PORT = process.env.PORT || 3004
app.listen(PORT, () => {
  console.log(`Notificaciones service corriendo en puerto ${PORT}`)
  conectarRabbitMQ()
})