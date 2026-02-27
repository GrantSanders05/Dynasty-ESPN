import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

export default function Navbar({
  appTitle,
  teams = [],
  userEmail,
  isCommish,
  onSignOut,
  authSlot,
  authLoading,
}) {
  const [teamsOpen,    setTeamsOpen]    = useState(false);
  const [rankingsOpen, setRankingsOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [q, setQ] = useState("");
  const dropdownRef  = useRef(null);
  const rankingsRef  = useRef(null);

  const teamLinks = useMemo(
    () => (teams || []).map((t) => ({ name: t.name, slug: t.slug })),
    [teams]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return teamLinks;
    return teamLinks.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.slug.toLowerCase().includes(s)
    );
  }, [q, teamLinks]);

  /* Close dropdowns on outside click/touch */
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setTeamsOpen(false);
      if (rankingsRef.current && !rankingsRef.current.contains(e.target))
        setRankingsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  function closeAll() {
    setTeamsOpen(false);
    setRankingsOpen(false);
    setMobileOpen(false);
    setQ("");
  }

  return (
    <div className="topbar">

      {/* ── Brand ── */}
      <div className="brand">
        <Link className="brandLink" to="/" onClick={closeAll}>
          <div className="brandMark" />
          <div className="brandText">
            <div className="brandTitle">{appTitle}</div>
            <div className="brandSub">Dynasty Coverage</div>
          </div>
        </Link>
      </div>

      {/* ── Nav links (hidden on mobile until hamburger pressed) ── */}
      <nav
        className="nav"
        style={{ display: mobileOpen ? "flex" : undefined }}
      >
        <NavLink
          className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")}
          to="/"
          onClick={closeAll}
        >
          Home
        </NavLink>

        {/* Teams dropdown */}
        <div className="dropdown" ref={dropdownRef}>
          <button
            className={teamsOpen ? "navBtn active" : "navBtn"}
            onClick={() => setTeamsOpen((v) => !v)}
            aria-expanded={teamsOpen}
            type="button"
          >
            Teams ▾
          </button>

          {teamsOpen && (
            <div className="menu" role="menu" aria-label="Teams">
              <div className="menuTop">
                <input
                  className="menuSearch"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search teams…"
                />
                <button
                  className="btn small"
                  type="button"
                  onClick={() => setQ("")}
                >
                  Clear
                </button>
              </div>

              <div className="menuGrid">
                {filtered.length ? (
                  filtered.map((t) => (
                    <Link
                      key={t.slug}
                      className="menuItem"
                      to={`/team/${t.slug}`}
                      onClick={closeAll}
                    >
                      {/* menuItemName wraps; menuMeta stays on one line */}
                      <span className="menuItemName">{t.name}</span>
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

        <NavLink
          className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")}
          to="/podcast"
          onClick={closeAll}
        >
          Podcast
        </NavLink>

        {/* Rankings dropdown */}
        <div className="dropdown" ref={rankingsRef}>
          <button
            className={rankingsOpen ? "navBtn active" : "navBtn"}
            onClick={() => setRankingsOpen((v) => !v)}
            aria-expanded={rankingsOpen}
            type="button"
          >
            Rankings ▾
          </button>

          {rankingsOpen && (
            <div className="menu rankingsMenu" role="menu" aria-label="Rankings">
              <div className="menuGrid">
                <Link
                  className="menuItem"
                  to="/rankings/top25"
                  onClick={closeAll}
                >
                  <span className="menuItemName">Top 25 Rankings</span>
                  <span className="menuMeta">National</span>
                </Link>
                <Link
                  className="menuItem"
                  to="/rankings/big10"
                  onClick={closeAll}
                >
                  <span className="menuItemName">Big 10 Rankings</span>
                  <span className="menuMeta">Conference</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        <NavLink
          className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")}
          to="/social"
          onClick={closeAll}
        >
          Social
        </NavLink>
      </nav>

      {/* ── Auth area ── */}
      <div className="navRight">
        {authSlot ? (
          authSlot
        ) : (
          <div className="authBox">
            {authLoading ? (
              <span className="muted" style={{ fontSize: 12 }}>Loading…</span>
            ) : userEmail ? (
              <>
                <span className="pill">
                  {isCommish ? "Commish" : "Signed in"}
                </span>
                <button className="btn small" onClick={onSignOut} type="button">
                  Sign out
                </button>
              </>
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>Not signed in</span>
            )}
          </div>
        )}
      </div>

      {/* ── Hamburger (mobile only) ── */}
      <button
        className="hamburger"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
        type="button"
      >
        {mobileOpen ? "✕ Close" : "☰ Menu"}
      </button>

    </div>
  );
}
