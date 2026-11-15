import math
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, MissionAssign, TelemetryUpdate


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2.0) ** 2
    )
    return r * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class VehicleRepository:
    @staticmethod
    def get_all(db: Session) -> List[Vehicle]:
        return db.query(Vehicle).order_by(Vehicle.id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, vehicle_id: int) -> Optional[Vehicle]:
        return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()

    @staticmethod
    def create(db: Session, data: VehicleCreate) -> Vehicle:
        vehicle = Vehicle(
            brand=data.brand,
            v_type=data.v_type,
            status="Available",
            start_lat=data.start_lat,
            start_lng=data.start_lng,
        )
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
        return vehicle

    @staticmethod
    def assign_mission(db: Session, vehicle: Vehicle, mission: MissionAssign) -> Vehicle:
        vehicle.dest_lat = mission.dest_lat
        vehicle.dest_lng = mission.dest_lng
        vehicle.mission_purpose = mission.mission_purpose
        vehicle.distance_km = mission.distance_km
        vehicle.duration_min = mission.duration_min
        vehicle.route_coordinates = mission.route_coordinates
        vehicle.status = "In Transit"
        db.commit()
        db.refresh(vehicle)
        return vehicle

    @staticmethod
    def update_telemetry(db: Session, vehicle: Vehicle, telemetry: TelemetryUpdate) -> Vehicle:
        vehicle.start_lat = telemetry.lat
        vehicle.start_lng = telemetry.lng

        if telemetry.completed:
            vehicle.dest_lat = None
            vehicle.dest_lng = None
            vehicle.mission_purpose = None
            vehicle.distance_km = None
            vehicle.duration_min = None
            vehicle.route_coordinates = None
            vehicle.status = "Available"
        elif vehicle.dest_lat is not None and vehicle.dest_lng is not None:
            if vehicle.distance_km and vehicle.distance_km > 0.05 and vehicle.duration_min:
                pace_min_per_km = vehicle.duration_min / vehicle.distance_km
            else:
                pace_min_per_km = 1.65

            coords = vehicle.route_coordinates
            if coords and len(coords) >= 2:
                closest_idx = min(
                    range(len(coords)),
                    key=lambda i: _haversine_km(telemetry.lat, telemetry.lng, coords[i][1], coords[i][0]),
                )
                dist_to_closest = _haversine_km(
                    telemetry.lat, telemetry.lng, coords[closest_idx][1], coords[closest_idx][0]
                )

                remaining_poly_km = sum(
                    _haversine_km(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0])
                    for i in range(closest_idx, len(coords) - 1)
                )
                total_km = dist_to_closest + remaining_poly_km

                if dist_to_closest <= 0.2 and closest_idx > 0:
                    vehicle.route_coordinates = [[telemetry.lng, telemetry.lat]] + coords[closest_idx + 1 :]

                vehicle.distance_km = round(total_km, 2)
                vehicle.duration_min = round(total_km * pace_min_per_km, 1)
            else:
                direct_km = _haversine_km(telemetry.lat, telemetry.lng, vehicle.dest_lat, vehicle.dest_lng)
                road_km = direct_km * 1.25
                vehicle.distance_km = round(road_km, 2)
                vehicle.duration_min = round(road_km * pace_min_per_km, 1)

        db.commit()
        db.refresh(vehicle)
        return vehicle

    @staticmethod
    def complete_mission(db: Session, vehicle: Vehicle) -> Vehicle:
        if vehicle.dest_lat is not None and vehicle.dest_lng is not None:
            vehicle.start_lat = vehicle.dest_lat
            vehicle.start_lng = vehicle.dest_lng

        vehicle.dest_lat = None
        vehicle.dest_lng = None
        vehicle.mission_purpose = None
        vehicle.distance_km = None
        vehicle.duration_min = None
        vehicle.route_coordinates = None
        vehicle.status = "Available"
        db.commit()
        db.refresh(vehicle)
        return vehicle

    @staticmethod
    def delete(db: Session, vehicle: Vehicle) -> None:
        db.delete(vehicle)
        db.commit()