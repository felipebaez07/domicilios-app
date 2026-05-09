import { useState, useEffect } from 'react';

/**
 * Hook que obtiene la ruta real por calles entre dos puntos
 * usando OSRM (gratuito, sin API key, OpenStreetMap)
 */
export function useRoute(origin, destination) {
  const [ruta, setRuta]       = useState(null); // array de [lat,lng]
  const [loading, setLoading] = useState(false);
  const [distancia, setDistancia] = useState(null); // metros
  const [duracion,  setDuracion]  = useState(null); // segundos

  useEffect(() => {
    if (!origin || !destination) { setRuta(null); return; }
    const [lat1, lng1] = origin;
    const [lat2, lng2] = destination;
    if (!lat1 || !lng1 || !lat2 || !lng2) { setRuta(null); return; }

    setLoading(true);

    // OSRM API pública — coordenadas en formato lng,lat
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes?.length > 0) {
          const route = data.routes[0];
          // Convertir coordenadas GeoJSON [lng,lat] → [lat,lng] para Leaflet
          const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          setRuta(coords);
          setDistancia(Math.round(route.distance)); // metros
          setDuracion(Math.round(route.duration));  // segundos
        }
      })
      .catch(() => setRuta(null))
      .finally(() => setLoading(false));
  }, [
    origin?.[0], origin?.[1],
    destination?.[0], destination?.[1],
  ]);

  return { ruta, loading, distancia, duracion };
}

// Utilitario para formatear distancia y tiempo
export function formatDistancia(metros) {
  if (!metros) return null;
  return metros < 1000 ? `${metros}m` : `${(metros/1000).toFixed(1)}km`;
}

export function formatDuracion(segundos) {
  if (!segundos) return null;
  const min = Math.round(segundos / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min/60)}h ${min%60}min`;
}