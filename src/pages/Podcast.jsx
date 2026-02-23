import React, { useEffect, useMemo, useState } from "react";

/**
 * Podcast page (FIXED v2)
 * Your DB has a NOT NULL column named "file_path".
 * This uploader now writes BOTH:
 *   - file_path (required by your table)
 *   - storage_path (kept for clarity / future use)
 */

function prettySize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n = n / 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Podcast({ supabase, isCommish }) {
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState([]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Upload form
  const [podcastTitle, setPodcastTitle] = useState("Dynasty Podcast");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeDesc, setEpisodeDesc] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fileInfo = useMemo(() => {
    if (!file) return "";
    return `${file.name} • ${prettySize(file.size)}`;
  }, [file]);

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

  async function loadSettingsAndEpisodes() {
    setLoading(true);

    // Podcast title (optional)
    try {
      const s = await supabase.from("site_settings").select("*").eq("key", "podcast_title").maybeSingle();
      if (!s.error && s.data?.value) setPodcastTitle(s.data.value);
    } catch {}

    const res = await supabase.from("podcast_episodes").select("*").order("created_at", { ascending: false });

    if (res.error) {
      flashError(res.error.message);
      setEpisodes([]);
    } else {
      setEpisodes(res.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSettingsAndEpisodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePodcastTitle() {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "podcast_title", value: podcastTitle }, { onConflict: "key" });
      if (error) throw error;
      flashNotice("Podcast title saved.");
    } catch (e) {
      flashError(e?.message || "Failed to save podcast title.");
    }
  }

  async function uploadEpisode() {
    if (!isCommish) return flashError("Commissioner only.");
    if (!episodeTitle.trim()) return flashError("Add an episode title.");
    if (!file) return flashError("Choose an audio file first.");

    setUploading(true);
    setError("");
    setNotice("");

    try {
      // Ensure session exists (better error if auth breaks)
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) throw new Error("Not signed in.");

      // Upload to Storage
      const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
      const safeTitle = episodeTitle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const path = `episodes/${Date.now()}-${safeTitle}.${ext}`;

      const up = await supabase.storage.from("podcasts").upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (up.error) throw new Error(`Storage upload failed: ${up.error.message}`);

      const pub = supabase.storage.from("podcasts").getPublicUrl(path);
      const audioUrl = pub?.data?.publicUrl;
      if (!audioUrl) throw new Error("Could not get public URL for uploaded audio.");

      // IMPORTANT: your table requires file_path NOT NULL
      const ins = await supabase.from("podcast_episodes").insert({
        title: episodeTitle.trim(),
        description: episodeDesc.trim() || null,
        audio_url: audioUrl,
        file_path: path,      // REQUIRED by your schema
        storage_path: path,   // kept for compatibility
      });

      if (ins.error) throw new Error(`Database insert failed: ${ins.error.message}`);

      flashNotice("Episode uploaded!");
      setEpisodeTitle("");
      setEpisodeDesc("");
      setFile(null);

      await loadSettingsAndEpisodes();
    } catch (e) {
      flashError(e?.message || "Upload failed.");
      console.error("Podcast upload error:", e);
    } finally {
      setUploading(false);
    }
  }

  async function deleteEpisode(id, pathMaybe) {
    if (!isCommish) return flashError("Commissioner only.");
    if (!confirm("Delete this episode?")) return;

    try {
      const del = await supabase.from("podcast_episodes").delete().eq("id", id);
      if (del.error) throw del.error;

      // Try delete storage file (policy must allow)
      const p = pathMaybe;
      if (p) {
        const st = await supabase.storage.from("podcasts").remove([p]);
        if (st.error) console.warn("Storage delete warning:", st.error.message);
      }

      flashNotice("Episode deleted.");
      await loadSettingsAndEpisodes();
    } catch (e) {
      flashError(e?.message || "Delete failed.");
    }
  }

  return (
    <main className="page">
      <div className="pageHeader">
        <h1>{podcastTitle}</h1>
        <div className="muted">Weekly episodes, takes, and recaps.</div>
      </div>

      {(notice || error) && (
        <div className="stack" style={{ marginBottom: 12 }}>
          {notice ? <div className="banner ok">{notice}</div> : null}
          {error ? <div className="banner err">{error}</div> : null}
        </div>
      )}

      {isCommish ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="cardHeader">
            <h2>Commissioner Upload</h2>
            <div className="muted">Only you can upload episodes.</div>
          </div>

          <div className="grid2">
            <div>
              <label className="label">Podcast page title</label>
              <input className="input" value={podcastTitle} onChange={(e) => setPodcastTitle(e.target.value)} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn" type="button" onClick={savePodcastTitle}>
                  Save Title
                </button>
              </div>
            </div>

            <div>
              <label className="label">Episode title</label>
              <input className="input" value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value)} placeholder="Week 4 Recap" />

              <label className="label" style={{ marginTop: 10 }}>Description (optional)</label>
              <textarea className="input" style={{ minHeight: 90 }} value={episodeDesc} onChange={(e) => setEpisodeDesc(e.target.value)} placeholder="What we covered..." />

              <label className="label" style={{ marginTop: 10 }}>Audio file</label>
              <input className="input" type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {fileInfo ? <div className="muted" style={{ marginTop: 6 }}>{fileInfo}</div> : null}

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn primary" type="button" disabled={uploading} onClick={uploadEpisode}>
                  {uploading ? "Uploading..." : "Upload Episode"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="banner">
          <strong>Note:</strong> Sign in as commissioner to upload episodes.
        </div>
      )}

      <section className="card">
        <div className="cardHeader">
          <h2>Episodes</h2>
          <div className="muted">{loading ? "Loading..." : `${episodes.length} total`}</div>
        </div>

        {loading ? (
          <div className="muted">Loading episodes…</div>
        ) : episodes.length === 0 ? (
          <div className="muted">No episodes yet.</div>
        ) : (
          <div className="list">
            {episodes.map((ep) => {
              const storagePath = ep.storage_path || ep.file_path || null;
              return (
                <div className="listItem" key={ep.id}>
                  <div className="listMain">
                    <div className="listTitle">{ep.title}</div>
                    {ep.description ? <div className="muted">{ep.description}</div> : null}
                    {ep.audio_url ? (
                      <audio controls style={{ width: "100%", marginTop: 8 }} src={ep.audio_url} />
                    ) : (
                      <div className="muted" style={{ marginTop: 8 }}>No audio URL</div>
                    )}
                  </div>

                  {isCommish ? (
                    <div className="listActions">
                      <button className="btn danger" type="button" onClick={() => deleteEpisode(ep.id, storagePath)}>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
