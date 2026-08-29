import "dotenv/config";

import { Worker } from "bullmq";
import nodemailer from "nodemailer";

import { redis } from "../lib/redis";
import prisma from "../lib/prisma";
import { reserveSendSlot } from "../services/send-spacing.service";
import { indexEmail } from "../services/search/elasticsearch.service";
import { sendSlackNotification } from "../services/notifications/slack.service";

const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const worker = new Worker(
  "email-queue",
  async (job) => {
    const { emailId } = job.data;

    console.log(`Processing email job: ${emailId}`);

    const email = await prisma.email.findUnique({
      where: {
        id: emailId,
      },
    });

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    // Idempotency check
    if (email.status === "SENT") {
      console.log(`Email ${emailId} already sent. Skipping.`);
      return;
    }

    // Reserve a global send slot using Redis
    const slot = await reserveSendSlot();

    if (!slot.allowed) {
      const delay = Math.max(1000, slot.sendAt - Date.now());

      console.log(
        `Rate limit reached for email ${emailId}. Retrying in ${delay}ms`
      );

      throw new Error(
        `Send rate limit reached. Retry after ${delay}ms`
      );
    }

    // Wait if another worker reserved a later slot
    const waitTime = slot.sendAt - Date.now();

    if (waitTime > 0) {
      console.log(
        `Email ${emailId} waiting ${waitTime}ms for send slot`
      );

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    console.log(`Send slot reserved for email ${emailId}`);

    // Mark as processing
    await prisma.email.update({
      where: {
        id: emailId,
      },
      data: {
        status: "PROCESSING",
      },
    });

    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email.recipient,
        subject: email.subject,
        text: email.body,
      });

      console.log(`Email ${emailId} sent successfully`);
      console.log(`Message ID: ${info.messageId}`);

      const updatedEmail = await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: "SENT",
        },
      });

      await indexEmail(updatedEmail);

      console.log(`Email ${emailId} status updated to SENT`);
      console.log(`Email ${emailId} indexed in Elasticsearch`);
        
      await sendSlackNotification(
  `Email sent successfully\n` +
  `ID: ${emailId}\n` +
  `Recipient: ${email.recipient}\n` +
  `Subject: ${email.subject}`
);

    } catch (error) {
      console.error(`Failed to send email ${emailId}:`, error);

      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: "PENDING",
        },
      });

      throw error;
    }
  },
  {
  connection: redis,
  concurrency,
}
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log(`Email worker started with concurrency: ${concurrency}`);