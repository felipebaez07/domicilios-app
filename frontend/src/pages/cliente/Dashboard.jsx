import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';
import Modal from '../../components/Modal';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;
const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;

const domiIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
    <div style="width:36px;height:36px;border-radius:50%;background:#8b5cf6;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(139,92,246,0.4);">🛵</div>
    <div style="background:white;color:#6d28d9;font-size:9px;padding:2px 7px;border-radius:99px;font-family:Poppins,sans-serif;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.15);">En camino</div>
  </div>`,
  iconSize: [70, 52], iconAnchor: [35, 52], className: '',
});

const origenIcon = new L.DivIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#10b981;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 12px rgba(16,185,129,0.4);">📦</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], className: '',
});

const destinoIcon = new L.DivIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 12px rgba(239,68,68,0.4);">🏠</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], className: '',
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
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ descripcion: '', direccion_origen: '', direccion_destino: '' });
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState('');
  const socketRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${PEDIDOS_URL}/pedidos/mis-pedidos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPedidos(data);
      // Actualizar el pedido seleccionado con datos frescos
      setSelected(prev => prev ? (data.find(p => p.id === prev.id) || prev) : (data[0] || null));
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    fetchData();
    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current.on('location_update', ({ pedido_id, lat, lng }) => {
      setSelected(prev => {
        if (prev?.id === pedido_id) setDomiPos([lat, lng]);
        return prev;
      });
    });
    // Escuchar cambios de estado en tiempo real
    socketRef.current.on('estado_actualizado', ({ pedido_id }) => {
      fetchData();
    });
    return () => socketRef.current?.disconnect();
  }, []);

  // Auto-refresh cada 15 segundos
  useAutoRefresh(fetchData, 15000);

  useEffect(() => {
    if (selected?.id && socketRef.current) {
      socketRef.current.emit('join_pedido', { pedido_id: selected.id });
    }
    setDomiPos(null);
  }, [selected?.id]);

  async function crearPedido(e) {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post(`${PEDIDOS_URL}/pedidos`, {
        ...form,
        cliente_nombre: user?.nombre || user?.email,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setModal(false);
      setForm({ descripcion: '', direccion_origen: '', direccion_destino: '' });
      setSuccess('¡Pedido creado! 🎉');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear pedido');
    } finally { setSaving(false); }
  }

  const stepIdx = PASOS.indexOf(selected?.estado);

  // Coordenadas de origen y destino si existen
  const tieneRuta = selected?.lat_origen && selected?.lng_origen && selected?.lat_destino && selected?.lng_destino;

  return (
    <DashboardLayout role="cliente" pageTitle="Mis pedidos">
      {success && <div className="alert alert-ok" style={{ margin: '0.75rem 1.5rem 0' }}>{success}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">🛍️ Rastrear pedido</div>
          <div className="page-subtitle">Sigue tu domicilio en tiempo real · se actualiza automáticamente</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {[{l:'Total',v:pedidos.length},{l:'Activos',v:pedidos.filter(p=>p.estado!=='entregado'&&p.estado!=='cancelado').length}].map(s=>(
            <div key={s.l} style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.6)', fontWeight:500, textTransform:'uppercase', letterSpacing:'.06em' }}>{s.l}</div>
              <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#fff', lineHeight:1 }}>{loading?'—':s.v}</div>
            </div>
          ))}
          <button className="btn btn-ghost" onClick={() => setModal(true)}>➕ Nuevo pedido</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', height:'calc(100vh - 190px)', minHeight:400 }}>
        {/* Lista pedidos */}
        <div style={{ borderRight:'1px solid rgba(255,255,255,.15)', overflowY:'auto', padding:10, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', padding:'4px 4px 0' }}>
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </div>
          {loading ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,.5)', fontSize:12 }}>⏳ Cargando...</div>
          ) : pedidos.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,.5)', fontSize:12 }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>📭</div>
              Sin pedidos aún<br/>
              <button onClick={() => setModal(true)} style={{ marginTop:10, padding:'6px 14px', borderRadius:99, background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', fontSize:11, cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:600 }}>
                ➕ Crear pedido
              </button>
            </div>
          ) : pedidos.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} style={{
              background: selected?.id===p.id ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)',
              border: `2px solid ${selected?.id===p.id ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.15)'}`,
              borderRadius:16, padding:'10px 12px', cursor:'pointer', textAlign:'left',
              transition:'all .2s', fontFamily:'Poppins,sans-serif',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:9, color:'rgba(255,255,255,.5)', fontWeight:500 }}>#{String(p.id).slice(-6)}</span>
                <span className={`badge ${BADGE[p.estado]||'badge-neutral'}`}>
                  <span className="badge-dot"/>{EMOJIS[p.estado]} {LABELS[p.estado]||p.estado}
                </span>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{p.descripcion||'Pedido'}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginTop:2 }}>{p.direccion_entrega||p.direccion_destino}</div>
            </button>
          ))}
        </div>

        {/* Mapa + timeline */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:10, left:12, zIndex:10, background:'rgba(255,255,255,.9)', borderRadius:99, padding:'4px 12px', fontSize:11, fontWeight:600, color:'#1a1a2e', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 10px rgba(0,0,0,.1)' }}>
              {domiPos
                ? <><span style={{width:7,height:7,borderRadius:'50%',background:'#10b981',display:'inline-block',boxShadow:'0 0 6px #10b981'}}/>GPS activo 🛵</>
                : <>📍 Mapa en vivo</>}
            </div>
            <div style={{ width:'100%', height:'100%' }}>
              <AppMap center={domiPos || (tieneRuta ? [selected.lat_origen, selected.lng_origen] : [4.4389,-75.2322])} zoom={14}>
                {/* Marcadores de origen y destino */}
                {tieneRuta && <>
                  <Marker position={[selected.lat_origen, selected.lng_origen]} icon={origenIcon}>
                    <Popup>📦 Origen: {selected.direccion_origen}</Popup>
                  </Marker>
                  <Marker position={[selected.lat_destino, selected.lng_destino]} icon={destinoIcon}>
                    <Popup>🏠 Destino: {selected.direccion_entrega||selected.direccion_destino}</Popup>
                  </Marker>
                  {/* Línea de ruta */}
                  <Polyline
                    positions={[
                      [selected.lat_origen, selected.lng_origen],
                      ...(domiPos ? [domiPos] : []),
                      [selected.lat_destino, selected.lng_destino],
                    ]}
                    color="#8b5cf6"
                    weight={4}
                    opacity={0.7}
                    dashArray="8 4"
                  />
                </>}
                {/* Domiciliario en tiempo real */}
                {domiPos && <Marker position={domiPos} icon={domiIcon}><Popup>🛵 Domiciliario en camino</Popup></Marker>}
              </AppMap>
            </div>
            {!domiPos && selected?.estado === 'en_camino' && (
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'8px 14px', background:'rgba(255,255,255,.9)', borderTop:'1px solid rgba(0,0,0,.05)', fontSize:11, color:'#d97706', display:'flex', alignItems:'center', gap:6, fontWeight:500, zIndex:10 }}>
                ⏳ Esperando señal GPS del domiciliario...
              </div>
            )}
          </div>

          {/* Timeline progreso */}
          {selected && selected.estado !== 'cancelado' && (
            <div style={{ padding:'1rem 1.25rem', background:'rgba(255,255,255,.1)', borderTop:'1px solid rgba(255,255,255,.15)', flexShrink:0 }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.75rem' }}>
                Progreso del pedido
              </div>
              <div style={{ display:'flex', alignItems:'center' }}>
                {PASOS.map((paso, i) => {
                  const done = i <= stepIdx; const cur = i === stepIdx;
                  return (
                    <div key={paso} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, position:'relative' }}>
                      {i < PASOS.length - 1 && (
                        <div style={{ position:'absolute', top:11, left:'50%', width:'100%', height:3, background: done && i < stepIdx ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.2)', zIndex:0, borderRadius:2 }} />
                      )}
                      <div style={{ width:22, height:22, borderRadius:'50%', zIndex:1, background: done ? '#fff' : 'rgba(255,255,255,.2)', border:`2px solid ${done?'#fff':'rgba(255,255,255,.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.6rem', color: done ? '#8b5cf6' : 'rgba(255,255,255,.5)', fontWeight:700, boxShadow: cur ? '0 0 0 4px rgba(255,255,255,.2)' : 'none', transition:'all .3s' }}>
                        {done ? '✓' : i+1}
                      </div>
                      <span style={{ fontSize:9, color: done ? '#fff' : 'rgba(255,255,255,.5)', textAlign:'center', fontWeight: cur ? 700 : 400 }}>
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

      {/* Modal nuevo pedido */}
      {modal && (
        <Modal onClose={() => setModal(false)} width={440}>
          <div className="modal-inner">
            <div className="modal-title">➕ Nuevo pedido</div>
            <div className="modal-sub">Ingresa los datos de tu entrega</div>
            <form onSubmit={crearPedido} style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
              {[
                { k:'descripcion',       l:'📦 ¿Qué necesitas enviar?',  p:'Documentos, ropa, mercado...' },
                { k:'direccion_origen',  l:'📍 Dirección de recogida',   p:'Calle 10 #5-20, Centro' },
                { k:'direccion_destino', l:'🏠 Dirección de entrega',    p:'Carrera 5 #15-30, El Salado' },
              ].map(f => (
                <div key={f.k}>
                  <div className="field-label">{f.l}</div>
                  <input type="text" placeholder={f.p} value={form[f.k]} onChange={e => setForm(v => ({...v,[f.k]:e.target.value}))} required />
                </div>
              ))}
              <div style={{ display:'flex', gap:'.5rem', marginTop:'.25rem' }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex:1, height:44, borderRadius:12, background:'#f0f2ff', border:'none', fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:13, color:'#4a4a6a', cursor:'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ flex:1, height:44, borderRadius:12, background:'linear-gradient(135deg,#8b5cf6,#6d28d9)', border:'none', fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:13, color:'#fff', cursor:'pointer', opacity:saving?.7:1 }}>
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