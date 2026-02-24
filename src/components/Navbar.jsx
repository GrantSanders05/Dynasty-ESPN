import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const dropdownRef = useRef(null);

  const teamLinks = useMemo(
    () => (teams || []).map((t) => ({ name: t.name, slug: t.slug })),
    [teams]
  );

  useEffect(() => {
    function onDocPointerDown(e) {
      if (!open) return;
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
  }, [open]);

  return (
    <header className="topbar">
      <div className="brand">
        <Link className="brandLink" to="/">
          <div className="brandMark" />
          <div>
            <div className="brandTitle">{appTitle}</div>
            <div className="brandSub">SportsCenter-style dynasty coverage</div>
          </div>
        </Link>
      </div>

      <nav className="nav">
        <NavLink className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")} to="/">
          Home
        </NavLink>

        <div className="dropdown" ref={dropdownRef}>
          <button className="navBtn" type="button" onClick={() => setOpen((v) => !v)}>
            Teams <span className="chev">▾</span>
          </button>

          {open && (
            <div className="menu">
              {teamLinks.length ? (
                teamLinks.map((t) => (
                  <Link key={t.slug} className="menuItem" to={`/team/${t.slug}`} onClick={() => setOpen(false)}>
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
        {authLoading ? <span className="pill warn">Loading…</span> : null}

        {userEmail ? (
          <div className="authSignedIn">
            <span className="pill">
              {userEmail} {isCommish ? <strong>• Commissioner</strong> : null}
            </span>
            <button className="btn danger small" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          authSlot
        )}
      </div>
    </header>
  );
}
