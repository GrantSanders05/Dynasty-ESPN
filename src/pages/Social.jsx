import React, { useEffect, useMemo, useState } from "react";
import PostCard from "../components/PostCard.jsx";

/**
 * Social tab (Supabase-backed)
 *
 * Expected tables (default names):
 * - posts: id, created_at, display_name, content
 * - post_reactions: id, post_id, user_id, vote (1 = like, -1 = dislike)
 * - post_replies: id, post_id, created_at, display_name, content
 *
 * If your table names differ, change the constants below.
 */
const POSTS_TABLE = "posts";
const REACTIONS_TABLE = "post_reactions";
const REPLIES_TABLE = "post_replies";

export default function Social({ supabase, user, isCommish }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [repliesByPostId, setRepliesByPostId] = useState({});
  const [myVotesByPostId, setMyVotesByPostId] = useState({});

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [text, setText] = useState("");
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

  async function loadSocial() {
    setLoading(true);

    const p = await supabase.from(POSTS_TABLE).select("*").order("created_at", { ascending: false });
    if (p.error) {
      flashError(`Posts: ${p.error.message}`);
      setPosts([]);
      setLoading(false);
      return;
    }

    const list = p.data || [];
    const ids = list.map((x) => x.id);

    // Load reactions for these posts, then aggregate in JS
    let reactions = [];
    if (ids.length) {
      const r = await supabase.from(REACTIONS_TABLE).select("post_id,user_id,vote").in("post_id", ids);
      if (!r.error) reactions = r.data || [];
    }

    const likes = {};
    const dislikes = {};
    const mine = {};

    for (const r of reactions) {
      if (r.vote === 1) likes[r.post_id] = (likes[r.post_id] || 0) + 1;
      if (r.vote === -1) dislikes[r.post_id] = (dislikes[r.post_id] || 0) + 1;
      if (user?.id && r.user_id === user.id) mine[r.post_id] = r.vote;
    }

    // Load replies
    let replies = [];
    if (ids.length) {
      const rr = await supabase.from(REPLIES_TABLE).select("*").in("post_id", ids).order("created_at", { ascending: true });
      if (!rr.error) replies = rr.data || [];
    }

    const grouped = {};
    for (const rep of replies) {
      grouped[rep.post_id] = grouped[rep.post_id] || [];
      grouped[rep.post_id].push(rep);
    }

    // Attach counts
    const hydrated = list.map((post) => ({
      ...post,
      likes: likes[post.id] || 0,
      dislikes: dislikes[post.id] || 0,
    }));

    setPosts(hydrated);
    setRepliesByPostId(grouped);
    setMyVotesByPostId(mine);

    setLoading(false);
  }

  useEffect(() => {
    loadSocial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function addPost(e) {
    e.preventDefault();
    if (!text.trim()) return flashError("Write something first.");

    setPosting(true);
    try {
      const { error } = await supabase.from(POSTS_TABLE).insert({
        display_name: name.trim() || "Anonymous",
        content: text.trim(),
      });
      if (error) throw error;

      setText("");
      flashNotice("Posted.");
      await loadSocial();
    } catch (e2) {
      flashError(e2?.message || "Failed to post.");
    } finally {
      setPosting(false);
    }
  }

  async function deletePost(id) {
    if (!isCommish) return;
    if (!confirm("Delete this post?")) return;

    try {
      await supabase.from(POSTS_TABLE).delete().eq("id", id);
      // Cleanup children (optional if you use FK cascade; safe to try)
      await supabase.from(REACTIONS_TABLE).delete().eq("post_id", id);
      await supabase.from(REPLIES_TABLE).delete().eq("post_id", id);
      flashNotice("Deleted.");
      await loadSocial();
    } catch (e) {
      flashError(e?.message || "Delete failed.");
    }
  }

  async function vote(postId, nextVote) {
    if (!user?.id) {
      flashError("Sign in to react.");
      return;
    }

    const current = myVotesByPostId[postId]; // 1, -1, or undefined
    const shouldRemove = current === nextVote;

    try {
      // Remove any existing vote for this user/post
      await supabase
        .from(REACTIONS_TABLE)
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      // Add if not removing
      if (!shouldRemove) {
        const { error } = await supabase.from(REACTIONS_TABLE).insert({
          post_id: postId,
          user_id: user.id,
          vote: nextVote,
        });
        if (error) throw error;
      }

      await loadSocial();
    } catch (e) {
      flashError(e?.message || "Reaction failed.");
    }
  }

  async function reply(postId, displayName, content) {
    if (!content.trim()) return;

    try {
      const { error } = await supabase.from(REPLIES_TABLE).insert({
        post_id: postId,
        display_name: (displayName || "").trim() || "Anonymous",
        content: content.trim(),
      });
      if (error) throw error;
      await loadSocial();
    } catch (e) {
      flashError(e?.message || "Reply failed.");
    }
  }

  const headerRight = useMemo(() => {
    if (loading) return "Loading...";
    return `${posts.length} posts`;
  }, [loading, posts.length]);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 style={{ margin: 0 }}>Social</h1>
          <div className="muted">Post updates, talk trash, drop clips.</div>
        </div>
        <div className="muted">{headerRight}</div>
      </div>

      {(notice || error) ? (
        <div style={{ marginBottom: 12 }}>
          {notice ? <div className="banner notice">{notice}</div> : null}
          {error ? <div className="banner error">{error}</div> : null}
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="cardHeader">
          <h2>Create Post</h2>
          <div className="muted">{user ? "Signed in" : "Sign in to react (posting is still allowed)."}</div>
        </div>

        <form className="form" onSubmit={addPost}>
          <div className="row">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" />
            <button className="btn primary" type="submit" disabled={posting}>
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
          <textarea className="textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What happened this week?…" />
        </form>
      </div>

      {loading ? (
        <div className="muted">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="muted">No posts yet.</div>
      ) : (
        <div className="stack">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              myVote={myVotesByPostId[p.id]}
              isCommish={isCommish}
              onDelete={deletePost}
              onVote={vote}
              onReply={reply}
              replies={repliesByPostId[p.id] || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
