import React, { useEffect, useMemo, useState } from "react";

/**
 * Podcast (Supabase)
 * Based on your SUPABASE_SQL.sql:
 * - podcast_episodes: id, created_at, title, description, file_path, public_url
 * Storage:
 * - bucket: podcasts (public)
 *
 * Commissioner can upload an audio file or paste a public URL.
 */

const EPISODES_TABLE = "podcast_episodes";
const PODCAST_BUCKET = "podcasts";

function safeFileName(name) {
  return (name || "audio")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 80);
}

export default function Podcast({ supabase, isCommish }) {
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState([]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [publicUrl, setPublicUrl] = useState("");
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
    if (!file && !publicUrl.trim()) return flashError("Choose an audio file OR paste a public URL.");

    setPosting(true);
    try {
      let file_path = null;
      let public_url = publicUrl.trim() || null;

      // Upload file to Storage if provided
      if (file) {
        const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
        const base = safeFileName(title.trim());
        const path = `episodes/${Date.now()}-${base}.${ext}`;

        const up = await supabase.storage.from(PODCAST_BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (up.error) throw up.error;

        file_path = path;

        const pub = supabase.storage.from(PODCAST_BUCKET).getPublicUrl(path);
        public_url = pub?.data?.publicUrl || null;
      }

      const { error } = await supabase.from(EPISODES_TABLE).insert({
        title: title.trim(),
        description: desc.trim() || null,
        file_path: file_path || "external",
        public_url: public_url,
      });

      if (error) throw error;

      flashNotice("Episode added.");
      setTitle("");
      setDesc("");
      setFile(null);
      setPublicUrl("");
      await loadEpisodes();
    } catch (e2) {
      flashError(e2?.message || "Failed to add episode.");
    } finally {
      setPosting(false);
    }
  }

  async function deleteEpisode(ep) {
    if (!isCommish) return;
    if (!confirm("Delete this episode?")) return;

    try {
      // Delete DB row
      const { error } = await supabase.from(EPISODES_TABLE).delete().eq("id", ep.id);
      if (error) throw error;

      // Best-effort delete storage object if it looks like ours
      if (ep.file_path && ep.file_path.startsWith("episodes/")) {
        await supabase.storage.from(PODCAST_BUCKET).remove([ep.file_path]);
      }

      flashNotice("Deleted.");
      await loadEpisodes();
    } catch (e) {
      flashError(e?.message || "Delete failed.");
    }
  }

  const subtitle = useMemo(() => (loading ? "Loading..." : `${episodes.length} episodes`), [loading, episodes.length]);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 style={{ margin: 0 }}>Podcast</h1>
          <div className="muted">Weekly recap, hot takes, and rankings.</div>
        </div>
        <div className="muted">{subtitle}</div>
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
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Episode title" />
            <textarea className="textarea" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" />

            <div className="row">
              <input
                className="input"
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <input
                className="input"
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="Or paste a public audio URL"
              />
            </div>

            <button className="btn primary" type="submit" disabled={posting}>
              {posting ? "Adding..." : "Add Episode"}
            </button>
          </form>

          <div className="muted" style={{ fontSize: 12 }}>
            Upload uses the <strong>{PODCAST_BUCKET}</strong> bucket and saves <strong>public_url</strong> in the table.
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

              {ep.public_url ? (
                <audio controls style={{ width: "100%", marginTop: 10 }}>
                  <source src={ep.public_url} />
                </audio>
              ) : (
                <div className="muted" style={{ marginTop: 10 }}>No public URL on this episode.</div>
              )}

              {isCommish ? (
                <div className="actions">
                  <button className="btn danger small" type="button" onClick={() => deleteEpisode(ep)}>
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
