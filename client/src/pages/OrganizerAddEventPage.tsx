import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { INTERESTS } from "../lib/utils";

const defaultImage = "https://images.unsplash.com/photo-1540575467063-027aefd2e6b7?w=800&q=80";

export function OrganizerAddEventPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    venue: "",
    address: "",
    city: "",
    stateCode: "",
    countryCode: "US",
    lat: "37.7749",
    lng: "-122.4194",
    category: "Music",
    image: defaultImage,
    url: "",
    priceRange: "paid",
    organizer: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : "",
        venue: form.venue,
        address: form.address,
        city: form.city,
        stateCode: form.stateCode,
        countryCode: form.countryCode,
        lat: Number(form.lat),
        lng: Number(form.lng),
        category: form.category,
        image: form.image.trim() || defaultImage,
        url: form.url.trim() || null,
        priceRange: form.priceRange,
        organizer: form.organizer.trim() || user?.name || "Organizer",
      };
      const { event } = await api.organizerCreateEvent(payload);
      navigate(`/event/${event.id}`);
    } catch (err: any) {
      setError(err.message || "Could not save event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center text-slate-600 dark:text-slate-400">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-slate-700 dark:text-slate-300">Sign in as an organizer first.</p>
        <Link to="/organizer" className="mt-4 inline-block font-semibold text-brand-600 hover:underline">
          Go to organizer sign-in
        </Link>
      </div>
    );
  }

  if (user.role !== "organizer") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-slate-700 dark:text-slate-300">
          This account is not registered as an organizer. Register a new organizer account or use another email.
        </p>
        <Link to="/organizer" className="mt-4 inline-block font-semibold text-brand-600 hover:underline">
          Organizer registration
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Add event</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Same fields as demo sample events. Persisted with PostgreSQL and pgvector embeddings.
          </p>
        </div>
        <Link
          to="/organizer"
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          ← Organizer home
        </Link>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900 dark:shadow-soft-dark"
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Event name *
          <input
            required
            value={form.name}
            onChange={set("name")}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
          <textarea
            rows={4}
            value={form.description}
            onChange={set("description")}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Start date & time *
          <input
            type="datetime-local"
            required
            value={form.startDate}
            onChange={set("startDate")}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Venue *
            <input
              required
              value={form.venue}
              onChange={set("venue")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Street address
            <input
              value={form.address}
              onChange={set("address")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            City *
            <input
              required
              value={form.city}
              onChange={set("city")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            State / region code
            <input
              placeholder="e.g. CA"
              maxLength={2}
              value={form.stateCode}
              onChange={set("stateCode")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Country (ISO-2) *
            <input
              required
              maxLength={2}
              value={form.countryCode}
              onChange={set("countryCode")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Latitude *
            <input
              required
              type="number"
              step="any"
              value={form.lat}
              onChange={set("lat")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Longitude *
            <input
              required
              type="number"
              step="any"
              value={form.lng}
              onChange={set("lng")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Category *
            <select
              value={form.category}
              onChange={set("category")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              {INTERESTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Price *
            <select
              value={form.priceRange}
              onChange={set("priceRange")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Image URL
          <input
            type="url"
            value={form.image}
            onChange={set("image")}
            placeholder={defaultImage}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Ticket / info URL (optional)
          <input
            type="url"
            value={form.url}
            onChange={set("url")}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Organizer / brand name (shown on listing) *
          <input
            required
            value={form.organizer}
            onChange={set("organizer")}
            placeholder={user?.name || "Your organization"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Publish event"}
        </button>
      </form>
    </motion.div>
  );
}
