import type { Server, Socket } from "socket.io";
import { createRoom, getPeer, leaveRoom } from "../matchmaking/rooms.js";
import { dequeuePair, enqueue, removeFromQueue } from "../matchmaking/queue.js";

async function tryMatch(io: Server): Promise<void> {
  const pair = await dequeuePair();
  if (!pair) return;

  const [socketAId, socketBId] = pair;
  const socketA = io.sockets.sockets.get(socketAId);
  const socketB = io.sockets.sockets.get(socketBId);

  // A peer may have disconnected between joining the queue and being
  // dequeued; drop the pairing and let the other peer be matched next.
  if (!socketA || !socketB) {
    if (socketA) await enqueue(socketAId);
    if (socketB) await enqueue(socketBId);
    return;
  }

  const roomId = createRoom(socketAId, socketBId);
  socketA.join(roomId);
  socketB.join(roomId);

  socketA.emit("match:found", { roomId });
  socketB.emit("match:found", { roomId });
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`socket connected: ${socket.id}`);

    socket.on("queue:join", async () => {
      await enqueue(socket.id);
      socket.emit("queue:waiting");
      await tryMatch(io);
    });

    socket.on("queue:leave", async () => {
      await removeFromQueue(socket.id);
    });

    socket.on("disconnect", async (reason) => {
      console.log(`socket disconnected: ${socket.id} (${reason})`);

      await removeFromQueue(socket.id);

      const peerId = getPeer(socket.id);
      leaveRoom(socket.id);
      if (peerId) {
        io.to(peerId).emit("match:ended");
      }
    });
  });
}
