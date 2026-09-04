import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { registerSocketHandlers } from "./socket/index.js";
import { getIceServers } from "./ice/turnCredentials.js";

const app = express();
app.use(cors({ origin: env.frontendOrigin }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Freshly-minted, short-lived TURN credentials per request - nothing
// long-lived or secret is ever sent to the client.
app.get("/ice-config", (_req, res) => {
  res.json({ iceServers: getIceServers() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.frontendOrigin },
});

registerSocketHandlers(io);

httpServer.listen(env.port, () => {
  console.log(`backend listening on port ${env.port}`);
});
