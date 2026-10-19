import { Router, Request, Response } from "express";
import { handleAssistantChat } from "../services/aiAgent.js";

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  const message = String(req.body?.message || "").trim().slice(0, 4000);
  if (!message) {
    return res.status(400).json({ error: "message is required", eventRelated: false });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      error: "AI assistant is not configured. Set GEMINI_API_KEY in server/.env",
      eventRelated: false,
    });
  }

  try {
    const result = await handleAssistantChat(message);
    return res.json(result);
  } catch (e: any) {
    console.error("AI assistant error:", e);
    const status = e?.status === 400 || e?.status === 403 ? e.status : 500;
    return res.status(status).json({
      error: e?.message || "AI request failed",
      eventRelated: false,
    });
  }
});

export default router;
