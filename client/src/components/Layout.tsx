import React from "react";
import { Link, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
      : "text-slate-600 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-surface/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Event<span className="text-brand-500">Finder</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink to="/" className={navClass} end>
              Discover
            </NavLink>
            <NavLink to="/assistant" className={navClass}>
              AI assistant
            </NavLink>
            <NavLink to="/organizer" className={navClass}>
              Organizers
            </NavLink>
            {user && (
              <NavLink to="/favorites" className={navClass}>
                Favorites
              </NavLink>
            )}
            <NavLink to="/auth" className={navClass}>
              {user ? "Account" : "Sign in"}
            </NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={toggle}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </motion.button>
            {user && (
              <button
                type="button"
                onClick={logout}
                className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:block"
              >
                Log out
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap border-t border-slate-100 px-2 py-2 sm:hidden dark:border-slate-800">
          <NavLink to="/" className={({ isActive }) => `${navClass({ isActive })} min-w-[22%] flex-1 text-center`} end>
            Home
          </NavLink>
          <NavLink to="/assistant" className={({ isActive }) => `${navClass({ isActive })} min-w-[22%] flex-1 text-center`}>
            AI
          </NavLink>
          <NavLink to="/organizer" className={({ isActive }) => `${navClass({ isActive })} min-w-[22%] flex-1 text-center`}>
            Org
          </NavLink>
          {user && (
            <NavLink to="/favorites" className={({ isActive }) => `${navClass({ isActive })} min-w-[22%] flex-1 text-center`}>
              Saved
            </NavLink>
          )}
          <NavLink to="/auth" className={({ isActive }) => `${navClass({ isActive })} min-w-[22%] flex-1 text-center`}>
            {user ? "Account" : "Sign in"}
          </NavLink>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Event Finder · Demo data when no Ticketmaster key · Maps © OpenStreetMap
      </footer>
    </div>
  );
}
