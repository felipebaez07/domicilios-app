import ravenLogo from '../assets/raven_logo.png';

// El archivo original trae el ícono (cuervo + brújula) arriba y el
// wordmark "RAVEN" debajo, separados por muy poco margen real. Para que
// el texto quede totalmente fuera del recorte, el ícono debe llenar el
// cuadro casi al borde (fill >= ~1) — un pelín de la brújula/cola puede
// recortarse, pero ninguna letra se asoma.
const IMG_W = 2400, IMG_H = 1315;
const BBOX = { x: 836, y: 196, w: 692, h: 605 };
const BBOX_CX = BBOX.x + BBOX.w / 2;
const BBOX_CY = BBOX.y + BBOX.h / 2;

// Insignia RAVEN — solo el cuervo y la brújula, sin texto ni animación.
export default function RavenMark({ size = 34, radius, mono = false, fill = 1.05 }) {
  const r = radius ?? size * 0.28;
  const scale = (size * fill) / BBOX.w;
  const bgX = size / 2 - BBOX_CX * scale;
  const bgY = size / 2 - BBOX_CY * scale;

  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      background: mono ? 'rgba(255,255,255,0.92)' : 'linear-gradient(135deg,#d0121b,#a80e17)',
      border: mono ? '1px solid rgba(255,255,255,0.5)' : 'none',
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${ravenLogo})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${IMG_W * scale}px ${IMG_H * scale}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        filter: mono ? 'none' : 'brightness(10)',
      }} />
    </div>
  );
}
