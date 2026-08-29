import { redis } from "../lib/redis";

const MAX_EMAILS_PER_HOUR = Number(
  process.env.MAX_EMAILS_PER_HOUR || 200
);

export async function checkAndConsumeRateLimit(
  sender: string
): Promise<{ allowed: boolean; retryAt?: number }> {
  const now = Date.now();

  const hourWindow = Math.floor(now / (60 * 60 * 1000));

  const key = `email-rate:${sender}:${hourWindow}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60 * 60 + 60);
  }

  if (count > MAX_EMAILS_PER_HOUR) {
    await redis.decr(key);

    const nextHour = (hourWindow + 1) * 60 * 60 * 1000;

    return {
      allowed: false,
      retryAt: nextHour,
    };
  }

  return {
    allowed: true,
  };
}