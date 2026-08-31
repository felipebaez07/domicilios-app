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
const AUTH_URL     = import.meta.env.VITE_AUTH_URL;

const domiIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
    <div style="width:36px;height:36px;border-radius:50%;background:#d0121b;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(208,18,27,0.4);">🛵</div>
    <div style="background:white;color:#a80e17;font-size:9px;padding:2px 7px;border-radius:99px;font-family:Poppins,sans-serif;font-weight:700;">En camino</div>
  </div>`,
  iconSize:[70,52], iconAnchor:[35,52], className:'',
});
const origenIcon = new L.DivIcon({
  html:`<div style="width:32px;height:32px;border-radius:50%;background:#1a9c53;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(26,156,83,0.4);">📦</div>`,
  iconSize:[32,32], iconAnchor:[16,32], className:'',
});
const destinoIcon = new L.DivIcon({
  html:`<div style="width:32px;height:32px;border-radius:50%;background:#d0121b;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(208,18,27,0.4);">🏠</div>`,
  iconSize:[32,32], iconAnchor:[16,32], className:'',
});

const PASOS  = ['pendiente','asignado','en_camino','entregado'];
const LABELS = { pendiente:'Pendiente', asignado:'Asignado', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado' };
const EMOJIS = { pendiente:'⏳', asignado:'👤', en_camino:'🛵', entregado:'✅', cancelado:'❌' };
const BADGE  = { pendiente:'badge-warn', asignado:'badge-info', en_camino:'badge-info', entregado:'badge-ok', cancelado:'badge-err' };

export default function ClienteDashboard() {
  const { token, user } = useAuth();
  const [pedidos, setPedidos]               = useState([]);
  const [selected, setSelected]             = useState(null);
  const [domiPos, setDomiPos]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [step, setStep]                     = useState('list'); // 'list' | 'empresa' | 'picker' | 'form'
  const [empresas, setEmpresas]             = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [ubicaciones, setUbicaciones]       = useState(null);
  const [form, setForm]                     = useState({ descripcion:'' });
  const [saving, setSaving]                 = useState(false);
  const [success, setSuccess]               = useState('');
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

  // Cargar empresas públicas
  async function fetchEmpresas() {
    setLoadingEmpresas(true);
    try {
      const { data } = await axios.get(`${AUTH_URL}/empresas/publicas`);
      setEmpresas(data);
    } catch {
      setEmpresas([]);
    } finally {
      setLoadingEmpresas(false);
    }
  }

  useEffect(() => {
    fetchData();
    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['polling'] });
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

  function handleNuevoPedido() {
    fetchEmpresas();
    setEmpresaSeleccionada(null);
    setUbicaciones(null);
    setForm({ descripcion: '' });
    setStep('empresa');
  }

  async function crearPedido(e) {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post(`${PEDIDOS_URL}/pedidos`, {
        descripcion:       form.descripcion,
        cliente_nombre:    user?.nombre || user?.email,
        empresa_id:        empresaSeleccionada.id,
        direccion_origen:  ubicaciones.origen.label,
        direccion_destino: ubicaciones.destino.label,
        direccion_entrega: ubicaciones.destino.label,
        lat_origen:  ubicaciones.origen.lat,
        lng_origen:  ubicaciones.origen.lng,
        lat_destino: ubicaciones.destino.lat,
        lng_destino: ubicaciones.destino.lng,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setStep('list');
      setUbicaciones(null);
      setEmpresaSeleccionada(null);
      setForm({ descripcion: '' });
      setSuccess('¡Pedido creado! 🎉 El operador lo asignará pronto.');
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
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

  // ── PASO: Selección de empresa ──
  if (step === 'empresa') {
    return (
      <DashboardLayout role="cliente" pageTitle="Nuevo pedido">
        <div style={{ padding: '1.5rem', maxWidth: 600, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <button onClick={() => setStep('list')} style={{ background: '#f4ebea', border: '1px solid #e9dcdb', color: '#55393b', borderRadius: 99, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', marginBottom: 12 }}>
              ← Volver
            </button>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#221415', marginBottom: 4, fontFamily: 'var(--font-display)' }}>
              🏢 ¿A qué empresa quieres hacerle el pedido?
            </div>
            <div style={{ fontSize: 12, color: '#8a6d6e' }}>
              Selecciona la empresa que realizará tu entrega
            </div>
          </div>

          {/* Lista de empresas */}
          {loadingEmpresas ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8a6d6e', fontSize: 14 }}>
              ⏳ Cargando empresas...
            </div>
          ) : empresas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8a6d6e', fontSize: 14 }}>
              😔 No hay empresas disponibles
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {empresas.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => { setEmpresaSeleccionada(emp); setStep('picker'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', borderRadius: 16,
                    background: '#fff',
                    border: '2px solid #e9dcdb',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all .2s', fontFamily: 'Poppins,sans-serif',
                    boxShadow: '0 2px 10px rgba(34,20,21,0.05)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ffb8b2'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(208,18,27,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e9dcdb'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(34,20,21,0.05)'; }}
                >
                  {/* Emoji / logo */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: emp.color1 || '#d0121b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem', boxShadow: '0 4px 12px rgba(0,0,0,.2)',
                  }}>
                    {emp.emoji || '🏢'}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#221415', marginBottom: 2 }}>
                      {emp.nombre}
                    </div>
                    <div style={{ fontSize: 11, color: '#8a6d6e', fontWeight: 500 }}>
                      Toca para seleccionar
                    </div>
                  </div>
                  <div style={{ fontSize: 20, color: '#d0121b' }}>→</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ── PASO: MapPicker ──
  if (step === 'picker') {
    return (
      <DashboardLayout role="cliente" pageTitle="Nuevo pedido">
        {/* Chip empresa seleccionada */}
        <div style={{ padding: '8px 1rem', background: '#fff', borderBottom: '1px solid #e9dcdb', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setStep('empresa')} style={{ background: '#f4ebea', border: 'none', color: '#55393b', borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>← Cambiar empresa</button>
          <div style={{ fontSize: 12, color: '#221415', fontWeight: 600 }}>
            {empresaSeleccionada?.emoji} {empresaSeleccionada?.nombre}
          </div>
        </div>
        <div style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
          <MapPicker
            gradiente="linear-gradient(135deg,#d0121b,#a80e17)"
            onCancel={() => setStep('empresa')}
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
        <button className="btn btn-ghost" style={{ flexShrink: 0 }} onClick={handleNuevoPedido}>
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
        {/* Lista pedidos */}
        <div style={{
          width: 250, flexShrink: 0,
          borderRight: '1px solid #e9dcdb',
          overflowY: 'auto', padding: 10,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 9, color: '#8a6d6e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', padding: '4px 4px 0' }}>
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8a6d6e', fontSize: 12 }}>⏳ Cargando...</div>
          ) : pedidos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8a6d6e', fontSize: 12 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📭</div>
              Sin pedidos aún
              <br/>
              <button onClick={handleNuevoPedido} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 99, background: '#f4ebea', border: '1px solid #e9dcdb', color: '#55393b', fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}>
                ➕ Crear pedido
              </button>
            </div>
          ) : pedidos.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} style={{
              background: selected?.id === p.id ? '#fff1f0' : '#fff',
              border: `2px solid ${selected?.id === p.id ? '#ffb8b2' : '#e9dcdb'}`,
              borderRadius: 16, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
              transition: 'all .2s', fontFamily: 'Poppins,sans-serif', width: '100%',
              boxShadow: '0 2px 8px rgba(34,20,21,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: '#8a6d6e', fontWeight: 500 }}>#{String(p.id).slice(-6)}</span>
                <span className={`badge ${BADGE[p.estado] || 'badge-neutral'}`}>
                  <span className="badge-dot"/>{EMOJIS[p.estado]} {LABELS[p.estado] || p.estado}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#221415', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.descripcion || 'Pedido'}
              </div>
              <div style={{ fontSize: 10, color: '#8a6d6e', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.direccion_entrega || p.direccion_destino}
              </div>
            </button>
          ))}
        </div>

        {/* Mapa + timeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 10, left: 12, zIndex: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#221415', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 10px rgba(0,0,0,.1)' }}>
                {domiPos
                  ? <><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1a9c53', display: 'inline-block', boxShadow: '0 0 6px #1a9c53' }}/>GPS activo 🛵</>
                  : <>📍 Mapa en vivo</>}
              </div>
              {ruta && distancia && (
                <div style={{ background: 'rgba(208,18,27,.9)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 10px rgba(0,0,0,.1)' }}>
                  🛣️ {formatDistancia(distancia)} · ⏱️ {formatDuracion(duracion)}
                </div>
              )}
            </div>

            <div style={{ width: '100%', height: '100%' }}>
              <AppMap center={mapCenter} zoom={14}>
                {ruta && ruta.length > 1 && (
                  <Polyline positions={ruta} color="#d0121b" weight={5} opacity={0.85}/>
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
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 14px', background: 'rgba(255,255,255,.9)', fontSize: 11, color: '#d9820b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, zIndex: 10 }}>
                ⏳ Esperando señal GPS del domiciliario...
              </div>
            )}
          </div>

          {/* Timeline progreso */}
          {selected && selected.estado !== 'cancelado' && (
            <div style={{ padding: '.85rem 1.25rem', background: '#fff', borderTop: '1px solid #e9dcdb', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#8a6d6e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.65rem' }}>
                Progreso del pedido
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {PASOS.map((paso, i) => {
                  const done = i <= stepIdx; const cur = i === stepIdx;
                  return (
                    <div key={paso} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
                      {i < PASOS.length - 1 && (
                        <div style={{ position: 'absolute', top: 11, left: '50%', width: '100%', height: 3, background: done && i < stepIdx ? '#d0121b' : '#e9dcdb', zIndex: 0, borderRadius: 2 }}/>
                      )}
                      <div style={{ width: 22, height: 22, borderRadius: '50%', zIndex: 1, background: done ? '#d0121b' : '#f4ebea', border: `2px solid ${done ? '#d0121b' : '#e9dcdb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', color: done ? '#fff' : '#8a6d6e', fontWeight: 700, boxShadow: cur ? '0 0 0 4px rgba(208,18,27,0.15)' : 'none', transition: 'all .3s' }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 9, color: done ? '#221415' : '#8a6d6e', textAlign: 'center', fontWeight: cur ? 700 : 400 }}>
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
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#221415', marginBottom: 4 }}>📦 Detalles del pedido</div>

            {/* Empresa seleccionada */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f4ebea', borderRadius: 10, border: '1px solid #e9dcdb', marginBottom: '1rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: empresaSeleccionada?.color1 || '#d0121b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                {empresaSeleccionada?.emoji || '🏢'}
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#d0121b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Empresa</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#221415' }}>{empresaSeleccionada?.nombre}</div>
              </div>
              <button onClick={() => setStep('empresa')} style={{ marginLeft: 'auto', fontSize: 11, color: '#d0121b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins,sans-serif' }}>Cambiar</button>
            </div>

            <div style={{ fontSize: 11, color: '#8a6d6e', marginBottom: '1rem' }}>Ya seleccionaste las ubicaciones en el mapa</div>

            {/* Resumen ubicaciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#e7f9ee', borderRadius: 10, border: '1px solid #a6e8bf', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>📦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#1a9c53', textTransform: 'uppercase', letterSpacing: '.06em' }}>Recogida</div>
                  <div style={{ fontSize: 11, color: '#221415', fontWeight: 500, marginTop: 1, wordBreak: 'break-word' }}>{ubicaciones.origen.label}</div>
                </div>
                <button onClick={() => setStep('picker')} style={{ fontSize: 12, color: '#8a6d6e', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✏️</button>
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#fff1f0', borderRadius: 10, border: '1px solid #ffb8b2', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>🏠</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#d0121b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Entrega</div>
                  <div style={{ fontSize: 11, color: '#221415', fontWeight: 500, marginTop: 1, wordBreak: 'break-word' }}>{ubicaciones.destino.label}</div>
                </div>
                <button onClick={() => setStep('picker')} style={{ fontSize: 12, color: '#8a6d6e', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✏️</button>
              </div>
            </div>

            <form onSubmit={crearPedido} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div>
                <div className="field-label">📝 ¿Qué vas a enviar?</div>
                <input type="text" placeholder="Documentos, mercado, ropa..." value={form.descripcion} onChange={e => setForm(v => ({ ...v, descripcion: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setStep('list')} style={{ flex: 1, height: 44, borderRadius: 12, background: '#f4ebea', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 13, color: '#55393b', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ flex: 2, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#d0121b,#a80e17)', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
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