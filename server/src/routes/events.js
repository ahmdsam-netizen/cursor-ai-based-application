import mongoose from "mongoose";
import { Router } from "express";
import fetch from "node-fetch";
import { searchEvents, getEventById } from "../services/ticketmaster.js";
import { ipToLocation } from "../services/ipGeolocation.js";
import { optionalAuth, authRequired } from "../middleware/auth.js";
import { EventStat } from "../models/EventStat.js";
import { User } from "../models/User.js";
import {
  getSampleEventsWithDates,
  getCitiesForCountry,
  getNearestCatalogCity,
} from "../data/sampleEvents.js";
import { getCatalogEventsWithDates } from "../services/catalogEvents.js";
import { useSampleEvents, getTicketmasterCities } from "../services/ticketmaster.js";

const router = Router();

function regionKey(lat, lng) {
  if (lat == null || lng == null) return "global";
  return `${Math.round(lat * 10) / 10},${Math.round(lng * 10) / 10}`;
}

router.get("/geolocate", async (req, res) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress;
  const loc = await ipToLocation(ip?.replace("::ffff:", "") || "");
  res.json(loc);
});

router.get("/cities", async (req, res) => {
  const country = (req.query.country || "").toString().toUpperCase().slice(0, 2);
  if (!country) return res.json({ cities: [], country: "" });
  if (!useSampleEvents()) {
    try {
      const cities = await getTicketmasterCities(country);
      return res.json({ cities, country });
    } catch (e) {
      console.warn("Ticketmaster cities lookup failed", e?.message || e);
    }
  }
  const cities = getCitiesForCountry(country);
  res.json({ cities, country });
});

router.get("/nearest-city", (req, res) => {
  const lat = req.query.lat != null ? parseFloat(req.query.lat) : NaN;
  const lng = req.query.lng != null ? parseFloat(req.query.lng) : NaN;
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng required" });
  }
  const nearest = getNearestCatalogCity(lat, lng);
  if (!nearest) return res.json({ nearest: null });
  res.json({ nearest });
});

/** OSRM public demo — driving directions (road geometry). */
router.get("/directions", async (req, res) => {
  const fromLat = req.query.fromLat != null ? parseFloat(req.query.fromLat) : NaN;
  const fromLng = req.query.fromLng != null ? parseFloat(req.query.fromLng) : NaN;
  const toLat = req.query.toLat != null ? parseFloat(req.query.toLat) : NaN;
  const toLng = req.query.toLng != null ? parseFloat(req.query.toLng) : NaN;
  if ([fromLat, fromLng, toLat, toLng].some((n) => Number.isNaN(n))) {
    return res.status(400).json({ error: "fromLat, fromLng, toLat, toLng are required" });
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const r = await fetch(osrmUrl, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      return res.status(502).json({ error: "Routing service returned an error" });
    }
    const data = await r.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates?.length) {
      return res.status(404).json({ error: "No drivable route found between these points" });
    }
    const route = data.routes[0];
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    res.json({
      coordinates,
      distanceM: route.distance,
      durationS: route.duration,
    });
  } catch (e) {
    console.error("directions proxy", e);
    res.status(502).json({ error: "Routing service unavailable" });
  }
});

/**
 * Approximate map point for a country / city from the event catalog (sample + organizer).
 * Keeps lat/lng available for driving directions without browser GPS.
 */
router.get("/region-center", async (req, res) => {
  const country = (req.query.country || "US").toString().toUpperCase().slice(0, 2);
  const cityRaw = (req.query.city || "").trim();
  const cityLower = cityRaw.toLowerCase();

  let list;
  try {
    list = await getCatalogEventsWithDates();
  } catch {
    list = getSampleEventsWithDates();
  }

  let matches = list.filter((e) => e.countryCode === country && e.lat != null && e.lng != null);
  if (cityLower) {
    matches = matches.filter((e) => {
      const ec = (e.city || "").toLowerCase();
      return ec.includes(cityLower) || (ec.length > 0 && cityLower.includes(ec));
    });
  }
  if (!matches.length) {
    matches = list.filter((e) => e.countryCode === country && e.lat != null && e.lng != null);
  }
  if (!matches.length) {
    matches = list.filter((e) => e.lat != null && e.lng != null);
  }
  if (!matches.length) {
    return res.json({
      lat: 37.7749,
      lng: -122.4194,
      label: "Default",
      fallback: true,
    });
  }

  let lat = 0;
  let lng = 0;
  for (const e of matches) {
    lat += e.lat;
    lng += e.lng;
  }
  lat /= matches.length;
  lng /= matches.length;

  res.json({
    lat,
    lng,
    label: cityRaw ? `${cityRaw}, ${country}` : `${country}`,
    fallback: false,
  });
});

router.get("/search", optionalAuth, async (req, res) => {
  const lat = req.query.lat != null ? parseFloat(req.query.lat) : undefined;
  const lng = req.query.lng != null ? parseFloat(req.query.lng) : undefined;
  const radiusKm = req.query.radiusKm != null ? parseFloat(req.query.radiusKm) : 50;
  const keyword = req.query.q || "";
  const city = (req.query.city || "").trim();
  const countryCode = (req.query.country || "US").toString().toUpperCase().slice(0, 2);
  const datePreset = req.query.date || "";
  const priceFilter = req.query.price || "";
  const categories = req.query.categories
    ? String(req.query.categories)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  /** City + country narrow results; skip lat/lng so filters stay city-scoped (e.g. GPS nearest city). */
  const hasCityFilter = city.length > 0;

  const { events, source } = await searchEvents({
    lat: hasCityFilter ? undefined : lat,
    lng: hasCityFilter ? undefined : lng,
    radiusKm,
    keyword,
    categories,
    datePreset,
    priceFilter,
    city: hasCityFilter ? city : "",
    countryCode,
  });

  let scored = events;
  if (req.user?.interests?.length) {
    const interestSet = new Set(req.user.interests.map((i) => i.toLowerCase()));
    scored = [...events].sort((a, b) => {
      const sa = interestSet.has(a.category?.toLowerCase()) ? 1 : 0;
      const sb = interestSet.has(b.category?.toLowerCase()) ? 1 : 0;
      return sb - sa;
    });
  }

  res.json({ events: scored, source, meta: { count: scored.length } });
});

router.get("/trending", async (req, res) => {
  const lat = req.query.lat != null ? parseFloat(req.query.lat) : null;
  const lng = req.query.lng != null ? parseFloat(req.query.lng) : null;
  const rk = regionKey(lat, lng);
  if (mongoose.connection.readyState !== 1) {
    const list = getSampleEventsWithDates().slice(0, 8).map((e) => ({ ...e, trendingScore: 0 }));
    return res.json({ events: list, source: "sample" });
  }
  const stats = await EventStat.find({ regionKey: rk }).sort({ views: -1 }).limit(12).lean();
  const ids = stats.map((s) => s.eventId);
  const allSample = await getCatalogEventsWithDates();
  const byId = new Map(allSample.map((e) => [e.id, e]));

  const enriched = ids
    .map((id) => {
      const ev = byId.get(id);
      if (!ev) return null;
      const st = stats.find((s) => s.eventId === id);
      return { ...ev, trendingScore: st?.views || 0 };
    })
    .filter(Boolean);

  if (enriched.length < 5) {
    const extra = allSample
      .filter((e) => !ids.includes(e.id))
      .slice(0, 8 - enriched.length)
      .map((e) => ({ ...e, trendingScore: 0 }));
    return res.json({ events: [...enriched, ...extra], source: "mixed" });
  }
  res.json({ events: enriched, source: "stats" });
});

router.get("/recommendations", authRequired, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({ events: [], basedOn: {}, message: "Database unavailable" });
  }
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const lat = req.query.lat != null ? parseFloat(req.query.lat) : 37.7749;
  const lng = req.query.lng != null ? parseFloat(req.query.lng) : -122.4194;
  const { events } = await searchEvents({
    lat,
    lng,
    radiusKm: 80,
    keyword: "",
    categories: user.interests?.length ? user.interests : undefined,
    datePreset: "month",
    priceFilter: "",
    city: "",
    countryCode: "US",
  });

  const catViews =
    user.categoryViews && typeof user.categoryViews === "object" && !(user.categoryViews instanceof Map)
      ? user.categoryViews
      : user.categoryViews instanceof Map
        ? Object.fromEntries(user.categoryViews)
        : {};
  const interestSet = new Set((user.interests || []).map((i) => i.toLowerCase()));

  const scoreEvent = (ev) => {
    let score = 0;
    const cat = (ev.category || "").toLowerCase();
    if (interestSet.has(cat)) score += 3;
    score += Math.min((catViews[cat] || 0) * 0.5, 5);
    if (user.favorites?.includes(ev.id)) score -= 10;
    return score;
  };

  const sorted = [...events].sort((a, b) => scoreEvent(b) - scoreEvent(a)).slice(0, 12);
  res.json({ events: sorted, basedOn: { interests: user.interests, behavior: catViews } });
});

router.get("/:id", optionalAuth, async (req, res) => {
  const ev = await getEventById(req.params.id);
  if (!ev) return res.status(404).json({ error: "Event not found" });

  const lat = req.query.lat != null ? parseFloat(req.query.lat) : ev.lat;
  const lng = req.query.lng != null ? parseFloat(req.query.lng) : ev.lng;
  const rk = regionKey(lat, lng);

  if (mongoose.connection.readyState === 1) {
    try {
      await EventStat.findOneAndUpdate(
        { eventId: ev.id },
        { $inc: { views: 1 }, $set: { regionKey: rk } },
        { upsert: true }
      );
      if (req.userId && ev.category) {
        const key = String(ev.category).replace(/\$/g, "").replace(/\./g, "_");
        await User.findByIdAndUpdate(req.userId, {
          $inc: { [`categoryViews.${key}`]: 1 },
        });
      }
    } catch (e) {
      console.warn("Event stat update skipped", e.message);
    }
  }

  res.json(ev);
});

export default router;
