import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import Navbar from "./components/Navbar.jsx";
import { Banner } from "./components/Banners.jsx";

import Home from "./pages/Home.jsx";
import Social from "./pages/Social.jsx";
import Podcast from "./pages/Podcast.jsx";
import Team from "./pages/Team.jsx";

const APP_TITLE = "CFB 26 DYNASTY NETWORK";

// CHANGE THIS if your commissioner email is different:
const COMMISH_EMAIL = "grantsanders05@gmail.com".toLowerCase();

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [teams, setTeams] = useState([]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [authMode, setAuthMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Commissioner is decided locally by email (NO database query, NO RLS dependency)
  const isCommish = useMemo(() => {
    const e = (user?.email || "").toLowerCase();
    return !!e && e === COMMISH_EMAIL;
  }, [user]);

  function flashNotice(msg) {
    setNotice(msg);
    setError("");
    window.clearTimeout(flashNotice._t);
    flashNotice._t = window.setTimeout(() => setNotice(""), 3500);
  }
  function flashError(msg) {
    setError(msg);
    setNotice("");
    window.clearTimeout(flashError._t);
    flashError._t = window.setTimeout(() => setError(""), 8000);
  }

  async function loadTeams() {
    const res = await supabase
      .from("teams")
      .select("*")
      .order("rank", { ascending: true })
      .order("name", { ascending: true });
    if (!res.error) setTeams(res.data || []);
  }

  async function refreshSession() {
    // Never let the UI get stuck on "Loading…"
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("getSession error:", error);
        flashError("Auth session error. Check Vercel env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
      }
      setUser(data?.session?.user ?? null);
    } catch (e) {
      console.warn("refreshSession fatal:", e);
      setUser(null);
      flashError("Auth failed to initialize. Check Supabase URL config + env vars.");
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    refreshSession();
    loadTeams();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      await refreshSession();
    });

    // Safety timeout: if anything weird happens, stop "Loading…" after 2 seconds
    const t = window.setTimeout(() => setAuthLoading(false), 2000);

    return () => {
      window.clearTimeout(t);
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signInOrUp(e) {
    e.preventDefault();
    if (!email || !password) return flashError("Enter email and password.");

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        flashNotice("Signed up! If email confirmation is enabled, check your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        flashNotice("Signed in.");
      }
      setEmail("");
      setPassword("");
      await refreshSession();
    } catch (err) {
      flashError(err?.message || "Auth error.");
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      flashNotice("Signed out.");
      setUser(null);
    } catch (err) {
      flashError(err?.message || "Sign out failed.");
    }
  }

  const authSlot = !user ? (
    <form className="authForm" onSubmit={signInOrUp}>
      <input
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
        type="email"
        autoComplete="email"
      />
      <input
        className="input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        type="password"
        autoComplete={authMode === "signup" ? "new-password" : "current-password"}
      />
      <button className="btn primary" type="submit">
        {authMode === "signup" ? "Sign up" : "Sign in"}
      </button>
      <button
        className="btn ghost"
        type="button"
        onClick={() => setAuthMode((m) => (m === "signup" ? "signin" : "signup"))}
      >
        {authMode === "signup" ? "Have an account?" : "New here?"}
      </button>
    </form>
  ) : null;

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar
          appTitle={APP_TITLE}
          teams={teams}
          userEmail={user?.email}
          isCommish={isCommish}
          onSignOut={signOut}
          authSlot={authSlot}
          authLoading={authLoading}
        />

        <Banner notice={notice} error={error} />

        <Routes>
          <Route path="/" element={<Home supabase={supabase} isCommish={isCommish} teams={teams} />} />
          <Route path="/social" element={<Social supabase={supabase} isCommish={isCommish} />} />
          <Route path="/podcast" element={<Podcast supabase={supabase} isCommish={isCommish} />} />
          <Route path="/teams/:slug" element={<Team supabase={supabase} isCommish={isCommish} />} />
          <Route
            path="*"
            element={
              <main className="page">
                <div className="pageHeader">
                  <h1>Not Found</h1>
                  <div className="muted">That page doesn't exist.</div>
                </div>
              </main>
            }
          />
        </Routes>

        <footer className="footer">
          <div className="muted">
            Commissioner is: <strong>grantsanders05@gmail.com</strong>. (This is enforced by RLS in Supabase and by this UI.)
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
