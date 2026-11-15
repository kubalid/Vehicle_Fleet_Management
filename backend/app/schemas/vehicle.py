from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class Waypoint(BaseModel):
    lat: float
    lng: float


class VehicleCreate(BaseModel):
    brand: str = Field(..., min_length=2, max_length=100)
    v_type: str = Field(..., min_length=2, max_length=50)
    start_lat: float = Field(..., ge=-90.0, le=90.0)
    start_lng: float = Field(..., ge=-180.0, le=180.0)


class MissionAssign(BaseModel):
    dest_lat: float = Field(..., ge=-90.0, le=90.0)
    dest_lng: float = Field(..., ge=-180.0, le=180.0)
    mission_purpose: str = Field(..., min_length=2, max_length=255)
    distance_km: Optional[float] = None
    duration_min: Optional[float] = None
    route_coordinates: Optional[List[List[float]]] = None  


class TelemetryUpdate(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Aktualna szerokość geogr. z Unreal Engine")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Aktualna długość geogr. z Unreal Engine")
    completed: bool = Field(default=False, description="Czy pojazd dotarł do punktu końcowego w UE5")


class VehicleResponse(BaseModel):
    id: int
    brand: str
    v_type: str
    status: str
    start_lat: float
    start_lng: float
    dest_lat: Optional[float]
    dest_lng: Optional[float]
    mission_purpose: Optional[str]
    distance_km: Optional[float]
    duration_min: Optional[float]
    route_coordinates: Optional[List[List[float]]] = None

    model_config = ConfigDict(from_attributes=True)


class UnrealRouteResponse(BaseModel):
    vehicle_id: int
    brand: str
    status: str
    mission_purpose: Optional[str]
    current_position: Waypoint
    destination: Optional[Waypoint]
    distance_km: Optional[float]
    duration_min: Optional[float]
    waypoints: List[Waypoint]  