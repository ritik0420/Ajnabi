import type { Server, Socket } from "socket.io";
import { createRoom, getPeer, getRoomId, leaveRoom } from "../matchmaking/rooms.js";
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

  // One side has to be the one that creates the WebRTC offer, or both
  // peers would send offers at once (glare). The server picks arbitrarily
  // but deterministically: whoever was dequeued first.
  socketA.emit("match:found", { roomId, initiator: true });
  socketB.emit("match:found", { roomId, initiator: false });
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

    // Signaling relay: the server never inspects SDP/ICE contents, it just
    // forwards them to the other member of the sender's room. socket.to()
    // excludes the sender, and a room only ever has the two matched peers,
    // so this always lands on exactly the right person.
    socket.on("webrtc:offer", (payload) => {
      const roomId = getRoomId(socket.id);
      if (!roomId) return;
      socket.to(roomId).emit("webrtc:offer", payload);
    });

    socket.on("webrtc:answer", (payload) => {
      const roomId = getRoomId(socket.id);
      if (!roomId) return;
      socket.to(roomId).emit("webrtc:answer", payload);
    });

    socket.on("webrtc:ice-candidate", (payload) => {
      const roomId = getRoomId(socket.id);
      if (!roomId) return;
      socket.to(roomId).emit("webrtc:ice-candidate", payload);
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
