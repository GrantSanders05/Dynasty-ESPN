import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route } from "react-router-dom";

import { supabase } from "./supabaseClient.js";
import Navbar from "./components/Navbar.jsx";
import { Banner } from "./components/Banners.jsx";

import Home from "./pages/Home.jsx";
import Social from "./pages/Social.jsx";
import Podcast from "./pages/Podcast.jsx";
import Team from "./pages/Team.jsx";
import Rankings from "./pages/Rankings.jsx";

const APP_TITLE = "CFB 26 DYNASTY NETWORK";

// ✅ MULTI-COMMISSIONER ALLOW LIST (frontend UI gating)
const COMMISH_EMAILS = [
  "grantssanders05@gmail.com",
  "tylerpoole113@gmail.com",
].map((e) => e.toLowerCase());

function withTimeout(promise, ms = 2000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Auth timeout")), ms)
    ),
  ]);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [teams, setTeams] = useState([]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ✅ Safe: same pattern you already had, just checks a list instead of 1 email
  const isCommish = useMemo(() => {
    const e = (user?.email || "").toLowerCase();
    return !!e && COMMISH_EMAILS.includes(e);
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
    flashError._t = window.setTimeout(() => setError(""), 9000);
  }

  async function loadTeams() {
    const res = await supabase
      .from("teams")
      .select("*")
      .order("name", { ascending: true });

    if (!res.error) setTeams(res.data || []);
  }

  async function refreshSession() {
    setAuthLoading(true);
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 2000);
      setUser(data?.session?.user ?? null);
    } catch (e) {
      console.warn("refreshSession:", e?.message || e);
      setUser(null);
      flashError(
        "Auth check timed out.\nIf this keeps happening: 1) Hard refresh (Ctrl+Shift+R), 2) Try Incognito, 3) Confirm Supabase Auth → URL Configuration has your Vercel URL."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    refreshSession();
    loadTeams();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshSession();
    });

    return () => sub?.subscription?.unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signInOrUp(e) {
    e.preventDefault();

    if (!email || !password) return flashError("Enter email and password.");

    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        flashNotice("Signed up! Check email if confirmations are enabled.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        flashNotice("Signed in.");
      }

      setEmail("");
      setPassword("");
      await refreshSession();
    } catch (err) {
      flashError(err?.message || "Auth error.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      flashNotice("Signed out.");
      setUser(null);
    } catch (err) {
      flashError(err?.message || "Sign out failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  // Keep auth UI inline (same behavior, just readable)
  const authSlot = !user ? (
    <form className="authRow" onSubmit={signInOrUp}>
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
      <button className="btn primary" disabled={authLoading} type="submit">
        {authMode === "signup" ? "Sign up" : "Sign in"}
      </button>
      <button
        className="btn"
        type="button"
        onClick={() => setAuthMode((m) => (m === "signup" ? "signin" : "signup"))}
      >
        {authMode === "signup" ? "Have an account?" : "New here?"}
      </button>
    </form>
  ) : null;

  return (
    <>
      <Navbar
        appTitle={APP_TITLE}
        teams={teams}
        userEmail={user?.email || ""}
        isCommish={isCommish}
        onSignOut={signOut}
        authSlot={authSlot}
        authLoading={authLoading}
      />

      <Banner notice={notice} error={error} />

      <Routes>
        <Route path="/" element={<Home supabase={supabase} isCommish={isCommish} />} />
        <Route
          path="/podcast"
          element={<Podcast supabase={supabase} isCommish={isCommish} />}
        />
        <Route
          path="/rankings"
          element={<Rankings supabase={supabase} isCommish={isCommish} />}
        />
        <Route
          path="/social"
          element={<Social supabase={supabase} isCommish={isCommish} user={user} />}
        />
        <Route
          path="/team/:slug"
          element={<Team supabase={supabase} isCommish={isCommish} />}
        />
      </Routes>
    </>
  );
}
