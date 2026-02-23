import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient.js";

/**
 * Minimal-file ESPN-ish Dynasty site
 * - Home tab: headlines, articles, podcast (commissioner edits/uploads)
 * - Social tab: anyone can post (anon insert policy), commissioner can delete
 *
 * Commissioner auth:
 * - Use Supabase Auth (email+password)
 * - Add commissioner email(s) to public.commissioners table
 */

const BRAND = {
  leagueName: "CFB 26 Online Dynasty",
  subTitle: "5-Man League • Weekly Recaps • Trash Talk",
};

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

async function isCommissionerForSession(session) {
  // If not signed in → not commissioner
  const user = session?.user;
  if (!user?.email) return false;

  // Commissioners are controlled by a simple "allow list" table.
  // RLS should allow selecting this table to everyone (read-only), or
  // you can lock it down and instead use an RPC. We keep it simple.
  const { data, error } = await supabase
    .from("commissioners")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (error) {
    console.warn("Commissioner check error:", error.message);
    return false;
  }
  return !!data?.email;
}

export default function App() {
  const [tab, setTab] = useState("home"); // home | social
  const [loading, setLoading] = useState(true);

  const [session, setSession] = useState(null);
  const [isCommissioner, setIsCommissioner] = useState(false);

  const [headlines, setHeadlines] = useState([]);
  const [articles, setArticles] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);

  // Auth form
  const [authMode, setAuthMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  // Commissioner content forms
  const [headlineText, setHeadlineText] = useState("");
  const [headlineLink, setHeadlineLink] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [articleBody, setArticleBody] = useState("");
  const [articleWeek, setArticleWeek] = useState("Week 1");
  const [articleAuthor, setArticleAuthor] = useState("Commissioner");
  const [podTitle, setPodTitle] = useState("");
  const [podDesc, setPodDesc] = useState("");

  // Social post form
  const [displayName, setDisplayName] = useState("");
  const [postText, setPostText] = useState("");
  const [postMsg, setPostMsg] = useState("");

  const podcastFileRef = useRef(null);

  const featuredArticle = useMemo(() => articles.find((a) => a.is_featured) ?? articles[0], [articles]);
  const otherArticles = useMemo(
    () => articles.filter((a) => (featuredArticle ? a.id !== featuredArticle.id : true)),
    [articles, featuredArticle]
  );

  useEffect(() => {
    // Initial auth load + listener
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // When session changes, re-check commissioner + reload content (RLS may differ)
    let cancelled = false;

    (async () => {
      const commissioner = await isCommissionerForSession(session);
      if (!cancelled) setIsCommissioner(commissioner);

      // Always load public content
      await loadAll();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function loadAll() {
    await Promise.all([loadHeadlines(), loadArticles(), loadEpisodes(), loadSocial()]);
  }

  async function loadHeadlines() {
    const { data, error } = await supabase
      .from("headlines")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) console.warn("Headlines load:", error.message);
    setHeadlines(data ?? []);
  }

  async function loadArticles() {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) console.warn("Articles load:", error.message);
    setArticles(data ?? []);
  }

  async function loadEpisodes() {
    const { data, error } = await supabase
      .from("podcast_episodes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.warn("Episodes load:", error.message);
    setEpisodes(data ?? []);
  }

  async function loadSocial() {
    const { data, error } = await supabase
      .from("social_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) console.warn("Social load:", error.message);
    setSocialPosts(data ?? []);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthMsg("");

    try {
      if (!email || !password) {
        setAuthMsg("Email + password required.");
        return;
      }

      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthMsg("Signed up. If email confirmation is ON, check your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthMsg("Signed in.");
      }
    } catch (err) {
      setAuthMsg(err.message || "Auth error");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Commissioner actions
  async function addHeadline(e) {
    e.preventDefault();
    if (!headlineText.trim()) return;

    const payload = {
      text: headlineText.trim(),
      link: headlineLink.trim() || null,
      priority: 50,
    };

    const { error } = await supabase.from("headlines").insert(payload);
    if (error) return alert(error.message);

    setHeadlineText("");
    setHeadlineLink("");
    loadHeadlines();
  }

  async function deleteHeadline(id) {
    if (!confirm("Delete this headline?")) return;
    const { error } = await supabase.from("headlines").delete().eq("id", id);
    if (error) return alert(error.message);
    loadHeadlines();
  }

  async function addArticle(e) {
    e.preventDefault();
    if (!articleTitle.trim() || !articleBody.trim()) return;

    const payload = {
      title: articleTitle.trim(),
      body: articleBody.trim(),
      week_label: articleWeek.trim(),
      author: articleAuthor.trim() || "Commissioner",
      published: true,
      is_featured: false,
    };

    const { error } = await supabase.from("articles").insert(payload);
    if (error) return alert(error.message);

    setArticleTitle("");
    setArticleBody("");
    loadArticles();
  }

  async function toggleFeatured(articleId, nextValue) {
    // Keep it simple: clear featured from all, then set one.
    const { error: clearErr } = await supabase.from("articles").update({ is_featured: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (clearErr) return alert(clearErr.message);

    const { error: setErr } = await supabase.from("articles").update({ is_featured: nextValue }).eq("id", articleId);
    if (setErr) return alert(setErr.message);

    loadArticles();
  }

  async function deleteArticle(id) {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) return alert(error.message);
    loadArticles();
  }

  async function uploadPodcast(e) {
    e.preventDefault();
    const file = podcastFileRef.current?.files?.[0];
    if (!file) return alert("Pick an audio file first.");
    if (!podTitle.trim()) return alert("Podcast title required.");

    // File naming: timestamp + original name
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${Date.now()}_${safeName}`;

    // Upload to Storage bucket "podcasts"
    const { error: upErr } = await supabase.storage.from("podcasts").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "audio/mpeg",
    });
    if (upErr) return alert(upErr.message);

    // Get public URL (bucket should be public for easy playback)
    const { data: pub } = supabase.storage.from("podcasts").getPublicUrl(path);
    const publicUrl = pub?.publicUrl || null;

    // Save metadata row
    const { error: rowErr } = await supabase.from("podcast_episodes").insert({
      title: podTitle.trim(),
      description: podDesc.trim() || null,
      file_path: path,
      public_url: publicUrl,
    });
    if (rowErr) return alert(rowErr.message);

    // reset
    setPodTitle("");
    setPodDesc("");
    if (podcastFileRef.current) podcastFileRef.current.value = "";
    loadEpisodes();
  }

  async function deleteEpisode(id, filePath) {
    if (!confirm("Delete this episode?")) return;

    const { error: rowErr } = await supabase.from("podcast_episodes").delete().eq("id", id);
    if (rowErr) return alert(rowErr.message);

    // best effort file delete
    await supabase.storage.from("podcasts").remove([filePath]).catch(() => {});
    loadEpisodes();
  }

  // Social actions
  async function createPost(e) {
    e.preventDefault();
    setPostMsg("");
    const name = (displayName || "Anonymous").trim().slice(0, 40);
    const content = postText.trim();

    if (!content) return;

    // tiny spam guard: basic length limit
    if (content.length > 800) {
      setPostMsg("Keep it under 800 characters.");
      return;
    }

    const { error } = await supabase.from("social_posts").insert({ display_name: name, content });
    if (error) {
      setPostMsg(error.message);
      return;
    }

    setPostText("");
    setPostMsg("Posted.");
    loadSocial();
  }

  async function deleteSocialPost(id) {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    if (error) return alert(error.message);
    loadSocial();
  }

  return (
    <div className="app">
      <Header tab={tab} setTab={setTab} />

      <main className="container">
        {loading ? (
          <div className="card p24">
            <div className="skeleton h16 w40" />
            <div className="skeleton h12 w80 mt12" />
            <div className="skeleton h12 w70 mt8" />
            <div className="skeleton h12 w60 mt8" />
          </div>
        ) : (
          <>
            <div className="topGrid">
              <div className="brandCard card p20">
                <div className="kicker">DYNASTY HUB</div>
                <h1 className="h1">{BRAND.leagueName}</h1>
                <p className="muted">{BRAND.subTitle}</p>

                <div className="row gap12 mt14">
                  <span className={cn("pill", tab === "home" && "pillActive")} onClick={() => setTab("home")}>
                    Home
                  </span>
                  <span className={cn("pill", tab === "social" && "pillActive")} onClick={() => setTab("social")}>
                    Social
                  </span>
                </div>
              </div>

              <div className="authCard card p20">
                <div className="row between center">
                  <div>
                    <div className="kicker">COMMISSIONER ACCESS</div>
                    <div className="muted small">
                      {session?.user?.email ? (
                        <>
                          Signed in as <b>{session.user.email}</b>
                          {isCommissioner ? <span className="tag ok ml8">Commissioner</span> : <span className="tag warn ml8">Viewer</span>}
                        </>
                      ) : (
                        "Sign in only if you're the commissioner."
                      )}
                    </div>
                  </div>
                  {session?.user ? (
                    <button className="btn" onClick={signOut}>
                      Sign out
                    </button>
                  ) : null}
                </div>

                {!session?.user ? (
                  <form className="mt14" onSubmit={handleAuth}>
                    <div className="grid2 gap10">
                      <div>
                        <label>Email</label>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="commissioner@email.com" />
                      </div>
                      <div>
                        <label>Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                      </div>
                    </div>

                    <div className="row gap10 mt10">
                      <button className="btn primary" type="submit">
                        {authMode === "signup" ? "Create account" : "Sign in"}
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => setAuthMode((m) => (m === "signin" ? "signup" : "signin"))}
                      >
                        Switch to {authMode === "signin" ? "Sign up" : "Sign in"}
                      </button>
                    </div>
                    {authMsg ? <div className="mt10 small muted">{authMsg}</div> : null}
                  </form>
                ) : (
                  <div className="mt10 small muted">
                    {isCommissioner ? "You can edit headlines, articles, and upload the podcast below." : "You are signed in, but not on the commissioner list."}
                  </div>
                )}
              </div>
            </div>

            {tab === "home" ? (
              <Home
                headlines={headlines}
                articles={articles}
                featuredArticle={featuredArticle}
                otherArticles={otherArticles}
                episodes={episodes}
                isCommissioner={isCommissioner}
                onAddHeadline={addHeadline}
                onDeleteHeadline={deleteHeadline}
                headlineText={headlineText}
                setHeadlineText={setHeadlineText}
                headlineLink={headlineLink}
                setHeadlineLink={setHeadlineLink}
                onAddArticle={addArticle}
                onDeleteArticle={deleteArticle}
                onToggleFeatured={toggleFeatured}
                articleTitle={articleTitle}
                setArticleTitle={setArticleTitle}
                articleBody={articleBody}
                setArticleBody={setArticleBody}
                articleWeek={articleWeek}
                setArticleWeek={setArticleWeek}
                articleAuthor={articleAuthor}
                setArticleAuthor={setArticleAuthor}
                podTitle={podTitle}
                setPodTitle={setPodTitle}
                podDesc={podDesc}
                setPodDesc={setPodDesc}
                podcastFileRef={podcastFileRef}
                onUploadPodcast={uploadPodcast}
                onDeleteEpisode={deleteEpisode}
              />
            ) : (
              <Social
                posts={socialPosts}
                isCommissioner={isCommissioner}
                displayName={displayName}
                setDisplayName={setDisplayName}
                postText={postText}
                setPostText={setPostText}
                postMsg={postMsg}
                onCreatePost={createPost}
                onDeletePost={deleteSocialPost}
              />
            )}

            <Footer />
          </>
        )}
      </main>
    </div>
  );
}

function Header({ tab, setTab }) {
  return (
    <header className="header">
      <div className="headerInner">
        <div className="logo">
          <span className="logoMark">D</span>
          <span className="logoText">Dynasty ESPN</span>
        </div>

        <nav className="nav">
          <button className={cn("navBtn", tab === "home" && "active")} onClick={() => setTab("home")}>
            Home
          </button>
          <button className={cn("navBtn", tab === "social" && "active")} onClick={() => setTab("social")}>
            Social
          </button>
        </nav>

        <div className="right muted small">Public landing page • commissioner edits</div>
      </div>
    </header>
  );
}

function Home({
  headlines,
  featuredArticle,
  otherArticles,
  episodes,
  isCommissioner,
  onAddHeadline,
  onDeleteHeadline,
  headlineText,
  setHeadlineText,
  headlineLink,
  setHeadlineLink,
  onAddArticle,
  onDeleteArticle,
  onToggleFeatured,
  articleTitle,
  setArticleTitle,
  articleBody,
  setArticleBody,
  articleWeek,
  setArticleWeek,
  articleAuthor,
  setArticleAuthor,
  podTitle,
  setPodTitle,
  podDesc,
  setPodDesc,
  podcastFileRef,
  onUploadPodcast,
  onDeleteEpisode,
}) {
  return (
    <div className="contentGrid">
      <section className="card p20">
        <div className="sectionTitle">Top Headlines</div>
        <div className="divider mt10" />
        <div className="headlineList mt10">
          {headlines.length === 0 ? <div className="muted small">No headlines yet.</div> : null}
          {headlines.map((h) => (
            <div key={h.id} className="headlineRow">
              <div className="dot" />
              <div className="headlineText">
                {h.link ? (
                  <a className="link" href={h.link} target="_blank" rel="noreferrer">
                    {h.text}
                  </a>
                ) : (
                  <span>{h.text}</span>
                )}
                <div className="muted small">{formatDate(h.created_at)}</div>
              </div>
              {isCommissioner ? (
                <button className="btn tiny danger" onClick={() => onDeleteHeadline(h.id)}>
                  Delete
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {isCommissioner ? (
          <form className="mt16" onSubmit={onAddHeadline}>
            <div className="kicker">Add headline</div>
            <div className="grid2 gap10 mt8">
              <div>
                <label>Headline text</label>
                <input value={headlineText} onChange={(e) => setHeadlineText(e.target.value)} placeholder="UGA drops 60 — commissioner in shambles" />
              </div>
              <div>
                <label>Optional link</label>
                <input value={headlineLink} onChange={(e) => setHeadlineLink(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <button className="btn primary mt10" type="submit">
              Add
            </button>
          </form>
        ) : null}
      </section>

      <section className="card p20">
        <div className="row between center">
          <div className="sectionTitle">Featured Story</div>
          {featuredArticle ? (
            <div className="muted small">
              {featuredArticle.week_label} • {featuredArticle.author} • {formatDate(featuredArticle.created_at)}
            </div>
          ) : null}
        </div>
        <div className="divider mt10" />

        {featuredArticle ? (
          <article className="mt10">
            <h2 className="h2">{featuredArticle.title}</h2>
            <div className="articleBody mt10">{featuredArticle.body}</div>

            {isCommissioner ? (
              <div className="row gap10 mt12">
                <button className="btn tiny" onClick={() => onToggleFeatured(featuredArticle.id, false)}>
                  Unfeature
                </button>
                <button className="btn tiny danger" onClick={() => onDeleteArticle(featuredArticle.id)}>
                  Delete
                </button>
              </div>
            ) : null}
          </article>
        ) : (
          <div className="muted small mt10">No articles yet. Commissioner can paste one below.</div>
        )}

        {otherArticles.length ? (
          <div className="mt16">
            <div className="kicker">More stories</div>
            <div className="divider mt8" />
            <div className="articleList mt10">
              {otherArticles.slice(0, 6).map((a) => (
                <div key={a.id} className="articleRow">
                  <div>
                    <div className="articleTitle">{a.title}</div>
                    <div className="muted small">
                      {a.week_label} • {a.author} • {formatDate(a.created_at)}
                    </div>
                  </div>
                  {isCommissioner ? (
                    <div className="row gap8">
                      <button className="btn tiny" onClick={() => onToggleFeatured(a.id, true)}>
                        Feature
                      </button>
                      <button className="btn tiny danger" onClick={() => onDeleteArticle(a.id)}>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isCommissioner ? (
          <form className="mt16" onSubmit={onAddArticle}>
            <div className="kicker">Add article (paste)</div>
            <div className="grid2 gap10 mt8">
              <div>
                <label>Title</label>
                <input value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="Week 5 Recap: The Upset Heard Round The PAC-12" />
              </div>
              <div>
                <label>Week label</label>
                <input value={articleWeek} onChange={(e) => setArticleWeek(e.target.value)} placeholder="Week 1" />
              </div>
            </div>
            <div className="grid2 gap10 mt10">
              <div>
                <label>Author</label>
                <input value={articleAuthor} onChange={(e) => setArticleAuthor(e.target.value)} placeholder="Commissioner" />
              </div>
              <div className="muted small">
                Tip: keep it readable—short paragraphs, bullet highlights, and bold names.
              </div>
            </div>
            <div className="mt10">
              <label>Body (paste your recap)</label>
              <textarea value={articleBody} onChange={(e) => setArticleBody(e.target.value)} rows={10} placeholder="Paste the recap here..." />
            </div>
            <button className="btn primary mt10" type="submit">
              Publish
            </button>
          </form>
        ) : null}
      </section>

      <aside className="card p20">
        <div className="sectionTitle">Dynasty Podcast</div>
        <div className="divider mt10" />

        {episodes.length === 0 ? <div className="muted small mt10">No episodes yet.</div> : null}

        <div className="episodeList mt10">
          {episodes.slice(0, 6).map((ep) => (
            <div key={ep.id} className="episodeCard">
              <div className="row between center">
                <div>
                  <div className="episodeTitle">{ep.title}</div>
                  <div className="muted small">{formatDate(ep.created_at)}</div>
                </div>
                {isCommissioner ? (
                  <button className="btn tiny danger" onClick={() => onDeleteEpisode(ep.id, ep.file_path)}>
                    Delete
                  </button>
                ) : null}
              </div>
              {ep.description ? <div className="muted small mt8">{ep.description}</div> : null}
              {ep.public_url ? (
                <audio className="mt10" controls src={ep.public_url} />
              ) : (
                <div className="muted small mt10">Audio URL missing (check storage settings).</div>
              )}
            </div>
          ))}
        </div>

        {isCommissioner ? (
          <form className="mt16" onSubmit={onUploadPodcast}>
            <div className="kicker">Upload new episode</div>
            <div className="mt8">
              <label>Title</label>
              <input value={podTitle} onChange={(e) => setPodTitle(e.target.value)} placeholder="Week 4 Power Rankings Show" />
            </div>
            <div className="mt10">
              <label>Description (optional)</label>
              <input value={podDesc} onChange={(e) => setPodDesc(e.target.value)} placeholder="30 minutes • game recaps • awards" />
            </div>
            <div className="mt10">
              <label>Audio file</label>
              <input ref={podcastFileRef} type="file" accept="audio/*" />
            </div>
            <button className="btn primary mt10" type="submit">
              Upload
            </button>
            <div className="muted small mt8">
              Only commissioner accounts can upload (Storage policy).
            </div>
          </form>
        ) : null}

        <div className="divider mt16" />
        <div className="kicker mt12">Quick Links</div>
        <div className="linkList mt10">
          <a className="link" href="#" onClick={(e) => e.preventDefault()}>
            Standings (coming soon)
          </a>
          <a className="link" href="#" onClick={(e) => e.preventDefault()}>
            Schedule (coming soon)
          </a>
          <a className="link" href="#" onClick={(e) => e.preventDefault()}>
            Awards (coming soon)
          </a>
        </div>
      </aside>
    </div>
  );
}

function Social({ posts, isCommissioner, displayName, setDisplayName, postText, setPostText, postMsg, onCreatePost, onDeletePost }) {
  return (
    <div className="contentGrid">
      <section className="card p20">
        <div className="sectionTitle">Social Feed</div>
        <div className="muted small mt6">Anyone can post. Keep it fun. Keep it respectful.</div>
        <div className="divider mt10" />

        <form className="mt12" onSubmit={onCreatePost}>
          <div className="grid2 gap10">
            <div>
              <label>Display name</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Grant / Hailey / Anonymous" />
            </div>
            <div className="muted small">
              Tip: If spam ever becomes an issue, we can flip this to “must be logged in” later.
            </div>
          </div>
          <div className="mt10">
            <label>Post</label>
            <textarea value={postText} onChange={(e) => setPostText(e.target.value)} rows={4} placeholder="Drop your hot takes..." />
          </div>
          <div className="row gap10 mt10">
            <button className="btn primary" type="submit">
              Post
            </button>
            {postMsg ? <div className="muted small">{postMsg}</div> : null}
          </div>
        </form>
      </section>

      <section className="card p20">
        <div className="sectionTitle">Latest</div>
        <div className="divider mt10" />

        <div className="feed mt10">
          {posts.length === 0 ? <div className="muted small">No posts yet.</div> : null}
          {posts.map((p) => (
            <div key={p.id} className="post">
              <div className="row between center">
                <div className="row center gap10">
                  <div className="avatar">{(p.display_name || "A").slice(0, 1).toUpperCase()}</div>
                  <div>
                    <div className="postName">{p.display_name || "Anonymous"}</div>
                    <div className="muted small">{formatDate(p.created_at)}</div>
                  </div>
                </div>
                {isCommissioner ? (
                  <button className="btn tiny danger" onClick={() => onDeletePost(p.id)}>
                    Delete
                  </button>
                ) : null}
              </div>
              <div className="postBody mt10">{p.content}</div>
            </div>
          ))}
        </div>
      </section>

      <aside className="card p20">
        <div className="sectionTitle">Rules</div>
        <div className="divider mt10" />
        <ul className="rules mt10">
          <li>No personal attacks.</li>
          <li>Keep it dynasty-related.</li>
          <li>Commissioner can delete anything.</li>
        </ul>
        <div className="divider mt16" />
        <div className="muted small mt12">Want reactions, polls, images, or weekly threads? Easy add-ons later.</div>
      </aside>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="muted small">
        Built for a 5-man CFB 26 dynasty • ESPN-style layout • Supabase backend
      </div>
    </footer>
  );
}
