import { Router } from "express";
import prisma from "../lib/prisma";
import { emailQueue } from "../queue/email.queue";
import { searchEmails } from "../services/search/elasticsearch.service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const emails = await prisma.email.findMany({
      orderBy: {
        scheduledAt: "asc",
      },
    });

    res.json(emails);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch emails",
    });
  }
});

router.get("/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const results = await searchEmails(query);

    res.json(results);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Search failed",
    });
  }
});




router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const email = await prisma.email.findUnique({
      where: {
        id,
      },
    });

    if (!email) {
      return res.status(404).json({
        message: "Email not found",
      });
    }

    res.json(email);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch email",
    });
  }
});


router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { recipient, subject, body, scheduledAt } = req.body;

    const email = await prisma.email.update({
      where: { id },
      data: {
        recipient,
        subject,
        body,
        scheduledAt: new Date(scheduledAt),
      },
    });

    res.json(email);
  } catch (error) {
    res.status(404).json({
      message: "Email not found",
    });
  }
});




router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const email = await prisma.email.delete({
      where: { id },
    });

    res.json(email);
  } catch (error) {
    res.status(404).json({
      message: "Email not found",
    });
  }
});


router.post("/", async (req, res) => {
  try {
    const { recipient, subject, body, scheduledAt } = req.body;

    const email = await prisma.email.create({
      data: {
        recipient,
        subject,
        body,
        scheduledAt: new Date(scheduledAt),
      },
    });

await emailQueue.add(
  "send-email",
  {
    emailId: email.id,
  },
  {
    delay: Math.max(
      0,
      new Date(email.scheduledAt).getTime() - Date.now()
    ),
    jobId: `email-${email.id}`,
    attempts: 20,
    backoff: {
      type: "fixed",
      delay: 5000,
    },
  }
);

    res.status(201).json(email);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create email",
    });
  }
});


export default router;