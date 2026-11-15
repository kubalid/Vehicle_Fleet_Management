from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.ws_manager import ws_manager
from app.schemas.vehicle import (
    VehicleCreate,
    MissionAssign,
    TelemetryUpdate,
    VehicleResponse,
    UnrealRouteResponse,
    Waypoint,
)
from app.repositories.vehicle_repository import VehicleRepository

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles & Unreal Engine API"])


@router.get("", response_model=List[VehicleResponse])
def list_vehicles(db: Session = Depends(get_db)):
    return VehicleRepository.get_all(db)


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def add_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    vehicle = VehicleRepository.create(db, payload)
    await ws_manager.broadcast({
        "event": "VEHICLE_CREATED",
        "vehicle": VehicleResponse.model_validate(vehicle).model_dump(),
    })
    return vehicle


@router.put("/{vehicle_id}/assign", response_model=VehicleResponse)
async def assign_vehicle_mission(vehicle_id: int, payload: MissionAssign, db: Session = Depends(get_db)):
    vehicle = VehicleRepository.get_by_id(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Pojazd nie istnieje")

    updated = VehicleRepository.assign_mission(db, vehicle, payload)
    await ws_manager.broadcast({
        "event": "MISSION_ASSIGNED",
        "vehicle": VehicleResponse.model_validate(updated).model_dump(),
    })
    return updated


@router.get("/{vehicle_id}/route", response_model=UnrealRouteResponse)
def get_route_for_unreal(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = VehicleRepository.get_by_id(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Pojazd nie istnieje")

    raw_coords = vehicle.route_coordinates or []
    waypoints = [Waypoint(lat=pt[1], lng=pt[0]) for pt in raw_coords if len(pt) >= 2]

    dest = (
        Waypoint(lat=vehicle.dest_lat, lng=vehicle.dest_lng)
        if vehicle.dest_lat is not None and vehicle.dest_lng is not None
        else None
    )

    return UnrealRouteResponse(
        vehicle_id=vehicle.id,
        brand=vehicle.brand,
        status=vehicle.status,
        mission_purpose=vehicle.mission_purpose,
        current_position=Waypoint(lat=vehicle.start_lat, lng=vehicle.start_lng),
        destination=dest,
        distance_km=vehicle.distance_km,
        duration_min=vehicle.duration_min,
        waypoints=waypoints,
    )


@router.patch("/{vehicle_id}/telemetry", response_model=VehicleResponse)
async def update_vehicle_telemetry(vehicle_id: int, payload: TelemetryUpdate, db: Session = Depends(get_db)):
    vehicle = VehicleRepository.get_by_id(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Pojazd nie istnieje")

    updated = VehicleRepository.update_telemetry(db, vehicle, payload)
    await ws_manager.broadcast({
        "event": "TELEMETRY_UPDATE",
        "vehicle": VehicleResponse.model_validate(updated).model_dump(),
    })
    return updated


@router.put("/{vehicle_id}/complete", response_model=VehicleResponse)
async def complete_vehicle_mission(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = VehicleRepository.get_by_id(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Pojazd nie istnieje")

    updated = VehicleRepository.complete_mission(db, vehicle)
    await ws_manager.broadcast({
        "event": "MISSION_COMPLETED",
        "vehicle": VehicleResponse.model_validate(updated).model_dump(),
    })
    return updated


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = VehicleRepository.get_by_id(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Pojazd nie istnieje")
    VehicleRepository.delete(db, vehicle)
    await ws_manager.broadcast({"event": "VEHICLE_DELETED", "vehicle_id": vehicle_id})
    return None