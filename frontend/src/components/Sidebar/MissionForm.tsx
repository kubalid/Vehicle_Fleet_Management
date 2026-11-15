import React, { useState, useEffect } from 'react';
import type { Coordinates, Vehicle, AssignMissionPayload } from '../../types/fleet';

interface MissionFormProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  pickedDest: Coordinates | null;
  routeMetrics: { distanceKm: number; durationMin: number } | null;
  routeCoordinates: [number, number][] | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onAssign: (vehicleId: number, payload: AssignMissionPayload) => Promise<void>;
}

export const MissionForm: React.FC<MissionFormProps> = ({
  vehicles,
  selectedVehicle,
  pickedDest,
  routeMetrics,
  routeCoordinates,
  onSelectVehicle,
  onAssign,
}) => {
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPurpose(selectedVehicle?.mission_purpose || '');
  }, [selectedVehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !pickedDest || !purpose.trim()) return;

    setSubmitting(true);
    try {
      await onAssign(selectedVehicle.id, {
        dest_lat: pickedDest.lat,
        dest_lng: pickedDest.lng,
        mission_purpose: purpose.trim(),
        distance_km: routeMetrics?.distanceKm ?? null,
        duration_min: routeMetrics?.durationMin ?? null,
        route_coordinates: routeCoordinates,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="panel-card" onSubmit={handleSubmit}>
      <h3 className="card-title text-blue">Assign Destination</h3>

      <label className="form-label">Vehicle from Fleet</label>
      <select
        className="form-select"
        value={selectedVehicle?.id || ''}
        onChange={(e) => {
          const found = vehicles.find((v) => v.id === Number(e.target.value));
          if (found) onSelectVehicle(found);
        }}
      >
        <option value="">-- Select a vehicle --</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            #{v.id} {v.brand} ({v.v_type}) [{v.status}]
          </option>
        ))}
      </select>

      <label className="form-label">Trip Purpose</label>
      <input
        className="form-input"
        type="text"
        placeholder="e.g., Container pickup at DCT Gdansk"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        required
      />

      <div className="coord-hint hint-red">
        {pickedDest ? (
          <div>
            <div>
               Destination: <strong>{pickedDest.lat.toFixed(4)}, {pickedDest.lng.toFixed(4)}</strong>
            </div>
            {routeMetrics && (
              <div className="route-stats">
                OSRM Route: <strong>{routeMetrics.distanceKm} km</strong> (~{routeMetrics.durationMin} min) • Points: {routeCoordinates?.length || 0}
              </div>
            )}
          </div>
        ) : (
          <span> Select a vehicle, then click on the map to set the destination.</span>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-blue"
        disabled={!selectedVehicle || !pickedDest || !purpose.trim() || submitting}
      >
        {submitting ? 'Updating...' : 'Confirm and Send to Route'}
      </button>
    </form>
  );
};