import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV ?? "development",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  mongoUrl: process.env.MONGO_URL ?? "mongodb://localhost:27017",
  mongoDbName: process.env.MONGO_DB_NAME ?? "ajnabi",

  // Must match the coturn container's --static-auth-secret.
  turnSecret:
    process.env.TURN_SECRET ?? "local-dev-turn-secret-change-in-production",
  turnUrls: (process.env.TURN_URLS ?? "turn:127.0.0.1:3478").split(","),
  turnCredentialTtlSeconds: Number(process.env.TURN_CREDENTIAL_TTL ?? 3600),

  // Salted so we never store a reversible/raw IP anywhere - only enough
  // to recognize "this is the same reported device again" for banning.
  ipHashSalt: process.env.IP_HASH_SALT ?? "local-dev-ip-salt-change-in-production",
  reportBanThreshold: Number(process.env.REPORT_BAN_THRESHOLD ?? 3),
  reportWindowSeconds: Number(process.env.REPORT_WINDOW_SECONDS ?? 60 * 60 * 24),
  reportBanDurationSeconds: Number(
    process.env.REPORT_BAN_DURATION_SECONDS ?? 60 * 60 * 24,
  ),
};
