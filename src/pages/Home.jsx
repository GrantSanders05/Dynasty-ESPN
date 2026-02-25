import React, { useEffect, useMemo, useState } from "react";
import ArticleCard from "../components/ArticleCard.jsx";

/**
 * Home page
 * - Uses ONE hero element for headlines: the rolling ticker banner (no stationary headline text)
 * - Priority controls ordering but is NEVER shown
 * - Fixes crash when an undefined article slips into the list
 * - Fixes ArticleCard prop wiring so publish/feature/delete work correctly
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

    // Headlines
    const h = await supabase
      .from("headlines")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
    if (h.error) flashError(`Headlines: ${h.error.message}`);
    setHeadlines((h.data || []).filter(Boolean));

    // Articles
    const a = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (a.error) flashError(`Articles: ${a.error.message}`);

    const all = (a.data || []).filter(Boolean);
    setArticles(isCommish ? all : all.filter((x) => x?.is_published !== false));

    // Teams
    const t = await supabase
      .from("teams")
      .select("id,name,slug")
      .order("name", { ascending: true });
    if (t.error) flashError(`Teams: ${t.error.message}`);
    setTeams((t.data || []).filter(Boolean));

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
      const { error: insErr } = await supabase.from("headlines").insert({
        text: hlText.trim(),
        link: hlLink.trim() || null,
        priority: Number(hlPriority) || 1,
      });
      if (insErr) throw insErr;

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
      const { error: delErr } = await supabase.from("headlines").delete().eq("id", id);
      if (delErr) throw delErr;
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
      const { data: inserted, error: insErr } = await supabase
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

      if (insErr) throw insErr;

      if (selectedTeamIds.length > 0) {
        const rows = selectedTeamIds.map((team_id) => ({
          article_id: inserted.id,
          team_id,
        }));
        const { error: tagErr } = await supabase.from("article_teams").insert(rows);
        if (tagErr) console.warn("article_teams insert:", tagErr.message);
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
      const { error: updErr } = await supabase
        .from("articles")
        .update({ is_featured: !is_featured })
        .eq("id", id);
      if (updErr) throw updErr;
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to update featured status.");
    }
  }

  async function togglePublished(id, is_published) {
    if (!isCommish) return;
    try {
      const { error: updErr } = await supabase
        .from("articles")
        .update({ is_published: !is_published })
        .eq("id", id);
      if (updErr) throw updErr;
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to update publish status.");
    }
  }

  async function deleteArticle(id) {
    if (!isCommish) return;
    if (!confirm("Delete this article?")) return;
    try {
      // Clean up join rows first (safe even if none exist)
      await supabase.from("article_teams").delete().eq("article_id", id);
      const { error: delErr } = await supabase.from("articles").delete().eq("id", id);
      if (delErr) throw delErr;
      flashNotice("Article deleted.");
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to delete article.");
    }
  }

  const tickerItems = useMemo(() => {
    const items = (headlines || []).filter(Boolean).map((h) => ({
      id: h.id,
      text: h.text,
      link: h.link || null,
    }));
    // duplicate for seamless scrolling
    return items.concat(items);
  }, [headlines]);

  const tickerDurationSec = useMemo(() => {
    const base = 18;
    const extra = Math.min(34, Math.floor((headlines?.length || 0) * 2));
    return base + extra;
  }, [headlines]);

  const safeArticles = useMemo(() => (articles || []).filter(Boolean), [articles]);

  return (
    <div className="page">
      {(notice || error) ? (
        <div className="toastWrap">
          {notice ? <div className="toast ok">{notice}</div> : null}
          {error ? <div className="toast err">{error}</div> : null}
        </div>
      ) : null}

      {/* Rolling headlines hero */}
      <div className="heroTicker">
        <div className="tickerLabel">Breaking</div>
        <div
          className="tickerTrack"
          style={{ animationDuration: `${tickerDurationSec}s` }}
        >
          {tickerItems.length ? (
            tickerItems.map((h, idx) => (
              <span key={`${h.id}-${idx}`} className="tickerItem">
                {h.link ? (
                  <a href={h.link} target="_blank" rel="noreferrer">
                    {h.text}
                  </a>
                ) : (
                  h.text
                )}
                <span className="tickerDot">•</span>
              </span>
            ))
          ) : (
            <span className="tickerItem">
              No headlines yet <span className="tickerDot">•</span>
            </span>
          )}
        </div>
        <div className="tickerBrand">Dynasty Network</div>
      </div>

      <div className="container">
        {loading ? (
          <div className="muted" style={{ marginTop: 12 }}>
            Loading…
          </div>
        ) : (
          <div className="grid2">
            <div>
              <h2>Articles</h2>
              {safeArticles.length ? (
                <div className="stack">
                  {safeArticles.map((a) => (
                    <ArticleCard
                      key={a.id}
                      a={a}
                      isCommish={isCommish}
                      onFeature={toggleFeatured}
                      onPublishToggle={togglePublished}
                      onDelete={deleteArticle}
                    />
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 10 }}>
                  No articles yet.
                </div>
              )}
            </div>

            <div>
              <h2>Commissioner Tools</h2>

              {!isCommish ? (
                <div className="muted">Commissioner only.</div>
              ) : (
                <>
                  <div className="card" style={{ marginTop: 10 }}>
                    <div className="cardTitle">Post Headline</div>
                    <div className="stack" style={{ marginTop: 10 }}>
                      <input
                        className="input"
                        value={hlText}
                        onChange={(e) => setHlText(e.target.value)}
                        placeholder="Headline text"
                      />
                      <input
                        className="input"
                        value={hlLink}
                        onChange={(e) => setHlLink(e.target.value)}
                        placeholder="Optional link (https://…)"
                      />
                      <input
                        className="input"
                        value={hlPriority}
                        onChange={(e) => setHlPriority(e.target.value)}
                        placeholder="Priority (1 = top)"
                      />
                      <button
                        className="btn primary"
                        onClick={addHeadline}
                        disabled={savingHeadline}
                        type="button"
                      >
                        {savingHeadline ? "Saving…" : "Post"}
                      </button>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: 12 }}>
                    <div className="cardTitle">Post Article</div>
                    <div className="stack" style={{ marginTop: 10 }}>
                      <input
                        className="input"
                        value={aTitle}
                        onChange={(e) => setATitle(e.target.value)}
                        placeholder="Title"
                      />
                      <div className="row">
                        <input
                          className="input"
                          value={aWeek}
                          onChange={(e) => setAWeek(e.target.value)}
                          placeholder="Week (optional)"
                        />
                        <input
                          className="input"
                          value={aAuthor}
                          onChange={(e) => setAAuthor(e.target.value)}
                          placeholder="Author (optional)"
                        />
                      </div>

                      <textarea
                        className="input"
                        value={aBody}
                        onChange={(e) => setABody(e.target.value)}
                        placeholder="Write the article…"
                        rows={10}
                      />

                      <div className="row">
                        <select
                          className="input"
                          value=""
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) return;
                            const id = Number(v);
                            setSelectedTeamIds((prev) =>
                              prev.includes(id) ? prev : prev.concat(id)
                            );
                          }}
                        >
                          <option value="">Tag team (optional)…</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>

                        <button
                          className="btn"
                          onClick={() => setSelectedTeamIds([])}
                          type="button"
                        >
                          Clear tags
                        </button>
                      </div>

                      {selectedTeamIds.length ? (
                        <div className="muted" style={{ marginTop: 6 }}>
                          Tagged: {selectedTeamIds.length} team(s)
                        </div>
                      ) : null}

                      <button
                        className="btn primary block"
                        onClick={addArticle}
                        disabled={savingArticle}
                        type="button"
                      >
                        {savingArticle ? "Saving…" : "Post Article"}
                      </button>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: 12 }}>
                    <div
                      style={{
                        fontFamily: "Oswald, Inter, system-ui, sans-serif",
                        fontWeight: 700,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Manage Headlines
                    </div>

                    <div className="list" style={{ marginTop: 10 }}>
                      {headlines.length ? (
                        headlines.filter(Boolean).map((h) => (
                          <div key={h.id} className="listItem" style={{ padding: 10 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                alignItems: "center",
                              }}
                            >
                              <div style={{ fontWeight: 900 }}>{h.text}</div>
                              <button
                                className="btn danger small"
                                onClick={() => deleteHeadline(h.id)}
                                type="button"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="listItem muted">No headlines yet.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
