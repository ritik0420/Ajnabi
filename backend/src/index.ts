import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { registerSocketHandlers } from "./socket/index.js";

const app = express();
app.use(cors({ origin: env.frontendOrigin }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.frontendOrigin },
});

registerSocketHandlers(io);

httpServer.listen(env.port, () => {
  console.log(`backend listening on port ${env.port}`);
});
