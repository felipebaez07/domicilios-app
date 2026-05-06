import { MapContainer, TileLayer } from 'react-leaflet';

const POSITRON = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const ATTR     = '&copy; <a href="https://carto.com/">CARTO</a>';

export default function AppMap({ center = [4.4389, -75.2322], zoom = 13, style = {}, children }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', ...style }}
      zoomControl={false}
    >
      <TileLayer url={POSITRON} attribution={ATTR} />
      {children}
    </MapContainer>
  );
}