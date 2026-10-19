import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatEventDate } from "../lib/utils";
import type { EventItem } from "../types";

interface EventCardProps {
  event: EventItem;
  index?: number;
}

export function EventCard({ event, index = 0 }: EventCardProps) {
  const img = event.image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:shadow-soft-dark"
    >
      <Link to={`/event/${event.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={img}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-brand-800 backdrop-blur dark:bg-slate-900/90 dark:text-brand-300">
            {event.category || "Event"}
          </span>
          {event.priceRange === "free" && (
            <span className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-white">
              Free
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg font-semibold text-slate-900 line-clamp-2 dark:text-white">
            {event.name}
          </h3>
          <p className="mt-1 text-sm text-brand-600 dark:text-brand-400">{formatEventDate(event.startDate)}</p>
          <p className="mt-2 text-sm text-slate-600 line-clamp-2 dark:text-slate-400">
            {[event.venue, event.city].filter(Boolean).join(" · ") || "Location TBA"}
          </p>
          {event.distanceKm != null && (
            <p className="mt-2 text-xs font-medium text-slate-500">{event.distanceKm.toFixed(1)} km away</p>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
