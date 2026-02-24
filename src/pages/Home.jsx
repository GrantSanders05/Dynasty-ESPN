import React, { useEffect, useMemo, useState } from "react";
import ArticleCard from "../components/ArticleCard.jsx";

/**
 * Home page
 * - Headline ticker at top (SportsCenter vibe)
 * - Priority controls sort but is NEVER shown to users
 * - Commissioner can:
 *   - post headlines
 *   - post articles
 *   - toggle featured/published
 *   - delete
 *   - (optional) tag articles to teams via article_teams join table
 */

export default function Home({ supabase, isCommish }) {
  const [loading, setLoading] = useState(true);
  const [headlines, setHeadlines] = useState([]);
  const [articles, setArticles] = useState([]);
  const [teams, setTeams] = useState([]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Headline form
  const [hlText, setHlText] = useState("");
  const [hlLink, setHlLink] = useState("");
  const [hlPriority, setHlPriority] = useState(1);
  const [savingHeadline, setSavingHeadline] = useState(false);

  // Article form
  const [aTitle, setATitle] = useState("");
  const [aWeek, setAWeek] = useState("");
  const [aAuthor, setAAuthor] = useState("");
  const [aBody, setABody] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [savingArticle, setSavingArticle] = useState(false);

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

  async function loadAll() {
    setLoading(true);

    const h = await supabase
      .from("headlines")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (h.error) flashError(`Headlines: ${h.error.message}`);
    setHeadlines(h.data || []);

    const a = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (a.error) flashError(`Articles: ${a.error.message}`);
    // Non-commish should only see published
    const all = a.data || [];
    setArticles(isCommish ? all : all.filter((x) => x.is_published !== false));

    const t = await supabase
      .from("teams")
      .select("id,name,slug")
      .order("name", { ascending: true });

    if (t.error) flashError(`Teams: ${t.error.message}`);
    setTeams(t.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addHeadline() {
    if (!isCommish) return flashError("Commissioner only.");
    if (!hlText.trim()) return flashError("Headline text is required.");

    setSavingHeadline(true);
    try {
      const { error } = await supabase.from("headlines").insert({
        text: hlText.trim(),
        link: hlLink.trim() || null,
        priority: Number(hlPriority) || 1,
      });
      if (error) throw error;

      flashNotice("Headline posted.");
      setHlText("");
      setHlLink("");
      setHlPriority(1);
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to post headline.");
    } finally {
      setSavingHeadline(false);
    }
  }

  async function deleteHeadline(id) {
    if (!isCommish) return;
    if (!confirm("Delete this headline?")) return;

    try {
      const { error } = await supabase.from("headlines").delete().eq("id", id);
      if (error) throw error;
      flashNotice("Headline deleted.");
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to delete headline.");
    }
  }

  async function addArticle() {
    if (!isCommish) return flashError("Commissioner only.");
    if (!aTitle.trim()) return flashError("Article title is required.");
    if (!aBody.trim()) return flashError("Article body is required.");

    setSavingArticle(true);
    try {
      const { data: inserted, error } = await supabase
        .from("articles")
        .insert({
          title: aTitle.trim(),
          body: aBody.trim(),
          week: aWeek ? Number(aWeek) : null,
          author: aAuthor.trim() || null,
          is_published: true,
          is_featured: false,
        })
        .select("*")
        .single();

      if (error) throw error;

      // Optional tagging (if you have article_teams join table)
      if (selectedTeamIds.length > 0) {
        const rows = selectedTeamIds.map((team_id) => ({
          article_id: inserted.id,
          team_id,
        }));

        const { error: tagErr } = await supabase.from("article_teams").insert(rows);
        if (tagErr) {
          // Don’t fail the whole post if tagging table isn’t there
          console.warn("article_teams insert:", tagErr.message);
        }
      }

      flashNotice("Article posted.");
      setATitle("");
      setAWeek("");
      setAAuthor("");
      setABody("");
      setSelectedTeamIds([]);
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to post article.");
    } finally {
      setSavingArticle(false);
    }
  }

  async function toggleFeatured(id, is_featured) {
    if (!isCommish) return;
    try {
      const { error } = await supabase.from("articles").update({ is_featured: !is_featured }).eq("id", id);
      if (error) throw error;
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to update.");
    }
  }

  async function togglePublished(id, is_published) {
    if (!isCommish) return;
    try {
      const { error } = await supabase.from("articles").update({ is_published: !is_published }).eq("id", id);
      if (error) throw error;
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to update.");
    }
  }

  async function deleteArticle(id) {
    if (!isCommish) return;
    if (!confirm("Delete this article?")) return;

    try {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
      flashNotice("Article deleted.");
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to delete article.");
    }
  }

  const tickerItems = useMemo(() => {
    const items = (headlines || []).map((h) => ({ id: h.id, text: h.text, link: h.link || null }));
    if (items.length <= 4) return items.concat(items);
    return items.concat(items);
  }, [headlines]);

  const tickerDurationSec = useMemo(() => {
    const base = 18;
    const extra = Math.min(30, Math.floor((headlines?.length || 0) * 2));
    return base + extra;
  }, [headlines]);

  return (
    <div>
      <div className="ticker">
        <div className="tickerLabel">TOP HEADLINES</div>
        <div className="tickerText" style={{ overflow: "hidden" }}>
          <div
            style={{
              display: "inline-flex",
              gap: 18,
              whiteSpace: "nowrap",
              animation: `tickerScroll ${tickerDurationSec}s linear infinite`,
            }}
          >
            {tickerItems.map((h, i) => (
              <span key={`${h.id}-${i}`}>
                {h.link ? (
                  <a className="link" href={h.link} target="_blank" rel="noreferrer">
                    {h.text}
                  </a>
                ) : (
                  h.text
                )}
                <span className="muted" style={{ margin: "0 10px" }}>
                  •
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div className="pageHeader">
        <div>
          <h1 style={{ margin: 0 }}>Home</h1>
          <div className="muted">Headlines, stories, and weekly coverage.</div>
        </div>
      </div>

      {(notice || error) ? (
        <div style={{ marginBottom: 12 }}>
          {notice ? <div className="banner notice">{notice}</div> : null}
          {error ? <div className="banner error">{error}</div> : null}
        </div>
      ) : null}

      {isCommish ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="cardHeader">
            <h2>Post a Headline</h2>
          </div>
          <div className="form">
            <input className="input" value={hlText} onChange={(e) => setHlText(e.target.value)} placeholder="Big Week 5 matchup..." />
            <div className="row">
              <input className="input" value={hlLink} onChange={(e) => setHlLink(e.target.value)} placeholder="Link (optional)" />
              <input className="input" value={hlPriority} onChange={(e) => setHlPriority(e.target.value)} placeholder="Order (1 = first)" type="number" min="1" />
            </div>
            <button className="btn primary" type="button" onClick={addHeadline} disabled={savingHeadline}>
              {savingHeadline ? "Posting..." : "Post Headline"}
            </button>
            <div className="muted" style={{ fontSize: 12 }}>
              Priority controls ticker order (it won’t be displayed).
            </div>
          </div>

          {headlines.length ? (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12, marginBottom: 8 }}>
                Manage Headlines
              </div>
              <div className="list">
                {headlines.map((h) => (
                  <div className="listItem" key={h.id}>
                    <div className="headlineRow">
                      <div style={{ fontWeight: 900 }}>{h.text}</div>
                      <button className="btn danger small" type="button" onClick={() => deleteHeadline(h.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <div className="cardHeader">
          <h2>Articles</h2>
          <div className="muted">{loading ? "Loading..." : `${articles.length} total`}</div>
        </div>

        {isCommish ? (
          <div className="card" style={{ marginBottom: 12, marginTop: 10 }}>
            <div className="cardHeader">
              <h2>Post an Article</h2>
            </div>

            <div className="form">
              <input className="input" value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Title" />
              <div className="row">
                <input className="input" value={aWeek} onChange={(e) => setAWeek(e.target.value)} placeholder="Week (optional)" />
                <input className="input" value={aAuthor} onChange={(e) => setAAuthor(e.target.value)} placeholder="Author (optional)" />
              </div>

              <div className="kv">
                <div className="kvKey">Tag Teams (optional)</div>
                {teams.length === 0 ? (
                  <div className="muted">No teams loaded.</div>
                ) : (
                  <div className="grid" style={{ marginTop: 8 }}>
                    {teams.map((t) => {
                      const checked = selectedTeamIds.includes(t.id);
                      return (
                        <label key={t.id} className="check">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeamIds((prev) => Array.from(new Set([...prev, t.id])));
                              } else {
                                setSelectedTeamIds((prev) => prev.filter((x) => x !== t.id));
                              }
                            }}
                          />
                          {t.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <textarea className="textarea" rows={6} value={aBody} onChange={(e) => setABody(e.target.value)} placeholder="Article body..." />

              <button className="btn primary" type="button" onClick={addArticle} disabled={savingArticle}>
                {savingArticle ? "Posting..." : "Post Article"}
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="muted">Loading articles…</div>
        ) : articles.length === 0 ? (
          <div className="muted">No articles yet.</div>
        ) : (
          <div className="list" style={{ marginTop: 10 }}>
            {articles.map((a) => (
              <ArticleCard
                key={a.id}
                a={a}
                isCommish={isCommish}
                onFeature={(id, is_featured) => toggleFeatured(id, is_featured)}
                onPublishToggle={(id, is_published) => togglePublished(id, is_published)}
                onDelete={(id) => deleteArticle(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
