import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

/**
 * Team Page
 * Fix: load tagged articles via a 2-step query:
 *  1) SELECT article_id FROM article_teams WHERE team_id = <team.id>
 *  2) SELECT * FROM articles WHERE id IN (<article_ids>)
 *
 * This works even if you don't have FK relationships configured for auto-joins.
 */
export default function Team() {
  const { slug } = useParams();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

  const [players, setPlayers] = useState([]);
  const [schedule, setSchedule] = useState([]);

  const teamName = team?.name || "Team";
  const heroLogo = team?.logo_url || "";

  const excerpt = useMemo(() => {
    return (text, max = 160) => {
      if (!text) return "";
      const t = String(text).replace(/\s+/g, " ").trim();
      return t.length > max ? t.slice(0, max).trim() + "…" : t;
    };
  }, []);

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
  }, [slug]);

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
  }, [team?.id]);

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
  }, [team?.id]);

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
  }, [team?.id]);

  if (loading) {
    return (
      <div className="page">
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
      <div className="team-hero">
        {heroLogo ? (
          <img className="team-hero-logo" src={heroLogo} alt={teamName} />
        ) : (
          <div className="muted">No logo set yet</div>
        )}
        <div className="team-hero-title">{teamName}</div>
      </div>

      <div className="grid2">
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
                <div className="storyExcerpt">
                  {excerpt(a.body || a.content || a.excerpt)}
                </div>
                <div className="actions">
                  {a.url ? (
                    <a
                      className="btn small"
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                    >
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
