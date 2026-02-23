import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import Navbar from "./components/Navbar.jsx";
import { Banner } from "./components/Banners.jsx";

import Home from "./pages/Home.jsx";
import Social from "./pages/Social.jsx";
import Podcast from "./pages/Podcast.jsx";
import Team from "./pages/Team.jsx";

const APP_TITLE = "CFB 26 DYNASTY NETWORK";

export default function App() {
  const [user, setUser] = useState(null);
  const [isCommish, setIsCommish] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [teams, setTeams] = useState([]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [authMode, setAuthMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    flashError._t = window.setTimeout(() => setError(""), 7000);
  }

  async function loadTeams() {
    const res = await supabase.from("teams").select("*").order("rank", { ascending: true }).order("name", { ascending: true });
    if (!res.error) setTeams(res.data || []);
  }

  async function refreshUserAndRole() {
    setAuthLoading(true);
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) console.warn("getSession error:", sessionErr);

      const session = sessionData?.session ?? null;
      const u = session?.user ?? null;

      setUser(u);

      if (!u?.email) {
        setIsCommish(false);
        return;
      }

      const { data: cRow, error: cErr } = await supabase
        .from("commissioners")
        .select("email")
        .eq("email", u.email)
        .maybeSingle();

      if (cErr) {
        console.warn("commissioners select error:", cErr);
        flashError("Signed in, but commissioner check failed (RLS). Run the commissioner RLS fix SQL.");
      }

      setIsCommish(!!cRow);
    } catch (e) {
      console.warn("refreshUserAndRole fatal:", e);
      flashError("Auth failed to initialize. Check Vercel env vars and Supabase Auth URL settings.");
      setUser(null);
      setIsCommish(false);
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    refreshUserAndRole();
    loadTeams();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      await refreshUserAndRole();
    });

    return () => sub?.subscription?.unsubscribe?.();
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
      await refreshUserAndRole();
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
      setIsCommish(false);
    } catch (err) {
      flashError(err?.message || "Sign out failed.");
    }
  }

  const authSlot =
    !authLoading && !user ? (
      <form className="authForm" onSubmit={signInOrUp}>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" type="email" autoComplete="email" />
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
        <button className="btn ghost" type="button" onClick={() => setAuthMode((m) => (m === "signup" ? "signin" : "signup"))}>
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
          <div className="muted">Commissioner-only actions are protected by Supabase RLS.</div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
