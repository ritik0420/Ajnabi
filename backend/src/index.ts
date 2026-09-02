import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { env } from "./config/env.js";

const app = express();
app.use(cors({ origin: env.frontendOrigin }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.frontendOrigin },
});

io.on("connection", (socket) => {
  console.log(`socket connected: ${socket.id}`);

  socket.on("disconnect", (reason) => {
    console.log(`socket disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(env.port, () => {
  console.log(`backend listening on port ${env.port}`);
});
