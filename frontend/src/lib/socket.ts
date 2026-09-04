import { io, type Socket } from "socket.io-client";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export function createSocket(): Socket {
  return io(BACKEND_URL);
}
