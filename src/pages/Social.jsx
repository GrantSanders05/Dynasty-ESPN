import React, { useEffect, useMemo, useState } from "react";
import PostCard from "../components/PostCard.jsx";
import { getAnonVoterKey } from "../components/anonKey.js";

/**
 * Social page
 * Fix goal: stop "silent failures" so like/dislike/reply visibly work or show the real error.
 * Most common root cause is Supabase rejecting writes (RLS / missing unique constraint for upsert).
 */
export default function Social({ supabase, isCommish }) {
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [votes, setVotes] = useState([]);

  const [newPost, setNewPost] = useState({ display_name: "", content: "" });

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [pRes, rRes, vRes] = await Promise.all([
        supabase
          .from("social_posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("social_replies")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(500),
        supabase.from("social_votes").select("*").limit(5000),
      ]);

      if (pRes.error) {
        console.error("LOAD posts error:", pRes.error);
        setError((e) => e || `Posts failed to load: ${pRes.error.message}`);
      } else {
        setPosts(pRes.data || []);
      }

      if (rRes.error) {
        console.error("LOAD replies error:", rRes.error);
        setError((e) => e || `Replies failed to load: ${rRes.error.message}`);
      } else {
        setReplies(rRes.data || []);
      }

      if (vRes.error) {
        console.error("LOAD votes error:", vRes.error);
        setError((e) => e || `Votes failed to load: ${vRes.error.message}`);
      } else {
        setVotes(vRes.data || []);
      }
    } catch (err) {
      console.error("LOAD crash:", err);
      setError("Feed crashed while loading. Check console.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replyByPost = useMemo(() => {
    const m = new Map();
    for (const r of replies) {
      const arr = m.get(r.post_id) || [];
      arr.push(r);
      m.set(r.post_id, arr);
    }
    return m;
  }, [replies]);

  const voteCounts = useMemo(() => {
    const counts = new Map();
    for (const v of votes) {
      const cur = counts.get(v.post_id) || { likes: 0, dislikes: 0 };
      if (v.value === 1) cur.likes += 1;
      if (v.value === -1) cur.dislikes += 1;
      counts.set(v.post_id, cur);
    }
    return counts;
  }, [votes]);

  async function addPost(e) {
    e.preventDefault();
    if (busy) return;

    const name = (newPost.display_name || "").trim() || "Anonymous";
    const content = (newPost.content || "").trim();
    if (!content) return;
    if (content.length > 800) return;

    setBusy(true);
    setError("");

    try {
      const res = await supabase
        .from("social_posts")
        .insert([{ display_name: name.slice(0, 40), content }]);

      if (res.error) {
        console.error("ADD POST error:", res.error);
        alert("Post failed: " + res.error.message);
        return;
      }

      setNewPost({ display_name: newPost.display_name, content: "" });
      await load();
    } catch (err) {
      console.error("ADD POST crash:", err);
      alert("Post crashed. Check console.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePost(id) {
    if (!isCommish) return;
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const res = await supabase.from("social_posts").delete().eq("id", id);

      if (res.error) {
        console.error("DELETE POST error:", res.error);
        alert("Delete failed: " + res.error.message);
        return;
      }

      await load();
    } catch (err) {
      console.error("DELETE POST crash:", err);
      alert("Delete crashed. Check console.");
    } finally {
      setBusy(false);
    }
  }

  async function vote(postId, value) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const voter_key = getAnonVoterKey();

      const res = await supabase.from("social_votes").upsert(
        [{ post_id: postId, voter_key, value }],
        { onConflict: "post_id,voter_key" }
      );

      if (res.error) {
        console.error("VOTE error:", res.error);
        alert(
          "Vote failed: " +
            res.error.message +
            "\n\nMost common fix: add a UNIQUE constraint on (post_id, voter_key) and/or fix RLS policies."
        );
        return;
      }

      await load();
    } catch (err) {
      console.error("VOTE crash:", err);
      alert("Vote crashed. Check console.");
    } finally {
      setBusy(false);
    }
  }

  async function reply(postId, displayName, content) {
    if (busy) return;

    const name = (displayName || "").trim() || "Anonymous";
    const txt = (content || "").trim();
    if (!txt) return;
    if (txt.length > 600) return;

    setBusy(true);
    setError("");

    try {
      const res = await supabase
        .from("social_replies")
        .insert([{ post_id: postId, display_name: name.slice(0, 40), content: txt }]);

      if (res.error) {
        console.error("REPLY error:", res.error);
        alert("Reply failed: " + res.error.message);
        return;
      }

      await load();
    } catch (err) {
      console.error("REPLY crash:", err);
      alert("Reply crashed. Check console.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="pageHeader">
        <h1>Social</h1>
        <div className="muted">Likes, dislikes, and replies. Commissioner can moderate.</div>
      </div>

      {error ? (
        <div className="card" style={{ border: "1px solid rgba(255,0,0,0.25)" }}>
          <div className="muted" style={{ color: "crimson" }}>
            {error}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={load} disabled={loading || busy}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="cardHeader">
          <h2>Create Post</h2>
        </div>
        <form className="form" onSubmit={addPost}>
          <div className="row">
            <input
              className="input"
              placeholder="Display name (optional)"
              value={newPost.display_name}
              onChange={(e) => setNewPost((s) => ({ ...s, display_name: e.target.value }))}
              disabled={busy}
            />
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? "Working..." : "Post"}
            </button>
          </div>
          <textarea
            className="textarea"
            rows={4}
            placeholder="Drop takes, trash talk, recruiting rumors…"
            value={newPost.content}
            onChange={(e) => setNewPost((s) => ({ ...s, content: e.target.value }))}
            disabled={busy}
          />
        </form>
      </div>

      <div className="card">
        <div className="cardHeader">
          <h2>Latest Posts</h2>
        </div>
        <div className="stack">
          {loading ? <div className="muted">Loading...</div> : null}

          {posts.map((p) => {
            const c = voteCounts.get(p.id) || { likes: 0, dislikes: 0 };
            return (
              <PostCard
                key={p.id}
                post={{ ...p, likes: c.likes, dislikes: c.dislikes }}
                isCommish={isCommish}
                onDelete={deletePost}
                onVote={vote}
                onReply={reply}
                replies={replyByPost.get(p.id) || []}
              />
            );
          })}

          {!loading && !posts.length ? <div className="muted">No posts yet.</div> : null}
        </div>
      </div>
    </main>
  );
}
