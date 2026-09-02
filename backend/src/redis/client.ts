import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.redisUrl);

redis.on("error", (err: Error) => {
  console.error("redis error:", err.message);
});
