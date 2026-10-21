import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDb } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import eventsRoutes from "./routes/events.js";
import userRoutes from "./routes/user.js";
import assistantRoutes from "./routes/assistant.js";
import organizerRoutes from "./routes/organizer.js";
import { getCatalogEventsWithDates } from "./services/catalogEvents.js";
import { eventVectorStore } from "./services/vectorStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
/** Default 5050 — macOS often uses 5000 for AirPlay, which breaks local APIs */
const PORT = Number(process.env.PORT) || 5050;

const defaultOrigins = [
  "https://off-by-one-red.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:80",
  "http://localhost",
];
const clientOrigin = process.env.CLIENT_ORIGIN;
const allowedOrigins = clientOrigin && !defaultOrigins.includes(clientOrigin)
  ? [...defaultOrigins, clientOrigin]
  : defaultOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/organizer", organizerRoutes);

// Optional static frontend serving if client/dist exists
const potentialDistPaths = [
  path.resolve(__dirname, "../../client/dist"),
  path.resolve(__dirname, "../client/dist"),
  path.resolve(process.cwd(), "client/dist"),
  path.resolve(process.cwd(), "../client/dist"),
];
const clientDistPath = potentialDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

async function main() {
  try {
    await connectDb();
  } catch (e: any) {
    console.warn("Database connection failed — running with limited features:", e?.message);
  }

  try {
    const catalogEvents = await getCatalogEventsWithDates();
    eventVectorStore.seedFromCatalog(catalogEvents);
    console.log(`Event Vector Store initialized with ${catalogEvents.length} events`);
  } catch (e: any) {
    console.warn("Could not seed Event Vector Store:", e?.message);
  }
  const server = app.listen(PORT);
  server.once("listening", () => {
    console.log(`API http://localhost:${PORT}`);
  });
  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\nPort ${PORT} is already in use. Fix one of:\n  • Set PORT=5051 in server/.env and the same URL in client/vite.config.js proxy target\n  • Or stop the other process: netstat -ano | findstr :${PORT} (note the PID, then taskkill /PID <PID> /F)\n`
      );
      process.exit(1);
    }
    throw err;
  });
}

main();