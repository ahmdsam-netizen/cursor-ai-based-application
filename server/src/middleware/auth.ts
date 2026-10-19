import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma, isDbConnected } from "../config/db.js";

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret") as any;
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret") as any;
    req.userId = payload.sub;
    if (isDbConnected() && payload.sub) {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { interests: true, favorites: true, categoryViews: true },
      });
      req.user = user;
    }
  } catch {
    /* ignore */
  }
  next();
}
