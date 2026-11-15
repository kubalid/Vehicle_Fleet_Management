import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { MapMouseEvent, GeoJSONSource } from 'maplibre-gl';
import type { LineString } from 'geojson';
import type { Coordinates, Vehicle } from '../../types/fleet';
import 'maplibre-gl/dist/maplibre-gl.css';

interface FleetMapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  pickedStart: Coordinates | null;
  pickedDest: Coordinates | null;
  routeGeometry: LineString | null;
  onMapClick: (coords: Coordinates) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export const FleetMap: React.FC<FleetMapProps> = ({
  vehicles,
  selectedVehicle,
  pickedStart,
  pickedDest,
  routeGeometry,
  onMapClick,
  onSelectVehicle,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const vehicleMarkersRef = useRef<maplibregl.Marker[]>([]);
  const startDraftMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
          },
          'osrm-route': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },

          {
            id: 'osrm-route-casing',
            type: 'line',
            source: 'osrm-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#1e3a8a',
              'line-width': 9,
              'line-opacity': 0.85,
            },
          },

          {
            id: 'osrm-route-line',
            type: 'line',
            source: 'osrm-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 5,
              'line-opacity': 1,
            },
          },
        ],
      },
      center: [18.6466, 54.352],
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('click', (e: MapMouseEvent) => {
      onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);


  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    vehicleMarkersRef.current.forEach((m) => m.remove());
    vehicleMarkersRef.current = [];

    vehicles.forEach((v) => {
      const el = document.createElement('div');
      el.className = `map-vehicle-marker ${v.status === 'In Transit' ? 'in-transit' : ''} ${
        selectedVehicle?.id === v.id ? 'active-marker' : ''
      }`;
      el.innerText = ` ${v.brand}`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectVehicle(v);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([v.start_lng, v.start_lat])
        .addTo(map);

      vehicleMarkersRef.current.push(marker);
    });
  }, [vehicles, selectedVehicle, onSelectVehicle]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!pickedStart) {
      startDraftMarkerRef.current?.remove();
      startDraftMarkerRef.current = null;
      return;
    }

    if (startDraftMarkerRef.current) {
      startDraftMarkerRef.current.setLngLat([pickedStart.lng, pickedStart.lat]);
    } else {
      startDraftMarkerRef.current = new maplibregl.Marker({ color: '#10b981' })
        .setLngLat([pickedStart.lng, pickedStart.lat])
        .addTo(map);
    }
  }, [pickedStart]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!pickedDest) {
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
      return;
    }

    if (destMarkerRef.current) {
      destMarkerRef.current.setLngLat([pickedDest.lng, pickedDest.lat]);
    } else {
      destMarkerRef.current = new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat([pickedDest.lng, pickedDest.lat])
        .addTo(map);
    }
  }, [pickedDest]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyRouteData = () => {
      const source = map.getSource('osrm-route') as GeoJSONSource | undefined;
      if (!source) return;

      if (routeGeometry && routeGeometry.coordinates.length > 0) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: routeGeometry,
        });

        const bounds = new maplibregl.LngLatBounds();
        routeGeometry.coordinates.forEach((coord) => {
          bounds.extend([coord[0], coord[1]]);
        });
        map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 800 });
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    };

    if (map.getSource('osrm-route')) {
      applyRouteData();
    } else {
      map.once('load', applyRouteData);
    }
  }, [routeGeometry]);

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map-container" />
    </div>
  );
};