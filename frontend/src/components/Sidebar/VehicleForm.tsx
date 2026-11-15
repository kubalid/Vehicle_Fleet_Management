import React, { useState } from 'react';
import type { Coordinates, CreateVehiclePayload, VehicleType } from '../../types/fleet';

interface VehicleFormProps {
  pickedStart: Coordinates | null;
  onSubmit: (payload: CreateVehiclePayload) => Promise<void>;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({ pickedStart, onSubmit }) => {
  const [brand, setBrand] = useState('');
  const [vType, setVType] = useState<VehicleType>('Van');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !pickedStart) return;

    setSubmitting(true);
    try {
      await onSubmit({
        brand: brand.trim(),
        v_type: vType,
        start_lat: pickedStart.lat,
        start_lng: pickedStart.lng,
      });
      setBrand('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="panel-card" onSubmit={handleSubmit}>
      <h3 className="card-title text-emerald">Add New Vehicle</h3>

      <label className="form-label">Brand and Model</label>
      <input
        className="form-input"
        type="text"
        placeholder="e.g., Scania R450 / Mercedes Sprinter"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        required
      />

      <label className="form-label">Vehicle Type</label>
      <select
        className="form-select"
        value={vType}
        onChange={(e) => setVType(e.target.value as VehicleType)}
      >
        <option value="Van">Van</option>
        <option value="Truck (TIR)">Truck (TIR)</option>
        <option value="Car">Car</option>
        <option value="Specialized">Specialized</option>
      </select>

      <div className="coord-hint hint-emerald">
        {pickedStart ? (
          <span>
             Starting point: <strong>{pickedStart.lat.toFixed(4)}, {pickedStart.lng.toFixed(4)}</strong>
          </span>
        ) : (
          <span> Click on the map to select the vehicle's starting point.</span>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-emerald"
        disabled={!brand.trim() || !pickedStart || submitting}
      >
        {submitting ? 'Saving...' : 'Add Vehicle to Fleet'}
      </button>
    </form>
  );
};