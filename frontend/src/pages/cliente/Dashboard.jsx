import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';

const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;
const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;

const domiIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="width:36px;height:36px;border-radius:50%;background:#8b5cf6;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(139,92,246,0.4);">🛵</div><div style="background:white;color:#1a1a2e;font-size:9px;padding:2px 7px;border-radius:99px;font-family:Poppins,sans-serif;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.15);">En camino</div></div>`,
  iconSize: [70, 52], iconAnchor: [35, 52], className: '',
});

const PASOS = ['pendiente','asignado','en_camino','entregado'];
const LABELS = { pendiente:'Pendiente', asignado:'Asignado', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado' };
const EMOJIS = { pendiente:'⏳', asignado:'👤', en_camino:'🛵', entregado:'✅', cancelado:'❌' };
const BADGE  = { pendiente:'badge-warn', asignado:'badge-info', en_camino:'badge-info', entregado:'badge-ok', cancelado:'badge-err' };

export default function ClienteDashboard() {
  const { token } = useAuth();
  const [pedidos, setPedidos]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [domiPos, setDomiPos]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    axios.get(`${PEDIDOS_URL}/pedidos/mis-pedidos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setPedidos(r.data); if (r.data.length) setSelected(r.data[0]); })
      .catch(() => {}).finally(() => setLoading(false));
    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current.on('location_update', ({ pedido_id, lat, lng }) => {
      setDomiPos(prev => selected?.id === pedido_id ? [lat, lng] : prev);
    });
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (selected?.id && socketRef.current) socketRef.current.emit('join_pedido', { pedido_id: selected.id });
    setDomiPos(null);
  }, [selected?.id]);

  const stepIdx = PASOS.indexOf(selected?.estado);

  return (
    <DashboardLayout role="cliente" pageTitle="Mis pedidos">
      <div className="page-header">
        <div>
          <div className="page-title">🛍️ Rastrear pedido</div>
          <div className="page-subtitle">Sigue tu domicilio en tiempo real con GPS</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[{l:'Total',v:pedidos.length},{l:'Activos',v:pedidos.filter(p=>p.estado!=='entregado'&&p.estado!=='cancelado').length}].map(s=>(
            <div key={s.l} style={{ textAlign:'right' }}>
              <div style={{ fontSize:9,color:'rgba(255,255,255,0.6)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.06em' }}>{s.l}</div>
              <div style={{ fontSize:'1.4rem',fontWeight:800,color:'#fff',lineHeight:1 }}>{loading?'—':s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: 'calc(100vh - 190px)', minHeight: 400 }}>
        {/* Lista */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.15)', overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.5)', fontSize:12 }}>⏳ Cargando...</div>
            : pedidos.length === 0 ? <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.5)', fontSize:12 }}>😶 Sin pedidos</div>
            : pedidos.map(p => (
              <button key={p.id} onClick={() => setSelected(p)} style={{ background: selected?.id===p.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', border: `2px solid ${selected?.id===p.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 16, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontFamily:'Poppins,sans-serif' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.5)', fontWeight:500 }}>#{String(p.id).slice(-6)}</span>
                  <span className={`badge ${BADGE[p.estado]||'badge-neutral'}`}><span className="badge-dot"/>{EMOJIS[p.estado]} {LABELS[p.estado]||p.estado}</span>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{p.descripcion||'Pedido'}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', marginTop:2 }}>{p.direccion_entrega||p.direccion_destino}</div>
              </button>
            ))}
        </div>

        {/* Mapa + progress */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:10, left:12, zIndex:10, background:'rgba(255,255,255,0.9)', borderRadius:99, padding:'4px 12px', fontSize:11, fontWeight:600, color:'#1a1a2e', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 10px rgba(0,0,0,0.1)' }}>
              {domiPos ? <><span style={{width:7,height:7,borderRadius:'50%',background:'#10b981',display:'inline-block',boxShadow:'0 0 6px #10b981'}}/>GPS activo 🛵</> : <>📍 Mapa en vivo</>}
            </div>
            <div style={{ width:'100%', height:'100%' }}>
              <AppMap center={domiPos||[4.4389,-75.2322]} zoom={14}>
                {domiPos && <Marker position={domiPos} icon={domiIcon}><Popup>🛵 Domiciliario en camino</Popup></Marker>}
              </AppMap>
            </div>
            {!domiPos && (
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'8px 14px', background:'rgba(255,255,255,0.9)', borderTop:'1px solid rgba(0,0,0,0.05)', fontSize:11, color:'#d97706', display:'flex', alignItems:'center', gap:6, fontWeight:500, zIndex:10 }}>
                ⏳ Esperando señal GPS del domiciliario...
              </div>
            )}
          </div>

          {selected && selected.estado !== 'cancelado' && (
            <div style={{ padding:'1rem 1.25rem', background:'rgba(255,255,255,0.1)', borderTop:'1px solid rgba(255,255,255,0.15)', flexShrink:0 }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem' }}>Progreso del pedido</div>
              <div style={{ display:'flex', alignItems:'center' }}>
                {PASOS.map((paso, i) => {
                  const done = i <= stepIdx; const cur = i === stepIdx;
                  return (
                    <div key={paso} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, position:'relative' }}>
                      {i < PASOS.length - 1 && <div style={{ position:'absolute', top:10, left:'50%', width:'100%', height:3, background: done && i < stepIdx ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', zIndex:0, borderRadius:2 }} />}
                      <div style={{ width:22, height:22, borderRadius:'50%', zIndex:1, background: done ? '#fff' : 'rgba(255,255,255,0.2)', border:`2px solid ${done?'#fff':'rgba(255,255,255,0.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', color: done ? '#8b5cf6' : 'rgba(255,255,255,0.5)', fontWeight:700, boxShadow: cur ? '0 0 0 4px rgba(255,255,255,0.2)' : 'none', transition:'all 0.3s' }}>
                        {done ? '✓' : i+1}
                      </div>
                      <span style={{ fontSize:9, color: done ? '#fff' : 'rgba(255,255,255,0.5)', textAlign:'center', fontWeight: cur ? 700 : 400 }}>{EMOJIS[paso]} {LABELS[paso]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}