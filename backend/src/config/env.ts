import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV ?? "development",
};
