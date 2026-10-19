import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { EventCard } from "../components/EventCard";
import { EventsMap } from "../components/EventsMap";
import { INTERESTS } from "../lib/utils";
import type { EventItem } from "../types";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
];

interface LocState {
  lat: number;
  lng: number;
  label: string;
  source: string;
  gpsCity?: string;
  gpsCountry?: string;
  gpsDistanceKm?: number;
}

interface TrendingItem extends EventItem {
  trendingScore?: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const { user, setInterests } = useAuth();
  const [loc, setLoc] = useState<LocState>({
    lat: 37.7749,
    lng: -122.4194,
    label: "San Francisco",
    source: "default",
  });
  /**
   * When true, automatic GPS/IP on load must not overwrite state (user already changed region).
   * Buttons "My location" / "Use IP" set this before refreshing coordinates.
   */
  const userTouchedLocationRef = useRef(false);
  /** Empty string = all cities in selected country */
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("US");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState(50);
  const [keyword, setKeyword] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mode, setMode] = useState<"list" | "map">("list");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [reco, setReco] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("");
  const [locStatus, setLocStatus] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [apiError, setApiError] = useState("");

  const toggleCategory = (c: string) => {
    setSelectedCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const gpsCityMode = loc.source === "gps" && Boolean(loc.gpsCity);
      const cityTrim = (city || "").trim();
      const hasPickerCity = cityTrim.length > 0;
      /** Search by named city+country (no radius) — GPS nearest city or an explicit city from the dropdown. */
      const cityScoped = gpsCityMode || hasPickerCity;

      const { events: list, source: src } = await api.searchEvents({
        lat: cityScoped ? undefined : loc.lat,
        lng: cityScoped ? undefined : loc.lng,
        radiusKm,
        q: keyword,
        date: datePreset,
        price: priceFilter,
        categories: selectedCategories.length ? selectedCategories.join(",") : undefined,
        country: gpsCityMode ? loc.gpsCountry : country,
        city: gpsCityMode ? loc.gpsCity : hasPickerCity ? cityTrim : undefined,
      });
      setEvents(list || []);
      setSource(src || "");
      setApiError("");
    } catch (e: any) {
      console.error(e);
      setEvents([]);
      setApiError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [loc, radiusKm, keyword, datePreset, priceFilter, selectedCategories, country, city]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /** Apply GPS coords + nearest demo city (shared by auto-load and the GPS button). */
  const applyGpsCoordinates = useCallback(async (la: number, lo: number, guard?: () => boolean) => {
    try {
      const { nearest } = await api.nearestCity(la, lo);
      if (guard?.()) return;
      if (!nearest) {
        setLoc({
          lat: la,
          lng: lo,
          label: "Your location",
          source: "gps",
          gpsCity: undefined,
          gpsCountry: undefined,
          gpsDistanceKm: undefined,
        });
        setLocStatus("GPS ready — map routes use your position.");
        return;
      }
      setCountry(nearest.countryCode);
      setCity(nearest.city);
      setLoc({
        lat: la,
        lng: lo,
        label: nearest.city,
        source: "gps",
        gpsCity: nearest.city,
        gpsCountry: nearest.countryCode,
        gpsDistanceKm: nearest.distanceKm,
      });
      setLocStatus(
        `GPS ready — nearest demo city is ${nearest.city}. Browse other cities below; driving routes always start from your position.`
      );
    } catch {
      if (guard?.()) return;
      setLoc({
        lat: la,
        lng: lo,
        label: "Your location",
        source: "gps",
        gpsCity: undefined,
        gpsCountry: undefined,
        gpsDistanceKm: undefined,
      });
      setLocStatus("GPS ready — could not resolve nearest demo city.");
    }
  }, []);

  /** On every visit: ask for GPS first so map routes have your position; fall back to server IP. */
  useEffect(() => {
    let cancelled = false;
    const guard = () => cancelled || userTouchedLocationRef.current;

    const tryIpFallback = async () => {
      try {
        const data = await api.geolocate();
        if (guard()) return;
        setLoc({
          lat: data.lat,
          lng: data.lng,
          label: data.label || data.city || "Near you",
          source: "ip",
          gpsCity: undefined,
          gpsCountry: undefined,
          gpsDistanceKm: undefined,
        });
        if (data.countryCode) setCountry(data.countryCode);
        if (data.city) setCity(data.city);
        setLocStatus(
          "Using approximate location from IP (GPS unavailable or denied). Driving routes still start from this point."
        );
      } catch {
        if (!guard()) {
          setLocStatus("Could not detect location — using default map. Try the buttons above.");
        }
      }
    };

    if (!navigator.geolocation) {
      void tryIpFallback();
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void applyGpsCoordinates(pos.coords.latitude, pos.coords.longitude, guard);
      },
      () => {
        if (!guard()) void tryIpFallback();
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );

    return () => {
      cancelled = true;
    };
  }, [applyGpsCoordinates]);

  /** Update which city/country we *browse* — keep your real lat/lng for map routes & directions API. */
  const setManualRegionLabel = useCallback((nextCountry: string, nextCity: string) => {
    setLoc((prev) => ({
      ...prev,
      source: "manual",
      label: nextCity ? `${nextCity}, ${nextCountry}` : `All cities · ${nextCountry}`,
      gpsCity: undefined,
      gpsCountry: undefined,
      gpsDistanceKm: undefined,
    }));
    setLocStatus(
      nextCity
        ? `Showing events in ${nextCity}. Driving routes on the map still start from your saved position (GPS or IP).`
        : `Showing all cities in ${nextCountry}. Routes still start from your position.`
    );
  }, []);

  useEffect(() => {
    api
      .trending(loc.lat, loc.lng)
      .then((r) => setTrending(r.events || []))
      .catch(() => setTrending([]));
  }, [loc.lat, loc.lng]);

  useEffect(() => {
    if (!user) {
      setReco([]);
      return;
    }
    api
      .recommendations(loc.lat, loc.lng)
      .then((r) => setReco(r.events || []))
      .catch(() => setReco([]));
  }, [user, loc.lat, loc.lng, user?.interests]);

  const useGps = () => {
    userTouchedLocationRef.current = true;
    setLocStatus("Locating…");
    if (!navigator.geolocation) {
      setLocStatus("GPS not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void applyGpsCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocStatus("GPS denied — try “Use IP location”.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  };

  const useIp = async () => {
    userTouchedLocationRef.current = true;
    setLocStatus("Looking up IP…");
    try {
      const data = await api.geolocate();
      setLoc({
        lat: data.lat,
        lng: data.lng,
        label: data.label || data.city,
        source: "ip",
        gpsCity: undefined,
        gpsCountry: undefined,
        gpsDistanceKm: undefined,
      });
      if (data.city) setCity(data.city);
      if (data.countryCode) setCountry(data.countryCode);
      setLocStatus("Approximate location from IP");
    } catch {
      setLocStatus("IP lookup failed");
    }
  };

  const applyManualRegion = () => {
    userTouchedLocationRef.current = true;
    setManualRegionLabel(country, city);
  };

  useEffect(() => {
    let cancelled = false;
    api
      .citiesForCountry(country)
      .then(({ cities }) => {
        if (!cancelled) setAvailableCities(cities || []);
      })
      .catch(() => {
        if (!cancelled) setAvailableCities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  const surprise = () => {
    if (!events.length) return;
    const pick = events[Math.floor(Math.random() * events.length)];
    navigate(`/event/${pick.id}`);
  };

  const syncInterestsToAccount = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      await setInterests(selectedCategories.length ? selectedCategories : INTERESTS.slice(0, 3));
    } catch (e) {
      console.error(e);
    }
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === "granted");
  };

  useEffect(() => {
    if (!notifEnabled || !user) return;
    const id = setInterval(async () => {
      try {
        const { upcoming } = await api.notificationsPreview();
        for (const u of upcoming || []) {
          if (Notification.permission === "granted") {
            // eslint-disable-next-line no-new
            new Notification("Upcoming saved event", { body: u.name });
          }
        }
        if (upcoming?.length) {
          await api.markNotificationsSent(upcoming.map((x: any) => x.id));
        }
      } catch {
        /* ignore */
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [notifEnabled, user]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (loc.lat != null && loc.lng != null) return [loc.lat, loc.lng];
    const first = events.find((e) => e.lat != null && e.lng != null);
    if (first && first.lat != null && first.lng != null) return [first.lat, first.lng];
    return [37.7749, -122.4194];
  }, [loc.lat, loc.lng, events]);

  return (
    <div className="space-y-10">
      {apiError && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <strong className="font-semibold">Connection issue.</strong> {apiError}
        </div>
      )}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-brand-50 via-white to-violet-50 p-6 shadow-soft dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 dark:shadow-soft-dark sm:p-8"
      >
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Discover events you’ll love
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Search near you or explore a country. Filter by interests, date, distance, and price — list or map.
        </p>
        <p className="mt-4 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
          On each visit we ask the browser for your location (you can allow or deny). If GPS is unavailable, we use your
          IP via the server. That position is sent to the API when you draw a driving route so paths run from you to
          events — even when you filter another city.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useGps}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-700"
          >
            My location (GPS)
          </button>
          <button
            type="button"
            onClick={useIp}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Use IP location
          </button>
          <button
            type="button"
            onClick={surprise}
            className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-900 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200"
          >
            Surprise me
          </button>
          <Link
            to="/assistant"
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95"
          >
            AI assistant
          </Link>
          {user && (
            <button
              type="button"
              onClick={enableNotifications}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
            >
              {notifEnabled ? "Notifications on" : "Enable reminders"}
            </button>
          )}
        </div>
        {locStatus && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{locStatus}</p>}
      </motion.section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Location & radius</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Country
                <select
                  value={country}
                  onChange={(e) => {
                    userTouchedLocationRef.current = true;
                    const next = e.target.value;
                    setCountry(next);
                    setCity("");
                    setManualRegionLabel(next, "");
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                City
                <select
                  value={city}
                  onChange={(e) => {
                    userTouchedLocationRef.current = true;
                    const v = e.target.value;
                    setCity(v);
                    setManualRegionLabel(country, v);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">
                    All cities with sample events ({availableCities.length} cities)
                  </option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  List shows cities that have events in our demo data for this country.
                </span>
              </label>
            </div>
            <button
              type="button"
              onClick={applyManualRegion}
              className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              Search this city / country
            </button>
            <div className="mt-6">
              <label className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                Radius
                <span className="text-brand-600 dark:text-brand-400">{radiusKm} km</span>
              </label>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                disabled={loc.source === "gps" && Boolean(loc.gpsCity)}
                className="mt-2 w-full accent-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {loc.source === "gps" && loc.gpsCity && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Radius is disabled while GPS is locked to the nearest demo city ({loc.gpsCity}).
                </p>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Active: <strong>{loc.label}</strong>
              {loc.lat != null && ` · ${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Interests</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Filter results and tune recommendations when signed in.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTERESTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategories.includes(c)
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={syncInterestsToAccount}
              className="mt-4 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Save interests to account →
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="block flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Keyword
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="Artist, venue, topic…"
                />
              </label>
              <button
                type="button"
                onClick={fetchEvents}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Search
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Any date</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Free & paid</option>
                <option value="free">Free only</option>
                <option value="paid">Paid only</option>
              </select>
              <div className="flex rounded-xl border border-slate-200 p-1 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setMode("list")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    mode === "list" ? "bg-slate-900 text-white dark:bg-brand-600" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setMode("map")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    mode === "map" ? "bg-slate-900 text-white dark:bg-brand-600" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Map
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode === "map" ? (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EventsMap
                  events={events}
                  center={mapCenter}
                  userLocation={
                    loc.lat != null && loc.lng != null
                      ? { lat: loc.lat, lng: loc.lng, label: loc.label || "Your location" }
                      : null
                  }
                />
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    {loading ? "Loading…" : `${events.length} events`}
                    {source && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                        {source}
                      </span>
                    )}
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {events.map((ev, i) => (
                    <EventCard key={ev.id} event={ev} index={i} />
                  ))}
                </div>
                {!loading && events.length === 0 && (
                  <p className="py-12 text-center text-slate-500">No events match your filters. Try widening radius or clearing filters.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Trending near you</h3>
            <ul className="mt-3 space-y-2">
              {trending.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/event/${e.id}`)}
                    className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <span className="font-medium text-slate-900 dark:text-white">{e.name}</span>
                    {e.trendingScore != null && e.trendingScore > 0 && (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">hot</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {user && reco.length > 0 && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-5 dark:border-violet-900 dark:bg-violet-950/30">
              <h3 className="font-display font-semibold text-violet-900 dark:text-violet-200">For you</h3>
              <p className="mt-1 text-xs text-violet-800/80 dark:text-violet-300/80">
                Based on your interests and what you open.
              </p>
              <ul className="mt-3 space-y-2">
                {reco.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/event/${e.id}`)}
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-violet-100/80 dark:hover:bg-violet-900/40"
                    >
                      {e.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
