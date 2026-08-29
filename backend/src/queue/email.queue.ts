import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const emailQueue = new Queue("email-queue", {
  connection: redis,
  defaultJobOptions: {
    attempts: 20,
    backoff: {
      type: "fixed",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

emailQueue.on("error", (error) => {
  console.error("BullMQ Queue Error:", error);
});

console.log("BullMQ Queue initialized");