import React, { useEffect, useMemo, useState } from "react";
import PostCard from "../components/PostCard.jsx";

/**
 * Social (Supabase)
 * - Keeps all existing functionality (posts, reactions, replies)
 * - Visual upgrade: thread replies render INSIDE the post card as a proper thread
 * - Fix: reply() now throws on error so PostCard knows it failed and shows the error
 */
const POSTS_TABLE = "social_posts";
const VOTES_TABLE = "social_votes";
const REPLIES_TABLE = "social_replies";
const VOTER_KEY_STORAGE = "dynasty_voter_key_v1";

function getOrCreateVoterKey() {
  try {
    const existing = localStorage.getItem(VOTER_KEY_STORAGE);
    if (existing && existing.length >= 10) return existing;
    const key = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(VOTER_KEY_STORAGE, key);
    return key;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

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

  const voterKey = useMemo(() => getOrCreateVoterKey(), []);

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

    // Votes
    let votes = [];
    if (ids.length) {
      const v = await supabase.from(VOTES_TABLE).select("post_id,voter_key,value").in("post_id", ids);
      if (!v.error) votes = v.data || [];
    }

    const likes = {};
    const dislikes = {};
    const mine = {};
    for (const v of votes) {
      if (v.value === 1) likes[v.post_id] = (likes[v.post_id] || 0) + 1;
      if (v.value === -1) dislikes[v.post_id] = (dislikes[v.post_id] || 0) + 1;
      if (v.voter_key === voterKey) mine[v.post_id] = v.value;
    }

    // Replies
    let replies = [];
    if (ids.length) {
      const r = await supabase.from(REPLIES_TABLE).select("*").in("post_id", ids).order("created_at", { ascending: true });
      if (!r.error) replies = r.data || [];
    }

    const grouped = {};
    for (const rep of replies) {
      grouped[rep.post_id] = grouped[rep.post_id] || [];
      grouped[rep.post_id].push(rep);
    }

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
      await supabase.from(VOTES_TABLE).delete().eq("post_id", id);
      await supabase.from(REPLIES_TABLE).delete().eq("post_id", id);
      flashNotice("Deleted.");
      await loadSocial();
    } catch (e) {
      flashError(e?.message || "Delete failed.");
    }
  }

  async function vote(postId, nextVote) {
    const current = myVotesByPostId[postId];
    const shouldRemove = current === nextVote;

    try {
      await supabase.from(VOTES_TABLE).delete().eq("post_id", postId).eq("voter_key", voterKey);
      if (!shouldRemove) {
        const { error } = await supabase.from(VOTES_TABLE).insert({
          post_id: postId,
          voter_key: voterKey,
          value: nextVote,
        });
        if (error) throw error;
      }
      await loadSocial();
    } catch (e) {
      flashError(e?.message || "Reaction failed.");
    }
  }

  // FIX: reply now throws on error so PostCard knows the insert failed.
  // This prevents the text from clearing on failure and surfaces the
  // exact Supabase error message in the banner at the top of the page.
  async function reply(postId, displayName, content) {
    if (!content.trim()) return;
    const { error } = await supabase.from(REPLIES_TABLE).insert({
      post_id: postId,
      parent_reply_id: null,
      display_name: (displayName || "").trim() || "Anonymous",
      content: content.trim(),
    });
    if (error) {
      flashError(error.message || "Reply failed.");
      throw error; // re-throw so PostCard does NOT clear the text box
    }
    await loadSocial();
  }

  const headerRight = useMemo(() => (loading ? "Loading..." : `${posts.length} posts`), [loading, posts.length]);

  return (
    <div className="page socialPage">
      <h1>Social</h1>
      <div className="muted" style={{ marginBottom: 8, fontWeight: 800 }}>Post updates, talk trash, drop clips.</div>
      <div className="muted" style={{ marginBottom: 12 }}>{headerRight}</div>

      {(notice || error) ? (
        <div className="row" style={{ marginBottom: 12 }}>
          {notice ? (
            <div className="card" style={{ borderColor: "rgba(43,212,106,.30)", background: "rgba(43,212,106,.08)", flex: 1 }}>{notice}</div>
          ) : null}
          {error ? (
            <div className="card" style={{ borderColor: "rgba(255,90,95,.35)", background: "rgba(255,90,95,.08)", flex: 1 }}>{error}</div>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <div className="cardHeader">
          <h2>Create Post</h2>
          <div className="muted" style={{ fontWeight: 800 }}>Anyone can post. Reactions use a browser-based voter key.</div>
        </div>

        <form onSubmit={addPost} className="form">
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
        <div className="muted" style={{ marginTop: 12 }}>Loading…</div>
      ) : posts.length === 0 ? (
        <div className="muted" style={{ marginTop: 12 }}>No posts yet.</div>
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
