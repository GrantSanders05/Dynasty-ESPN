import React, { useEffect, useMemo, useState } from "react";
import PostCard from "../components/PostCard.jsx";
import { getAnonVoterKey } from "../components/anonKey.js";

/**
 * Social page (ESPN-style polish + working interactions)
 * Improvements included:
 * 1) Optimistic UI for votes & replies (no full reload needed)
 * 2) Vote state + toggling (click same reaction again removes your vote)
 * 4) Replies sorted and grouped under each post with clean thread UI (in PostCard)
 * 5) Light ESPN polish (active states, disabled states, small status banner)
 *
 * NOTE: For vote toggle (delete), your Supabase RLS must allow DELETE on social_votes
 * for public/anon. SQL policy snippet provided in chat.
 */
export default function Social({ supabase, isCommish }) {
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [votes, setVotes] = useState([]);

  const [newPost, setNewPost] = useState({ display_name: "", content: "" });

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const voterKey = useMemo(() => getAnonVoterKey(), []);

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

  // Replies grouped per post, always sorted oldest->newest (thread style)
  const replyByPost = useMemo(() => {
    const m = new Map();
    for (const r of replies) {
      const arr = m.get(r.post_id) || [];
      arr.push(r);
      m.set(r.post_id, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      m.set(k, arr);
    }
    return m;
  }, [replies]);

  // Counts per post
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

  // Current viewer's vote per post (for active state + toggling)
  const myVoteByPost = useMemo(() => {
    const m = new Map();
    for (const v of votes) {
      if (v.voter_key === voterKey) m.set(v.post_id, v.value);
    }
    return m;
  }, [votes, voterKey]);

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
      // Insert and fetch the row so we can optimistically add it to the top
      const res = await supabase
        .from("social_posts")
        .insert([{ display_name: name.slice(0, 40), content }])
        .select("*")
        .single();

      if (res.error) {
        console.error("ADD POST error:", res.error);
        alert("Post failed: " + res.error.message);
        return;
      }

      const created = res.data;
      setPosts((prev) => [created, ...prev]);
      setNewPost({ display_name: newPost.display_name, content: "" });
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

    // Optimistic remove
    const prevPosts = posts;
    setPosts((p) => p.filter((x) => x.id !== id));
    setReplies((r) => r.filter((x) => x.post_id !== id));
    setVotes((v) => v.filter((x) => x.post_id !== id));

    try {
      const res = await supabase.from("social_posts").delete().eq("id", id);

      if (res.error) {
        console.error("DELETE POST error:", res.error);
        alert("Delete failed: " + res.error.message);
        setPosts(prevPosts);
        await load();
        return;
      }
    } catch (err) {
      console.error("DELETE POST crash:", err);
      alert("Delete crashed. Check console.");
      setPosts(prevPosts);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function vote(postId, value) {
    if (busy) return;

    const existing = myVoteByPost.get(postId); // 1, -1, or undefined

    // If clicking the same reaction again => toggle off (delete vote)
    const isToggleOff = existing === value;

    // Optimistic update to local votes array
    const prevVotes = votes;

    setVotes((cur) => {
      // remove any existing vote by this voter on this post
      const withoutMine = cur.filter((v) => !(v.post_id === postId && v.voter_key === voterKey));
      if (isToggleOff) return withoutMine; // toggled off
      return [
        ...withoutMine,
        {
          // id not needed for UI; keep minimal shape
          id: `local-${postId}-${voterKey}`,
          post_id: postId,
          voter_key: voterKey,
          value,
          created_at: new Date().toISOString(),
        },
      ];
    });

    setError("");
    setBusy(true);

    try {
      if (isToggleOff) {
        const delRes = await supabase
          .from("social_votes")
          .delete()
          .eq("post_id", postId)
          .eq("voter_key", voterKey);

        if (delRes.error) {
          console.error("VOTE delete error:", delRes.error);
          alert(
            "Could not remove vote: " +
              delRes.error.message +
              "\n\nFix: add a DELETE policy for social_votes."
          );
          setVotes(prevVotes);
        }
      } else {
        const upRes = await supabase.from("social_votes").upsert(
          [{ post_id: postId, voter_key: voterKey, value }],
          { onConflict: "post_id,voter_key" }
        );

        if (upRes.error) {
          console.error("VOTE upsert error:", upRes.error);
          alert("Vote failed: " + upRes.error.message);
          setVotes(prevVotes);
        }
      }
    } catch (err) {
      console.error("VOTE crash:", err);
      alert("Vote crashed. Check console.");
      setVotes(prevVotes);
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

    setError("");
    setBusy(true);

    // optimistic reply (insert at end of thread)
    const tempId = `local-reply-${postId}-${Date.now()}`;
    const optimistic = {
      id: tempId,
      post_id: postId,
      display_name: name.slice(0, 40),
      content: txt,
      created_at: new Date().toISOString(),
    };
    setReplies((cur) => [...cur, optimistic]);

    try {
      const res = await supabase
        .from("social_replies")
        .insert([{ post_id: postId, display_name: name.slice(0, 40), content: txt }])
        .select("*")
        .single();

      if (res.error) {
        console.error("REPLY error:", res.error);
        alert("Reply failed: " + res.error.message);
        // rollback optimistic
        setReplies((cur) => cur.filter((r) => r.id !== tempId));
        return;
      }

      // replace optimistic with real row (id + created_at)
      const real = res.data;
      setReplies((cur) => cur.map((r) => (r.id === tempId ? real : r)));
    } catch (err) {
      console.error("REPLY crash:", err);
      alert("Reply crashed. Check console.");
      setReplies((cur) => cur.filter((r) => r.id !== tempId));
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

      {/* Small status banner (ESPN-ish, minimal) */}
      <div
        className="card"
        style={{
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div className="muted" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 99,
              background: loading ? "#999" : error ? "crimson" : "#2ecc71",
            }}
          />
          <span>
            {loading
              ? "Loading feed…"
              : error
              ? "Feed error (open console)"
              : busy
              ? "Updating…"
              : "Live"}
          </span>
        </div>
        <button className="btn" type="button" onClick={load} disabled={loading || busy}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="card" style={{ border: "1px solid rgba(255,0,0,0.25)" }}>
          <div className="muted" style={{ color: "crimson" }}>
            {error}
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
          {posts.map((p) => {
            const c = voteCounts.get(p.id) || { likes: 0, dislikes: 0 };
            const my = myVoteByPost.get(p.id); // 1/-1/undefined
            return (
              <PostCard
                key={p.id}
                post={{ ...p, likes: c.likes, dislikes: c.dislikes }}
                myVote={my}
                isCommish={isCommish}
                onDelete={deletePost}
                onVote={vote}
                onReply={reply}
                replies={replyByPost.get(p.id) || []}
              />
            );
          })}
          {!posts.length && !loading ? <div className="muted">No posts yet.</div> : null}
        </div>
      </div>
    </main>
  );
}
