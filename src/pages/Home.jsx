import React, { useEffect, useMemo, useState } from "react";
import ArticleCard from "../components/ArticleCard.jsx";

const SPONSORS_SETTING_KEY = "sponsors";
const MAX_SPONSORS = 5;

export default function Home({ supabase, isCommish }) {
  const [loading, setLoading] = useState(true);
  const [headlines, setHeadlines] = useState([]);
  const [articles, setArticles] = useState([]);
  const [teams, setTeams] = useState([]);

  // Sponsors: [{ id, name, logo_url, link_url }]
  const [sponsors, setSponsors] = useState([]);
  const [spName, setSpName] = useState("");
  const [spLogo, setSpLogo] = useState("");
  const [spLink, setSpLink] = useState("");
  const [savingSponsor, setSavingSponsor] = useState(false);

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

  // ── Sponsor helpers ──────────────────────────────────────────────────────

  async function loadSponsors() {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", SPONSORS_SETTING_KEY)
      .maybeSingle();
    try {
      const parsed = JSON.parse(data?.value || "[]");
      setSponsors(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSponsors([]);
    }
  }

  async function persistSponsors(list) {
    await supabase.from("site_settings").upsert({
      key: SPONSORS_SETTING_KEY,
      value: JSON.stringify(list),
      updated_at: new Date().toISOString(),
    });
    setSponsors(list);
  }

  async function addSponsor(e) {
    e.preventDefault();
    if (!isCommish) return flashError("Commissioner only.");
    if (!spName.trim()) return flashError("Sponsor name is required.");
    if (!spLogo.trim()) return flashError("Logo image URL is required.");
    if (sponsors.length >= MAX_SPONSORS)
      return flashError(`Max ${MAX_SPONSORS} sponsors reached.`);

    setSavingSponsor(true);
    try {
      const updated = [
        ...sponsors,
        {
          id: crypto.randomUUID(),
          name: spName.trim(),
          logo_url: spLogo.trim(),
          link_url: spLink.trim() || null,
        },
      ];
      await persistSponsors(updated);
      setSpName(""); setSpLogo(""); setSpLink("");
      flashNotice("Sponsor added.");
    } catch (err) {
      flashError(err?.message || "Failed to add sponsor.");
    } finally {
      setSavingSponsor(false);
    }
  }

  async function deleteSponsor(id) {
    if (!isCommish) return;
    if (!confirm("Remove this sponsor?")) return;
    await persistSponsors(sponsors.filter((s) => s.id !== id));
    flashNotice("Sponsor removed.");
  }

  // ── Main data load ───────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true);

    const h = await supabase
      .from("headlines")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
    if (h.error) flashError(`Headlines: ${h.error.message}`);
    setHeadlines((h.data || []).filter(Boolean));

    const a = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (a.error) flashError(`Articles: ${a.error.message}`);
    const all = (a.data || []).filter(Boolean);
    setArticles(isCommish ? all : all.filter((x) => x?.is_published !== false));

    const t = await supabase
      .from("teams")
      .select("id,name,slug")
      .order("name", { ascending: true });
    if (t.error) flashError(`Teams: ${t.error.message}`);
    setTeams((t.data || []).filter(Boolean));

    await loadSponsors();

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
      setHlText(""); setHlLink(""); setHlPriority(1);
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
        const rows = selectedTeamIds.map((team_id) => ({ article_id: inserted.id, team_id }));
        const { error: tagErr } = await supabase.from("article_teams").insert(rows);
        if (tagErr) console.warn("article_teams insert:", tagErr.message);
      }

      flashNotice("Article posted.");
      setATitle(""); setAWeek(""); setAAuthor(""); setABody(""); setSelectedTeamIds([]);
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
        .from("articles").update({ is_featured: !is_featured }).eq("id", id);
      if (updErr) throw updErr;
      await loadAll();
    } catch (e) { flashError(e?.message || "Failed to update."); }
  }

  async function togglePublished(id, is_published) {
    if (!isCommish) return;
    try {
      const { error: updErr } = await supabase
        .from("articles").update({ is_published: !is_published }).eq("id", id);
      if (updErr) throw updErr;
      await loadAll();
    } catch (e) { flashError(e?.message || "Failed to update."); }
  }

  async function deleteArticle(id) {
    if (!isCommish) return;
    if (!confirm("Delete this article?")) return;
    try {
      await supabase.from("article_teams").delete().eq("article_id", id);
      const { error: delErr } = await supabase.from("articles").delete().eq("id", id);
      if (delErr) throw delErr;
      flashNotice("Article deleted.");
      await loadAll();
    } catch (e) { flashError(e?.message || "Failed to delete article."); }
  }

  const tickerItems = useMemo(() => {
    const items = (headlines || []).filter(Boolean).map((h) => ({
      id: h.id, text: h.text, link: h.link || null,
    }));
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
          {error  ? <div className="toast err">{error}</div>  : null}
        </div>
      ) : null}

      {/* ── Headlines Ticker ── */}
      <div className="heroTicker">
        <div className="tickerLabel">Breaking</div>
        <div className="tickerViewport">
          <div
            className="tickerTrack"
            style={{ animationDuration: `${tickerDurationSec}s` }}
          >
            {tickerItems.length ? (
              tickerItems.map((h, idx) => (
                <span key={`${h.id}-${idx}`} className="tickerItem">
                  {h.link ? (
                    <a href={h.link} target="_blank" rel="noreferrer">{h.text}</a>
                  ) : h.text}
                  <span className="tickerDot">•</span>
                </span>
              ))
            ) : (
              <span className="tickerItem">No headlines yet <span className="tickerDot">•</span></span>
            )}
          </div>
        </div>
        <div className="tickerBrand">Dynasty Network</div>
      </div>

      {/* ── Main content ── */}
      {loading ? (
        <div className="muted" style={{ marginTop: 12 }}>Loading…</div>
      ) : (
        <>
          {/* ── Row 1: Articles (left) + Sponsors (right) ── */}
          <div className="grid2">

            {/* Articles */}
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
                <div className="muted" style={{ marginTop: 10 }}>No articles yet.</div>
              )}
            </div>

            {/* ── Sponsors ── */}
            <div>
              <h2>Our Sponsors</h2>

              {/* Sponsor cards — visible to everyone if sponsors exist */}
              {sponsors.length > 0 ? (
                <div className="stack">
                  {sponsors.map((s) => (
                    <div key={s.id} className="sponsorCard">
                      <div className="sponsorThankYou">Thank you to our sponsor</div>
                      {s.link_url ? (
                        <a
                          href={s.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="sponsorLogoWrap"
                          title={s.name}
                        >
                          <img src={s.logo_url} alt={s.name} className="sponsorLogo" />
                        </a>
                      ) : (
                        <div className="sponsorLogoWrap">
                          <img src={s.logo_url} alt={s.name} className="sponsorLogo" />
                        </div>
                      )}
                      <div className="sponsorName">{s.name}</div>

                      {isCommish && (
                        <button
                          className="btn danger small"
                          style={{ marginTop: 10 }}
                          onClick={() => deleteSponsor(s.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 10 }}>
                  {isCommish ? "No sponsors yet. Add one below." : "No sponsors yet."}
                </div>
              )}

              {/* Add sponsor form — commissioner only, hidden when at max */}
              {isCommish && sponsors.length < MAX_SPONSORS && (
                <div className="card" style={{ marginTop: 12 }}>
                  <div className="cardHeader">
                    <h2>Add Sponsor</h2>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {sponsors.length}/{MAX_SPONSORS}
                    </span>
                  </div>
                  <form className="form" onSubmit={addSponsor}>
                    <input
                      className="input"
                      value={spName}
                      onChange={(e) => setSpName(e.target.value)}
                      placeholder="Sponsor name"
                    />
                    <input
                      className="input"
                      value={spLogo}
                      onChange={(e) => setSpLogo(e.target.value)}
                      placeholder="Logo image URL (https://…)"
                    />
                    <input
                      className="input"
                      value={spLink}
                      onChange={(e) => setSpLink(e.target.value)}
                      placeholder="Website link (optional)"
                    />
                    <button
                      className="btn primary"
                      type="submit"
                      disabled={savingSponsor}
                    >
                      {savingSponsor ? "Adding…" : "Add Sponsor"}
                    </button>
                  </form>
                </div>
              )}

              {/* Show max reached notice */}
              {isCommish && sponsors.length >= MAX_SPONSORS && (
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Maximum of {MAX_SPONSORS} sponsors reached. Remove one to add another.
                </div>
              )}
            </div>
          </div>

          {/* ── Row 2: Commissioner Tools — full width below ── */}
          {isCommish && (
            <div style={{ marginTop: 24 }}>
              <h2>Commissioner Tools</h2>
              <div className="grid2">

                {/* Left: Post Headline + Manage Headlines */}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
                  <div className="card">
                    <div className="cardHeader"><h2>Post Headline</h2></div>
                    <div className="form">
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
                        {savingHeadline ? "Saving…" : "Post Headline"}
                      </button>
                    </div>
                  </div>

                  <div className="card">
                    <div className="cardHeader"><h2>Manage Headlines</h2></div>
                    <div className="list">
                      {headlines.length ? (
                        headlines.filter(Boolean).map((h) => (
                          <div key={h.id} className="listItem" style={{ padding: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
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
                </div>

                {/* Right: Post Article */}
                <div className="card">
                  <div className="cardHeader"><h2>Post Article</h2></div>
                  <div className="form">
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
                          const id = v; // uuid string
                          setSelectedTeamIds((prev) =>
                            prev.includes(id) ? prev : [...prev, id]
                          );
                        }}
                      >
                        <option value="">Tag team (optional)…</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
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
                      <div className="muted" style={{ fontSize: 12 }}>
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

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
