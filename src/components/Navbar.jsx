import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";

/**
 * Navbar (dcf-style look)
 * - No functional changes
 * - Purely markup/classes for a cleaner ESPN-style header
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
      <div className="topbarInner container">
        <div className="brand">
          <Link to="/" className="brandLink">
            <div className="brandTitle">{appTitle}</div>
            <div className="brandSub">SportsCenter-style dynasty coverage</div>
          </Link>
        </div>

        <nav className="nav">
          <NavLink className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")} to="/">
            Home
          </NavLink>

          <div className="navDropdown" ref={dropdownRef}>
            <button className="navBtn" type="button" onClick={() => setOpen((v) => !v)}>
              Teams ▾
            </button>
            {open && (
              <div className="dropdown">
                {teamLinks.length ? (
                  teamLinks.map((t) => (
                    <Link
                      key={t.slug}
                      to={`/team/${t.slug}`}
                      className="dropdownItem"
                      onClick={() => setOpen(false)}
                    >
                      {t.name}
                    </Link>
                  ))
                ) : (
                  <div className="dropdownEmpty">No teams yet</div>
                )}
              </div>
            )}
          </div>

          <NavLink
            className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")}
            to="/podcast"
          >
            Podcast
          </NavLink>

          <NavLink
            className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")}
            to="/social"
          >
            Social
          </NavLink>
        </nav>

        <div className="auth">
          {authLoading ? <span className="muted">Loading…</span> : null}
          {userEmail ? (
            <div className="authUser">
              <span className="authEmail">{userEmail}</span>
              {isCommish ? <span className="pill">Commissioner</span> : null}
              <button className="btn" type="button" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            authSlot
          )}
        </div>
      </div>
    </header>
  );
}
