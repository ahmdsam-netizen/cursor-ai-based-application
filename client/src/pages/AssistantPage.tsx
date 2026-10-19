import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";

export function AssistantPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [eventRelated, setEventRelated] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true);
    setError("");
    setReply(null);
    setEventRelated(null);
    try {
      const data = await api.assistantChat(text);
      setEventRelated(data.eventRelated);
      setReply(data.reply || "");
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          to="/"
          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          ← Back to Discover
        </Link>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
        >
          Event assistant
        </motion.h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Ask about concerts, festivals, cities, dates, or categories. Answers use only our{" "}
          <strong>demo event catalog</strong>. Unrelated questions get a standard “not related” reply.
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onSubmit={send}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <label htmlFor="ai-msg" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Your question
        </label>
        <textarea
          id="ai-msg"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. What tech events are in Delhi this week?"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </motion.form>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {reply != null && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border px-4 py-4 text-sm leading-relaxed ${
            eventRelated
              ? "border-emerald-200 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
              : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200"
          }`}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {eventRelated ? "Answer (from demo data)" : "Not related"}
          </p>
          <p className="whitespace-pre-wrap">{reply}</p>
        </motion.div>
      )}
    </div>
  );
}
