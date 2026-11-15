import React from 'react';
import type { Vehicle } from '../../types/fleet';

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedVehicleId: number | null;
  onSelect: (vehicle: Vehicle) => void;
  onCompleteMission: (vehicleId: number) => void;
  onDelete: (vehicleId: number) => void;
}

export const VehicleList: React.FC<VehicleListProps> = ({
  vehicles,
  selectedVehicleId,
  onSelect,
  onCompleteMission,
  onDelete,
}) => {
  return (
    <div className="vehicle-list-section">
      <h3 className="section-subtitle">Vehicle Fleet Status ({vehicles.length})</h3>

      {vehicles.length === 0 ? (
        <p className="empty-text">No registered vehicles in the database.</p>
      ) : (
        <div className="vehicle-cards">
          {vehicles.map((v) => {
            const isSelected = v.id === selectedVehicleId;
            const inTransit = v.status === 'In Transit';

            return (
              <div
                key={v.id}
                className={`vehicle-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(v)}
              >
                <div className="vehicle-card-header">
                  <div>
                    <span className="vehicle-brand">{v.brand}</span>
                    <span className="vehicle-type">({v.v_type})</span>
                  </div>
                  <span className={`status-badge ${inTransit ? 'badge-amber' : 'badge-emerald'}`}>
                    {v.status}
                  </span>
                </div>

                <div className="vehicle-coords">
                   Position: {v.start_lat.toFixed(4)}, {v.start_lng.toFixed(4)}
                </div>

                {v.mission_purpose && (
                  <div className="mission-box">
                    <div> <strong>Destination:</strong> {v.mission_purpose}</div>
                    {v.distance_km !== null && (
                      <div className="mission-metrics">
                        Distance: {v.distance_km} km • Time: ~{v.duration_min} min
                      </div>
                    )}
                  </div>
                )}

                <div className="vehicle-actions">
                  <button
                    type="button"
                    className="btn-small btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(v.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};