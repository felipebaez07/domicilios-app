import ravenRed from '../assets/raven-red.png';
import ravenWhite from '../assets/raven-white.png';

// Solo el cuervo (sin caja, sin margen): rojo para fondos claros,
// blanco para fondos de color. `size` es el lado del cuadro que ocupa.
export default function RavenMark({ size = 34, mono = false }) {
  return (
    <img
      src={mono ? ravenWhite : ravenRed}
      alt="Raven"
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, display: 'block' }}
    />
  );
}
