import { randomUUID } from "node:crypto";

// Active room membership lives in process memory: with a single backend
// instance, the Socket.IO server holding both peers' connections is the
// same process that needs this state, so Redis isn't needed here.
const roomBySocket = new Map<string, string>();
const peersByRoom = new Map<string, [string, string]>();

export function createRoom(socketA: string, socketB: string): string {
  const roomId = randomUUID();
  peersByRoom.set(roomId, [socketA, socketB]);
  roomBySocket.set(socketA, roomId);
  roomBySocket.set(socketB, roomId);
  return roomId;
}

export function getRoomId(socketId: string): string | null {
  return roomBySocket.get(socketId) ?? null;
}

export function getPeer(socketId: string): string | null {
  const roomId = roomBySocket.get(socketId);
  if (!roomId) return null;

  const peers = peersByRoom.get(roomId);
  if (!peers) return null;

  return peers[0] === socketId ? peers[1] : peers[0];
}

export function leaveRoom(socketId: string): void {
  const roomId = roomBySocket.get(socketId);
  if (!roomId) return;

  const peers = peersByRoom.get(roomId);
  peers?.forEach((id) => roomBySocket.delete(id));
  peersByRoom.delete(roomId);
}
