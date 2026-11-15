import { useEffect, useState, useCallback, useRef } from 'react';
import type { LineString } from 'geojson';
import type {
  Coordinates,
  InteractionMode,
  Vehicle,
  CreateVehiclePayload,
  AssignMissionPayload,
} from './types/fleet';
import { fleetApi } from './services/api';
import { calculateOsrmRoute } from './services/osrm';
import { VehicleForm } from './components/Sidebar/VehicleForm';
import { MissionForm } from './components/Sidebar/MissionForm';
import { VehicleList } from './components/Sidebar/VehicleList';
import { FleetMap } from './components/Map/FleetMap';
import { PixelStreamView } from './components/Stream/PixelStreamView';
import './styles/fleet.css';

type WorkspaceViewMode = 'MAP' | 'SPLIT' | 'STREAM';

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mode, setMode] = useState<InteractionMode>('ADD_VEHICLE');
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('SPLIT');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const pickedDestRef = useRef<Coordinates | null>(null);
  const [pickedStart, setPickedStart] = useState<Coordinates | null>(null);
  const [pickedDest, setPickedDest] = useState<Coordinates | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<LineString | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  useEffect(() => {
  pickedDestRef.current = pickedDest;
  }, [pickedDest]);

  const loadVehicles = useCallback(async () => {
    try {
      const data = await fleetApi.getAll();
      setVehicles(data);
    } catch (err) {
      console.error(err);
    }
  }, []);


  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

 useEffect(() => {
    let isMounted = true;
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/fleet');

    ws.onopen = () => {
      if (!isMounted) {
        ws.close();
        return;
      }
      console.log('Połączono z WebSocket FastAPI');
    };

ws.onmessage = (event) => {
      if (!isMounted) return;
      try {
        const msg = JSON.parse(event.data);
        if (
          msg.event === 'TELEMETRY_UPDATE' ||
          msg.event === 'MISSION_ASSIGNED' ||
          msg.event === 'MISSION_COMPLETED'
        ) {
          const updatedVehicle: Vehicle = msg.vehicle;

          setVehicles((prev) =>
            prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
          );

          setSelectedVehicleId((currentSelectedId) => {
            if (currentSelectedId === updatedVehicle.id) {
              const currentPicked = pickedDestRef.current;

              const isPreviewingNewRoute =
                msg.event === 'TELEMETRY_UPDATE' &&
                currentPicked !== null &&
                (updatedVehicle.dest_lat === null ||
                  updatedVehicle.dest_lng === null ||
                  Math.abs(currentPicked.lat - updatedVehicle.dest_lat) > 0.0001 ||
                  Math.abs(currentPicked.lng - updatedVehicle.dest_lng) > 0.0001);

              if (!isPreviewingNewRoute) {
                if (updatedVehicle.distance_km !== null && updatedVehicle.duration_min !== null) {
                  setRouteMetrics({
                    distanceKm: updatedVehicle.distance_km,
                    durationMin: updatedVehicle.duration_min,
                  });
                } else {
                  setRouteMetrics(null);
                }

                if (updatedVehicle.route_coordinates && updatedVehicle.route_coordinates.length > 1) {
                  setRouteGeometry({
                    type: 'LineString',
                    coordinates: updatedVehicle.route_coordinates,
                  });
                } else if (msg.event === 'MISSION_COMPLETED') {
                  setRouteGeometry(null);
                  setPickedDest(null);
                }
              }
            }
            return currentSelectedId;
          });
        } else if (msg.event === 'VEHICLE_CREATED') {
          loadVehicles();
        } else if (msg.event === 'VEHICLE_DELETED') {
          setVehicles((prev) => prev.filter((v) => v.id !== msg.vehicle_id));
        }
      } catch (e) {
        console.error('Błąd pakietu WebSocket:', e);
      }
    };

    return () => {
      isMounted = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [loadVehicles]);

  const handleSelectVehicle = useCallback(async (vehicle: Vehicle) => {
    setMode('ASSIGN_MISSION');
    setSelectedVehicleId(vehicle.id);
    setPickedStart(null);

    if (vehicle.dest_lat !== null && vehicle.dest_lng !== null) {
      const dest = { lat: vehicle.dest_lat, lng: vehicle.dest_lng };
      setPickedDest(dest);

      if (vehicle.route_coordinates && vehicle.route_coordinates.length > 0) {
        setRouteGeometry({
          type: 'LineString',
          coordinates: vehicle.route_coordinates,
        });
        setRouteMetrics({
          distanceKm: vehicle.distance_km || 0,
          durationMin: vehicle.duration_min || 0,
        });
      } else {
        const osrm = await calculateOsrmRoute(
          { lat: vehicle.start_lat, lng: vehicle.start_lng },
          dest
        );
        setRouteGeometry(osrm.geometry);
        setRouteMetrics({ distanceKm: osrm.distanceKm, durationMin: osrm.durationMin });
      }
    } else {
      setPickedDest(null);
      setRouteGeometry(null);
      setRouteMetrics(null);
    }
  }, []);

  const handleMapClick = useCallback(
    async (coords: Coordinates) => {
      if (mode === 'ADD_VEHICLE') {
        setPickedStart(coords);
      } else if (mode === 'ASSIGN_MISSION') {
        if (!selectedVehicle) {
          alert('First, select a vehicle from the list on the left!');
          return;
        }
        setPickedDest(coords);
        const osrm = await calculateOsrmRoute(
          { lat: selectedVehicle.start_lat, lng: selectedVehicle.start_lng },
          coords
        );
        setRouteGeometry(osrm.geometry);
        setRouteMetrics({ distanceKm: osrm.distanceKm, durationMin: osrm.durationMin });
      }
    },
    [mode, selectedVehicle]
  );

  const handleCreateVehicle = async (payload: CreateVehiclePayload) => {
    await fleetApi.create(payload);
    setPickedStart(null);
    await loadVehicles();
  };

  const handleAssignMission = async (vehicleId: number, payload: AssignMissionPayload) => {
    await fleetApi.assignMission(vehicleId, payload);
    await loadVehicles();
  };

  const handleCompleteMission = async (vehicleId: number) => {
    await fleetApi.completeMission(vehicleId);
    setPickedDest(null);
    setRouteGeometry(null);
    setRouteMetrics(null);
    await loadVehicles();
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    await fleetApi.remove(vehicleId);
    if (selectedVehicleId === vehicleId) {
      setSelectedVehicleId(null);
      setPickedDest(null);
      setRouteGeometry(null);
      setRouteMetrics(null);
    }
    await loadVehicles();
  };

  const currentRouteCoords =
    (routeGeometry?.coordinates as [number, number][] | undefined) || null;

  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, [viewMode]);

  return (
    <div className="fleet-layout">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>Fleet Management APP</h1>
        
        </header>

        <div className="mode-tabs">
          <button
            type="button"
            className={`tab-btn ${mode === 'ADD_VEHICLE' ? 'active-emerald' : ''}`}
            onClick={() => {
              setMode('ADD_VEHICLE');
              setPickedDest(null);
              setRouteGeometry(null);
            }}
          >
            + Add a Vehicle
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'ASSIGN_MISSION' ? 'active-blue' : ''}`}
            onClick={() => {
              setMode('ASSIGN_MISSION');
              setPickedStart(null);
            }}
          >
             Set a destination
          </button>
        </div>

        {mode === 'ADD_VEHICLE' ? (
          <VehicleForm pickedStart={pickedStart} onSubmit={handleCreateVehicle} />
        ) : (
          <MissionForm
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            pickedDest={pickedDest}
            routeMetrics={routeMetrics}
            routeCoordinates={currentRouteCoords}
            onSelectVehicle={handleSelectVehicle}
            onAssign={handleAssignMission}
          />
        )}

        <VehicleList
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelect={handleSelectVehicle}
          onCompleteMission={handleCompleteMission}
          onDelete={handleDeleteVehicle}
        />
      </aside>


      <main className="workspace-area">
        <div className="view-mode-bar">
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
           
          </span>
          <div className="view-mode-buttons">
            <button
              type="button"
              className={`view-btn ${viewMode === 'MAP' ? 'active' : ''}`}
              onClick={() => setViewMode('MAP')}
            >
               2D Map Only
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'SPLIT' ? 'active' : ''}`}
              onClick={() => setViewMode('SPLIT')}
            >
               2D Map + Unreal Engine 3D
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'STREAM' ? 'active' : ''}`}
              onClick={() => setViewMode('STREAM')}
            >
               Full Screen UE5 3D
            </button>
          </div>
        </div>

        <div className="workspace-content">
          <div className={viewMode === 'STREAM' ? 'pane-hidden' : 'pane-half'}>
            <FleetMap
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              pickedStart={pickedStart}
              pickedDest={pickedDest}
              routeGeometry={routeGeometry}
              onMapClick={handleMapClick}
              onSelectVehicle={handleSelectVehicle}
            />
          </div>

          <div className={viewMode === 'MAP' ? 'pane-hidden' : 'pane-half'}>
            <PixelStreamView defaultUrl="http://127.0.0.1:8090" />
          </div>
        </div>
      </main>
    </div>
  );
}