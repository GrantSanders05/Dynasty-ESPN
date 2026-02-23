import React, { useEffect, useState } from "react";

/**
 * Home page (Headlines polished)
 * Changes:
 * - Removes the literal word "Priority" from the UI
 * - Headlines render as a clean ESPN-style ticker list (not "cards")
 * - Still supports commissioner posting + deleting
 */

export default function Home({ supabase, isCommish }) {
  const [loading, setLoading] = useState(true);

  const [headlines, setHeadlines] = useState([]);
  const [articles, setArticles] = useState([]);

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
    if (!isCommish) return flashError("Commissioner only.");
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
      const { error } = await supabase.from("articles").insert({
        title: aTitle.trim(),
        body: aBody.trim(),
        week: aWeek ? Number(aWeek) : null,
        author: aAuthor.trim() || null,
        is_published: true,
        is_featured: false,
      });
      if (error) throw error;

      flashNotice("Article posted.");
      setATitle("");
      setAWeek("");
      setAAuthor("");
      setABody("");
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to post article.");
    } finally {
      setSavingArticle(false);
    }
  }

  async function toggleFeatured(id, is_featured) {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      const { error } = await supabase.from("articles").update({ is_featured: !is_featured }).eq("id", id);
      if (error) throw error;
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to update.");
    }
  }

  async function togglePublished(id, is_published) {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      const { error } = await supabase.from("articles").update({ is_published: !is_published }).eq("id", id);
      if (error) throw error;
      await loadAll();
    } catch (e) {
      flashError(e?.message || "Failed to update.");
    }
  }

  async function deleteArticle(id) {
    if (!isCommish) return flashError("Commissioner only.");
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

  return (
    <main className="page">
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

      {/* Headlines (ticker-style) */}
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="cardHeader">
          <h2>Headlines</h2>
          <div className="muted">{loading ? "Loading..." : `${headlines.length} total`}</div>
        </div>

        {isCommish ? (
          <div className="grid2" style={{ marginBottom: 12 }}>
            <div>
              <label className="label">Headline</label>
              <input
                className="input"
                value={hlText}
                onChange={(e) => setHlText(e.target.value)}
                placeholder="Big Week 5 matchup..."
              />
              <label className="label" style={{ marginTop: 10 }}>
                Link (optional)
              </label>
              <input className="input" value={hlLink} onChange={(e) => setHlLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="label">Order (1 = top)</label>
              <input className="input" type="number" value={hlPriority} onChange={(e) => setHlPriority(e.target.value)} />
              <div style={{ marginTop: 10 }}>
                <button className="btn primary" type="button" disabled={savingHeadline} onClick={addHeadline}>
                  {savingHeadline ? "Posting..." : "Post Headline"}
                </button>
              </div>
              <div className="muted" style={{ marginTop: 10 }}>
                Tip: lower numbers appear first.
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="muted">Loading headlines…</div>
        ) : headlines.length === 0 ? (
          <div className="muted">No headlines yet.</div>
        ) : (
          <div
            className="headlineTicker"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              marginTop: 8,
            }}
          >
            {headlines.map((h) => (
              <div
                key={h.id}
                className="headlineRow"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 6px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* small green bullet for SportsCenter vibe */}
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "var(--accent)",
                    display: "inline-block",
                    flex: "0 0 auto",
                  }}
                />
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <div className="headlineText" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {h.link ? (
                      <a href={h.link} target="_blank" rel="noreferrer">
                        {h.text}
                      </a>
                    ) : (
                      h.text
                    )}
                  </div>
                </div>

                {isCommish ? (
                  <button className="btn danger" type="button" onClick={() => deleteHeadline(h.id)}>
                    Delete
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

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
                </div>
              </div>
            </div>

            <div>
              <label className="label">Body (paste your article)</label>
              <textarea
                className="input"
                style={{ minHeight: 140 }}
                value={aBody}
                onChange={(e) => setABody(e.target.value)}
                placeholder="Paste article text here..."
              />
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
