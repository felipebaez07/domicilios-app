import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';
import Modal from '../../components/Modal';
import MapPicker from '../../components/MapPicker';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useRoute, formatDistancia, formatDuracion } from '../../hooks/useRoute';

const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;
const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;

const domiIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
    <div style="width:36px;height:36px;border-radius:50%;background:#8b5cf6;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(139,92,246,0.4);">🛵</div>
    <div style="background:white;color:#6d28d9;font-size:9px;padding:2px 7px;border-radius:99px;font-family:Poppins,sans-serif;font-weight:700;">En camino</div>
  </div>`,
  iconSize:[70,52], iconAnchor:[35,52], className:'',
});
const origenIcon = new L.DivIcon({
  html:`<div style="width:32px;height:32px;border-radius:50%;background:#10b981;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(16,185,129,0.4);">📦</div>`,
  iconSize:[32,32], iconAnchor:[16,32], className:'',
});
const destinoIcon = new L.DivIcon({
  html:`<div style="width:32px;height:32px;border-radius:50%;background:#ef4444;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(239,68,68,0.4);">🏠</div>`,
  iconSize:[32,32], iconAnchor:[16,32], className:'',
});

const PASOS  = ['pendiente','asignado','en_camino','entregado'];
const LABELS = { pendiente:'Pendiente', asignado:'Asignado', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado' };
const EMOJIS = { pendiente:'⏳', asignado:'👤', en_camino:'🛵', entregado:'✅', cancelado:'❌' };
const BADGE  = { pendiente:'badge-warn', asignado:'badge-info', en_camino:'badge-info', entregado:'badge-ok', cancelado:'badge-err' };

export default function ClienteDashboard() {
  const { token, user } = useAuth();
  const [pedidos, setPedidos]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [domiPos, setDomiPos]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [step, setStep]         = useState('list'); // 'list' | 'picker' | 'form'
  const [ubicaciones, setUbicaciones] = useState(null);
  const [form, setForm]         = useState({ descripcion:'' });
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState('');
  const socketRef = useRef(null);

  const origin      = domiPos || (selected?.lat_origen && selected?.lng_origen ? [selected.lat_origen, selected.lng_origen] : null);
  const destination = selected?.lat_destino && selected?.lng_destino ? [selected.lat_destino, selected.lng_destino] : null;
  const { ruta, distancia, duracion } = useRoute(origin, destination);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${PEDIDOS_URL}/pedidos/mis-pedidos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPedidos(data);
      setSelected(prev => prev ? (data.find(p => p.id === prev.id) || prev) : (data[0] || null));
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    fetchData();
    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current.on('location_update', ({ pedido_id, lat, lng }) => {
      if (!selected || selected.id === pedido_id) setDomiPos([lat, lng]);
    });
    socketRef.current.on('estado_actualizado', () => fetchData());
    return () => socketRef.current?.disconnect();
  }, []);

  useAutoRefresh(fetchData, 15000);

  useEffect(() => {
    if (selected?.id && socketRef.current) socketRef.current.emit('join_pedido', { pedido_id: selected.id });
    setDomiPos(null);
  }, [selected?.id]);

  async function crearPedido(e) {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post(`${PEDIDOS_URL}/pedidos`, {
        descripcion:       form.descripcion,
        cliente_nombre:    user?.nombre || user?.email,
        direccion_origen:  ubicaciones.origen.label,
        direccion_destino: ubicaciones.destino.label,
        direccion_entrega: ubicaciones.destino.label,
        lat_origen:  ubicaciones.origen.lat,
        lng_origen:  ubicaciones.origen.lng,
        lat_destino: ubicaciones.destino.lat,
        lng_destino: ubicaciones.destino.lng,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setStep('list'); setUbicaciones(null); setForm({ descripcion: '' });
      setSuccess('¡Pedido creado! 🎉 El operador lo asignará pronto.');
      fetchData(); setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear pedido');
    } finally { setSaving(false); }
  }

  const stepIdx      = PASOS.indexOf(selected?.estado);
  const tieneOrigen  = selected?.lat_origen  && selected?.lng_origen;
  const tieneDestino = selected?.lat_destino && selected?.lng_destino;
  const mapCenter    = domiPos
    || (tieneOrigen ? [selected.lat_origen, selected.lng_origen] : null)
    || [4.4389, -75.2322];

  // Paso picker — pantalla completa del mapa
  if (step === 'picker') {
    return (
      <DashboardLayout role="cliente" pageTitle="Nuevo pedido">
        <div style={{ height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
          <MapPicker
            gradiente="linear-gradient(135deg,#8b5cf6,#6d28d9)"
            onCancel={() => setStep('list')}
            onConfirm={ubs => { setUbicaciones(ubs); setStep('form'); }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="cliente" pageTitle="Mis pedidos">
      {success && <div className="alert alert-ok" style={{ margin: '.75rem 1rem 0' }}>{success}</div>}

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">🛍️ Mis pedidos</div>
          <div className="page-subtitle">Rastrea tu domicilio en tiempo real</div>
        </div>
        <button className="btn btn-ghost" style={{ flexShrink: 0 }} onClick={() => setStep('picker')}>
          ➕ Nuevo pedido
        </button>
      </div>

      {/* Layout principal: lista + mapa */}
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 185px)',
        minHeight: 400,
        overflow: 'hidden',
      }}>
        {/* Lista pedidos - ancho fijo */}
        <div style={{
          width: 250,
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,.15)',
          overflowY: 'auto',
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', padding: '4px 4px 0' }}>
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,.5)', fontSize: 12 }}>⏳ Cargando...</div>
          ) : pedidos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,.5)', fontSize: 12 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📭</div>
              Sin pedidos aún
              <br/>
              <button onClick={() => setStep('picker')} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 99, background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}>
                ➕ Crear pedido
              </button>
            </div>
          ) : pedidos.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} style={{
              background: selected?.id === p.id ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)',
              border: `2px solid ${selected?.id === p.id ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.15)'}`,
              borderRadius: 16, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
              transition: 'all .2s', fontFamily: 'Poppins,sans-serif', width: '100%',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', fontWeight: 500 }}>#{String(p.id).slice(-6)}</span>
                <span className={`badge ${BADGE[p.estado] || 'badge-neutral'}`}>
                  <span className="badge-dot"/>{EMOJIS[p.estado]} {LABELS[p.estado] || p.estado}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.descripcion || 'Pedido'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.direccion_entrega || p.direccion_destino}
              </div>
            </button>
          ))}
        </div>

        {/* Mapa + timeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Mapa */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* Chips info */}
            <div style={{ position: 'absolute', top: 10, left: 12, zIndex: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 10px rgba(0,0,0,.1)' }}>
                {domiPos
                  ? <><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}/>GPS activo 🛵</>
                  : <>📍 Mapa en vivo</>}
              </div>
              {ruta && distancia && (
                <div style={{ background: 'rgba(139,92,246,.9)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 10px rgba(0,0,0,.1)' }}>
                  🛣️ {formatDistancia(distancia)} · ⏱️ {formatDuracion(duracion)}
                </div>
              )}
            </div>

            <div style={{ width: '100%', height: '100%' }}>
              <AppMap center={mapCenter} zoom={14}>
                {ruta && ruta.length > 1 && (
                  <Polyline positions={ruta} color="#8b5cf6" weight={5} opacity={0.85}/>
                )}
                {tieneOrigen && (
                  <Marker position={[selected.lat_origen, selected.lng_origen]} icon={origenIcon}>
                    <Popup>📦 Origen: {selected.direccion_origen}</Popup>
                  </Marker>
                )}
                {tieneDestino && (
                  <Marker position={[selected.lat_destino, selected.lng_destino]} icon={destinoIcon}>
                    <Popup>🏠 Destino: {selected.direccion_entrega || selected.direccion_destino}</Popup>
                  </Marker>
                )}
                {domiPos && (
                  <Marker position={domiPos} icon={domiIcon}>
                    <Popup>🛵 Domiciliario en camino</Popup>
                  </Marker>
                )}
              </AppMap>
            </div>

            {!domiPos && selected?.estado === 'en_camino' && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 14px', background: 'rgba(255,255,255,.9)', fontSize: 11, color: '#d97706', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, zIndex: 10 }}>
                ⏳ Esperando señal GPS del domiciliario...
              </div>
            )}
          </div>

          {/* Timeline progreso */}
          {selected && selected.estado !== 'cancelado' && (
            <div style={{ padding: '.85rem 1.25rem', background: 'rgba(255,255,255,.1)', borderTop: '1px solid rgba(255,255,255,.15)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.65rem' }}>
                Progreso del pedido
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {PASOS.map((paso, i) => {
                  const done = i <= stepIdx; const cur = i === stepIdx;
                  return (
                    <div key={paso} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
                      {i < PASOS.length - 1 && (
                        <div style={{ position: 'absolute', top: 11, left: '50%', width: '100%', height: 3, background: done && i < stepIdx ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.2)', zIndex: 0, borderRadius: 2 }}/>
                      )}
                      <div style={{ width: 22, height: 22, borderRadius: '50%', zIndex: 1, background: done ? '#fff' : 'rgba(255,255,255,.2)', border: `2px solid ${done ? '#fff' : 'rgba(255,255,255,.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', color: done ? '#8b5cf6' : 'rgba(255,255,255,.5)', fontWeight: 700, boxShadow: cur ? '0 0 0 4px rgba(255,255,255,.2)' : 'none', transition: 'all .3s' }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 9, color: done ? '#fff' : 'rgba(255,255,255,.5)', textAlign: 'center', fontWeight: cur ? 700 : 400 }}>
                        {EMOJIS[paso]} {LABELS[paso]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal formulario después del picker */}
      {step === 'form' && ubicaciones && (
        <Modal onClose={() => setStep('list')} width={420}>
          <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '80vh' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>📦 Detalles del pedido</div>
            <div style={{ fontSize: 11, color: '#9090b0', marginBottom: '1rem' }}>Ya seleccionaste las ubicaciones en el mapa</div>

            {/* Resumen ubicaciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#f0faf5', borderRadius: 10, border: '1px solid #86efac', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>📦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '.06em' }}>Recogida</div>
                  <div style={{ fontSize: 11, color: '#1a1a2e', fontWeight: 500, marginTop: 1, wordBreak: 'break-word' }}>{ubicaciones.origen.label}</div>
                </div>
                <button onClick={() => setStep('picker')} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✏️</button>
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fca5a5', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>🏠</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.06em' }}>Entrega</div>
                  <div style={{ fontSize: 11, color: '#1a1a2e', fontWeight: 500, marginTop: 1, wordBreak: 'break-word' }}>{ubicaciones.destino.label}</div>
                </div>
                <button onClick={() => setStep('picker')} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✏️</button>
              </div>
            </div>

            <form onSubmit={crearPedido} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div>
                <div className="field-label">📝 ¿Qué vas a enviar?</div>
                <input type="text" placeholder="Documentos, mercado, ropa..." value={form.descripcion} onChange={e => setForm(v => ({ ...v, descripcion: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setStep('list')} style={{ flex: 1, height: 44, borderRadius: 12, background: '#f0f2ff', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 13, color: '#4a4a6a', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ flex: 2, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? '⏳ Creando...' : '🚀 Pedir ahora'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}