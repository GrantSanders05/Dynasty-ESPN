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
    return teamLinks.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.slug || "").toLowerCase().includes(s)
    );
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

  function closeAll() {
    setOpen(false);
    setMobileOpen(false);
  }

  return (
    <div className="nav">
      <div className="navInner">
        <Link to="/" className="brand" onClick={closeAll}>
          <div className="brandTitle">{appTitle}</div>
          <div className="brandSub">SportsCenter-style dynasty coverage</div>
        </Link>

        <button
          className="mobileToggle"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>

        <div className={`navLinks ${mobileOpen ? "open" : ""}`}>
          <NavLink
            className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")}
            to="/"
            onClick={closeAll}
          >
            Home
          </NavLink>

          <div className="dropdown" ref={dropdownRef}>
            <button
              className="navBtn"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              Teams ▾
            </button>

            {open && (
              <div className="menu">
                <div className="menuTop">
                  <input
                    className="menuSearch"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search teams…"
                  />
                  <button className="menuClear" onClick={() => setQ("")}>
                    Clear
                  </button>
                </div>

                <div className="menuList">
                  {filtered.length ? (
                    filtered.map((t) => (
                      <Link
                        key={t.slug}
                        className="menuItem"
                        to={`/team/${t.slug}`}
                        onClick={closeAll}
                      >
                        <span className="teamName">{t.name}</span>
                        <span className="teamSlug">{t.slug}</span>
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

          <NavLink
            className={({ isActive }) => (isActive ? "navBtn active" : "navBtn")}
            to="/social"
            onClick={closeAll}
          >
            Social
          </NavLink>

          {authSlot ? (
            authSlot
          ) : (
            <div className="authBox">
              {authLoading ? (
                <span className="muted">Loading…</span>
              ) : userEmail ? (
                <div className="row">
                  <span className="muted">
                    Signed in{isCommish ? " • COMMISH" : ""}
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
    </div>
  );
}
