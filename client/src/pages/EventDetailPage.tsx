import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatEventDate, googleCalendarUrl, downloadIcs } from "../lib/utils";
import type { EventItem } from "../types";

interface DetailedEvent extends EventItem {
  stateCode?: string;
  countryCode?: string;
  organizer?: string;
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, refresh } = useAuth();
  const [event, setEvent] = useState<DetailedEvent | null>(null);
  const [fav, setFav] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const ev = await api.getEvent(id);
        if (!cancelled) {
          setEvent(ev);
          setFav(Boolean(user?.favorites?.includes(id)));
        }
      } catch {
        if (!cancelled) setErr("Could not load event.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.favorites]);

  const toggleFavorite = async () => {
    if (!user || !id) return;
    try {
      if (fav) {
        await api.removeFavorite(id);
        setFav(false);
      } else {
        await api.addFavorite(id);
        setFav(true);
      }
      await refresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (err) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">{err}</p>
        <Link to="/" className="mt-4 inline-block font-semibold text-brand-600">
          Back home
        </Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-8 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  const img =
    event.image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80";

  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900 dark:shadow-soft-dark">
      <div className="relative aspect-[21/9] min-h-[200px] bg-slate-100 dark:bg-slate-800">
        <img src={img} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur">
            {event.category}
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">{event.name}</h1>
          <p className="mt-2 text-lg text-white/90">{formatEventDate(event.startDate)}</p>
        </div>
      </div>
      <div className="grid gap-8 p-6 sm:grid-cols-[1fr_280px] sm:p-8">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">About</h2>
          <p className="mt-3 whitespace-pre-line text-slate-600 dark:text-slate-300">{event.description}</p>
          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Where</h3>
            <p className="mt-1 text-slate-900 dark:text-white">
              {[event.venue, event.address, event.city, event.stateCode, event.countryCode].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-600">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Organizer</h3>
            <p className="mt-1 font-medium text-slate-900 dark:text-white">{event.organizer || "TBA"}</p>
          </div>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700"
            >
              Get tickets
            </a>
          )}
          <div className="flex flex-col gap-2">
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Add to Google Calendar
            </a>
            <button
              type="button"
              onClick={() => downloadIcs(event)}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Download .ics
            </button>
          </div>
          {user ? (
            <button
              type="button"
              onClick={toggleFavorite}
              className={`w-full rounded-xl py-3 text-sm font-semibold ${
                fav
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                  : "border border-slate-200 text-slate-800 dark:border-slate-600 dark:text-slate-100"
              }`}
            >
              {fav ? "★ Saved" : "☆ Save event"}
            </button>
          ) : (
            <p className="text-center text-sm text-slate-500">
              <Link to="/auth" className="font-semibold text-brand-600">
                Sign in
              </Link>{" "}
              to save favorites
            </p>
          )}
        </aside>
      </div>
    </motion.article>
  );
}
