import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma, isDbConnected } from "../config/db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "14d" });
}

router.post("/register", async (req: Request, res: Response) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: "Database not connected. Please ensure PostgreSQL is running." });
  }

  try {
    const { email, password, name, asOrganizer } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const role = asOrganizer === true || asOrganizer === "true" ? "organizer" : "user";

    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        name: String(name || "").trim(),
        interests: [],
        favorites: [],
        categoryViews: {},
        notifiedEventIds: [],
        role,
      },
    });

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests,
        favorites: user.favorites,
        role: user.role,
      },
    });
  } catch (e: any) {
    console.error("Registration error:", e);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: "Database not connected. Please ensure PostgreSQL is running." });
  }

  try {
    const { email, password } = req.body || {};
    const emailNorm = String(email || "").trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests,
        favorites: user.favorites,
        role: user.role || "user",
      },
    });
  } catch (e: any) {
    console.error("Login error:", e);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authRequired, async (req: Request, res: Response) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: "Database not connected." });
  }

  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, interests: true, favorites: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (e: any) {
    console.error("Get /me error:", e);
    res.status(500).json({ error: "Could not fetch user profile" });
  }
});

export default router;
