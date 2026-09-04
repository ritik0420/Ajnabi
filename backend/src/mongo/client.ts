import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

const client = new MongoClient(env.mongoUrl);
const dbReady = client.connect();

export async function getDb() {
  await dbReady;
  return client.db(env.mongoDbName);
}
