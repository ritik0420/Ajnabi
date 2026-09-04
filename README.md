# Ajnabi

A web-only, anonymous, random 1-to-1 video chat platform — similar in concept to Omegle. Guest-based, no sign-up: open the site, click **Start Video Chat**, get matched with a random stranger, talk over a peer-to-peer video/audio connection.

Built for adult users in India as the initial market.

## Status

Early-stage, incrementally built. What's implemented so far:

- Landing page with camera/mic permission flow
- Redis-backed matchmaking queue (join queue → paired with another waiting user)
- WebRTC signaling relay over Socket.IO (offer/answer/ICE exchange)
- Real peer-to-peer video/audio connection between two matched users, relayed through a TURN server so peer IP addresses are never exposed to each other
- Next/Skip: skip to a new stranger mid-call, or find a new one after the other side leaves — without re-requesting camera access
- Reporting: report the current stranger with a reason; they're disconnected from you immediately and it's logged for moderation
- Auto-ban: an IP hash that collects enough reports in a time window is temporarily banned from matchmaking
- Call ends (either side leaves, skips, reports, or disconnects) → the other side is notified

Not yet implemented: manual moderation review tooling, appeals, persistent user-facing accounts (still fully anonymous by design).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + Socket.IO (TypeScript, ESM) |
| Matchmaking state, ban flags | Redis |
| Reports (moderation audit trail) | MongoDB |
| Peer connection | WebRTC, relayed through a TURN server (coturn locally) |

## How it works

### Matchmaking + signaling

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
    |====== WebRTC media (video + audio), relayed through TURN ==============|
```

The backend never inspects the media itself, and never stores or forwards video/audio — it only relays SDP/ICE signaling messages between the two sockets in a matched room, over Socket.IO.

Matchmaking uses a Redis list as the waiting queue, with an atomic Lua script both to enqueue (remove-then-push, so a socket can never end up queued twice and risk being matched with itself) and to dequeue pairs (so concurrent joins can never double-match the same person).

### TURN and IP privacy

Peer connections fetch short-lived ICE credentials from `GET /ice-config` before each match, and set `iceTransportPolicy: "relay"` whenever a TURN server is present — forcing all media through the TURN relay instead of a direct peer-to-peer path. This is what actually keeps IP addresses hidden from the matched peer (STUN alone cannot do this: it helps peers connect directly, which means they'd see each other's IP).

Credentials are minted per the standard TURN REST API convention (coturn's `--use-auth-secret` mode): the backend HMACs a short-lived username with a shared secret, coturn validates it without either side storing per-user credentials. Nothing long-lived is ever sent to the browser.

If `/ice-config` can't be reached, the frontend falls back to STUN-only (`iceTransportPolicy: "all"`) so local dev doesn't fully break — but that means IPs would be exposed, so this should never happen in a real deployment. It logs a console warning if it does.

### Reporting and bans

```
Reporter clicks Report → picks a reason → socket emits "report"
                                              |
                                              v
                              backend hashes the reported peer's IP
                              (salted, never stored raw or sent to
                              any client) and:
                                1. logs the report to MongoDB (audit trail)
                                2. records it in a Redis sliding-window
                                   sorted set for that IP hash
                                3. if the window now has >= threshold
                                   reports, sets a Redis key banning
                                   that IP hash for a fixed duration
                              then treats it like a skip: the reporter
                              is re-queued, the reported peer gets
                              match:ended
```

A banned IP hash gets a `banned` event instead of being enqueued on `queue:join` or `queue:next`, and can't get back into the queue until the ban expires.

Defaults: 3 reports within 24 hours bans an IP hash for 24 hours (`REPORT_BAN_THRESHOLD`, `REPORT_WINDOW_SECONDS`, `REPORT_BAN_DURATION_SECONDS` in [backend/.env.example](backend/.env.example)).

## Repo structure

```
Ajnabi/
├── docker-compose.yml          # Redis + MongoDB + coturn for local dev
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express + Socket.IO entrypoint, /health, /ice-config
│   │   ├── config/env.ts         # env var loading
│   │   ├── redis/client.ts       # ioredis connection
│   │   ├── mongo/client.ts       # MongoDB connection
│   │   ├── ice/turnCredentials.ts# ephemeral TURN credential minting
│   │   ├── matchmaking/
│   │   │   ├── queue.ts          # Redis-backed waiting queue (atomic enqueue/dequeue)
│   │   │   └── rooms.ts          # in-memory room/peer tracking for a single instance
│   │   ├── moderation/
│   │   │   ├── clientIp.ts       # per-connection IP (direct connections only, see below)
│   │   │   ├── ipHash.ts         # salted IP hashing - raw IPs are never stored
│   │   │   ├── reports.ts        # report audit log (MongoDB)
│   │   │   └── bans.ts           # report counting + ban flags (Redis)
│   │   └── socket/index.ts       # Socket.IO event handlers (queue, WebRTC relay, reports)
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/page.tsx           # landing page / call UI, report reason picker
    │   ├── hooks/useVideoChat.ts  # call state machine, getUserMedia, RTCPeerConnection
    │   └── lib/socket.ts          # socket.io-client factory
    └── .env.local.example
```

## Getting started

### Prerequisites

- Node.js 20+ and npm
- Docker (for Redis, MongoDB, and a local TURN server), or reachable instances of each

### 1. Start Redis, MongoDB, and coturn

```bash
docker compose up -d
```

This starts all three from [docker-compose.yml](docker-compose.yml). The coturn service defaults to `external-ip=127.0.0.1`, which only works for same-machine testing (e.g. two browser tabs). To test from another device on your network:

```bash
TURN_EXTERNAL_IP=<your machine's LAN IP> docker compose up -d
```

...and point that other device's `NEXT_PUBLIC_BACKEND_URL` at the same LAN IP.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:4000`. `GET /health` returns `{"status":"ok"}`; `GET /ice-config` returns STUN + TURN servers with fresh credentials.

Env vars ([.env.example](backend/.env.example)):

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | backend HTTP/WebSocket port |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS allow-list for the frontend |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGO_DB_NAME` | `ajnabi` | MongoDB database name |
| `TURN_SECRET` | (dev default) | Must match coturn's `--static-auth-secret` |
| `TURN_URLS` | `turn:127.0.0.1:3478` | TURN server URL(s) handed to clients |
| `TURN_CREDENTIAL_TTL` | `3600` | Seconds before minted TURN credentials expire |
| `IP_HASH_SALT` | (dev default) | Salt for hashing IPs before they touch Redis/Mongo |
| `REPORT_BAN_THRESHOLD` | `3` | Reports within the window before a ban |
| `REPORT_WINDOW_SECONDS` | `86400` | Sliding window for counting reports |
| `REPORT_BAN_DURATION_SECONDS` | `86400` | How long a ban lasts |

**Change `TURN_SECRET` and `IP_HASH_SALT` before deploying anywhere real** — the checked-in defaults are dev-only placeholders.

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

- **CGNAT / shared-IP collateral bans.** Bans are keyed on a hashed IP address. Multiple people sharing an IP (common on Indian mobile carrier NAT, or a shared home/office network) can end up sharing a ban if one of them gets reported enough. There's no per-device or per-session disambiguation yet — a real fix would need something like a device fingerprint or a persistent-but-anonymous session identifier, which has its own privacy trade-offs worth deciding deliberately rather than adding by default.
- **No manual moderation review UI.** Reports are logged to MongoDB and auto-bans apply automatically, but there's no dashboard to review reports, see ban history, or lift a ban early.
- **`clientIp.ts` assumes a direct connection.** It reads the socket's handshake address directly. Deployed behind a reverse proxy/load balancer, this needs to read `X-Forwarded-For` instead, with the proxy configured to overwrite (not append to) any client-supplied header first — otherwise a user could spoof it to dodge a ban.
- **Local TURN server, not a production one.** The `coturn` service in `docker-compose.yml` is for local dev/testing only — no TLS (`turns:`), a fixed shared secret, and `external-ip` defaulting to `127.0.0.1`. A real deployment needs a publicly reachable TURN server with its own secret and (ideally) TLS.
- **Single backend instance assumed.** Room/peer pairing state lives in process memory (by design — see `matchmaking/rooms.ts`). Horizontal scaling would need that moved to Redis plus a Socket.IO Redis adapter to relay events across instances.
- **Moderate npm advisory:** a transitive DoS advisory in `qs` (via Express 4's `body-parser`) has no non-breaking fix yet; would need an Express 5 upgrade. Low risk currently since no untrusted query strings are parsed.

## Security & privacy principles this project follows

- Anonymous/guest-based — no accounts, no auth in this phase
- No video/audio is ever recorded or stored server-side
- Peer connections are relayed through TURN, so user IP addresses are never exposed to the other user
- Raw IP addresses are never stored — only a salted hash, used solely to recognize repeat reports against the same device
- The signaling server only relays opaque connection IDs and SDP/ICE payloads — it doesn't inspect or log media content
