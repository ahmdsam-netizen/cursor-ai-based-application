import crypto from "crypto";
import { Router, Request, Response } from "express";
import { authRequired } from "../middleware/auth.js";
import { organizerRequired } from "../middleware/organizer.js";
import { prisma, isDbConnected } from "../config/db.js";
import { docToAppEvent } from "../services/catalogEvents.js";
import { generateStructuredDescription, generateEmbedding } from "../services/aiAgent.js";
import { eventVectorStore } from "../services/vectorStore.js";

const router = Router();

const CATEGORIES = new Set([
  "Tech",
  "Music",
  "Sports",
  "Food",
  "Business",
  "Art",
  "Festivals",
  "Education",
]);

router.post("/events", authRequired, organizerRequired, async (req: Request, res: Response) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: "Database not connected. Please ensure PostgreSQL is running." });
  }

  try {
    const {
      name,
      description,
      startDate,
      venue,
      address,
      city,
      stateCode,
      countryCode,
      lat,
      lng,
      category,
      image,
      url,
      priceRange,
      organizer,
    } = req.body || {};

    const nameStr = String(name || "").trim();
    if (!nameStr) return res.status(400).json({ error: "name is required" });
    const cityStr = String(city || "").trim();
    if (!cityStr) return res.status(400).json({ error: "city is required" });
    const cc = String(countryCode || "")
      .trim()
      .toUpperCase()
      .slice(0, 2);
    if (cc.length !== 2) return res.status(400).json({ error: "countryCode must be a 2-letter ISO code" });
    const cat = String(category || "").trim();
    if (!CATEGORIES.has(cat)) {
      return res.status(400).json({ error: `category must be one of: ${[...CATEGORIES].join(", ")}` });
    }
    const latN = lat != null ? Number(lat) : NaN;
    const lngN = lng != null ? Number(lng) : NaN;
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      return res.status(400).json({ error: "lat and lng must be valid numbers" });
    }
    const startStr = String(startDate || "").trim();
    if (!startStr) return res.status(400).json({ error: "startDate is required" });
    const d = new Date(startStr);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "startDate must be a valid date" });

    const pr = String(priceRange || "paid").toLowerCase();
    if (!["free", "paid", "unknown"].includes(pr)) {
      return res.status(400).json({ error: "priceRange must be free, paid, or unknown" });
    }
    const orgName = String(organizer || "").trim();
    if (!orgName) return res.status(400).json({ error: "organizer (display name) is required" });

    const id = `org-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const urlVal = url != null && String(url).trim() ? String(url).trim() : null;

    if (!req.userId) return res.status(401).json({ error: "Authentication required" });

    // Generate AI structured description & summary (explicitly incorporating location and date)
    const eventPayload = {
      name: nameStr,
      description: String(description || "").trim(),
      startDate: d.toISOString(),
      venue: String(venue || "").trim(),
      address: String(address || "").trim(),
      city: cityStr,
      stateCode: String(stateCode || "").trim().toUpperCase().slice(0, 2),
      countryCode: cc,
      category: cat,
      priceRange: pr,
      organizer: orgName,
    };

    const structuredDescription = await generateStructuredDescription(eventPayload);
    const embedding = await generateEmbedding(structuredDescription.rawText || structuredDescription.summary);

    const doc = await prisma.organizerEvent.create({
      data: {
        id,
        name: nameStr,
        description: String(description || "").trim(),
        startDate: d.toISOString(),
        venue: String(venue || "").trim(),
        address: String(address || "").trim(),
        city: cityStr,
        stateCode: String(stateCode || "")
          .trim()
          .toUpperCase()
          .slice(0, 2),
        countryCode: cc,
        lat: latN,
        lng: lngN,
        category: cat,
        image: String(image || "").trim(),
        url: urlVal,
        priceRange: pr,
        organizer: orgName,
        structuredDescription,
        createdBy: req.userId,
      },
    });

    // Save pgvector embedding into PostgreSQL
    if (Array.isArray(embedding) && embedding.length > 0) {
      await eventVectorStore.savePgVector(id, embedding);
    }

    const appEvent = docToAppEvent(doc);
    // Add to in-memory vector store for instant retrieval
    eventVectorStore.addEvent(appEvent, embedding, structuredDescription.rawText);

    res.status(201).json({ event: appEvent });
  } catch (e: any) {
    console.error("Create event error:", e);
    res.status(500).json({ error: "Could not create event" });
  }
});

router.get("/events", authRequired, organizerRequired, async (req: Request, res: Response) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: "Database not connected" });
  }

  try {
    if (!req.userId) return res.status(401).json({ error: "Authentication required" });
    const docs = await prisma.organizerEvent.findMany({
      where: { createdBy: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ events: docs.map(docToAppEvent).filter(Boolean) });
  } catch (e: any) {
    console.error("List organizer events error:", e);
    res.status(500).json({ error: "Could not list events" });
  }
});

export default router;
