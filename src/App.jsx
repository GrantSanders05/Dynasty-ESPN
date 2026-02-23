import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";

const APP_TITLE = "CFB 26 DYNASTY NETWORK"; // change this if you want

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  } catch {
    return "";
  }
}

export default function App() {
  // Routing/tabs
  const [tab, setTab] = useState("home"); // home | social

  // Auth / commissioner
  const [user, setUser] = useState(null);
  const [isCommish, setIsCommish] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Data
  const [headlines, setHeadlines] = useState([]);
  const [articles, setArticles] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [posts, setPosts] = useState([]);

  // Loading
  const [loading, setLoading] = useState({
    headlines: false,
    articles: false,
    episodes: false,
    posts: false,
  });

  // UI messages
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Forms
  const [authMode, setAuthMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [newHeadline, setNewHeadline] = useState({ text: "", link: "", priority: 50 });
  const [newArticle, setNewArticle] = useState({
    title: "",
    body: "",
    week_label: "",
    author: "",
    published: true,
    is_featured: false,
  });
  const [newEpisode, setNewEpisode] = useState({
    title: "",
    description: "",
    file: null,
  });

  const [newPost, setNewPost] = useState({
    display_name: "",
    content: "",
  });

  // Derived
  const featuredArticle = useMemo(
    () => articles.find((a) => a.is_featured) || null,
    [articles]
  );
  const otherArticles = useMemo(
    () => articles.filter((a) => !a.is_featured),
    [articles]
  );

  function flashNotice(msg) {
    setNotice(msg);
    setErrorMsg("");
    window.clearTimeout(flashNotice._t);
    flashNotice._t = window.setTimeout(() => setNotice(""), 3500);
  }
  function flashError(msg) {
    setErrorMsg(msg);
    setNotice("");
    window.clearTimeout(flashError._t);
    flashError._t = window.setTimeout(() => setErrorMsg(""), 6000);
  }

  // ---------- AUTH ----------
  async function refreshUserAndRole() {
    setAuthLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      setUser(u);

      if (!u?.email) {
        setIsCommish(false);
        return;
      }

      // commissioner check
      const { data: cRow, error } = await supabase
        .from("commissioners")
        .select("email")
        .eq("email", u.email)
        .maybeSingle();

      if (error) {
        setIsCommish(false);
        return;
      }
      setIsCommish(!!cRow);
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    refreshUserAndRole();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      await refreshUserAndRole();
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function signInOrUp(e) {
    e?.preventDefault?.();
    setErrorMsg("");
    setNotice("");

    if (!email || !password) {
      flashError("Please enter email and password.");
      return;
    }

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        flashNotice("Signed up! If email confirmation is enabled, check your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        flashNotice("Signed in.");
      }
      setEmail("");
      setPassword("");
      await refreshUserAndRole();
    } catch (err) {
      flashError(err?.message || "Auth error.");
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      flashNotice("Signed out.");
      setIsCommish(false);
      setUser(null);
    } catch (err) {
      flashError(err?.message || "Sign out failed.");
    }
  }

  // ---------- DATA LOADERS ----------
  async function loadHeadlines() {
    setLoading((s) => ({ ...s, headlines: true }));
    try {
      const { data, error } = await supabase
        .from("headlines")
        .select("*")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHeadlines(data || []);
    } catch (err) {
      flashError(err?.message || "Failed to load headlines.");
    } finally {
      setLoading((s) => ({ ...s, headlines: false }));
    }
  }

  async function loadArticles() {
    setLoading((s) => ({ ...s, articles: true }));
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      flashError(err?.message || "Failed to load articles.");
    } finally {
      setLoading((s) => ({ ...s, articles: false }));
    }
  }

  async function loadEpisodes() {
    setLoading((s) => ({ ...s, episodes: true }));
    try {
      const { data, error } = await supabase
        .from("podcast_episodes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEpisodes(data || []);
    } catch (err) {
      flashError(err?.message || "Failed to load podcast episodes.");
    } finally {
      setLoading((s) => ({ ...s, episodes: false }));
    }
  }

  async function loadPosts() {
    setLoading((s) => ({ ...s, posts: true }));
    try {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      flashError(err?.message || "Failed to load social posts.");
    } finally {
      setLoading((s) => ({ ...s, posts: false }));
    }
  }

  useEffect(() => {
    // Load everything initially
    loadHeadlines();
    loadArticles();
    loadEpisodes();
    loadPosts();
  }, []);

  // ---------- COMMISSIONER ACTIONS ----------
  async function addHeadline(e) {
    e?.preventDefault?.();
    if (!isCommish) return flashError("Commissioner only.");

    if (!newHeadline.text.trim()) return flashError("Headline text is required.");

    try {
      const payload = {
        text: newHeadline.text.trim(),
        link: newHeadline.link.trim() || null,
        priority: Number.isFinite(Number(newHeadline.priority)) ? Number(newHeadline.priority) : 50,
      };
      const { error } = await supabase.from("headlines").insert([payload]);
      if (error) throw error;

      setNewHeadline({ text: "", link: "", priority: 50 });
      flashNotice("Headline added.");
      await loadHeadlines();
    } catch (err) {
      flashError(err?.message || "Failed to add headline.");
    }
  }

  async function deleteHeadline(id) {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      const { error } = await supabase.from("headlines").delete().eq("id", id);
      if (error) throw error;
      flashNotice("Headline deleted.");
      await loadHeadlines();
    } catch (err) {
      flashError(err?.message || "Failed to delete headline.");
    }
  }

  async function addArticle(e) {
    e?.preventDefault?.();
    if (!isCommish) return flashError("Commissioner only.");

    if (!newArticle.title.trim()) return flashError("Article title is required.");
    if (!newArticle.body.trim()) return flashError("Article body is required.");

    try {
      // If making featured, clear others first (so only one featured)
      if (newArticle.is_featured) {
        const { error: clearErr } = await supabase
          .from("articles")
          .update({ is_featured: false })
          .eq("is_featured", true);

        if (clearErr) throw clearErr;
      }

      const payload = {
        title: newArticle.title.trim(),
        body: newArticle.body.trim(),
        week_label: newArticle.week_label.trim() || null,
        author: newArticle.author.trim() || null,
        published: !!newArticle.published,
        is_featured: !!newArticle.is_featured,
      };

      const { error } = await supabase.from("articles").insert([payload]);
      if (error) throw error;

      setNewArticle({
        title: "",
        body: "",
        week_label: "",
        author: "",
        published: true,
        is_featured: false,
      });

      flashNotice("Article posted.");
      await loadArticles();
    } catch (err) {
      flashError(err?.message || "Failed to post article.");
    }
  }

  async function deleteArticle(id) {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
      flashNotice("Article deleted.");
      await loadArticles();
    } catch (err) {
      flashError(err?.message || "Failed to delete article.");
    }
  }

  async function setFeatured(id) {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      // Clear current featured
      const { error: clearErr } = await supabase
        .from("articles")
        .update({ is_featured: false })
        .eq("is_featured", true);

      if (clearErr) throw clearErr;

      // Set new featured
      const { error } = await supabase.from("articles").update({ is_featured: true }).eq("id", id);
      if (error) throw error;

      flashNotice("Featured story updated.");
      await loadArticles();
    } catch (err) {
      flashError(err?.message || "Failed to set featured.");
    }
  }

  async function unpublishArticle(id) {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      const { error } = await supabase.from("articles").update({ published: false }).eq("id", id);
      if (error) throw error;
      flashNotice("Article unpublished.");
      await loadArticles();
    } catch (err) {
      flashError(err?.message || "Failed to unpublish.");
    }
  }

  async function publishArticle(id) {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      const { error } = await supabase.from("articles").update({ published: true }).eq("id", id);
      if (error) throw error;
      flashNotice("Article published.");
      await loadArticles();
    } catch (err) {
      flashError(err?.message || "Failed to publish.");
    }
  }

  // ---------- PODCAST ----------
  async function uploadPodcastEpisode(e) {
    e?.preventDefault?.();
    if (!isCommish) return flashError("Commissioner only.");
    if (!newEpisode.title.trim()) return flashError("Episode title is required.");
    if (!newEpisode.file) return flashError("Choose an audio file to upload.");

    try {
      const file = newEpisode.file;
      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${Date.now()}_${safeName}`;

      // Upload file to storage bucket
      const { data: up, error: upErr } = await supabase.storage
        .from("podcasts")
        .upload(path, file, { upsert: false });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("podcasts").getPublicUrl(up.path);
      const publicUrl = pub?.publicUrl || null;

      // Save metadata row
      const payload = {
        title: newEpisode.title.trim(),
        description: newEpisode.description.trim() || null,
        file_path: up.path,
        public_url: publicUrl,
      };

      const { error: insErr } = await supabase.from("podcast_episodes").insert([payload]);
      if (insErr) throw insErr;

      setNewEpisode({ title: "", description: "", file: null });
      flashNotice("Podcast uploaded.");
      await loadEpisodes();
    } catch (err) {
      flashError(err?.message || "Podcast upload failed.");
    }
  }

  async function deleteEpisode(ep) {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      // Delete storage file first
      if (ep?.file_path) {
        const { error: delFileErr } = await supabase.storage.from("podcasts").remove([ep.file_path]);
        if (delFileErr) throw delFileErr;
      }

      // Delete db row
      const { error } = await supabase.from("podcast_episodes").delete().eq("id", ep.id);
      if (error) throw error;

      flashNotice("Episode deleted.");
      await loadEpisodes();
    } catch (err) {
      flashError(err?.message || "Failed to delete episode.");
    }
  }

  // ---------- SOCIAL ----------
  async function addPost(e) {
    e?.preventDefault?.();

    const name = (newPost.display_name || "").trim() || "Anonymous";
    const content = (newPost.content || "").trim();

    if (!content) return flashError("Write something first.");
    if (content.length > 800) return flashError("Keep posts under 800 characters.");

    try {
      const { error } = await supabase.from("social_posts").insert([
        {
          display_name: name.slice(0, 40),
          content,
        },
      ]);
      if (error) throw error;

      setNewPost({ display_name: newPost.display_name, content: "" });
      flashNotice("Posted.");
      await loadPosts();
    } catch (err) {
      flashError(err?.message || "Failed to post.");
    }
  }

  async function deletePost(id) {
    if (!isCommish) return flashError("Commissioner only.");
    try {
      const { error } = await supabase.from("social_posts").delete().eq("id", id);
      if (error) throw error;
      flashNotice("Post deleted.");
      await loadPosts();
    } catch (err) {
      flashError(err?.message || "Failed to delete post.");
    }
  }

  // ---------- UI ----------
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" />
          <div className="brandText">
            <div className="brandTitle">{APP_TITLE}</div>
            <div className="brandSub">ESPN-style hub for your 5-man online dynasty</div>
          </div>
        </div>

        <nav className="nav">
          <button className={cn("navBtn", tab === "home" && "active")} onClick={() => setTab("home")}>
            Home
          </button>
          <button
            className={cn("navBtn", tab === "social" && "active")}
            onClick={() => setTab("social")}
          >
            Social
          </button>
        </nav>

        <div className="authBox">
          {authLoading ? (
            <div className="pill">Checking auth…</div>
          ) : user ? (
            <div className="authSignedIn">
              <div className="pill">
                {user.email} {isCommish ? <strong>• Commissioner</strong> : null}
              </div>
              <button className="btn" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <form className="authForm" onSubmit={signInOrUp}>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                type="email"
                autoComplete="email"
              />
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                type="password"
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              />
              <button className="btn primary" type="submit">
                {authMode === "signup" ? "Sign up" : "Sign in"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setAuthMode((m) => (m === "signup" ? "signin" : "signup"))}
              >
                {authMode === "signup" ? "Have an account?" : "New here?"}
              </button>
            </form>
          )}
        </div>
      </header>

      {(notice || errorMsg) && (
        <div className={cn("banner", errorMsg ? "error" : "notice")}>
          {errorMsg || notice}
        </div>
      )}

      {tab === "home" ? (
        <main className="layout">
          {/* Left rail: Headlines */}
          <section className="rail">
            <div className="card">
              <div className="cardHeader">
                <h2>Headlines</h2>
                <button className="btn small" onClick={loadHeadlines} disabled={loading.headlines}>
                  {loading.headlines ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {isCommish && (
                <form className="form" onSubmit={addHeadline}>
                  <input
                    className="input"
                    placeholder="Headline text"
                    value={newHeadline.text}
                    onChange={(e) => setNewHeadline((s) => ({ ...s, text: e.target.value }))}
                  />
                  <input
                    className="input"
                    placeholder="Optional link (https://...)"
                    value={newHeadline.link}
                    onChange={(e) => setNewHeadline((s) => ({ ...s, link: e.target.value }))}
                  />
                  <div className="row">
                    <input
                      className="input"
                      placeholder="Priority (lower = higher)"
                      value={newHeadline.priority}
                      onChange={(e) => setNewHeadline((s) => ({ ...s, priority: e.target.value }))}
                      type="number"
                      min="1"
                      max="999"
                    />
                    <button className="btn primary" type="submit">
                      Add
                    </button>
                  </div>
                </form>
              )}

              <ul className="list">
                {headlines.map((h) => (
                  <li key={h.id} className="listItem">
                    <div className="headlineRow">
                      {h.link ? (
                        <a className="link" href={h.link} target="_blank" rel="noreferrer">
                          {h.text}
                        </a>
                      ) : (
                        <span>{h.text}</span>
                      )}
                      {isCommish && (
                        <button className="btn tiny danger" onClick={() => deleteHeadline(h.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="muted">{timeAgo(h.created_at)}</div>
                  </li>
                ))}
                {headlines.length === 0 && <li className="muted">No headlines yet.</li>}
              </ul>
            </div>

            <div className="ticker">
              <div className="tickerLabel">LIVE</div>
              <div className="tickerText">
                {headlines.length
                  ? headlines.map((h) => h.text).join(" • ")
                  : "Drop your first headline to start the ticker."}
              </div>
            </div>
          </section>

          {/* Center: Articles */}
          <section className="main">
            <div className="card">
              <div className="cardHeader">
                <h2>Top Story</h2>
                <button className="btn small" onClick={loadArticles} disabled={loading.articles}>
                  {loading.articles ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {featuredArticle ? (
                <article className="feature">
                  <div className="featureTop">
                    <div className="kicker">FEATURED</div>
                    <div className="meta">
                      {featuredArticle.week_label ? `Week: ${featuredArticle.week_label}` : null}
                      {featuredArticle.author ? ` • By ${featuredArticle.author}` : null}
                      {` • ${timeAgo(featuredArticle.created_at)}`}
                    </div>
                  </div>
                  <h3 className="featureTitle">{featuredArticle.title}</h3>
                  <p className="featureBody">{featuredArticle.body}</p>

                  {isCommish && (
                    <div className="actions">
                      <button className="btn danger" onClick={() => deleteArticle(featuredArticle.id)}>
                        Delete
                      </button>
                      {featuredArticle.published ? (
                        <button className="btn" onClick={() => unpublishArticle(featuredArticle.id)}>
                          Unpublish
                        </button>
                      ) : (
                        <button className="btn" onClick={() => publishArticle(featuredArticle.id)}>
                          Publish
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ) : (
                <div className="muted">No featured story yet. Commissioner can feature an article.</div>
              )}
            </div>

            <div className="card">
              <div className="cardHeader">
                <h2>More Stories</h2>
              </div>

              <div className="grid">
                {otherArticles.map((a) => (
                  <div key={a.id} className="storyCard">
                    <div className="storyMeta">
                      <span className="badge">{a.week_label ? a.week_label : "Dynasty"}</span>
                      <span className="muted">
                        {a.author ? `By ${a.author} • ` : ""}
                        {timeAgo(a.created_at)}
                      </span>
                    </div>
                    <div className="storyTitle">{a.title}</div>
                    <div className="storyExcerpt">{a.body}</div>

                    {isCommish && (
                      <div className="actions">
                        <button className="btn" onClick={() => setFeatured(a.id)}>
                          Feature
                        </button>
                        <button className="btn danger" onClick={() => deleteArticle(a.id)}>
                          Delete
                        </button>
                        {a.published ? (
                          <button className="btn" onClick={() => unpublishArticle(a.id)}>
                            Unpublish
                          </button>
                        ) : (
                          <button className="btn" onClick={() => publishArticle(a.id)}>
                            Publish
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {otherArticles.length === 0 && (
                  <div className="muted">No additional stories yet.</div>
                )}
              </div>
            </div>

            {isCommish && (
              <div className="card">
                <div className="cardHeader">
                  <h2>Commissioner: Post Article</h2>
                </div>

                <form className="form" onSubmit={addArticle}>
                  <input
                    className="input"
                    placeholder="Title"
                    value={newArticle.title}
                    onChange={(e) => setNewArticle((s) => ({ ...s, title: e.target.value }))}
                  />

                  <div className="row">
                    <input
                      className="input"
                      placeholder="Week label (ex: Week 4)"
                      value={newArticle.week_label}
                      onChange={(e) => setNewArticle((s) => ({ ...s, week_label: e.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="Author (optional)"
                      value={newArticle.author}
                      onChange={(e) => setNewArticle((s) => ({ ...s, author: e.target.value }))}
                    />
                  </div>

                  <textarea
                    className="textarea"
                    placeholder="Paste your article body here…"
                    value={newArticle.body}
                    onChange={(e) => setNewArticle((s) => ({ ...s, body: e.target.value }))}
                    rows={10}
                  />

                  <div className="row">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={newArticle.is_featured}
                        onChange={(e) => setNewArticle((s) => ({ ...s, is_featured: e.target.checked }))}
                      />
                      Feature this article
                    </label>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={newArticle.published}
                        onChange={(e) => setNewArticle((s) => ({ ...s, published: e.target.checked }))}
                      />
                      Published (public)
                    </label>

                    <button className="btn primary" type="submit">
                      Post
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>

          {/* Right rail: Podcast */}
          <section className="rail">
            <div className="card">
              <div className="cardHeader">
                <h2>Dynasty Podcast</h2>
                <button className="btn small" onClick={loadEpisodes} disabled={loading.episodes}>
                  {loading.episodes ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {isCommish && (
                <form className="form" onSubmit={uploadPodcastEpisode}>
                  <input
                    className="input"
                    placeholder="Episode title"
                    value={newEpisode.title}
                    onChange={(e) => setNewEpisode((s) => ({ ...s, title: e.target.value }))}
                  />
                  <input
                    className="input"
                    placeholder="Description (optional)"
                    value={newEpisode.description}
                    onChange={(e) => setNewEpisode((s) => ({ ...s, description: e.target.value }))}
                  />

                  <input
                    className="input"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setNewEpisode((s) => ({ ...s, file: e.target.files?.[0] || null }))}
                  />

                  <button className="btn primary" type="submit">
                    Upload
                  </button>

                  <div className="muted">
                    Only you can upload. Everyone can listen.
                  </div>
                </form>
              )}

              <div className="stack">
                {episodes.map((ep) => (
                  <div key={ep.id} className="episode">
                    <div className="episodeTop">
                      <div className="episodeTitle">{ep.title}</div>
                      <div className="muted">{timeAgo(ep.created_at)}</div>
                    </div>
                    {ep.description && <div className="episodeDesc">{ep.description}</div>}

                    {ep.public_url ? (
                      <audio controls src={ep.public_url} style={{ width: "100%" }} />
                    ) : (
                      <div className="muted">No public URL found for this episode.</div>
                    )}

                    {isCommish && (
                      <div className="actions">
                        <button className="btn danger" onClick={() => deleteEpisode(ep)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {episodes.length === 0 && (
                  <div className="muted">No episodes yet. Commissioner can upload the first one.</div>
                )}
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="layoutSocial">
          <section className="main">
            <div className="card">
              <div className="cardHeader">
                <h2>Social</h2>
                <button className="btn small" onClick={loadPosts} disabled={loading.posts}>
                  {loading.posts ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              <form className="form" onSubmit={addPost}>
                <div className="row">
                  <input
                    className="input"
                    placeholder="Display name (optional)"
                    value={newPost.display_name}
                    onChange={(e) => setNewPost((s) => ({ ...s, display_name: e.target.value }))}
                  />
                  <button className="btn primary" type="submit">
                    Post
                  </button>
                </div>

                <textarea
                  className="textarea"
                  placeholder="Post anything dynasty-related (trash talk encouraged)…"
                  value={newPost.content}
                  onChange={(e) => setNewPost((s) => ({ ...s, content: e.target.value }))}
                  rows={4}
                />

                <div className="muted">
                  Anyone can post. Commissioner can delete posts.
                </div>
              </form>
            </div>

            <div className="card">
              <div className="cardHeader">
                <h2>Latest Posts</h2>
              </div>

              <div className="stack">
                {posts.map((p) => (
                  <div key={p.id} className="post">
                    <div className="postTop">
                      <div className="postName">{p.display_name || "Anonymous"}</div>
                      <div className="muted">{timeAgo(p.created_at)}</div>
                    </div>
                    <div className="postBody">{p.content}</div>

                    {isCommish && (
                      <div className="actions">
                        <button className="btn tiny danger" onClick={() => deletePost(p.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {posts.length === 0 && <div className="muted">No posts yet. Start the talk.</div>}
              </div>
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <div className="muted">
          Commissioner-only content is protected by Supabase RLS. Social posting is public by design.
        </div>
      </footer>
    </div>
  );
}
