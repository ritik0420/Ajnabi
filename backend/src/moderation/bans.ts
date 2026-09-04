import { randomUUID } from "node:crypto";
import { redis } from "../redis/client.js";
import { env } from "../config/env.js";

const reportsKey = (ipHash: string) => `moderation:reports:${ipHash}`;
const banKey = (ipHash: string) => `moderation:ban:${ipHash}`;

// Records a report against an IP hash (sliding-window sorted set, one
// entry per report) and bans it once it collects enough reports within
// the window. Returns whether this report triggered a new ban.
export async function recordReportAndMaybeBan(ipHash: string): Promise<boolean> {
  const key = reportsKey(ipHash);
  const now = Date.now();
  const windowStart = now - env.reportWindowSeconds * 1000;

  await redis.zadd(key, now, `${now}-${randomUUID()}`);
  await redis.zremrangebyscore(key, 0, windowStart);
  await redis.expire(key, env.reportWindowSeconds);

  const reportCount = await redis.zcard(key);
  if (reportCount < env.reportBanThreshold) {
    return false;
  }

  await redis.set(banKey(ipHash), "1", "EX", env.reportBanDurationSeconds);
  return true;
}

export async function isBanned(ipHash: string): Promise<boolean> {
  const result = await redis.exists(banKey(ipHash));
  return result === 1;
}
