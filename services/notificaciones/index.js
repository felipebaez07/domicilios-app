require('dotenv').config()
const express = require('express')
const amqplib = require('amqplib')
const cors    = require('cors')

const app = express()
app.use(cors())
app.use(express.json())
// Nunca cachear respuestas de la API: un proxy delante que ignore
// Authorization podria servirle a un usuario la respuesta de otro.
app.use((req, res, next) => { res.set('Cache-Control', 'no-store, private'); next() })

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const AUTH_URL           = process.env.AUTH_URL || 'https://raven-auth.onrender.com'
const RABBITMQ_URL       = process.env.RABBITMQ_URL

app.get('/health', (req, res) => {
  res.json({ status: 'ok', servicio: 'notificaciones', timestamp: new Date().toISOString() })
})

async function notificarUsuario(userId, mensaje) {
  if (!userId) return
  try {
    await fetch(`${AUTH_URL}/telegram/notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userId, mensaje })
    })
    console.log(`✅ Notificación enviada al usuario ${userId}`)
  } catch (e) {
    console.error('Error notificando usuario:', e.message)
  }
}

function mensajePorEvento(evento) {
  switch (evento.tipo) {

    case 'pedido_creado':
      return {
        destinatarios: evento.operador_ids || [],
        mensaje: `📦 <b>Nuevo pedido recibido</b>\n\n` +
                 `👤 Cliente: <b>${evento.cliente_nombre || 'Sin nombre'}</b>\n` +
                 `📍 Recogida: ${evento.direccion_origen || 'No especificado'}\n` +
                 `🏠 Entrega: ${evento.direccion_destino || 'No especificado'}\n\n` +
                 `⚡ Entra a RAVEN y asígnalo`
      }

    case 'pedido_asignado':
      return {
        destinatarios: evento.domiciliario_id ? [evento.domiciliario_id] : [],
        mensaje: `🛵 <b>¡Pedido asignado!</b>\n\n` +
                 `📦 ${evento.descripcion || 'Sin descripción'}\n` +
                 `👤 ${evento.cliente_nombre || ''}\n` +
                 `📍 Recogida: ${evento.direccion_origen || 'No especificado'}\n` +
                 `🏠 Entrega: ${evento.direccion_entrega || evento.direccion_destino || 'No especificado'}\n\n` +
                 `🗺️ Abre RAVEN para ver la ruta`
      }

    case 'estado_actualizado': {
      const destEstado = []
      if (evento.distribuidor_id) destEstado.push(evento.distribuidor_id)
      if (evento.cliente_id)      destEstado.push(evento.cliente_id)

      const emojis = { asignado:'🟡', en_camino:'🛵', entregado:'✅', cancelado:'❌' }
      const textos = {
        asignado:  'Tu pedido fue asignado a un domiciliario.',
        en_camino: '¡Tu pedido está en camino!',
        entregado: '¡Tu pedido fue entregado exitosamente! 🎉',
        cancelado: 'Tu pedido fue cancelado.',
      }

      return {
        destinatarios: destEstado,
        mensaje: `${emojis[evento.estado] || '📋'} <b>Estado actualizado</b>\n\n` +
                 `${textos[evento.estado] || `Nuevo estado: ${evento.estado}`}\n\n` +
                 `📦 ${evento.descripcion || 'Pedido'}\n` +
                 `🆔 ID: <code>${evento.pedido_id}</code>`
      }
    }

    default:
      console.log(`Evento desconocido ignorado: ${evento.tipo}`)
      return null
  }
}

async function conectarRabbitMQ() {
  try {
    const conn    = await amqplib.connect(RABBITMQ_URL)
    const channel = await conn.createChannel()

    await channel.assertQueue('pedidos_eventos', { durable: true })
    channel.prefetch(1)

    console.log('🐇 RabbitMQ conectado — escuchando pedidos_eventos...')

    channel.consume('pedidos_eventos', async (msg) => {
      if (!msg) return
      let evento
      try {
        evento = JSON.parse(msg.content.toString())
        console.log(`📨 Evento recibido: ${evento.tipo}`, evento)
      } catch (e) {
        console.error('JSON inválido:', e.message)
        channel.ack(msg)
        return
      }
      try {
        const resultado = mensajePorEvento(evento)
        if (resultado && resultado.destinatarios.length > 0) {
          for (const userId of resultado.destinatarios) {
            await notificarUsuario(userId, resultado.mensaje)
          }
        }
        channel.ack(msg)
      } catch (e) {
        console.error('Error procesando evento:', e.message)
        channel.nack(msg, false, false)
      }
    })

    conn.on('error', (e) => { console.error('RabbitMQ error:', e.message); setTimeout(conectarRabbitMQ, 5000) })
    conn.on('close', () => { console.log('RabbitMQ desconectado, reconectando...'); setTimeout(conectarRabbitMQ, 5000) })

  } catch (e) {
    console.error('Error conectando RabbitMQ:', e.message)
    setTimeout(conectarRabbitMQ, 5000)
  }
}

const PORT = process.env.PORT || 3004
app.listen(PORT, () => {
  console.log(`🔔 Notificaciones service corriendo en puerto ${PORT}`)
  if (!TELEGRAM_BOT_TOKEN) console.warn('⚠️  TELEGRAM_BOT_TOKEN no configurado')
  if (!RABBITMQ_URL)       console.warn('⚠️  RABBITMQ_URL no configurado')
  conectarRabbitMQ()
})