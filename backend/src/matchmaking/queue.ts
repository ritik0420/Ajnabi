import { redis } from "../redis/client.js";

const WAITING_QUEUE_KEY = "matchmaking:waiting";

// Pops two waiting socket ids atomically so concurrent match attempts
// (e.g. two users joining at nearly the same time) can never both grab
// the same peer.
const DEQUEUE_PAIR_SCRIPT = `
if redis.call('LLEN', KEYS[1]) >= 2 then
  local a = redis.call('RPOP', KEYS[1])
  local b = redis.call('RPOP', KEYS[1])
  return {a, b}
end
return nil
`;

// Remove-then-push, atomically: a socket already in the queue (e.g. a
// duplicate queue:join, or a race between two code paths that both try
// to re-enqueue it) must never end up with two entries - dequeuePair()
// would then be able to pop the same socket twice and "match" it with
// itself.
const ENQUEUE_SCRIPT = `
redis.call('LREM', KEYS[1], 0, ARGV[1])
redis.call('LPUSH', KEYS[1], ARGV[1])
`;

export async function enqueue(socketId: string): Promise<void> {
  await redis.eval(ENQUEUE_SCRIPT, 1, WAITING_QUEUE_KEY, socketId);
}

export async function removeFromQueue(socketId: string): Promise<void> {
  await redis.lrem(WAITING_QUEUE_KEY, 0, socketId);
}

export async function dequeuePair(): Promise<[string, string] | null> {
  const result = (await redis.eval(
    DEQUEUE_PAIR_SCRIPT,
    1,
    WAITING_QUEUE_KEY,
  )) as [string, string] | null;

  return result;
}
