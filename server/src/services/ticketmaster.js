import fetch from "node-fetch";
import { getSampleEventsWithDates } from "../data/sampleEvents.js";
import { getCatalogEventsWithDates, getOrganizerEventById } from "./catalogEvents.js";

const TM_BASE = "https://app.ticketmaster.com/discovery/v2";

/** Sample data when forced, or when no Ticketmaster key (even if USE_SAMPLE_EVENTS=false). */
export function useSampleEvents() {
  const force = process.env.USE_SAMPLE_EVENTS;
  const key = process.env.TICKETMASTER_API_KEY?.trim();
  if (force === "true" || force === "1") return true;
  if (force === "false" || force === "0") return !key;
  return !key;
}

const CATEGORY_MAP = {
  Music: "Music",
  Sports: "Sports",
  "Arts & Theatre": "Art",
  Miscellaneous: "Festivals",
  Film: "Art",
  Undefined: "Festivals",
};

function mapSegmentToCategory(segment) {
  if (!segment?.name) return "Festivals";
  return CATEGORY_MAP[segment.name] || segment.name;
}

function tmEventToApp(e) {
  const venue = e._embedded?.venues?.[0];
  const images = e.images || [];
  const img = images.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
  const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
  const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;
  const min = e.priceRanges?.[0]?.min;
  const max = e.priceRanges?.[0]?.max;
  let priceRange = "unknown";
  if (min === 0 && max === 0) priceRange = "free";
  else if (min != null || max != null) priceRange = "paid";

  return {
    id: e.id,
    source: "ticketmaster",
    name: e.name,
    description: e.info || e.pleaseNote || e.name,
    startDate: e.dates?.start?.dateTime || e.dates?.start?.localDate,
    venue: venue?.name || "",
    address: venue?.address?.line1 || "",
    city: venue?.city?.name || "",
    stateCode: venue?.state?.stateCode || "",
    countryCode: venue?.country?.countryCode || "",
    lat,
    lng,
    category: mapSegmentToCategory(e.classifications?.[0]?.segment),
    image: img?.url || "",
    url: e.url || null,
    priceRange,
    organizer: e.promoter?.name || venue?.name || "Ticketmaster",
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Sample catalog is worldwide. skipRadiusFilter=true (default) keeps all cities visible with distance sorted;
 * radius only applies when false (e.g. strict demo).
 */
function filterSampleEvents({
  lat,
  lng,
  radiusKm,
  keyword,
  categories,
  datePreset,
  priceFilter,
  city,
  countryCode,
  skipRadiusFilter = true,
  eventList,
}) {
  let list = eventList || getSampleEventsWithDates();
  if (city) {
    const c = city.toLowerCase();
    list = list.filter((ev) => ev.city?.toLowerCase().includes(c) || c.includes(ev.city?.toLowerCase() || ""));
  }
  if (countryCode) {
    list = list.filter((ev) => !ev.countryCode || ev.countryCode === countryCode);
  }
  if (keyword) {
    const k = keyword.toLowerCase();
    list = list.filter(
      (ev) =>
        ev.name.toLowerCase().includes(k) ||
        (ev.description && ev.description.toLowerCase().includes(k)) ||
        ev.city.toLowerCase().includes(k)
    );
  }
  if (categories?.length) {
    const set = new Set(categories.map((c) => c.toLowerCase()));
    list = list.filter((ev) => set.has(ev.category.toLowerCase()));
  }
  if (priceFilter === "free") list = list.filter((ev) => ev.priceRange === "free");
  if (priceFilter === "paid") list = list.filter((ev) => ev.priceRange === "paid");

  const now = new Date();
  if (datePreset === "today") {
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    list = list.filter((ev) => {
      const d = new Date(ev.startDate);
      return d >= now && d <= end;
    });
  } else if (datePreset === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    list = list.filter((ev) => {
      const d = new Date(ev.startDate);
      return d >= now && d <= end;
    });
  } else if (datePreset === "month") {
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    list = list.filter((ev) => {
      const d = new Date(ev.startDate);
      return d >= now && d <= end;
    });
  }

  if (lat != null && lng != null && radiusKm) {
    list = list.map((ev) => {
      if (ev.lat == null || ev.lng == null) return { ...ev, distanceKm: null };
      return { ...ev, distanceKm: haversineKm(lat, lng, ev.lat, ev.lng) };
    });
    if (skipRadiusFilter) {
      list.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else {
      list = list.filter((ev) => ev.distanceKm == null || ev.distanceKm <= radiusKm);
    }
  } else {
    list = list.map((ev) => ({ ...ev, distanceKm: null }));
  }

  return list;
}

export async function searchEvents(params) {
  const {
    lat,
    lng,
    radiusKm = 50,
    keyword,
    categories,
    datePreset,
    priceFilter,
    city,
    countryCode,
  } = params;

  if (useSampleEvents()) {
    const eventList = await getCatalogEventsWithDates();
    return {
      events: filterSampleEvents({
        lat,
        lng,
        radiusKm,
        keyword,
        categories,
        datePreset,
        priceFilter,
        city,
        countryCode,
        eventList,
      }),
      source: "sample",
    };
  }

  const apiKey = process.env.TICKETMASTER_API_KEY?.trim() || "";

  try {
    const search = new URLSearchParams();
    search.set("apikey", apiKey);
    search.set("size", "50");
    search.set("sort", "date,asc");
    if (keyword) search.set("keyword", keyword);
    if (lat != null && lng != null) {
      search.set("latlong", `${lat},${lng}`);
      search.set("radius", String(Math.min(Math.round(radiusKm), 500)));
      search.set("unit", "km");
    } else if (city) {
      search.set("city", city);
    }
    if (countryCode) search.set("countryCode", countryCode);

    const now = new Date();
    if (datePreset === "today") {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      search.set("startDateTime", now.toISOString().replace(/\.\d{3}Z$/, "Z"));
      search.set("endDateTime", end.toISOString().replace(/\.\d{3}Z$/, "Z"));
    } else if (datePreset === "week") {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      search.set("startDateTime", now.toISOString().replace(/\.\d{3}Z$/, "Z"));
      search.set("endDateTime", end.toISOString().replace(/\.\d{3}Z$/, "Z"));
    } else if (datePreset === "month") {
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      search.set("startDateTime", now.toISOString().replace(/\.\d{3}Z$/, "Z"));
      search.set("endDateTime", end.toISOString().replace(/\.\d{3}Z$/, "Z"));
    }

    const url = `${TM_BASE}/events.json?${search.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error("Ticketmaster error", res.status, text);
      const eventList = await getCatalogEventsWithDates();
      return {
        events: filterSampleEvents({
          lat,
          lng,
          radiusKm,
          keyword,
          categories,
          datePreset,
          priceFilter,
          city,
          countryCode,
          eventList,
        }),
        source: "sample",
      };
    }
    const data = await res.json();
    let events = (data._embedded?.events || []).map(tmEventToApp);

    if (categories?.length) {
      const set = new Set(categories.map((c) => c.toLowerCase()));
      events = events.filter((ev) => set.has(ev.category.toLowerCase()));
    }
    if (priceFilter === "free") events = events.filter((ev) => ev.priceRange === "free");
    if (priceFilter === "paid") events = events.filter((ev) => ev.priceRange === "paid");

    if (lat != null && lng != null) {
      events = events.map((ev) => {
        if (ev.lat == null || ev.lng == null) return { ...ev, distanceKm: null };
        return { ...ev, distanceKm: haversineKm(lat, lng, ev.lat, ev.lng) };
      });
      events = events.filter((ev) => ev.distanceKm == null || ev.distanceKm <= radiusKm);
    } else {
      events = events.map((ev) => ({ ...ev, distanceKm: null }));
    }

    return { events, source: "ticketmaster" };
  } catch (err) {
    console.error(err);
    const eventList = await getCatalogEventsWithDates();
    return {
      events: filterSampleEvents({
        lat,
        lng,
        radiusKm,
        keyword,
        categories,
        datePreset,
        priceFilter,
        city,
        countryCode,
        eventList,
      }),
      source: "sample",
    };
  }
}

export async function getEventById(id) {
  const fromOrg = await getOrganizerEventById(id);
  if (fromOrg) return fromOrg;
  if (useSampleEvents() || id.startsWith("sample-")) {
    const found = getSampleEventsWithDates().find((e) => e.id === id);
    return found || null;
  }
  const apiKey = process.env.TICKETMASTER_API_KEY?.trim() || "";
  try {
    const url = `${TM_BASE}/events/${id}.json?apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return tmEventToApp(data);
  } catch {
    return null;
  }
}

/**
 * Fetch a list of distinct city names for a given country from Ticketmaster.
 * Falls back to an empty array on error.
 */
const _tmCitiesCache = new Map();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch a list of distinct city names for a given country from Ticketmaster.
 * Uses a short in-memory cache and retry/backoff to avoid 429 spike arrests.
 */
export async function getTicketmasterCities(countryCode) {
  if (!countryCode) return [];
  const key = String(countryCode).toUpperCase();
  const now = Date.now();
  const cached = _tmCitiesCache.get(key);
  if (cached && cached.expiresAt > now) return cached.cities;

  const apiKey = process.env.TICKETMASTER_API_KEY?.trim() || "";
  if (!apiKey) return [];

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const search = new URLSearchParams();
      search.set("apikey", apiKey);
      // keep page smaller to reduce rate pressure
      search.set("size", "100");
      search.set("countryCode", key);
      const url = `${TM_BASE}/events.json?${search.toString()}`;
      const res = await fetch(url);

      if (res.status === 429) {
        // Respect Retry-After or use exponential backoff with jitter
        const ra = res.headers.get("retry-after");
        const raSec = ra ? Number(ra) : null;
        const backoffMs = raSec ? raSec * 1000 : Math.min(1000 * 2 ** attempt, 5000);
        const jitter = Math.floor(Math.random() * 300);
        await sleep(backoffMs + jitter);
        continue;
      }

      if (!res.ok) {
        // For other HTTP errors, don't retry aggressively
        console.warn("getTicketmasterCities: non-ok response", res.status);
        return [];
      }

      const data = await res.json();
      const events = data._embedded?.events || [];
      const cities = new Set();
      for (const e of events) {
        const venue = e._embedded?.venues?.[0];
        const city = venue?.city?.name;
        if (city) cities.add(city);
      }
      const list = [...cities].sort((a, b) => a.localeCompare(b));
      // cache for 1 hour
      _tmCitiesCache.set(key, { cities: list, expiresAt: Date.now() + 60 * 60 * 1000 });
      return list;
    } catch (e) {
      console.error("getTicketmasterCities error", e?.message || e);
      // backoff on network errors
      const backoffMs = Math.min(1000 * 2 ** attempt, 5000);
      const jitter = Math.floor(Math.random() * 300);
      await sleep(backoffMs + jitter);
    }
  }

  return [];
}
