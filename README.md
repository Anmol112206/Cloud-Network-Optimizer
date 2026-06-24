# Cloud Network Optimizer

An interactive web application designed to monitor, simulate, and optimize cloud network performance. The project offers two distinct feeds: a **Virtual Simulator** modeling packet routing and congestion on a simulated topology, and a **Real PC Monitor** tracking live hardware throughput from the host machine.

---

## Complete Flow & Architecture

```mermaid
graph TD
  subgraph Frontend (React + Vite + Tailwind)
    UI[Dashboard View] -->|Toggles Mode| VM[View Mode: Virtual / Real]
    UI -->|Polls 2s| API[API Service]
  end

  subgraph Backend (Node.js + Express)
    API -->|HTTP Requests| Router[Express Routes]
    Router -->|Controllers| Ctrl[API Controllers]
    
    subgraph Mode 1: Virtual Simulator
      Ctrl -->|Queries| SimMgr[Simulation Manager]
      SimMgr -->|Dijkstra Algorithm| RouteServ[Routing Service]
      SimMgr -->|Drives| Clock[Simulation Clock: 2s ticks]
      Clock -->|Runs| Packets[Packet Simulator]
      Packets -->|Logs topologoy/stats| DB[(Postgres via Prisma)]
      Packets -->|Caches live states| Redis[(Redis Cache)]
    end

    subgraph Mode 2: Real PC Monitor
      Ctrl -->|Queries| MonitorCtrl[RealNetworkController]
      MonitorCtrl -->|Reads Cache| Redis
      RealMon[RealNetworkMonitor Collector] -->|polls system stats| SI[systeminformation Library]
      RealMon -->|Caches network:live / network:history| Redis
    end
  end
```

### 1. Virtual Simulator Flow
- **Initialization**: On backend start, a default topology (routers and links) is loaded and synced with PostgreSQL.
- **Simulation Loop**: Every 2 seconds, the `SimulationClock` triggers a tick.
  - A **Traffic Generator** spawns packets with random sizes/rates between routers.
  - **Routing Service** uses Dijkstra's Algorithm to determine the shortest path.
  - **Packet Simulator** moves packets hop-by-hop. Queue sizes, propagation delays, packet delivery, and packet drops are processed.
  - Live statistics (latency, packet loss, throughput) are cached in Redis, and a snapshot of the run is saved in PostgreSQL.
- **Frontend Presentation**: The UI polls the metrics from Redis to draw the interactive topology, real-time lines, bottleneck tables, and congestion alerts.

### 2. Real PC Monitor Flow
- **Collection Loop**: A background service (`RealNetworkMonitor`) polls OS network interface statistics every 2 seconds via the `systeminformation` library.
- **Caching**: The latest download/upload speed (Mbps), active interface name, and status are cached under the Redis key `network:live`, and the last 30 readings are pushed and trimmed to the Redis list `network:history`.
- **Frontend Presentation**: Renders cards for connection metrics and a chronological Recharts `AreaChart` showing throughput trends.

---

## How to Get Started

### Prerequisites
- **Node.js** (v18+)
- **Redis Server** (listening on default port `6379`)
- **PostgreSQL Database**

### 1. Database Initialization
From the `backend/` folder, ensure database configuration is set in `.env` and sync schema:
```bash
cd backend
npx prisma db push
```

### 2. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
*Runs backend server on `http://localhost:3000` (or configured PORT).*

### 3. Start the Frontend Dashboard
```bash
cd ../frontend
npm install
npm run dev
```
*Launches development server on `http://localhost:5173` (proxied to backend).*

### 4. Running Tests
Run Jest tests to verify backend route and simulator logic:
```bash
cd ../backend
cmd /c npm test
```

---

## Features
- **Algorithm Optimization**: Exclusively uses Dijkstra's shortest path routing for packet propagation.
- **Dual Dashboard Modes**: Clean toggle switch between virtual mock topology telemetry and real OS networking cards.
- **Adaptive Performance**: Automatic 2-second telemetry fetching from Redis with pause/resume controls.
- **Graceful Shutdown**: Intercepts `SIGINT`/`SIGTERM` to clean up timers and disconnect database/Redis client bindings.
