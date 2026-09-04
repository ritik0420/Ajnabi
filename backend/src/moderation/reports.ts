import { getDb } from "../mongo/client.js";

export type ReportReason =
  | "nudity-sexual-content"
  | "harassment-abuse"
  | "underage-user"
  | "spam-scam"
  | "other";

interface ReportInput {
  roomId: string;
  reportedIpHash: string;
  reason: ReportReason;
}

// Durable audit trail of reports, kept for moderation review. This is
// separate from the ban logic (Redis, see bans.ts) - Mongo is the
// record of what happened, Redis is the fast-path enforcement.
export async function logReport(input: ReportInput): Promise<void> {
  const db = await getDb();
  await db.collection("reports").insertOne({
    ...input,
    createdAt: new Date(),
  });
}
