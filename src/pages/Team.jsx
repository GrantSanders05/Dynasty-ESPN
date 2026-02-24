import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase as defaultSupabase } from "../supabaseClient";

/**
 * Team Page
 * - Shows: hero, key players, schedule, team news (tagged articles)
 * - Restores: commissioner editing (name/logo + one "about" field if present)
 *
 * Notes:
 * - Editing is safe: we only update columns that actually exist on the team row.
 * - Commish detection:
 *    1) isCommish prop (preferred)
 *    2) user + commishEmail props (fallback)
 */
export default function Team({
  supabase = defaultSupabase,
  isCommish = false,
  user = null,
  commishEmail = "",
}) {
  const { slug } = useParams();

  const canEdit = useMemo(() => {
    if (isCommish) return true;
    const e = (user?.email || "").toLowerCase();
    const c = (commishEmail || "").toLowerCase();
    return !!e && !!c && e === c;
  }, [isCommish, user, commishEmail]);

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

  const [players, setPlayers] = useState([]);
  const [schedule, setSchedule] = useState([]);

  // --- Editing ---
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    logo_url: "",
    about: "",
  });

  // Prefer an "about" column if it exists (so we don't guess wrong column names)
  const aboutFieldName = useMemo(() => {
    if (!team) return "";
    const candidates = ["about", "bio", "description", "blurb", "summary"];
    return candidates.find((c) => Object.prototype.hasOwnProperty.call(team, c)) || "";
  }, [team]);

  const teamName = team?.name || "Team";
  const heroLogo = team?.logo_url || "";

  const excerpt = useMemo(() => {
    return (text, max = 160) => {
      if (!text) return "";
      const t = String(text).replace(/\s+/g, " ").trim();
      return t.length > max ? t.slice(0, max).trim() + "…" : t;
    };
  }, []);

  // Load team by slug
  useEffect(() => {
    let alive = true;

    async function loadTeam() {
      setLoading(true);

      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error("Team load error:", error);
        setTeam(null);
        setLoading(false);
        return;
      }

      setTeam(data || null);
      setLoading(false);
    }

    loadTeam();

    return () => {
      alive = false;
    };
  }, [slug, supabase]);

  // When team loads, seed editor draft (but don't overwrite while actively editing)
  useEffect(() => {
    if (!team) return;
    if (editing) return;

    setDraft({
      name: team.name || "",
      logo_url: team.logo_url || "",
      about: aboutFieldName ? (team[aboutFieldName] || "") : "",
    });
  }, [team, aboutFieldName, editing]);

  // Key players (optional table)
  useEffect(() => {
    if (!team?.id) return;
    let alive = true;

    async function loadPlayers() {
      const { data, error } = await supabase
        .from("team_key_players")
        .select("*")
        .eq("team_id", team.id)
        .order("position", { ascending: true });

      if (!alive) return;

      if (error) {
        console.warn("Key players load skipped:", error.message || error);
        setPlayers([]);
        return;
      }

      setPlayers(data || []);
    }

    loadPlayers();

    return () => {
      alive = false;
    };
  }, [team?.id, supabase]);

  // Schedule (optional table)
  useEffect(() => {
    if (!team?.id) return;
    let alive = true;

    async function loadSchedule() {
      const { data, error } = await supabase
        .from("team_schedule")
        .select("*")
        .eq("team_id", team.id)
        .order("week", { ascending: true });

      if (!alive) return;

      if (error) {
        console.warn("Schedule load skipped:", error.message || error);
        setSchedule([]);
        return;
      }

      setSchedule(data || []);
    }

    loadSchedule();

    return () => {
      alive = false;
    };
  }, [team?.id, supabase]);

  // Tagged articles
  useEffect(() => {
    if (!team?.id) return;

    let alive = true;

    async function loadTeamArticles() {
      setArticlesLoading(true);

      const { data: tags, error: tagErr } = await supabase
        .from("article_teams")
        .select("article_id")
        .eq("team_id", team.id);

      if (!alive) return;

      if (tagErr) {
        console.error("article_teams read error:", tagErr);
        setArticles([]);
        setArticlesLoading(false);
        return;
      }

      const ids = (tags || []).map((t) => t.article_id).filter(Boolean);

      if (!ids.length) {
        setArticles([]);
        setArticlesLoading(false);
        return;
      }

      const { data: arts, error: artErr } = await supabase
        .from("articles")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (artErr) {
        console.error("articles read error:", artErr);
        setArticles([]);
        setArticlesLoading(false);
        return;
      }

      setArticles(arts || []);
      setArticlesLoading(false);
    }

    loadTeamArticles();

    return () => {
      alive = false;
    };
  }, [team?.id, supabase]);

  async function saveTeamEdits() {
    if (!canEdit || !team?.id) return;
    if (saving) return;

    const name = (draft.name || "").trim();
    const logo_url = (draft.logo_url || "").trim();
    const about = (draft.about || "").trim();

    if (!name) {
      setSaveError("Team name cannot be empty.");
      return;
    }

    setSaving(true);
    setSaveError("");

    // Only update columns we KNOW exist (prevents "column does not exist" errors)
    const patch = {};
    if (Object.prototype.hasOwnProperty.call(team, "name")) patch.name = name;
    if (Object.prototype.hasOwnProperty.call(team, "logo_url")) patch.logo_url = logo_url;

    if (aboutFieldName) {
      patch[aboutFieldName] = about;
    }

    try {
      const res = await supabase
        .from("teams")
        .update(patch)
        .eq("id", team.id)
        .select("*")
        .single();

      if (res.error) {
        console.error("Team update error:", res.error);
        setSaveError(res.error.message || "Update failed.");
        return;
      }

      setTeam(res.data || team);
      setEditing(false);
    } catch (err) {
      console.error("Team update crash:", err);
      setSaveError("Update crashed. Check console.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page teamPage">
        <div className="card">
          <div className="muted">Loading team…</div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page">
        <div className="card">
          <h2>Team not found</h2>
          <div className="muted">No team exists with slug: {slug}</div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn" to="/">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* HERO */}
      <div className="team-hero">
        {heroLogo ? (
          <img className="team-hero-logo" src={heroLogo} alt={teamName} />
        ) : (
          <div className="muted">No logo set yet</div>
        )}

        <div className="team-hero-title">{teamName}</div>

        {canEdit ? (
          <div style={{ marginLeft: "auto" }}>
            {!editing ? (
              <button className="btn" type="button" onClick={() => setEditing(true)}>
                Edit Team
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn primary"
                  type="button"
                  onClick={saveTeamEdits}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setSaveError("");
                    setDraft({
                      name: team.name || "",
                      logo_url: team.logo_url || "",
                      about: aboutFieldName ? (team[aboutFieldName] || "") : "",
                    });
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* EDIT PANEL */}
      {canEdit && editing ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="cardHeader">
            <h2>Edit Team Page</h2>
            <div className="muted">Update the basics. Changes save to Supabase.</div>
          </div>

          {saveError ? (
            <div className="muted" style={{ color: "crimson", marginBottom: 10 }}>
              {saveError}
            </div>
          ) : null}

          <div className="form">
            <div className="row">
              <input
                className="input"
                placeholder="Team name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                disabled={saving}
              />
            </div>

            <div className="row">
              <input
                className="input"
                placeholder="Logo URL (optional)"
                value={draft.logo_url}
                onChange={(e) => setDraft((d) => ({ ...d, logo_url: e.target.value }))}
                disabled={saving}
              />
            </div>

            {aboutFieldName ? (
              <textarea
                className="textarea"
                rows={5}
                placeholder="About / Team Notes (optional)"
                value={draft.about}
                onChange={(e) => setDraft((d) => ({ ...d, about: e.target.value }))}
                disabled={saving}
              />
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>
                No “about/bio/description” column found on your <code>teams</code> table. If you want
                one, add a column like <code>about</code> and it will show up here automatically.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* BODY */}
      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="cardHeader">
            <h2>Key Players</h2>
          </div>

          {players.length ? (
            <div className="stack">
              {players.map((p) => (
                <div key={p.id} className="kv">
                  <div className="kvKey">{p.position}</div>
                  <div className="kvVal">
                    {p.name} <span className="muted">• OVR {p.overall}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No key players yet.</div>
          )}
        </div>

        <div className="card">
          <div className="cardHeader">
            <h2>Schedule</h2>
          </div>

          {schedule.length ? (
            <ul className="list">
              {schedule.map((g) => (
                <li key={g.id} className="listItem">
                  <div className="headlineRow">
                    <div style={{ fontWeight: 900 }}>
                      Week {g.week}: {g.opponent || "TBD"}
                      {g.opponent_rank ? (
                        <span className="muted"> (#{g.opponent_rank})</span>
                      ) : null}
                    </div>
                    <div className="muted">{g.home_away || ""}</div>
                  </div>
                  {g.note ? <div className="muted">{g.note}</div> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="muted">No schedule yet.</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <h2>Team News</h2>
          {articlesLoading ? <div className="muted">Loading…</div> : null}
        </div>

        {!articlesLoading && !articles.length ? (
          <div className="muted">No tagged articles yet.</div>
        ) : null}

        {articles.length ? (
          <div className="grid" style={{ marginTop: 10 }}>
            {articles.map((a) => (
              <div key={a.id} className="storyCard">
                <div className="storyMeta">
                  <div className="badge">TEAM NEWS</div>
                  {a.created_at ? (
                    <div className="muted">
                      {new Date(a.created_at).toLocaleDateString()}
                    </div>
                  ) : null}
                </div>
                <div className="storyTitle">{a.title || "Untitled"}</div>
                <div className="storyExcerpt">{excerpt(a.body || a.content || a.excerpt)}</div>
                <div className="actions">
                  {a.url ? (
                    <a className="btn small" href={a.url} target="_blank" rel="noreferrer">
                      Read
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
