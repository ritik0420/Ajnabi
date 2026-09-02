# Ajnabi

A web-only, anonymous, random 1-to-1 video chat platform — similar in concept to Omegle. Guest-based, no sign-up: open the site, click **Start Video Chat**, get matched with a random stranger, talk over a peer-to-peer video/audio connection.

Built for adult users in India as the initial market.

## Status

Early-stage, incrementally built. What's implemented so far:

- Landing page with camera/mic permission flow
- Redis-backed matchmaking queue (join queue → paired with another waiting user)
- WebRTC signaling relay over Socket.IO (offer/answer/ICE exchange)
- Real peer-to-peer video/audio connection between two matched users
- Call ends → both sides notified, back to idle

Not yet implemented: Next/Skip (re-queue after a call ends), abuse/reporting tools, MongoDB-backed persistence, TURN server (see [Known limitations](#known-limitations)).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + Socket.IO (TypeScript, ESM) |
| Matchmaking state | Redis |
| Persistent data | MongoDB (planned — not wired up yet, nothing needs it yet) |
| Peer connection | WebRTC (STUN only right now — see limitations) |

## How it works

```
Browser A                    Backend (Express + Socket.IO)                Browser B
    |                                    |                                     |
    |--- queue:join ------------------->|                                     |
    |                                    |<---------------- queue:join -------|
    |                                    |  (atomically pairs 2 waiting users |
    |                                    |   via a Redis-backed queue)        |
    |<---- match:found {roomId} --------|------- match:found {roomId} ------>|
    |                                    |                                     |
    |--- webrtc:offer ------------------>|-------- relayed to peer ---------->|
    |<----------------- webrtc:answer ---|<----- webrtc:answer ---------------|
    |<--- webrtc:ice-candidate (both directions, relayed) ------------------->|
    |                                    |                                     |
    |========== direct P2P WebRTC media (video + audio) =====================|
```

The backend never inspects the media itself, and never stores or forwards video/audio — it only relays SDP/ICE signaling messages between the two sockets in a matched room, over Socket.IO. Once the peer connection is established, video/audio flows directly between the two browsers.

Matchmaking uses a Redis list as the waiting queue, with an atomic Lua script to pop pairs — this keeps concurrent joins from ever double-matching the same person, and would let the queue be shared safely across multiple backend instances if the app scales horizontally later.

## Repo structure

```
Ajnabi/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express + Socket.IO entrypoint, /health route
│   │   ├── config/env.ts         # env var loading
│   │   ├── redis/client.ts       # ioredis connection
│   │   ├── matchmaking/
│   │   │   ├── queue.ts          # Redis-backed waiting queue (atomic pair dequeue)
│   │   │   └── rooms.ts          # in-memory room/peer tracking for a single instance
│   │   └── socket/index.ts       # Socket.IO event handlers (queue + WebRTC relay)
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/page.tsx           # landing page / call UI
    │   ├── hooks/useVideoChat.ts  # call state machine, getUserMedia, RTCPeerConnection
    │   └── lib/socket.ts          # socket.io-client factory
    └── .env.local.example
```

## Getting started

### Prerequisites

- Node.js 20+ and npm
- Docker (for running Redis locally), or a reachable Redis instance

### 1. Start Redis

```bash
docker run -d --name ajnabi-redis -p 6379:6379 redis:7-alpine
```

(Already have a container? `docker start ajnabi-redis` instead.)

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:4000`. `GET /health` returns `{"status":"ok"}` once it's up.

Env vars ([.env.example](backend/.env.example)):

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | backend HTTP/WebSocket port |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS allow-list for the frontend |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Runs on `http://localhost:3000`.

Env vars ([.env.local.example](frontend/.env.local.example)):

| Var | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:4000` | backend URL the browser connects to |

### 4. Try it

Open `http://localhost:3000` in two browser windows/tabs (or two different browsers/devices on the same network), click **Start Video Chat** in both, grant camera/mic access, and they should match with each other.

## Known limitations

- **IP exposure via WebRTC (production blocker):** peer connections currently use public STUN servers only. ICE candidates inherently reveal each user's IP address to their matched peer — this conflicts with the product's "never expose user IPs" requirement. Fixing it requires a TURN server (self-hosted `coturn` or a paid provider) with `iceTransportPolicy: "relay"` forced on the frontend, so all media relays through the TURN server instead of connecting directly. This must be in place before real users are on the platform.
- **No abuse/reporting tools yet.** No report button, no blocking, no rate-limiting or ban mechanism.
- **No MongoDB usage yet.** Nothing persistent needs storing yet (guest/anonymous, no accounts); it'll come in once there's a concrete need (e.g. reports, ban lists).
- **No Next/Skip logic.** Ending a call currently returns both users to the idle screen; there's no one-click "find someone else."
- **Single backend instance assumed.** Room/peer pairing state lives in process memory (by design — see `matchmaking/rooms.ts`). Horizontal scaling would need that moved to Redis plus a Socket.IO Redis adapter to relay events across instances.
- **Moderate npm advisory:** a transitive DoS advisory in `qs` (via Express 4's `body-parser`) has no non-breaking fix yet; would need an Express 5 upgrade. Low risk currently since no untrusted query strings are parsed.

## Security & privacy principles this project follows

- Anonymous/guest-based — no accounts, no auth in this phase
- No video/audio is ever recorded or stored server-side
- User IP addresses are never exposed to the other user (pending the TURN fix above)
- The signaling server only relays opaque connection IDs and SDP/ICE payloads — it doesn't inspect or log media content
