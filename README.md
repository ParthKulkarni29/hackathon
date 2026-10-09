# FairPool — Algorithmic Transit Ride-Pooling & Fair Fare Allocation Engine

**FairPool** is an algorithmic transit engine designed for high-density expressways (demonstrated on the **Pune–Mumbai Expressway NH 48 corridor**). It solves vehicle routing with time windows (VRPTW), enforces strict detour quality of service ($\le 15.0\%$), and allocates vehicle costs among pooled passengers using **cooperative game theory (Shapley Values)** with the **Largest-Remainder Method in integer paise**, guaranteeing **0 platform deficit**.

---

## 🚀 Quick Start Instructions

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24.20.0)
- **npm** v9+ (tested on npm 11.19.0)

### 2. Start Backend (Express API + Socket.IO Engine)
Open Terminal 1:
```powershell
cd backend
npm install
npm start
```
> The backend runs on `http://localhost:5000`

### 3. Start Frontend (React + Vite + Leaflet)
Open Terminal 2:
```powershell
cd frontend
npm install
npm run dev
```
> Open your browser at `http://localhost:5173`

### 4. Run Algorithmic Unit Tests
```powershell
npm test
# Or: cd backend && node test/test_engine.js
```

---

## 🛠 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | Integrated multi-role UI (Passenger, Driver, Dispatch Operator) |
| **Backend** | Node.js + Express 5 | Modular architecture, REST API + Socket.IO real-time events |
| **Maps & GIS** | Leaflet + CARTO Dark Matter | Corridor milestones, GPS points, glowing route polylines, vehicle tracking |
| **Routing** | OSRM Public Driving API | Real road network routing with timeout (3s), caching, & Haversine fallback |
| **Realtime** | Socket.IO | Instant sync between Passenger, Driver, and Admin without polling |
| **Persistence**| JSON File Storage | Atomic read/write in `backend/data/db.json` with deterministic seed reset |
| **Styling** | Modern Transit Design System | Dark mode cyber aesthetic matching reference UI (Apple/Uber/Lyft inspired) |

---

## 🧠 Core Algorithmic Capabilities

### 1. Integer-Paise Shapley Fair Pricing
- Computes marginal cost contributions over all permutations $|N|!$ of the passenger coalition.
- Uses the **Largest Remainder Method (Hamilton Method)** on integer paise (1 INR = 100 paise).
- **Exact zero-deficit guarantee**: $\sum \text{fares\_paise} \equiv \text{total\_trip\_paise}$ (0 deficit down to the single paisa).
- **Golden Corridor Benchmark**: Rahul (₹504.00), Priya (₹728.00), Aman (₹868.00) = ₹2,100.00 total vehicle cost.

### 2. Linear Precedence VRPTW Highway Routing
- Ensures each passenger's pickup strictly precedes their dropoff.
- At coincident milestones (e.g. Lonavala 58 km), **dropoffs precede pickups** so vehicular seating capacity is freed before passenger boarding.

### 3. Maximum 15.0% Passenger Detour SLA
- Enforces $\text{detour\_pct} \le 15.0\%$ for every rider in the vehicle coalition.
- **Detour Rejection Demo**: Candidate Vikram requesting Pen detour is automatically rejected because it would push Priya's detour to 18.1% (SLA violation).

### 4. Sliding-Window Dynamic Batching
- Collects pending ride requests within configurable time windows (e.g., 30s).
- Evaluates coalition compatibility based on directional vectors, capacity limits, and detour constraints.

### 5. Atomic Driver & Vehicle Assignment
- Matches the nearest available driver with sufficient vehicle seating capacity.
- Locks the driver's status to `ASSIGNED` / `BUSY` and associates the `current_trip_id`.

---

## 🌐 API Design

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and version |
| `GET` | `/api/corridor-nodes` | Expressway milestones with km positions and GPS coordinates |
| `GET` | `/api/rides` | List all ride requests (filter by `status` or `rider_id`) |
| `POST`| `/api/rides` | Submit a new ride request |
| `GET` | `/api/rides/:id` | Get details of a specific ride |
| `POST`| `/api/rides/:id/cancel`| Cancel a ride request |
| `POST`| `/api/quote` | Upfront locked fare estimate (solo vs pooled comparison) |
| `GET` | `/api/drivers` | List all fleet drivers and vehicle availability |
| `POST`| `/api/drivers/:id/status`| Update driver status (`AVAILABLE`, `BUSY`, `OFFLINE`) |
| `GET` | `/api/trips` | List all dispatched pooled trips |
| `GET` | `/api/trips/:id` | Get full route manifest and Shapley split for a trip |
| `POST`| `/api/trips/:id/status`| Update trip status or mark intermediate stops completed |
| `POST`| `/api/dispatch/run` | Execute sliding-window dynamic batcher and driver assignment |
| `GET` | `/api/dispatch/status` | Current queue status, pending rides count, and available drivers |
| `GET` | `/api/analytics` | Overall fleet KPIs, total savings, CO2 saved, game theory proofs |
| `POST`| `/api/demo/golden-corridor` | 1-Click dispatch of canonical Rahul, Priya, Aman scenario |
| `POST`| `/api/demo/rejection` | Simulate Vikram 18.1% detour violation and SLA rejection |
| `POST`| `/api/demo/benchmark` | Run 100-commuter peak corridor simulation scorecard |
| `POST`| `/api/demo/reset` | Restore deterministic seed state |

---

## 📱 Role-Based Interfaces

Switch roles instantly via the top navigation bar:
1. **🧑 Passenger**:
   - Modern bottom-sheet booking card inspired by Apple Maps / Uber.
   - Station pickers with direct km distances.
   - Upfront locked fare quote comparing solo private cab vs FairPool pooled price.
   - Live status tracking (`PENDING` $\to$ `MATCHED` $\to$ `COMPLETED`).
   - Assigned driver & car model details with cancellation support.
   - Collapsible SHAP-style plain-English fair fare attribution modal.
2. **🚖 Driver**:
   - Vehicle occupancy capacity meter (e.g., 2/4 seats filled).
   - Sequenced stop manifest (VRPTW order) with mileage milestones.
   - Interactive stop confirmation buttons (`Arrived / Confirm Stop`).
   - Guaranteed trip earnings tracker in ₹ and paise.
3. **⚡ Admin / Dispatch Operator**:
   - Real-time sliding-window batching queue & manual trigger button.
   - Live fleet map view with OSRM road geometry.
   - Axiomatic Game Theory verification proofs (Budget balance, Pareto efficiency, Individual rationality, Symmetry).
   - Comparative fare allocation table (Shapley vs Equal split vs Distance-proportional).
   - Interactive 100-commuter benchmark simulation modal.
