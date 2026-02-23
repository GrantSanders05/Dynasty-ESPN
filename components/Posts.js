"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function Feed({ table, titleField, bodyField, extraMeta, withImages }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!mounted) return;
      if (error) setError(error.message);
      setItems(data || []);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [table]);

  if (loading) return <div className="muted">Loading…</div>;
  if (error) return <div className="muted">Error: {error}</div>;
  if (!items.length) return <div className="muted">No posts yet.</div>;

  return (
    <div className="feed">
      {items.map((it) => (
        <article className="item" key={it.id}>
          <div className="meta">
            <span>{it.author_name || "Anonymous"}</span>
            <span>{formatDate(it.created_at)}</span>
          </div>

          {titleField && it[titleField] ? <h3>{it[titleField]}</h3> : null}
          {bodyField && it[bodyField] ? <p style={{ whiteSpace: "pre-wrap" }}>{it[bodyField]}</p> : null}

          {extraMeta ? (
            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              {extraMeta(it)}
            </div>
          ) : null}

          {withImages && it.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="img" src={it.image_url} alt="uploaded media" />
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function ArticleForm() {
  const [week, setWeek] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState("");

  const canSubmit = useMemo(() => title.trim() && body.trim(), [title, body]);

  async function submit() {
    setStatus("Posting…");

    const payload = {
      week: week ? Number(week) : null,
      title: title.trim(),
      body: body.trim(),
      author_name: author.trim() || "Commissioner",
    };

    const { error } = await supabase.from("articles").insert(payload);
    if (error) {
      setStatus("Error: " + error.message);
      return;
    }

    setWeek("");
    setTitle("");
    setBody("");
    setAuthor("");
    setStatus("Posted! Refresh to see it at the top.");
  }

  return (
    <div className="card">
      <h2>Post a Weekly Article</h2>
      <p className="muted" style={{ marginTop: -6 }}>
        Lightweight “ESPN recap” posts. Public by design.
      </p>

      <div className="row">
        <div style={{ flex: 1, minWidth: 180 }}>
          <label>Week (optional)</label>
          <input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="e.g. 1" />
        </div>
        <div style={{ flex: 2, minWidth: 220 }}>
          <label>Author name (optional)</label>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Grant" />
        </div>
      </div>

      <label>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 3: Chaos in the Top 25" />

      <label>Body</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your recap…" />

      <div className="spacer" />
      <button className="btn primary" disabled={!canSubmit} onClick={submit}>
        Post Article
      </button>

      {status ? <div className="muted" style={{ marginTop: 10 }}>{status}</div> : null}
    </div>
  );
}

export function SocialForm() {
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const canSubmit = useMemo(() => content.trim().length > 0, [content]);

  async function uploadIfNeeded() {
    if (!file) return null;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `social/${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, {
      contentType: file.type || "image/*",
      upsert: false,
    });

    if (upErr) throw new Error(upErr.message);

    const { data } = supabase.storage.from("uploads").getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function submit() {
    setStatus("Posting…");
    try {
      const imageUrl = await uploadIfNeeded();

      const payload = {
        author_name: author.trim() || "Anonymous",
        content: content.trim(),
        image_url: imageUrl,
      };

      const { error } = await supabase.from("social_posts").insert(payload);
      if (error) {
        setStatus("Error: " + error.message);
        return;
      }

      setAuthor("");
      setContent("");
      setFile(null);
      setStatus("Posted! Refresh to see it at the top.");
    } catch (e) {
      setStatus("Error: " + (e?.message || "Upload failed"));
    }
  }

  return (
    <div className="card">
      <h2>Post to the Social Wall</h2>
      <p className="muted" style={{ marginTop: -6 }}>
        Anyone can post anything (text + optional image).
      </p>

      <label>Name (optional)</label>
      <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" />

      <label>Post</label>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Talk your trash… 👀" />

      <label>Optional image</label>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />

      <div className="spacer" />
      <button className="btn primary" disabled={!canSubmit} onClick={submit}>
        Post
      </button>

      {status ? <div className="muted" style={{ marginTop: 10 }}>{status}</div> : null}
    </div>
  );
}
