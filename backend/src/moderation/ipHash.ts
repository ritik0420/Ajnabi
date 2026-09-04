import { createHash } from "node:crypto";
import { env } from "../config/env.js";

// We never store or forward a user's raw IP - only a salted hash, kept
// purely to recognize repeat reports against the same device for the
// ban logic below. It's never sent to any client.
export function hashIp(ip: string): string {
  return createHash("sha256").update(env.ipHashSalt).update(ip).digest("hex");
}
