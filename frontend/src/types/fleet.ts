import type { LineString } from 'geojson';

export type VehicleType = 'Van' | 'Truck' | 'Car' | 'Specialized';
export type VehicleStatus = 'Available' | 'In Transit';
export type InteractionMode = 'ADD_VEHICLE' | 'ASSIGN_MISSION';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: number;
  brand: string;
  v_type: VehicleType;
  status: VehicleStatus;
  start_lat: number;
  start_lng: number;
  dest_lat: number | null;
  dest_lng: number | null;
  mission_purpose: string | null;
  distance_km: number | null;
  duration_min: number | null;
  route_coordinates: [number, number][] | null;
}

export interface CreateVehiclePayload {
  brand: string;
  v_type: VehicleType;
  start_lat: number;
  start_lng: number;
}

export interface AssignMissionPayload {
  dest_lat: number;
  dest_lng: number;
  mission_purpose: string;
  distance_km: number | null;
  duration_min: number | null;
  route_coordinates: [number, number][] | null;
}

export interface OsrmRouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: LineString;
}