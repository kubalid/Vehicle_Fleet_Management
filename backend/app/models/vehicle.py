from sqlalchemy import Column, Integer, String, Float, JSON
from app.core.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String(100), nullable=False)
    v_type = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="Available")
    start_lat = Column(Float, nullable=False)
    start_lng = Column(Float, nullable=False)
    dest_lat = Column(Float, nullable=True)
    dest_lng = Column(Float, nullable=True)
    mission_purpose = Column(String(255), nullable=True)
    distance_km = Column(Float, nullable=True)
    duration_min = Column(Float, nullable=True)
    route_coordinates = Column(JSON, nullable=True)