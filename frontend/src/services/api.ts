import type { Vehicle, CreateVehiclePayload, AssignMissionPayload } from '../types/fleet';

const API_BASE_URL = 'http://localhost:8000/api/vehicles';

export const fleetApi = {
  async getAll(): Promise<Vehicle[]> {
    const res = await fetch(API_BASE_URL);
    if (!res.ok) throw new Error('Błąd pobierania floty');
    return res.json();
  },

  async create(payload: CreateVehiclePayload): Promise<Vehicle> {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Nie udało się dodać pojazdu');
    return res.json();
  },

  async assignMission(vehicleId: number, payload: AssignMissionPayload): Promise<Vehicle> {
    const res = await fetch(`${API_BASE_URL}/${vehicleId}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Nie udało się przypisać celu');
    return res.json();
  },

  async completeMission(vehicleId: number): Promise<Vehicle> {
    const res = await fetch(`${API_BASE_URL}/${vehicleId}/complete`, {
      method: 'PUT',
    });
    if (!res.ok) throw new Error('Nie udało się zakończyć trasy');
    return res.json();
  },

  async remove(vehicleId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/${vehicleId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Nie udało się usunąć pojazdu');
  },
};