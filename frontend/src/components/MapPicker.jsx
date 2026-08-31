import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Icon from './Icon';

const SVG_PACKAGE = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8L12 3L21 8V17L12 22L3 17V8Z"/><path d="M3 8L12 13L21 8"/><path d="M12 13V22"/></svg>`;
const SVG_HOME = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11L12 4L20 11"/><path d="M6 10V20H18V10"/><path d="M10 20V15H14V20"/></svg>`;

const pinIcon = (color, svg) => new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
    <div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.25);">${svg}</div>
    <div style="width:3px;height:10px;background:${color};border-radius:2px;"></div>
  </div>`,
  iconSize:[36,50], iconAnchor:[18,50], className:'',
});

const origenIcon  = pinIcon('#1a9c53', SVG_PACKAGE);
const destinoIcon = pinIcon('#d0121b', SVG_HOME);

function ClickHandler({ onTap }) {
  useMapEvents({ click: e => onTap(e.latlng) });
  return null;
}

/**
 * Picker de ubicación en 2 pasos: primero origen, luego destino
 * onConfirm({ origen: {lat,lng,label}, destino: {lat,lng,label} })
 */
export default function MapPicker({ onConfirm, onCancel, gradiente }) {
  const [step, setStep]       = useState('origen');  // 'origen' | 'destino' | 'confirm'
  const [origen, setOrigen]   = useState(null);
  const [destino, setDestino] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  const CENTER = [4.4389, -75.2322]; // Ibagué

  async function geocodeReverse(lat, lng) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
      const d = await r.json();
      return d.display_name?.split(',').slice(0,3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  const handleTap = useCallback(async ({ lat, lng }) => {
    setGeocoding(true);
    const label = await geocodeReverse(lat, lng);
    setGeocoding(false);

    if (step === 'origen') {
      setOrigen({ lat, lng, label });
      setStep('destino');
    } else if (step === 'destino') {
      setDestino({ lat, lng, label });
      setStep('confirm');
    }
  }, [step]);

  function reset() { setOrigen(null); setDestino(null); setStep('origen'); }

  const grad = gradiente || 'linear-gradient(135deg,#d0121b,#a80e17)';

  const INSTRUCCIONES = {
    origen:  { icon:'package',     texto:'Toca el mapa para marcar el punto de RECOGIDA', color:'#1a9c53' },
    destino: { icon:'home',        texto:'Ahora marca el punto de ENTREGA',               color:'#d0121b' },
    confirm: { icon:'checkCircle', texto:'¡Perfecto! Confirma las ubicaciones',            color:'#a80e17' },
  };

  const inst = INSTRUCCIONES[step];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:'Poppins,sans-serif' }}>
      {/* Header con instrucciones */}
      <div style={{ padding:'1rem 1.25rem', background: grad, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
            <Icon name={inst.icon} size={16} color="#fff" />Selecciona ubicación
          </div>
          <button onClick={onCancel} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,.2)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="x" size={15} color="#fff" /></button>
        </div>

        {/* Pasos */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          {['origen','destino','confirm'].map((s,i) => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background: step===s||(['destino','confirm'].includes(step)&&s==='origen')||(step==='confirm'&&s==='destino') ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color: step===s ? '#a80e17' : '#fff', transition:'all .3s' }}>
                {i+1}
              </div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,.85)', fontWeight:500 }}>
                {s==='origen'?'Recogida':s==='destino'?'Entrega':'Confirmar'}
              </span>
              {i<2 && <div style={{ width:20, height:2, background:'rgba(255,255,255,.3)', borderRadius:2 }}/>}
            </div>
          ))}
        </div>

        <div style={{ fontSize:12, color:'rgba(255,255,255,.9)', fontWeight:500, background:'rgba(255,255,255,.15)', padding:'6px 10px', borderRadius:8 }}>
          {geocoding ? 'Obteniendo dirección...' : inst.texto}
        </div>
      </div>

      {/* Mapa */}
      <div style={{ flex:1, position:'relative', minHeight:300 }}>
        <MapContainer
          center={CENTER}
          zoom={14}
          style={{ width:'100%', height:'100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
          />
          {step !== 'confirm' && <ClickHandler onTap={handleTap} />}
          {origen  && <Marker position={[origen.lat,  origen.lng]}  icon={origenIcon}/>}
          {destino && <Marker position={[destino.lat, destino.lng]} icon={destinoIcon}/>}
        </MapContainer>

        {/* Cursor indicator cuando no es confirm */}
        {step !== 'confirm' && (
          <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'rgba(0,0,0,.6)', color:'#fff', fontSize:11, padding:'4px 12px', borderRadius:99, pointerEvents:'none', whiteSpace:'nowrap' }}>
            Toca el mapa
          </div>
        )}
      </div>

      {/* Panel de confirmación */}
      {step === 'confirm' && (
        <div style={{ padding:'1rem 1.25rem', background:'#fff', flexShrink:0, borderTop:'2px solid #e9dcdb' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 10px', background:'#e7f9ee', borderRadius:10, border:'1px solid #a6e8bf' }}>
              <Icon name="package" size={15} color="#1a9c53" style={{ flexShrink:0, marginTop:2 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#1a9c53', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Recogida</div>
                <div style={{ fontSize:12, color:'#221415', fontWeight:500, wordBreak:'break-word' }}>{origen?.label}</div>
              </div>
              <button onClick={() => { setOrigen(null); setStep('origen'); }} style={{ color:'#8a6d6e', background:'none', border:'none', cursor:'pointer', padding:'2px 4px', display:'flex' }}><Icon name="pencil" size={13} /></button>
            </div>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 10px', background:'#fff1f0', borderRadius:10, border:'1px solid #ffb8b2' }}>
              <Icon name="home" size={15} color="#d0121b" style={{ flexShrink:0, marginTop:2 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#d0121b', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Entrega</div>
                <div style={{ fontSize:12, color:'#221415', fontWeight:500, wordBreak:'break-word' }}>{destino?.label}</div>
              </div>
              <button onClick={() => { setDestino(null); setStep('destino'); }} style={{ color:'#8a6d6e', background:'none', border:'none', cursor:'pointer', padding:'2px 4px', display:'flex' }}><Icon name="pencil" size={13} /></button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={reset} style={{ flex:1, height:44, borderRadius:12, background:'#f4ebea', border:'none', fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:13, color:'#55393b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Icon name="refresh" size={13} />Reiniciar
            </button>
            <button onClick={() => onConfirm({ origen, destino })} style={{ flex:2, height:44, borderRadius:12, background:grad, border:'none', fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:13, color:'#fff', cursor:'pointer', boxShadow:'0 4px 15px rgba(0,0,0,.15)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Icon name="checkCircle" size={14} color="#fff" />Confirmar ubicaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
}