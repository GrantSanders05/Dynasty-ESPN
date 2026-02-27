import React, { useEffect, useMemo, useState } from "react";
import PostCard from "../components/PostCard.jsx";

const POSTS_TABLE = "social_posts";
const VOTES_TABLE = "social_votes";
const REPLIES_TABLE = "social_replies";
const REPLY_VOTES_TABLE = "reply_votes";
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
  const [myReplyVotes, setMyReplyVotes] = useState({});

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

    // Post votes
    let votes = [];
    if (ids.length) {
      const v = await supabase.from(VOTES_TABLE).select("post_id,voter_key,value").in("post_id", ids);
      if (!v.error) votes = v.data || [];
    }

    const likes = {};
    const dislikes = {};
    const mine = {};
    for (const v of votes) {
      if (v.value === 1)  likes[v.post_id]    = (likes[v.post_id]    || 0) + 1;
      if (v.value === -1) dislikes[v.post_id] = (dislikes[v.post_id] || 0) + 1;
      if (v.voter_key === voterKey) mine[v.post_id] = v.value;
    }

    // Replies
    let replies = [];
    if (ids.length) {
      const r = await supabase
        .from(REPLIES_TABLE)
        .select("*")
        .in("post_id", ids)
        .order("created_at", { ascending: true });
      if (!r.error) replies = r.data || [];
    }

    // Reply votes
    let replyVotes = [];
    if (replies.length) {
      const replyIds = replies.map((r) => r.id);
      const rv = await supabase
        .from(REPLY_VOTES_TABLE)
        .select("reply_id,voter_key,value")
        .in("reply_id", replyIds);
      if (!rv.error) replyVotes = rv.data || [];
    }

    const replyLikes = {};
    const replyDislikes = {};
    const myRV = {};
    for (const rv of replyVotes) {
      if (rv.value === 1)  replyLikes[rv.reply_id]    = (replyLikes[rv.reply_id]    || 0) + 1;
      if (rv.value === -1) replyDislikes[rv.reply_id] = (replyDislikes[rv.reply_id] || 0) + 1;
      if (rv.voter_key === voterKey) myRV[rv.reply_id] = rv.value;
    }

    const hydratedReplies = replies.map((r) => ({
      ...r,
      likes: replyLikes[r.id] || 0,
      dislikes: replyDislikes[r.id] || 0,
    }));

    const grouped = {};
    for (const rep of hydratedReplies) {
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
    setMyReplyVotes(myRV);
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
      // Remove post from local state immediately
      setPosts((prev) => prev.filter((p) => p.id !== id));
      flashNotice("Deleted.");
    } catch (e) {
      flashError(e?.message || "Delete failed.");
    }
  }

  // ─── OPTIMISTIC VOTE ON A POST ───────────────────────────────────────────
  async function vote(postId, nextVote) {
    const current = myVotesByPostId[postId];
    const shouldRemove = current === nextVote;
    const newVote = shouldRemove ? null : nextVote;

    // 1. Update local state instantly — no flicker, no reload
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        let { likes, dislikes } = p;

        // Undo previous vote
        if (current === 1)  likes    = Math.max(0, likes - 1);
        if (current === -1) dislikes = Math.max(0, dislikes - 1);

        // Apply new vote
        if (!shouldRemove && nextVote === 1)  likes    += 1;
        if (!shouldRemove && nextVote === -1) dislikes += 1;

        return { ...p, likes, dislikes };
      })
    );
    setMyVotesByPostId((prev) => ({ ...prev, [postId]: newVote }));

    // 2. Sync with database in the background
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
    } catch (e) {
      // Roll back local state if DB write failed
      flashError("Reaction failed — please try again.");
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          let { likes, dislikes } = p;
          if (!shouldRemove && nextVote === 1)  likes    = Math.max(0, likes - 1);
          if (!shouldRemove && nextVote === -1) dislikes = Math.max(0, dislikes - 1);
          if (current === 1)  likes    += 1;
          if (current === -1) dislikes += 1;
          return { ...p, likes, dislikes };
        })
      );
      setMyVotesByPostId((prev) => ({ ...prev, [postId]: current }));
    }
  }

  // ─── OPTIMISTIC VOTE ON A REPLY ──────────────────────────────────────────
  async function voteReply(replyId, nextVote) {
    // Find which post this reply belongs to
    let ownerPostId = null;
    for (const [pid, reps] of Object.entries(repliesByPostId)) {
      if (reps.some((r) => r.id === replyId)) { ownerPostId = pid; break; }
    }

    const current = myReplyVotes[replyId];
    const shouldRemove = current === nextVote;
    const newVote = shouldRemove ? null : nextVote;

    // 1. Update local reply state instantly
    setMyReplyVotes((prev) => ({ ...prev, [replyId]: newVote }));
    if (ownerPostId) {
      setRepliesByPostId((prev) => ({
        ...prev,
        [ownerPostId]: prev[ownerPostId].map((r) => {
          if (r.id !== replyId) return r;
          let { likes, dislikes } = r;
          if (current === 1)  likes    = Math.max(0, likes - 1);
          if (current === -1) dislikes = Math.max(0, dislikes - 1);
          if (!shouldRemove && nextVote === 1)  likes    += 1;
          if (!shouldRemove && nextVote === -1) dislikes += 1;
          return { ...r, likes, dislikes };
        }),
      }));
    }

    // 2. Sync with database in the background
    try {
      await supabase.from(REPLY_VOTES_TABLE).delete().eq("reply_id", replyId).eq("voter_key", voterKey);
      if (!shouldRemove) {
        const { error } = await supabase.from(REPLY_VOTES_TABLE).insert({
          reply_id: replyId,
          voter_key: voterKey,
          value: nextVote,
        });
        if (error) throw error;
      }
    } catch (e) {
      // Roll back
      flashError("Reaction failed — please try again.");
      setMyReplyVotes((prev) => ({ ...prev, [replyId]: current }));
      if (ownerPostId) {
        setRepliesByPostId((prev) => ({
          ...prev,
          [ownerPostId]: prev[ownerPostId].map((r) => {
            if (r.id !== replyId) return r;
            let { likes, dislikes } = r;
            if (!shouldRemove && nextVote === 1)  likes    = Math.max(0, likes - 1);
            if (!shouldRemove && nextVote === -1) dislikes = Math.max(0, dislikes - 1);
            if (current === 1)  likes    += 1;
            if (current === -1) dislikes += 1;
            return { ...r, likes, dislikes };
          }),
        }));
      }
    }
  }

  // ─── REPLIES (still need a reload since they add new content) ────────────
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
      throw error;
    }
    await loadSocial();
  }

  async function replyToReply(postId, parentReplyId, displayName, content) {
    if (!content.trim()) return;
    const { error } = await supabase.from(REPLIES_TABLE).insert({
      post_id: postId,
      parent_reply_id: parentReplyId,
      display_name: (displayName || "").trim() || "Anonymous",
      content: content.trim(),
    });
    if (error) {
      flashError(error.message || "Reply failed.");
      throw error;
    }
    await loadSocial();
  }

  async function deleteReply(replyId) {
    if (!isCommish) return;
    if (!confirm("Delete this reply?")) return;
    try {
      const { error } = await supabase.from(REPLIES_TABLE).delete().eq("id", replyId);
      if (error) throw error;
      flashNotice("Reply deleted.");
      await loadSocial();
    } catch (e) {
      flashError(e?.message || "Delete failed.");
    }
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
              onReplyToReply={replyToReply}
              onDeleteReply={deleteReply}
              onVoteReply={voteReply}
              replies={repliesByPostId[p.id] || []}
              myReplyVotes={myReplyVotes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
