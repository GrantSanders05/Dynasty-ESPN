import React, { useEffect, useMemo, useState } from "react";
import ArticleCard from "../components/ArticleCard.jsx";

export default function Home({ supabase, isCommish, teams }) {
  const [headlines, setHeadlines] = useState([]);
  const [articles, setArticles] = useState([]);
  const [episodes, setEpisodes] = useState([]);

  const [newHeadline, setNewHeadline] = useState({ text: "", link: "", priority: 50 });
  const [newArticle, setNewArticle] = useState({
    title: "",
    body: "",
    week_label: "",
    author: "",
    published: true,
    is_featured: false,
    team_slug: "",
  });

  const featuredArticle = useMemo(() => articles.find(a => a.is_featured) || null, [articles]);
  const otherArticles = useMemo(() => articles.filter(a => !a.is_featured), [articles]);

  async function load() {
    const [hRes, aRes, eRes] = await Promise.all([
      supabase.from("headlines").select("*").order("priority", { ascending: true }).order("created_at", { ascending: false }),
      supabase.from("articles").select("*").order("is_featured", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("podcast_episodes").select("*").order("created_at", { ascending: false }).limit(1),
    ]);
    if (!hRes.error) setHeadlines(hRes.data || []);
    if (!aRes.error) setArticles(aRes.data || []);
    if (!eRes.error) setEpisodes(eRes.data || []);
  }

  useEffect(() => { load(); }, []);

  async function addHeadline(e) {
    e.preventDefault();
    if (!isCommish) return;
    if (!newHeadline.text.trim()) return;

    await supabase.from("headlines").insert([{
      text: newHeadline.text.trim(),
      link: newHeadline.link.trim() || null,
      priority: Number(newHeadline.priority) || 50,
    }]);

    setNewHeadline({ text: "", link: "", priority: 50 });
    await load();
  }

  async function deleteHeadline(id) {
    if (!isCommish) return;
    await supabase.from("headlines").delete().eq("id", id);
    await load();
  }

  async function setFeatured(id) {
    if (!isCommish) return;
    await supabase.from("articles").update({ is_featured: false }).eq("is_featured", true);
    await supabase.from("articles").update({ is_featured: true }).eq("id", id);
    await load();
  }

  async function deleteArticle(id) {
    if (!isCommish) return;
    await supabase.from("articles").delete().eq("id", id);
    await load();
  }

  async function togglePublish(id, published) {
    if (!isCommish) return;
    await supabase.from("articles").update({ published }).eq("id", id);
    await load();
  }

  async function addArticle(e) {
    e.preventDefault();
    if (!isCommish) return;
    if (!newArticle.title.trim() || !newArticle.body.trim()) return;

    if (newArticle.is_featured) {
      await supabase.from("articles").update({ is_featured: false }).eq("is_featured", true);
    }

    const ins = await supabase.from("articles").insert([{
      title: newArticle.title.trim(),
      body: newArticle.body.trim(),
      week_label: newArticle.week_label.trim() || null,
      author: newArticle.author.trim() || null,
      published: !!newArticle.published,
      is_featured: !!newArticle.is_featured,
    }]).select("id").single();

    if (!ins.error && newArticle.team_slug) {
      const team = (teams || []).find(t => t.slug === newArticle.team_slug);
      if (team) {
        await supabase.from("article_team_map").insert([{ article_id: ins.data.id, team_id: team.id }]);
      }
    }

    setNewArticle({
      title: "",
      body: "",
      week_label: "",
      author: "",
      published: true,
      is_featured: false,
      team_slug: "",
    });
    await load();
  }

  return (
    <main className="layout">
      <section className="rail">
        <div className="card">
          <div className="cardHeader">
            <h2>Headlines</h2>
            <button className="btn small" type="button" onClick={load}>Refresh</button>
          </div>

          {isCommish && (
            <form className="form" onSubmit={addHeadline}>
              <input className="input" placeholder="Headline text" value={newHeadline.text}
                onChange={(e) => setNewHeadline(s => ({ ...s, text: e.target.value }))} />
              <input className="input" placeholder="Optional link (https://…)" value={newHeadline.link}
                onChange={(e) => setNewHeadline(s => ({ ...s, link: e.target.value }))} />
              <div className="row">
                <input className="input" type="number" min="1" max="999" placeholder="Priority"
                  value={newHeadline.priority}
                  onChange={(e) => setNewHeadline(s => ({ ...s, priority: e.target.value }))} />
                <button className="btn primary" type="submit">Add</button>
              </div>
            </form>
          )}

          <ul className="list">
            {headlines.map(h => (
              <li key={h.id} className="listItem">
                <div className="headlineRow">
                  {h.link ? <a className="link" href={h.link} target="_blank" rel="noreferrer">{h.text}</a> : <span>{h.text}</span>}
                  {isCommish && <button className="btn tiny danger" type="button" onClick={() => deleteHeadline(h.id)}>Delete</button>}
                </div>
              </li>
            ))}
            {!headlines.length && <li className="muted">No headlines yet.</li>}
          </ul>
        </div>

        <div className="ticker">
          <div className="tickerLabel">LIVE</div>
          <div className="tickerText">
            {headlines.length ? headlines.map(h => h.text).join(" • ") : "Add your first headline to start the ticker."}
          </div>
        </div>
      </section>

      <section className="main">
        <div className="card">
          <div className="cardHeader"><h2>Top Story</h2></div>

          {featuredArticle ? (
            <article className="feature">
              <div className="kicker">FEATURED</div>
              <h3 className="featureTitle">{featuredArticle.title}</h3>
              <p className="featureBody">{featuredArticle.body}</p>
              {isCommish && (
                <div className="actions">
                  <button className="btn danger" type="button" onClick={() => deleteArticle(featuredArticle.id)}>Delete</button>
                  <button className="btn" type="button" onClick={() => togglePublish(featuredArticle.id, !featuredArticle.published)}>
                    {featuredArticle.published ? "Unpublish" : "Publish"}
                  </button>
                </div>
              )}
            </article>
          ) : (
            <div className="muted">No featured story yet.</div>
          )}
        </div>

        <div className="card">
          <div className="cardHeader"><h2>More Stories</h2></div>
          <div className="grid">
            {otherArticles.map(a => (
              <ArticleCard
                key={a.id}
                a={a}
                isCommish={isCommish}
                onFeature={setFeatured}
                onDelete={deleteArticle}
                onPublishToggle={togglePublish}
              />
            ))}
            {!otherArticles.length && <div className="muted">No stories yet.</div>}
          </div>
        </div>

        {isCommish && (
          <div className="card">
            <div className="cardHeader"><h2>Commissioner: Post Article</h2></div>

            <form className="form" onSubmit={addArticle}>
              <input className="input" placeholder="Title" value={newArticle.title}
                onChange={(e) => setNewArticle(s => ({ ...s, title: e.target.value }))} />

              <div className="row">
                <input className="input" placeholder="Week label (ex: Week 4)" value={newArticle.week_label}
                  onChange={(e) => setNewArticle(s => ({ ...s, week_label: e.target.value }))} />
                <input className="input" placeholder="Author (optional)" value={newArticle.author}
                  onChange={(e) => setNewArticle(s => ({ ...s, author: e.target.value }))} />
              </div>

              <div className="row">
                <select className="input" value={newArticle.team_slug}
                  onChange={(e) => setNewArticle(s => ({ ...s, team_slug: e.target.value }))}>
                  <option value="">Tag a team (optional)</option>
                  {(teams || []).map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
                </select>

                <label className="check">
                  <input type="checkbox" checked={newArticle.is_featured}
                    onChange={(e) => setNewArticle(s => ({ ...s, is_featured: e.target.checked }))} />
                  Feature
                </label>
                <label className="check">
                  <input type="checkbox" checked={newArticle.published}
                    onChange={(e) => setNewArticle(s => ({ ...s, published: e.target.checked }))} />
                  Published
                </label>

                <button className="btn primary" type="submit">Post</button>
              </div>

              <textarea className="textarea" rows={10} placeholder="Paste your article…"
                value={newArticle.body}
                onChange={(e) => setNewArticle(s => ({ ...s, body: e.target.value }))} />
            </form>
          </div>
        )}
      </section>

      <section className="rail">
        <div className="card">
          <div className="cardHeader"><h2>Podcast</h2></div>

          {episodes.length ? (
            <div className="episode">
              <div className="episodeTitle">{episodes[0].title}</div>
              {episodes[0].description && <div className="episodeDesc">{episodes[0].description}</div>}
              {episodes[0].public_url ? <audio controls src={episodes[0].public_url} style={{ width: "100%" }} /> : <div className="muted">Missing audio URL.</div>}
              <div className="muted">View all episodes on the Podcast page.</div>
            </div>
          ) : (
            <div className="muted">No episodes yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}
