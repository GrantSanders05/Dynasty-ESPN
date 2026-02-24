import React, { useEffect, useState } from "react";

/**
 * Podcast tab (Supabase-backed)
 *
 * Expected table (default name): podcast_episodes
 * Columns (suggested):
 * - id, created_at
 * - title (text), description (text)
 * - audio_url (text, optional)  -> renders <audio controls>
 * - embed_url (text, optional)  -> renders <iframe> (Spotify, YouTube, etc)
 *
 * If your table is named differently, change EPISODES_TABLE below.
 */
const EPISODES_TABLE = "podcast_episodes";

export default function Podcast({ supabase, isCommish }) {
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState([]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [posting, setPosting] = useState(false);

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

  async function loadEpisodes() {
    setLoading(true);
    const res = await supabase.from(EPISODES_TABLE).select("*").order("created_at", { ascending: false });
    if (res.error) {
      flashError(`Podcast: ${res.error.message}`);
      setEpisodes([]);
    } else {
      setEpisodes(res.data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEpisodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addEpisode(e) {
    e.preventDefault();
    if (!isCommish) return flashError("Commissioner only.");
    if (!title.trim()) return flashError("Title is required.");

    setPosting(true);
    try {
      const { error } = await supabase.from(EPISODES_TABLE).insert({
        title: title.trim(),
        description: desc.trim() || null,
        audio_url: audioUrl.trim() || null,
        embed_url: embedUrl.trim() || null,
      });
      if (error) throw error;

      flashNotice("Episode added.");
      setTitle("");
      setDesc("");
      setAudioUrl("");
      setEmbedUrl("");
      await loadEpisodes();
    } catch (e2) {
      flashError(e2?.message || "Failed to add episode.");
    } finally {
      setPosting(false);
    }
  }

  async function deleteEpisode(id) {
    if (!isCommish) return;
    if (!confirm("Delete this episode?")) return;

    try {
      const { error } = await supabase.from(EPISODES_TABLE).delete().eq("id", id);
      if (error) throw error;
      flashNotice("Deleted.");
      await loadEpisodes();
    } catch (e) {
      flashError(e?.message || "Delete failed.");
    }
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 style={{ margin: 0 }}>Podcast</h1>
          <div className="muted">Weekly recap, hot takes, and rankings.</div>
        </div>
        <div className="muted">{loading ? "Loading..." : `${episodes.length} episodes`}</div>
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
            <h2>Add Episode</h2>
          </div>

          <form className="form" onSubmit={addEpisode}>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <textarea className="textarea" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" />
            <input className="input" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="Audio URL (optional)" />
            <input className="input" value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="Embed URL (optional, Spotify/YouTube iframe src)" />
            <button className="btn primary" type="submit" disabled={posting}>
              {posting ? "Adding..." : "Add Episode"}
            </button>
          </form>

          <div className="muted" style={{ fontSize: 12 }}>
            Tip: If you use Spotify embed, paste the <strong>iframe src</strong> (not the whole iframe).
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : episodes.length === 0 ? (
        <div className="muted">No episodes yet.</div>
      ) : (
        <div className="stack">
          {episodes.map((ep) => (
            <div className="episode" key={ep.id}>
              <div className="episodeTitle">{ep.title}</div>
              {ep.description ? <div className="episodeDesc" style={{ whiteSpace: "pre-wrap" }}>{ep.description}</div> : null}

              {ep.audio_url ? (
                <audio controls style={{ width: "100%" }}>
                  <source src={ep.audio_url} />
                </audio>
              ) : null}

              {ep.embed_url ? (
                <div style={{ marginTop: 10 }}>
                  <iframe
                    title={ep.title}
                    src={ep.embed_url}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
              ) : null}

              {isCommish ? (
                <div className="actions">
                  <button className="btn danger small" type="button" onClick={() => deleteEpisode(ep.id)}>
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
