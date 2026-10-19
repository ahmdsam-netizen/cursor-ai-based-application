import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { INTERESTS } from "../lib/utils";

export function AuthPage() {
  const { user, login, register, logout, setInterests } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (user?.interests?.length) setPicked([...user.interests]);
    else if (user) setPicked([]);
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  const toggleInterest = (c: string) => {
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  };

  const saveInterests = async () => {
    setError("");
    try {
      await setInterests(picked.length ? picked : INTERESTS.slice(0, 2));
    } catch (err: any) {
      setError(err.message || "Update failed");
    }
  };

  if (user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900 dark:shadow-soft-dark"
      >
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Your account</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">{user.email}</p>
        {user.name && <p className="text-sm text-slate-500">{user.name}</p>}
        <h2 className="mt-8 font-semibold text-slate-900 dark:text-white">Saved interests</h2>
        <p className="text-sm text-slate-500">Used for personalized ranking and “For you”.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleInterest(c)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                picked.includes(c)
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={saveInterests}
          className="mt-6 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Update interests
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={logout}
          className="mt-8 w-full rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          Log out
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
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
          Sign up
        </button>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "register" && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Name
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700"
        >
          {mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </motion.div>
  );
}
