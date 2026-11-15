from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, ensure_schema_migrations, SessionLocal
from app.core.ws_manager import ws_manager
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.vehicle import TelemetryUpdate, VehicleResponse
from app.routers import vehicles
import json

Base.metadata.create_all(bind=engine)
ensure_schema_migrations()

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehicles.router)


@app.websocket("/ws/fleet")
async def fleet_websocket(websocket: WebSocket):
    await ws_manager.connect(websocket)
    print("\n[WS] New client connected to /ws/fleet (React or Unreal Engine)!")
    try:
        while True:
            raw_msg = await websocket.receive_text()
            print(f"[RECEIVED FROM UNREAL]: {raw_msg}")

            try:
                data = json.loads(raw_msg)
                if isinstance(data, dict) and data.get("event") == "UE_TELEMETRY":
                    vehicle_id = int(data["vehicle_id"])
                    telemetry = TelemetryUpdate(
                        lat=float(data["lat"]),
                        lng=float(data["lng"]),
                        completed=bool(data.get("completed", False)),
                    )
                    db = SessionLocal()
                    try:
                        vehicle = VehicleRepository.get_by_id(db, vehicle_id)
                        if vehicle:
                            updated = VehicleRepository.update_telemetry(db, vehicle, telemetry)
                            await ws_manager.broadcast({
                                "event": "TELEMETRY_UPDATE",
                                "vehicle": VehicleResponse.model_validate(updated).model_dump(),
                            })
                    finally:
                        db.close()
            except json.JSONDecodeError:
                await websocket.send_text(f"FastAPI received text: {raw_msg}")

    except WebSocketDisconnect:
        print("[WS] Client disconnected from /ws/fleet")
        ws_manager.disconnect(websocket)