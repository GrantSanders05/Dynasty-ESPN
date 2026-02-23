import React, { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";

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
  const teamLinks = useMemo(() => (teams || []).map((t) => ({ name: t.name, slug: t.slug })), [teams]);

  return (
    <header className="topbar">
      <div className="brand">
        <Link to="/" className="brandLink">
          <div className="brandMark" aria-hidden />
          <div className="brandText">
            <div className="brandTitle">{appTitle}</div>
            <div className="brandSub">SportsCenter-style dynasty coverage</div>
          </div>
        </Link>
      </div>

      <nav className="nav">
        <NavLink className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")} to="/">
          Home
        </NavLink>

        <div className="dropdown" onMouseLeave={() => setOpen(false)}>
          <button className="navBtn" type="button" onClick={() => setOpen((v) => !v)}>
            Teams <span className="chev">▾</span>
          </button>

          {open && (
            <div className="menu" role="menu">
              {teamLinks.length ? (
                teamLinks.map((t) => (
                  <Link key={t.slug} to={`/teams/${t.slug}`} className="menuItem" onClick={() => setOpen(false)}>
                    {t.name}
                  </Link>
                ))
              ) : (
                <div className="menuItem muted">No teams yet</div>
              )}
            </div>
          )}
        </div>

        <NavLink className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")} to="/podcast">
          Podcast
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")} to="/social">
          Social
        </NavLink>
      </nav>

      <div className="authBox">
        {authLoading ? (
          <div className="pill">Loading…</div>
        ) : authSlot ? (
          authSlot
        ) : userEmail ? (
          <div className="authSignedIn">
            <div className="pill">
              {userEmail} {isCommish ? <strong>• Commissioner</strong> : null}
            </div>
            <button className="btn" onClick={onSignOut} type="button">
              Sign out
            </button>
          </div>
        ) : (
          <div className="pill">Not signed in</div>
        )}
      </div>
    </header>
  );
}
