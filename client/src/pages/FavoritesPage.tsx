import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { EventCard } from "../components/EventCard";
import type { EventItem } from "../types";

export function FavoritesPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { events: list } = await api.favorites();
        if (!cancelled) setEvents(list || []);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">Sign in to see saved events.</p>
        <Link to="/auth" className="mt-4 inline-block font-semibold text-brand-600">
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-slate-500">Loading favorites…</p>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Favorite events</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">{events.length} saved</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {events.map((ev, i) => (
          <EventCard key={ev.id} event={ev} index={i} />
        ))}
      </div>
      {events.length === 0 && (
        <p className="mt-12 text-center text-slate-500">
          No favorites yet.{" "}
          <Link to="/" className="font-semibold text-brand-600">
            Discover events
          </Link>
        </p>
      )}
    </motion.div>
  );
}
