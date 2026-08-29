import { Express } from "express";
import { Queue } from "bullmq";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { redis } from "../lib/redis";

const emailQueue = new Queue("email-queue", {
  connection: redis,
});

export function setupBullBoard(app: Express) {
  const serverAdapter = new ExpressAdapter();

  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());

  console.log(
    "Bull Board available at http://localhost:5000/admin/queues"
  );
}