import type { Coordinates, OsrmRouteResult } from '../types/fleet';

export async function calculateOsrmRoute(
  start: Coordinates,
  dest: Coordinates
): Promise<OsrmRouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          distanceKm: Number((route.distance / 1000).toFixed(2)),
          durationMin: Number((route.duration / 60).toFixed(1)),
          geometry: route.geometry,
        };
      }
    }
  } catch (error) {
    console.warn('OSRM server unavailable, using an alternative route:', error);
  }

  const R = 6371;
  const dLat = ((dest.lat - start.lat) * Math.PI) / 180;
  const dLng = ((dest.lng - start.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((start.lat * Math.PI) / 180) *
      Math.cos((dest.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const straightDist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const estimatedRoadKm = Number((straightDist * 1.25).toFixed(2));

  return {
    distanceKm: estimatedRoadKm,
    durationMin: Number(((estimatedRoadKm / 60) * 60).toFixed(1)),
    geometry: {
      type: 'LineString',
      coordinates: [
        [start.lng, start.lat],
        [dest.lng, dest.lat],
      ],
    },
  };
}