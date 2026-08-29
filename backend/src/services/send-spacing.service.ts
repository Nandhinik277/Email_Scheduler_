import { redis } from "../lib/redis";

const MIN_DELAY = Number(
  process.env.MIN_DELAY_BETWEEN_EMAILS_MS || 2000
);

const MAX_EMAILS_PER_HOUR = Number(
  process.env.MAX_EMAILS_PER_HOUR || 200
);

const LAST_SEND_KEY = "email-scheduler:last-send";
const HOURLY_COUNT_KEY = "email-scheduler:hourly-count";

const reserveScript = `
local lastSend = redis.call("GET", KEYS[1])
local count = redis.call("GET", KEYS[2])

local now = tonumber(ARGV[1])
local minDelay = tonumber(ARGV[2])
local maxEmails = tonumber(ARGV[3])

if not count then
    count = 0
else
    count = tonumber(count)
end

if count >= maxEmails then
    local ttl = redis.call("TTL", KEYS[2])

    if ttl < 1 then
        ttl = 1
    end

    return {
        0,
        now + (ttl * 1000)
    }
end

if not lastSend then
    lastSend = 0
else
    lastSend = tonumber(lastSend)
end

local sendAt = math.max(now, lastSend + minDelay)

redis.call("SET", KEYS[1], tostring(sendAt))

local newCount = redis.call("INCR", KEYS[2])

if newCount == 1 then
    redis.call("EXPIRE", KEYS[2], 3600)
end

return {
    1,
    sendAt
}
`;

export async function reserveSendSlot(): Promise<{
  allowed: boolean;
  sendAt: number;
}> {
  const now = Date.now();

  const result = (await redis.eval(
    reserveScript,
    2,
    LAST_SEND_KEY,
    HOURLY_COUNT_KEY,
    now,
    MIN_DELAY,
    MAX_EMAILS_PER_HOUR
  )) as [number, number];

  return {
    allowed: result[0] === 1,
    sendAt: Number(result[1]),
  };
}