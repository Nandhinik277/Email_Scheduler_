import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!name) {
      return res.status(400).json({ message: "Please enter your name." });
    }

    if (!email || !emailPattern.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Unable to create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !emailPattern.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    if (!password) {
      return res.status(400).json({ message: "Please enter your password." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Unable to sign in." });
  }
});

export default router;
