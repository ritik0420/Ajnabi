import type { Socket } from "socket.io";

// Direct connection only. Behind a reverse proxy/load balancer in a real
// deployment, this needs to read X-Forwarded-For instead (with the proxy
// configured to strip/overwrite client-supplied values first, so a user
// can't just spoof the header to dodge a ban) - not needed for local dev.
export function getClientIp(socket: Socket): string {
  return socket.handshake.address;
}
