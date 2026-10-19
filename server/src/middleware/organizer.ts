import { Request, Response, NextFunction } from "express";
import { prisma, isDbConnected } from "../config/db.js";

export async function organizerRequired(req: Request, res: Response, next: NextFunction) {
  if (!isDbConnected()) {
    return res.status(503).json({
      error: "Database required for organizer features. Ensure DATABASE_URL is set and PostgreSQL is running.",
    });
  }
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });
    if (!user || user.role !== "organizer") {
      return res.status(403).json({ error: "Organizer account required" });
    }
    next();
  } catch (err: any) {
    console.error("organizerRequired error:", err);
    return res.status(500).json({ error: "Failed to verify organizer status" });
  }
}
