import { createHmac } from "node:crypto";
import { env } from "../config/env.js";

interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

// Standard TURN REST API credential scheme (coturn's --use-auth-secret
// mode): username is an expiry timestamp, credential is an HMAC of it
// keyed by the shared secret. coturn validates this without either side
// needing to store or look up per-user credentials.
function generateTurnCredential(): { username: string; credential: string } {
  const expiresAt = Math.floor(Date.now() / 1000) + env.turnCredentialTtlSeconds;
  const username = String(expiresAt);
  const credential = createHmac("sha1", env.turnSecret)
    .update(username)
    .digest("base64");
  return { username, credential };
}

export function getIceServers(): IceServer[] {
  const { username, credential } = generateTurnCredential();

  return [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: env.turnUrls, username, credential },
  ];
}
