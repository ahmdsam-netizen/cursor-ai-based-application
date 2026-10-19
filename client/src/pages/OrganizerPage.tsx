import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export function OrganizerPage() {
  const navigate = useNavigate();
  const { user, loading, login, registerOrganizer, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        const data = await login(email, password);
        if (data.user?.role !== "organizer") {
          setError("This account is not an organizer. Use the regular sign-in, or register as an organizer.");
          return;
        }
        navigate("/organizer/add");
      } else {
        await registerOrganizer(email, password, name);
        navigate("/organizer/add");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  if (loading) {
    return (
      <p className="text-center text-slate-600 dark:text-slate-400" aria-busy="true">
        Loading…
      </p>
    );
  }

  if (user && user.role !== "organizer") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900"
      >
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Wrong account type</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          You’re signed in as <span className="font-medium">{user.email}</span> (attendee account). Log out to sign in or
          register as an organizer.
        </p>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-6 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Log out
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/" className="text-brand-600 hover:underline">
            ← Home
          </Link>
        </p>
      </motion.div>
    );
  }

  if (user?.role === "organizer") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900"
      >
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Organizer</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">{user.email}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/organizer/add"
            className="rounded-xl bg-brand-600 px-6 py-3 text-center font-semibold text-white hover:bg-brand-700"
          >
            Add new event
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            Log out
          </button>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          <Link to="/" className="text-brand-600 hover:underline">
            ← Back to Discover
          </Link>
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900"
    >
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Organizers</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Log in or register to publish events that appear in search with the demo catalog.
      </p>
      <div className="mt-6 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
            mode === "login" ? "bg-white shadow dark:bg-slate-700" : "text-slate-600 dark:text-slate-400"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
            mode === "register" ? "bg-white shadow dark:bg-slate-700" : "text-slate-600 dark:text-slate-400"
          }`}
        >
          Register as organizer
        </button>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "register" && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        )}
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700"
        >
          {mode === "login" ? "Log in as organizer" : "Create organizer account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Looking for attendee login?{" "}
        <Link to="/auth" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
