import React, { useEffect, useMemo, useState } from "react";

/**
 * Home page (Headlines scrolling ticker)
 * - Displays headlines in a horizontal scrolling ticker at the top (SportsCenter vibe)
 * - NO priority number shown anywhere after publish
 * - Commissioner can still post headlines (order/priority still controls sorting, just not shown)
 * - Articles section unchanged
 */

export default function Home({ supabase, isCommish }) {
  const [loading, setLoading] = useState(true);

  const [headlines, setHeadlines] = useState([]);
  const \[articles, setArticles\] = useState\(\[\]\);

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
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [aBody, setABody] = useState("");
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

    const a = await supabase.from("articles").select("*").order("created_at", { ascending: false });

    if (a.error) flashError(`Articles: ${a.error.message}`);
    setArticles(a.data || []);


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


      // Link article to selected teams (many-to-many)
      if (selectedTeamIds.length > 0) {
        const rows = selectedTeamIds.map((team_id) => ({ article_id: inserted.id, team_id }));
        const { error: tagErr } = await supabase.from("article_teams").insert(rows);
        if (tagErr) throw tagErr;
      }

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
    // Build ticker strings, no priority displayed
    const items = (headlines || []).map((h) => ({
      id: h.id,
      text: h.text,
      link: h.link || null,
    }));
    // Duplicate items to make seamless loop if there are few headlines
    if (items.length <= 4) return items.concat(items);
    return items.concat(items); // smoother loop
  }, [headlines]);

  // Speed scales with content length, but keep it simple + stable
  const tickerDurationSec = useMemo(() => {
    const base = 18; // seconds
    const extra = Math.min(30, Math.floor((headlines?.length || 0) * 2));
    return base + extra;
  }, [headlines]);

  return (
    <main className="page">
      {/* Ticker Styles (local to this component) */}
      <style>{`
        .tickerWrap{
          border-radius:16px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,0.10);
          box-shadow:0 10px 30px rgba(0,0,0,0.25);
          margin-bottom:14px;
          background: linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0.25));
        }
        .tickerTop{
          display:flex;
          align-items:center;
          gap:12px;
          padding:10px 12px;
          border-bottom:1px solid rgba(255,255,255,0.10);
          background: linear-gradient(90deg, rgba(0,0,0,0.80), rgba(0,0,0,0.35));
        }
        .tickerLabel{
          display:inline-flex;
          align-items:center;
          gap:8px;
          font-weight:900;
          letter-spacing:0.6px;
          text-transform:uppercase;
          white-space:nowrap;
        }
        .tickerDot{
          width:10px;height:10px;border-radius:999px;
          background: var(--accent);
          display:inline-block;
        }
        .tickerRail{
          position:relative;
          overflow:hidden;
          white-space:nowrap;
        }
        .tickerFadeLeft, .tickerFadeRight{
          position:absolute; top:0; bottom:0; width:48px; z-index:2;
          pointer-events:none;
        }
        .tickerFadeLeft{
          left:0;
          background: linear-gradient(90deg, rgba(0,0,0,0.85), rgba(0,0,0,0));
        }
        .tickerFadeRight{
          right:0;
          background: linear-gradient(270deg, rgba(0,0,0,0.55), rgba(0,0,0,0));
        }
        .tickerTrack{
          display:inline-flex;
          align-items:center;
          gap:18px;
          padding:12px 12px;
          will-change: transform;
          animation: tickerMove var(--tickerDur) linear infinite;
        }
        @keyframes tickerMove{
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .tickerItem{
          display:inline-flex;
          align-items:center;
          gap:10px;
          font-weight:800;
          font-size:14px;
          line-height:1;
          white-space:nowrap;
        }
        .tickerSep{
          width:6px;height:6px;border-radius:999px;
          background: rgba(255,255,255,0.20);
          display:inline-block;
        }
        .tickerLink a{
          text-decoration:none;
        }
        .tickerLink a:hover{
          text-decoration:underline;
        }
      `}</style>

      {/* Headlines ticker (outside cards) */}
      <section className="tickerWrap">
        <div className="tickerTop">
          <div className="tickerLabel">
            <span className="tickerDot" aria-hidden />
            Top Headlines
          </div>
          <div className="muted" style={{ marginLeft: "auto" }}>
            {loading ? "Loading…" : `${headlines.length}`}
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: 12 }}>
            Loading headlines…
          </div>
        ) : headlines.length === 0 ? (
          <div className="muted" style={{ padding: 12 }}>
            No headlines yet.
          </div>
        ) : (
          <div className="tickerRail" style={{ ["--tickerDur"]: `${tickerDurationSec}s` }}>
            <div className="tickerFadeLeft" />
            <div className="tickerFadeRight" />
            {/* Track duplicated content for seamless loop */}
            <div className="tickerTrack" aria-label="Scrolling headlines">
              {tickerItems.map((h, i) => (
                <div className="tickerItem" key={`${h.id}-${i}`}>
                  <span className="tickerSep" aria-hidden />
                  <span className="tickerLink">
                    {h.link ? (
                      <a href={h.link} target="_blank" rel="noreferrer">
                        {h.text}
                      </a>
                    ) : (
                      h.text
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="pageHeader">
        <h1>Home</h1>
        <div className="muted">Headlines, stories, and weekly coverage.</div>
      </div>

      {(notice || error) && (
        <div className="stack" style={{ marginBottom: 12 }}>
          {notice ? <div className="banner ok">{notice}</div> : null}
          {error ? <div className="banner err">{error}</div> : null}
        </div>
      )}

      {/* Commissioner: post headline (safe card) */}
      {isCommish ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="cardHeader">
            <h2>Post a Headline</h2>
            <div className="muted">These appear in the top ticker.</div>
          </div>

          <div className="grid2">
            <div>
              <label className="label">Headline</label>
              <input className="input" value={hlText} onChange={(e) => setHlText(e.target.value)} placeholder="Big Week 5 matchup..." />
              <label className="label" style={{ marginTop: 10 }}>Link (optional)</label>
              <input className="input" value={hlLink} onChange={(e) => setHlLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="label">Order (1 = first)</label>
              <input className="input" type="number" value={hlPriority} onChange={(e) => setHlPriority(e.target.value)} />
              <div style={{ marginTop: 10 }}>
                <button className="btn primary" type="button" disabled={savingHeadline} onClick={addHeadline}>
                  {savingHeadline ? "Posting..." : "Post Headline"}
                </button>
              </div>
              <div className="muted" style={{ marginTop: 10 }}>
                This order controls the ticker (it won’t be displayed).
              </div>
            </div>
          </div>

          {headlines.length > 0 ? (
            <div className="muted" style={{ marginTop: 10 }}>
              Tip: if you want to delete a headline, use the list below.
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Optional small list for commish to delete quickly (kept minimal) */}
      {isCommish && headlines.length > 0 ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="cardHeader">
            <h2>Manage Headlines</h2>
            <div className="muted">Delete or clean up old headlines.</div>
          </div>
          <div className="list">
            {headlines.map((h) => (
              <div className="listItem" key={h.id}>
                <div className="listMain">
                  <div className="listTitle">{h.text}</div>
                </div>
                <div className="listActions">
                  <button className="btn danger" type="button" onClick={() => deleteHeadline(h.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Articles */}
      <section className="card">
        <div className="cardHeader">
          <h2>Articles</h2>
          <div className="muted">{loading ? "Loading..." : `${articles.length} total`}</div>
        </div>

        {isCommish ? (
          <div className="grid2" style={{ marginBottom: 12 }}>
            <div>
              <label className="label">Title</label>
              <input className="input" value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Week 5 Power Rankings" />

              <div className="grid2" style={{ marginTop: 10 }}>
                <div>
                  <label className="label">Week (optional)</label>
                  <input className="input" type="number" value={aWeek} onChange={(e) => setAWeek(e.target.value)} placeholder="5" />
                </div>
                <div>
                  <label className="label">Author (optional)</label>
                  <input className="input" value={aAuthor} onChange={(e) => setAAuthor(e.target.value)} placeholder="Commissioner" />
                

              <div style={{ marginTop: 10 }}>
                <label className="label">Tag Teams (optional)</label>
                <div className="grid2" style={{ marginTop: 6 }}>
                  {teams.length === 0 ? (
                    <div className="muted">No teams loaded.</div>
                  ) : (
                    teams.map((t) => (
                      <label key={t.id} className="check" style={{ justifyContent: "flex-start" }}>
                        <input
                          type="checkbox"
                          checked={selectedTeamIds.includes(t.id)}
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
                    ))
                  )}
                </div>
              </div>
</div>
              </div>
            </div>

            <div>
              <label className="label">Body (paste your article)</label>
              <textarea className="input" style={{ minHeight: 140 }} value={aBody} onChange={(e) => setABody(e.target.value)} placeholder="Paste article text here..." />
              <div style={{ marginTop: 10 }}>
                <button className="btn primary" type="button" disabled={savingArticle} onClick={addArticle}>
                  {savingArticle ? "Posting..." : "Post Article"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="muted">Loading articles…</div>
        ) : articles.length === 0 ? (
          <div className="muted">No articles yet.</div>
        ) : (
          <div className="list">
            {articles.map((a) => (
              <div className="listItem" key={a.id}>
                <div className="listMain">
                  <div className="listTitle">{a.title}</div>
                  <div className="muted">
                    {a.week ? `Week ${a.week}` : "No week"} • {a.author || "No author"}
                    {a.is_featured ? " • Featured" : ""}
                    {!a.is_published ? " • Unpublished" : ""}
                  </div>
                  <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                    {a.body}
                  </div>
                </div>

                {isCommish ? (
                  <div className="listActions">
                    <button className="btn" type="button" onClick={() => toggleFeatured(a.id, a.is_featured)}>
                      Feature
                    </button>
                    <button className="btn" type="button" onClick={() => togglePublished(a.id, a.is_published)}>
                      {a.is_published ? "Unpublish" : "Publish"}
                    </button>
                    <button className="btn danger" type="button" onClick={() => deleteArticle(a.id)}>
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
