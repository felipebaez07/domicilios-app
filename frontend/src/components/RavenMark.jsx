// Insignia RAVEN — monograma "R" en carmesí, pensado para verse nítido
// a cualquier tamaño (topbar, avatar, favicon), sin depender de una imagen.
export default function RavenMark({ size = 34, radius, mono = false }) {
  const r = radius ?? size * 0.28;
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      background: mono ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg,#d0121b,#a80e17)',
      border: mono ? '1px solid rgba(255,255,255,0.3)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none">
        <path d="M6 20V4h8.5a4.5 4.5 0 0 1 2.6 8.18L21 20h-4l-3.6-7H9.5v7H6Z" fill="#fff" />
        <path d="M9.5 7v4.5h4a2.25 2.25 0 0 0 0-4.5h-4Z" fill={mono ? '#fff' : '#d0121b'} fillOpacity={mono ? 0.35 : 1} />
      </svg>
    </div>
  );
}
