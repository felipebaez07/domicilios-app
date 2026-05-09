import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import AppMap from '../../components/AppMap';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;

const myIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
    <div style="width:40px;height:40px;border-radius:50%;background:#10b981;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 16px rgba(16,185,129,0.4);">🛵</div>
    <div style="background:white;color:#059669;font-size:9px;padding:2px 8px;border-radius:99px;font-family:Poppins,sans-serif;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.1);">Tú</div>
  </div>`,
  iconSize:[70,52], iconAnchor:[35,52], className:'',
});

const ESTADOS_SIG = {
  asignado:  { next:'en_camino', label:'▶️ Iniciar entrega' },
  en_camino: { next:'entregado', label:'✅ Marcar entregado' },
};

export default function DomiciliarioDashboard() {
  const { token, user } = useAuth();
  const [gpsOn,   setGpsOn  ] = usePersistentState('dom_gps_active', false);
  const [lastPos, setLastPos] = usePersistentState('dom_last_pos', null);
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [pedidosHoy,   setPedidosHoy]   = useState([]);
  const [myPos,     setMyPos]     = useState(lastPos);
  const [gpsErr,    setGpsErr]    = useState('');
  const [updating,  setUpdating]  = useState(false);
  const [loading,   setLoading]   = useState(true);

  const socketRef = useRef(null);
  const watchRef  = useRef(null);
  const gpsRef    = useRef(gpsOn);
  const pedidoRef = useRef(pedidoActivo);
  const userRef   = useRef(user);
  useEffect(() => { gpsRef.current = gpsOn; },          [gpsOn]);
  useEffect(() => { pedidoRef.current = pedidoActivo; }, [pedidoActivo]);
  useEffect(() => { userRef.current = user; },           [user]);

  function fetchData() {
    axios.get(`${PEDIDOS_URL}/pedidos/mis-entregas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        setPedidoActivo(r.data.find(p => p.estado==='asignado'||p.estado==='en_camino')||null);
        setPedidosHoy(r.data.filter(p => p.estado==='entregado' && p.created_at && new Date(p.created_at).toDateString()===new Date().toDateString()));
      }).catch(() => {}).finally(() => setLoading(false));
  }

  function startWatch() {
    if (!navigator.geolocation) { setGpsErr('GPS no disponible en este dispositivo'); return; }
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    setGpsErr('');
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude:lat, longitude:lng } = pos.coords;
        const arr = [lat,lng]; setMyPos(arr); setLastPos(arr);
        socketRef.current?.emit('location_update', { lat, lng, domiciliario_id:userRef.current?.id, pedido_id:pedidoRef.current?.id, nombre:userRef.current?.nombre });
      },
      err => { setGpsErr(err.message); setGpsOn(false); gpsRef.current = false; },
      { enableHighAccuracy:true, maximumAge:3000, timeout:15000 }
    );
    setGpsOn(true); gpsRef.current = true;
  }

  function stopWatch() {
    if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setGpsOn(false); gpsRef.current = false;
    socketRef.current?.emit('gps_off', { domiciliario_id:userRef.current?.id });
  }

  function toggleGPS() { gpsRef.current ? stopWatch() : startWatch(); }

  useEffect(() => {
    fetchData();
    socketRef.current = io(TRACKING_URL, { auth:{ token }, transports:['websocket'] });
    if (localStorage.getItem('dom_gps_active')==='true') setTimeout(() => startWatch(), 600);
    return () => { socketRef.current?.disconnect(); if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  useAutoRefresh(fetchData, 15000);

  async function actualizarEstado(nuevoEstado) {
    if (!pedidoActivo) return;
    setUpdating(true);
    try {
      await axios.patch(`${PEDIDOS_URL}/pedidos/${pedidoActivo.id}/estado`, { estado:nuevoEstado }, { headers:{ Authorization:`Bearer ${token}` } });
      await fetchData();
    } catch {} finally { setUpdating(false); }
  }

  const accion = pedidoActivo ? ESTADOS_SIG[pedidoActivo.estado] : null;

  return (
    <DashboardLayout role="domiciliario" pageTitle="Mi turno">
      <div className="page-header">
        <div>
          <div className="page-title">🏠 Centro de entregas</div>
          <div className="page-subtitle">Gestiona tu ruta y comparte tu ubicación GPS · auto-sync 15s</div>
        </div>
        <button onClick={toggleGPS} style={{ padding:'8px 20px', borderRadius:99, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:13, fontWeight:700, background:gpsOn?'rgba(255,255,255,.9)':'rgba(255,255,255,.25)', color:gpsOn?'#10b981':'#fff', boxShadow:gpsOn?'0 4px 15px rgba(16,185,129,.3)':'none', transition:'all .2s', display:'flex', alignItems:'center', gap:8 }}>
          {gpsOn
            ? <><span style={{width:8,height:8,borderRadius:'50%',background:'#10b981',display:'inline-block',boxShadow:'0 0 8px #10b981',animation:'blink 2s infinite'}}/>GPS activo</>
            : <>📍 Activar GPS</>}
        </button>
      </div>

      {gpsErr && <div className="alert alert-err" style={{margin:'0 1.5rem .5rem'}}>⚠️ {gpsErr}</div>}

      <div className="stats-grid-3">
        <StatCard icon={gpsOn?'📡':'📵'} value={gpsOn?'ACTIVO':'INACTIVO'} label="GPS"          delay={0} />
        <StatCard icon="📦"              value={loading?'—':String(pedidoActivo?1:0)}           label="Pedido activo" delay={100} />
        <StatCard icon="✅"              value={loading?'—':String(pedidosHoy.length)}           label="Entregas hoy"  delay={200} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', height:'calc(100vh - 290px)', minHeight:360 }}>
        {/* Mapa */}
        <div style={{ borderRight:'1px solid rgba(255,255,255,.15)', position:'relative', overflow:'hidden' }}>
          {myPos && (
            <div style={{ position:'absolute', bottom:10, right:10, zIndex:10, background:'rgba(255,255,255,.9)', borderRadius:99, padding:'4px 12px', fontSize:10, fontWeight:600, color:'#1a1a2e', boxShadow:'0 2px 10px rgba(0,0,0,.1)' }}>
              📍 {myPos[0].toFixed(4)}, {myPos[1].toFixed(4)}
            </div>
          )}
          <div style={{ width:'100%', height:'100%' }}>
            <AppMap center={myPos||[4.4389,-75.2322]} zoom={14}>
              {myPos && <Marker position={myPos} icon={myIcon}><Popup>📍 Tu ubicación actual</Popup></Marker>}
            </AppMap>
          </div>
          {!myPos && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.1)', backdropFilter:'blur(4px)', zIndex:5 }}>
              <div style={{ textAlign:'center', color:'rgba(255,255,255,.8)' }}>
                <div style={{ fontSize:'3rem', marginBottom:8 }}>📍</div>
                <div style={{ fontSize:13, fontWeight:600 }}>Activa el GPS para ver tu posición</div>
              </div>
            </div>
          )}
        </div>

        {/* Panel pedido activo */}
        <div style={{ overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'rgba(255,255,255,.15)', borderRadius:20, padding:'1rem', border:'1px solid rgba(255,255,255,.25)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.7)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.75rem' }}>📦 Pedido activo</div>
            {loading
              ? <p style={{color:'rgba(255,255,255,.5)',fontSize:12}}>⏳ Cargando...</p>
              : !pedidoActivo
              ? (
                <div style={{textAlign:'center',padding:'1rem 0'}}>
                  <div style={{fontSize:'2rem',marginBottom:6}}>😴</div>
                  <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.7)'}}>Sin pedidos asignados</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.4)',marginTop:4}}>Espera asignación del operador</div>
                </div>
              )
              : (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[
                    { icon:'👤', label:'Cliente',   value:pedidoActivo.cliente_nombre },
                    { icon:'📍', label:'Dirección', value:pedidoActivo.direccion_entrega||pedidoActivo.direccion_destino },
                    { icon:'📦', label:'Pedido',    value:pedidoActivo.descripcion },
                    { icon:'📞', label:'Teléfono',  value:pedidoActivo.telefono },
                  ].map(r => (
                    <div key={r.label} style={{display:'flex',gap:8}}>
                      <span style={{fontSize:'1rem',flexShrink:0}}>{r.icon}</span>
                      <div>
                        <div style={{fontSize:9,color:'rgba(255,255,255,.5)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>{r.label}</div>
                        <div style={{fontSize:12,color:'#fff',fontWeight:600,marginTop:1}}>{r.value||'—'}</div>
                      </div>
                    </div>
                  ))}
                  {accion && (
                    <button onClick={() => actualizarEstado(accion.next)} disabled={updating} style={{ marginTop:6, padding:'10px 0', borderRadius:12, background:'rgba(255,255,255,.25)', border:'2px solid rgba(255,255,255,.4)', color:'#fff', fontFamily:'Poppins,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s', opacity:updating?0.6:1 }}>
                      {updating ? '⏳ Actualizando...' : accion.label}
                    </button>
                  )}
                  {!gpsOn && (
                    <div className="alert alert-warn" style={{marginTop:4,fontSize:10}}>
                      ⚠️ Activa el GPS para compartir tu ubicación
                    </div>
                  )}
                </div>
              )}
          </div>

          {pedidosHoy.length > 0 && (
            <div style={{background:'rgba(255,255,255,.1)',borderRadius:20,padding:'.85rem',border:'1px solid rgba(255,255,255,.2)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem'}}>✅ Entregas de hoy</div>
              {pedidosHoy.slice(0,5).map(p => (
                <div key={p.id} style={{padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.1)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:'rgba(255,255,255,.8)',fontWeight:500}}>{p.cliente_nombre||p.descripcion}</span>
                  <span style={{fontSize:11}}>✅</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </DashboardLayout>
  );
}