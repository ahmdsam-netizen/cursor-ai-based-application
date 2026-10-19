import { Router, Request, Response } from "express";
import { authRequired } from "../middleware/auth.js";
import { prisma, isDbConnected } from "../config/db.js";
import { getEventById } from "../services/ticketmaster.js";

const router = Router();

router.patch("/interests", authRequired, async (req: Request, res: Response) => {
  if (!isDbConnected()) return res.status(503).json({ error: "Database not connected" });
  const { interests } = req.body || {};
  if (!Array.isArray(interests)) {
    return res.status(400).json({ error: "interests must be an array" });
  }

  try {
    if (!req.userId) return res.status(401).json({ error: "Authentication required" });
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { interests: interests.map(String).slice(0, 20) },
      select: { id: true, email: true, name: true, interests: true, favorites: true, role: true },
    });
    res.json({ user });
  } catch (e: any) {
    console.error("Update interests error:", e);
    res.status(500).json({ error: "Could not update interests" });
  }
});

router.get("/favorites", authRequired, async (req: Request, res: Response) => {
  if (!isDbConnected()) return res.json({ events: [] });
  try {
    if (!req.userId) return res.status(401).json({ error: "Authentication required" });
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { favorites: true },
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    const events: any[] = [];
    for (const id of user.favorites || []) {
      const ev = await getEventById(id);
      if (ev) events.push(ev);
    }
    res.json({ events });
  } catch (e: any) {
    console.error("Get favorites error:", e);
    res.status(500).json({ error: "Could not fetch favorites" });
  }
});

router.post("/favorites/:eventId", authRequired, async (req: Request, res: Response) => {
  if (!isDbConnected()) return res.status(503).json({ error: "Database not connected" });
  const eventId = String(req.params.eventId);
  const ev = await getEventById(eventId);
  if (!ev) return res.status(404).json({ error: "Event not found" });

  try {
    if (!req.userId) return res.status(401).json({ error: "Authentication required" });
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { favorites: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const currentFavs = user.favorites || [];
    const updatedFavs = currentFavs.includes(eventId) ? currentFavs : [...currentFavs, eventId];

    await prisma.user.update({
      where: { id: req.userId },
      data: { favorites: updatedFavs },
    });

    res.json({ ok: true, favoritesCount: updatedFavs.length });
  } catch (e: any) {
    console.error("Add favorite error:", e);
    res.status(500).json({ error: "Could not add favorite" });
  }
});

router.delete("/favorites/:eventId", authRequired, async (req: Request, res: Response) => {
  if (!isDbConnected()) return res.status(503).json({ error: "Database not connected" });
  const eventId = String(req.params.eventId);
  try {
    if (!req.userId) return res.status(401).json({ error: "Authentication required" });
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { favorites: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const updatedFavs = (user.favorites || []).filter((id) => id !== eventId);
    await prisma.user.update({
      where: { id: req.userId },
      data: { favorites: updatedFavs },
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error("Remove favorite error:", e);
    res.status(500).json({ error: "Could not remove favorite" });
  }
});

router.get("/notifications-preview", authRequired, async (req: Request, res: Response) => {
  if (!isDbConnected()) return res.json({ upcoming: [] });
  try {
    if (!req.userId) return res.status(401).json({ error: "Authentication required" });
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { favorites: true, notifiedEventIds: true },
    });
    if (!user) return res.status(404).json({ error: "Not found" });

    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 3600 * 1000);
    const upcoming: any[] = [];

    for (const id of user.favorites || []) {
      const ev = await getEventById(id);
      if (!ev?.startDate) continue;
      const d = new Date(ev.startDate);
      if (d >= now && d <= in48h && !user.notifiedEventIds?.includes(id)) {
        upcoming.push({ id: ev.id, name: ev.name, startDate: ev.startDate });
      }
    }
    res.json({ upcoming });
  } catch (e: any) {
    console.error("Notifications preview error:", e);
    res.status(500).json({ error: "Could not preview notifications" });
  }
});

router.post("/notifications/mark-sent", authRequired, async (req: Request, res: Response) => {
  if (!isDbConnected()) return res.status(503).json({ error: "Database not connected" });
  const { eventIds } = req.body || {};
  if (!Array.isArray(eventIds)) return res.status(400).json({ error: "eventIds array required" });

  try {
    if (!req.userId) return res.status(401).json({ error: "Authentication required" });
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { notifiedEventIds: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const set = new Set([...(user.notifiedEventIds || []), ...eventIds.map(String)]);
    await prisma.user.update({
      where: { id: req.userId },
      data: { notifiedEventIds: Array.from(set) },
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error("Mark notifications error:", e);
    res.status(500).json({ error: "Could not mark notifications sent" });
  }
});

export default router;
