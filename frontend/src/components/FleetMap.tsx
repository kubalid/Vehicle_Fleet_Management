import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
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
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [18.6466, 54.352], 
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      map.addSource('osrm-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'osrm-route-line',
        type: 'line',
        source: 'osrm-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-width': 5,
          'line-opacity': 0.85,
        },
      });
    });

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

    const applyRouteData = () => {
      const source = map.getSource('osrm-route') as GeoJSONSource | undefined;
      if (!source) return;

      if (routeGeometry && routeGeometry.coordinates.length > 0) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: routeGeometry,
        });
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


  useEffect(() => {
    if (selectedVehicle && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedVehicle.start_lng, selectedVehicle.start_lat],
        zoom: 12,
      });
    }
  }, [selectedVehicle?.id]);


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

    const updateSource = () => {
      const source = map.getSource('osrm-route') as GeoJSONSource | undefined;
      if (!source) return;

      if (routeGeometry) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: routeGeometry,
        });
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateSource();
    } else {
      map.once('load', updateSource);
    }
  }, [routeGeometry]);

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map-container" />
    </div>
  );
};