import React, { useEffect, useMemo, useState } from "react";

export default function Home({ supabase, isCommish }) {
  const [loading, setLoading] = useState(true);
  const [headlines, setHeadlines] = useState([]);
  const [articles, setArticles] = useState([]);

  const [hlText, setHlText] = useState("");
  const [hlLink, setHlLink] = useState("");
  const [hlPriority, setHlPriority] = useState(1);
  const [savingHeadline, setSavingHeadline] = useState(false);

  const [aTitle, setATitle] = useState("");
  const [aWeek, setAWeek] = useState("");
  const [aAuthor, setAAuthor] = useState("");
  const [aBody, setABody] = useState("");
  const [savingArticle, setSavingArticle] = useState(false);

  async function loadAll() {
    setLoading(true);

    const h = await supabase
      .from("headlines")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    setHeadlines(h.data || []);

    const a = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    setArticles((a.data || []).filter((x) => x.is_published !== false));

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addHeadline() {
    if (!isCommish) return;
    if (!hlText.trim()) return;

    setSavingHeadline(true);
    try {
      const { error } = await supabase.from("headlines").insert({
        text: hlText.trim(),
        link: hlLink.trim() || null,
        priority: Number(hlPriority) || 1,
      });
      if (error) throw error;
      setHlText("");
      setHlLink("");
      setHlPriority(1);
      await loadAll();
    } finally {
      setSavingHeadline(false);
    }
  }

  async function addArticle() {
    if (!isCommish) return;
    if (!aTitle.trim() || !aBody.trim()) return;

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

      setATitle("");
      setAWeek("");
      setAAuthor("");
      setABody("");
      await loadAll();
    } finally {
      setSavingArticle(false);
    }
  }

  const tickerItems = useMemo(() => {
    const items = (headlines || []).map((h) => ({
      id: h.id,
      text: h.text,
      link: h.link || null,
    }));
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

      {isCommish ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="cardHeader">
            <h2>Post a Headline</h2>
          </div>
          <div className="form">
            <input className="input" value={hlText} onChange={(e) => setHlText(e.target.value)} placeholder="Big Week 5 matchup..." />
            <div className="row">
              <input className="input" value={hlLink} onChange={(e) => setHlLink(e.target.value)} placeholder="Link (optional)" />
              <input
                className="input"
                value={hlPriority}
                onChange={(e) => setHlPriority(e.target.value)}
                placeholder="Order (1 = first)"
                type="number"
                min="1"
              />
            </div>
            <button className="btn primary" type="button" onClick={addHeadline} disabled={savingHeadline}>
              {savingHeadline ? "Posting..." : "Post Headline"}
            </button>
          </div>
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
              <div className="listItem" key={a.id}>
                <div className="headlineRow">
                  <div style={{ fontWeight: 900 }}>{a.title}</div>
                  <div className="muted">{a.week ? `Week ${a.week}` : ""}</div>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {a.author || "Commissioner"} {a.created_at ? `• ${new Date(a.created_at).toLocaleDateString()}` : ""}
                </div>
                <div className="muted" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{a.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
