# Fleet Management – Real-Time Fleet Management & UE5 Digital Twin

A real-time fleet management and dispatching system integrated with a 3D **Digital Twin** built in **Unreal Engine 5**. The application combines a 2D GIS web dashboard for managing vehicles and calculating road routes via the **OSRM** routing engine with bidirectional **WebSocket** telemetry and live 3D visualization powered by **WebRTC Pixel Streaming**.

---

## 1. Application Overview & Key Features

The platform bridges traditional 2D web-based fleet tracking with a live 3D simulation environment:

* **Fleet Management (CRUD):** Add new vehicles (brand, type such as Delivery Van or Heavy Truck) by clicking their starting coordinates directly on the interactive map, inspect fleet status, and remove vehicles from the database.
* **OSRM Route Calculation & Mission Dispatching:** Selecting an available vehicle and clicking a destination on the map queries the OSRM routing engine, renders the road geometry (`GeoJSON LineString`), and calculates total distance (`km`), estimated time of arrival (`ETA` in minutes), and waypoint count.
* **Real-Time Bidirectional Telemetry (WebSockets):** Confirming a mission (`Confirm & Dispatch`) broadcasts the route coordinates via WebSocket to Unreal Engine 5. The 3D vehicle immediately begins traversing the route and streams its live GPS coordinates (`lat`, `lng`) back to the FastAPI server at ~6–7 Hz (every `0.15 s`).
* **Dynamic Route Slicing & Live ETA Updates:** As telemetry packets arrive from UE5, the backend dynamically trims already traversed waypoints from the route polyline and recalculates the remaining distance and duration in real time. The system also supports on-the-fly rerouting while a vehicle is already in transit.
* **2D Map / 3D Unreal Engine View Switcher (Pixel Streaming):** Operators can seamlessly toggle between the 2D vector map (`MapLibre GL`) and the live 3D **Unreal Engine 5 Pixel Streaming** viewport (featuring a follow-camera locked onto the dispatched vehicle inside a photorealistic 3D environment powered by **Cesium for Unreal**).

---

## 2. Technical Architecture & Highlights

### Tech Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, MapLibre GL (OpenStreetMap), Fetch API, Native WebSockets, CSS3 |
| **Backend (API & Hub)** | Python 3.11+, FastAPI, Uvicorn (ASGI), SQLAlchemy 2.0 (ORM), Pydantic v2, WebSockets |
| **Database** | MySQL (relational persistence for vehicle states, mission metrics, and JSON route geometry) |
| **Routing & GIS** | OSRM (Open Source Routing Machine API), GeoJSON, Haversine geodesics |
| **3D Simulation (Optional)** | Unreal Engine 5, C++ / Blueprints, Cesium for Unreal, UE5 WebSocket Subsystem, WebRTC Pixel Streaming |

### Notable Engineering Solutions

1. **Centralized WebSocket Hub with Echo Cancellation (`exclude` sender filtering):**
   A custom `ConnectionManager` on the `/ws/fleet` endpoint handles concurrent connections from both React web clients and Unreal Engine 5. When broadcasting `TELEMETRY_UPDATE` events, the server excludes the originating socket (`exclude=websocket`), preventing UE5 from receiving echoes of its own telemetry packets and avoiding state-reset loops in Blueprints.
2. **RFC 6455 Subprotocol Negotiation (`Sec-WebSocket-Protocol`):**
   Unreal Engine's `WebSocketSubsystem` strictly enforces subprotocol validation during the HTTP Upgrade handshake. The FastAPI WebSocket manager dynamically inspects the incoming `sec-websocket-protocol` header and mirrors it during `websocket.accept()`, eliminating `400 Bad Request` rejections and unexpected connection drops.
3. **Real-Time Polyline Slicing & Haversine ETA Recalculation:**
   On every incoming `UE_TELEMETRY` packet, the backend repository locates the closest vertex along the active OSRM polyline using the Haversine formula, slices off completed segments, and sums the remaining polygon edges to push live distance and ETA updates to the React UI.
4. **Zero-Unmount View Switching (WebGL & WebRTC Context Preservation):**
   Switching between the 2D MapLibre view and the 3D Pixel Streaming `<iframe>` is implemented via layered CSS states (`visibility`, `opacity`, `pointer-events`) rather than conditional DOM unmounting. This preserves the MapLibre WebGL canvas state and keeps the active WebRTC video stream alive in the background without re-negotiating the signalling handshake.
5. **Custom C++ JSON Parser Node for Unreal Engine (`ParseMissionAssigned`):**
   A dedicated C++ `BlueprintCallable` function deserializes incoming `MISSION_ASSIGNED` payloads, extracts the `route_coordinates` array, and converts geographic `(Lng, Lat)` pairs via `CesiumGlobeAnchor` into local 3D world space points along a `USplineComponent`.

---

## 3. Local Setup & Installation Guide

### Prerequisites
* **Python** `3.10+`
* **Node.js** `18+` and `npm`
* **MySQL Server** (e.g., via **XAMPP** or a standalone MySQL instance running on port **`3307`** or default `3306`)
* *(Optional)* **Unreal Engine 5** with *Cesium for Unreal*, *Pixel Streaming*, and *WebSocket* plugins enabled

### Step 1: Start the MySQL Database
1. Start your **MySQL** server (e.g., via the XAMPP Control Panel).
2. Verify that the database connection parameters in `backend/app/core/config.py` match your local setup (default: host `127.0.0.1`, port `3307`, user `root`, empty password).
3. Create the database in phpMyAdmin or via the MySQL CLI:

~~~sql
CREATE DATABASE IF NOT EXISTS fleet_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
~~~

*(All tables and schema column migrations are created automatically on backend startup via `ensure_schema_migrations()`).*

### Step 2: Run the Backend API (FastAPI)
Open a terminal, navigate to the `backend` directory, and run the following commands:

~~~bash
cd backend

# 1. Create a virtual environment
python -m venv venv

# 2. Activate the virtual environment
# Windows (PowerShell / CMD):
venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the Uvicorn ASGI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
~~~

* **REST API Base URL:** `http://127.0.0.1:8000`
* **Interactive Swagger UI Docs:** `http://127.0.0.1:8000/docs`
* **WebSocket Endpoint:** `ws://127.0.0.1:8000/ws/fleet`

### Step 3: Run the Frontend (React + TypeScript)
Open a second terminal, navigate to the `frontend` directory, and start the Vite development server:

~~~bash
cd frontend

# 1. Install npm packages
npm install

# 2. Start the Vite dev server
npm run dev
~~~

* **Open your browser at:** `http://localhost:5173`

### Step 4: Connect Unreal Engine 5 (Optional – 3D Digital Twin)
The web application works standalone for fleet management and OSRM route planning. To enable live 3D simulation and telemetry from Unreal Engine 5:

1. Open the Unreal Engine 5 project.
2. Navigate to **Edit -> Editor Preferences -> Level Editor -> Pixel Streaming** and set the **Http Port** to **`8090`** (to avoid port `80` conflicts with Apache/XAMPP).
3. In **Edit -> Editor Preferences**, uncheck **Use Less CPU when in Background** to maintain 60 FPS streaming while interacting with the web browser.
4. Click the **Pixel Streaming** toolbar icon, select **Launch Signalling Server**, and enable **Stream Level Viewport**.
5. In the level Blueprint, ensure the WebSocket `Connect` node points to `ws://127.0.0.1:8000/ws/fleet` with `Protocol` set to `ws`.
6. Press **Play** in UE5 and click **Switch to Unreal Engine View** in the web dashboard to watch the live 3D stream.

---

## 4. AI Tools Usage

Throughout the development of this project, AI coding assistants (**Gemini / Claude / Cursor**) were used as pair-programming tools to accelerate full-stack and 3D integration tasks:

* **API Boilerplate & Data Layer Generation:** Used AI to scaffold FastAPI REST routers, Pydantic v2 validation schemas (`VehicleCreate`, `MissionAssign`, `TelemetryUpdate`), and SQLAlchemy repository methods along with automated startup schema migrations.
* **Frontend Refactoring (React + TypeScript + MapLibre GL):** Leveraged AI to structure modular React components (`FleetMap`, `MissionForm`, `VehicleList`, `PixelStreamView`), type GeoJSON route payloads, and style the dark-mode dispatch interface with zero-unmount layer toggling.
* **Geospatial Algorithms (Haversine & Polyline Slicing):** Assisted in implementing the real-time Haversine distance calculator that snaps incoming UE5 telemetry coordinates to the nearest OSRM route vertex and dynamically updates remaining distance and ETA.
* **Low-Level UE5 <-> FastAPI WebSocket Debugging:** Used AI to diagnose RFC 6455 `Sec-WebSocket-Protocol` handshake rejections (`400 Bad Request`), resolve iframe WebXR permissions policy warnings (`xr-spatial-tracking`), and design echo cancellation logic for high-frequency telemetry streams.