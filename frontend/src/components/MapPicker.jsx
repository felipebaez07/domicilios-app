import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pinIcon = (color, emoji) => new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
    <div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 16px rgba(0,0,0,0.25);">${emoji}</div>
    <div style="width:3px;height:10px;background:${color};border-radius:2px;"></div>
  </div>`,
  iconSize:[36,50], iconAnchor:[18,50], className:'',
});

const origenIcon  = pinIcon('#10b981','📦');
const destinoIcon = pinIcon('#ef4444','🏠');

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

  const grad = gradiente || 'linear-gradient(135deg,#8b5cf6,#6d28d9)';

  const INSTRUCCIONES = {
    origen:  { emoji:'📦', texto:'Toca el mapa para marcar el punto de RECOGIDA', color:'#10b981' },
    destino: { emoji:'🏠', texto:'Ahora marca el punto de ENTREGA',               color:'#ef4444' },
    confirm: { emoji:'✅', texto:'¡Perfecto! Confirma las ubicaciones',            color:'#8b5cf6' },
  };

  const inst = INSTRUCCIONES[step];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:'Poppins,sans-serif' }}>
      {/* Header con instrucciones */}
      <div style={{ padding:'1rem 1.25rem', background: grad, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>
            {inst.emoji} Selecciona ubicación
          </div>
          <button onClick={onCancel} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,.2)', border:'none', color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Pasos */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          {['origen','destino','confirm'].map((s,i) => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background: step===s||(['destino','confirm'].includes(step)&&s==='origen')||(step==='confirm'&&s==='destino') ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color: step===s ? '#6d28d9' : '#fff', transition:'all .3s' }}>
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
          {geocoding ? '🔍 Obteniendo dirección...' : inst.texto}
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
            👆 Toca el mapa
          </div>
        )}
      </div>

      {/* Panel de confirmación */}
      {step === 'confirm' && (
        <div style={{ padding:'1rem 1.25rem', background:'#fff', flexShrink:0, borderTop:'2px solid #f0f0ff' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 10px', background:'#f0faf5', borderRadius:10, border:'1px solid #86efac' }}>
              <span style={{ fontSize:'1.1rem', flexShrink:0 }}>📦</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#10b981', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Recogida</div>
                <div style={{ fontSize:12, color:'#1a1a2e', fontWeight:500, wordBreak:'break-word' }}>{origen?.label}</div>
              </div>
              <button onClick={() => { setOrigen(null); setStep('origen'); }} style={{ fontSize:10, color:'#aaa', background:'none', border:'none', cursor:'pointer', padding:'2px 4px' }}>✏️</button>
            </div>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 10px', background:'#fef2f2', borderRadius:10, border:'1px solid #fca5a5' }}>
              <span style={{ fontSize:'1.1rem', flexShrink:0 }}>🏠</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#ef4444', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Entrega</div>
                <div style={{ fontSize:12, color:'#1a1a2e', fontWeight:500, wordBreak:'break-word' }}>{destino?.label}</div>
              </div>
              <button onClick={() => { setDestino(null); setStep('destino'); }} style={{ fontSize:10, color:'#aaa', background:'none', border:'none', cursor:'pointer', padding:'2px 4px' }}>✏️</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={reset} style={{ flex:1, height:44, borderRadius:12, background:'#f0f2ff', border:'none', fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:13, color:'#4a4a6a', cursor:'pointer' }}>
              🔄 Reiniciar
            </button>
            <button onClick={() => onConfirm({ origen, destino })} style={{ flex:2, height:44, borderRadius:12, background:grad, border:'none', fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:13, color:'#fff', cursor:'pointer', boxShadow:'0 4px 15px rgba(0,0,0,.15)' }}>
              ✅ Confirmar ubicaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
}