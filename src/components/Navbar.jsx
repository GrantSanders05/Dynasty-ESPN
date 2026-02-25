import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";

/**
 * Navbar (official sports vibe)
 * - Fixes Teams dropdown (real panel, scroll, search, closes on outside click)
 * - Adds mobile hamburger without changing routing/auth functionality
 */
export default function Navbar({
  appTitle,
  teams = [],
  userEmail,
  isCommish,
  onSignOut,
  authSlot,
  authLoading,
}) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const dropdownRef = useRef(null);

  const teamLinks = useMemo(
    () => (teams || []).map((t) => ({ name: t.name, slug: t.slug })),
    [teams]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return teamLinks;
    return teamLinks.filter((t) => t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s));
  }, [q, teamLinks]);

  useEffect(() => {
    function onDocPointerDown(e) {
      const el = dropdownRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("touchstart", onDocPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("touchstart", onDocPointerDown);
    };
  }, []);

  // Close dropdown on route changes via click
  function closeAll() {
    setOpen(false);
    setMobileOpen(false);
  }

  return (
    <div className="topbar">
      <div className="brand">
        <Link className="brandLink" to="/" onClick={closeAll}>
          <div className="brandMark" />
          <div className="brandText">
            <div className="brandTitle">{appTitle}</div>
            <div className="brandSub">SportsCenter-style dynasty coverage</div>
          </div>
        </Link>
      </div>

      <button
        className="hamburger"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? "Close" : "Menu"}
      </button>

      <div className="nav" style={{ display: mobileOpen ? "flex" : undefined }}>
        <NavLink className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")} to="/" onClick={closeAll}>
          Home
        </NavLink>

        <div className="dropdown" ref={dropdownRef}>
          <button className="navBtn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            Teams <span className="chev">▾</span>
          </button>

          {open && (
            <div className="menu" role="menu" aria-label="Teams">
              <div className="menuTop">
                <input
                  className="menuSearch"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search teams…"
                />
                <button className="btn small" onClick={() => setQ("")}>
                  Clear
                </button>
              </div>

              <div className="menuGrid">
                {filtered.length ? (
                  filtered.map((t) => (
                    <Link key={t.slug} className="menuItem" to={`/teams/${t.slug}`} onClick={closeAll}>
                      <span>{t.name}</span>
                      <span className="menuMeta">{t.slug}</span>
                    </Link>
                  ))
                ) : (
                  <div className="menuEmpty">No matches.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <NavLink className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")} to="/podcast" onClick={closeAll}>
          Podcast
        </NavLink>

        <NavLink className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")} to="/social" onClick={closeAll}>
          Social
        </NavLink>
      </div>

      <div className="navRight">
        {/* Keep your existing auth UI */}
        {authSlot ? (
          authSlot
        ) : (
          <div className="authBox">
            {authLoading ? (
              <span className="muted">Loading…</span>
            ) : userEmail ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="pill">
                  Signed in{isCommish ? <span style={{ fontWeight: 950 }}> • COMMISH</span> : null}
                </span>
                <button className="btn" onClick={onSignOut}>
                  Sign out
                </button>
              </div>
            ) : (
              <span className="muted">Not signed in</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
