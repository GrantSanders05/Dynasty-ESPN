import React, { useEffect, useState } from "react";

export default function Podcast({ supabase, isCommish }) {
  const [podcastTitle, setPodcastTitle] = useState("Dynasty Podcast");
  const [episodes, setEpisodes] = useState([]);

  const [editTitle, setEditTitle] = useState("");
  const [newEpisode, setNewEpisode] = useState({ title: "", description: "", file: null });

  async function load() {
    const [sRes, eRes] = await Promise.all([
      supabase.from("site_settings").select("*").eq("key", "podcast_title").maybeSingle(),
      supabase.from("podcast_episodes").select("*").order("created_at", { ascending: false }),
    ]);

    if (!sRes.error && sRes.data?.value) {
      setPodcastTitle(sRes.data.value);
      setEditTitle(sRes.data.value);
    } else {
      setEditTitle(podcastTitle);
    }

    if (!eRes.error) setEpisodes(eRes.data || []);
  }

  useEffect(() => { load(); }, []);

  async function saveTitle(e) {
    e.preventDefault();
    if (!isCommish) return;
    const val = (editTitle || "").trim();
    if (!val) return;

    await supabase.from("site_settings").upsert([{ key: "podcast_title", value: val }]);
    await load();
  }

  async function uploadEpisode(e) {
    e.preventDefault();
    if (!isCommish) return;
    if (!newEpisode.title.trim() || !newEpisode.file) return;

    const file = newEpisode.file;
    const safeName = file.name.replace(/\s+/g, "_");
    const path = `${Date.now()}_${safeName}`;

    const up = await supabase.storage.from("podcasts").upload(path, file, { upsert: false });
    if (up.error) return;

    const pub = supabase.storage.from("podcasts").getPublicUrl(up.data.path);
    await supabase.from("podcast_episodes").insert([{
      title: newEpisode.title.trim(),
      description: newEpisode.description.trim() || null,
      file_path: up.data.path,
      public_url: pub.data.publicUrl,
    }]);

    setNewEpisode({ title: "", description: "", file: null });
    await load();
  }

  async function deleteEpisode(ep) {
    if (!isCommish) return;
    if (ep.file_path) await supabase.storage.from("podcasts").remove([ep.file_path]);
    await supabase.from("podcast_episodes").delete().eq("id", ep.id);
    await load();
  }

  return (
    <main className="page">
      <div className="pageHeader">
        <h1>{podcastTitle}</h1>
        <div className="muted">Commissioner uploads episodes. Everyone listens.</div>
      </div>

      {isCommish && (
        <div className="card">
          <div className="cardHeader"><h2>Commissioner: Podcast Title</h2></div>
          <form className="form" onSubmit={saveTitle}>
            <div className="row">
              <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <button className="btn primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      )}

      {isCommish && (
        <div className="card">
          <div className="cardHeader"><h2>Commissioner: Upload Episode</h2></div>
          <form className="form" onSubmit={uploadEpisode}>
            <input className="input" placeholder="Episode title" value={newEpisode.title}
              onChange={(e) => setNewEpisode(s => ({ ...s, title: e.target.value }))} />
            <input className="input" placeholder="Description (optional)" value={newEpisode.description}
              onChange={(e) => setNewEpisode(s => ({ ...s, description: e.target.value }))} />
            <input className="input" type="file" accept="audio/*"
              onChange={(e) => setNewEpisode(s => ({ ...s, file: e.target.files?.[0] || null }))} />
            <button className="btn primary" type="submit">Upload</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="cardHeader"><h2>Episodes</h2></div>
        <div className="stack">
          {episodes.map(ep => (
            <div key={ep.id} className="episode">
              <div className="episodeTitle">{ep.title}</div>
              {ep.description && <div className="episodeDesc">{ep.description}</div>}
              {ep.public_url ? <audio controls src={ep.public_url} style={{ width: "100%" }} /> : <div className="muted">Missing audio URL.</div>}
              {isCommish && (
                <div className="actions">
                  <button className="btn danger" type="button" onClick={() => deleteEpisode(ep)}>Delete</button>
                </div>
              )}
            </div>
          ))}
          {!episodes.length && <div className="muted">No episodes yet.</div>}
        </div>
      </div>
    </main>
  );
}
