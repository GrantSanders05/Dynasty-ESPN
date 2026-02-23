import React, { useEffect, useMemo, useState } from "react";
import PostCard from "../components/PostCard.jsx";
import { getAnonVoterKey } from "../components/anonKey.js";

export default function Social({ supabase, isCommish }) {
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [votes, setVotes] = useState([]);

  const [newPost, setNewPost] = useState({ display_name: "", content: "" });

  async function load() {
    const [pRes, rRes, vRes] = await Promise.all([
      supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("social_replies").select("*").order("created_at", { ascending: true }).limit(500),
      supabase.from("social_votes").select("*").limit(5000),
    ]);
    if (!pRes.error) setPosts(pRes.data || []);
    if (!rRes.error) setReplies(rRes.data || []);
    if (!vRes.error) setVotes(vRes.data || []);
  }

  useEffect(() => { load(); }, []);

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
    const name = (newPost.display_name || "").trim() || "Anonymous";
    const content = (newPost.content || "").trim();
    if (!content) return;
    if (content.length > 800) return;

    await supabase.from("social_posts").insert([{ display_name: name.slice(0, 40), content }]);
    setNewPost({ display_name: newPost.display_name, content: "" });
    await load();
  }

  async function deletePost(id) {
    if (!isCommish) return;
    await supabase.from("social_posts").delete().eq("id", id);
    await load();
  }

  async function vote(postId, value) {
    const voter_key = getAnonVoterKey();
    await supabase.from("social_votes").upsert(
      [{ post_id: postId, voter_key, value }],
      { onConflict: "post_id,voter_key" }
    );
    await load();
  }

  async function reply(postId, displayName, content) {
    const name = (displayName || "").trim() || "Anonymous";
    const txt = (content || "").trim();
    if (!txt) return;
    if (txt.length > 600) return;

    await supabase.from("social_replies").insert([{ post_id: postId, display_name: name.slice(0, 40), content: txt }]);
    await load();
  }

  return (
    <main className="page">
      <div className="pageHeader">
        <h1>Social</h1>
        <div className="muted">Likes, dislikes, and replies. Commissioner can moderate.</div>
      </div>

      <div className="card">
        <div className="cardHeader"><h2>Create Post</h2></div>
        <form className="form" onSubmit={addPost}>
          <div className="row">
            <input className="input" placeholder="Display name (optional)" value={newPost.display_name}
              onChange={(e) => setNewPost(s => ({ ...s, display_name: e.target.value }))} />
            <button className="btn primary" type="submit">Post</button>
          </div>
          <textarea className="textarea" rows={4} placeholder="Drop takes, trash talk, recruiting rumors…"
            value={newPost.content}
            onChange={(e) => setNewPost(s => ({ ...s, content: e.target.value }))} />
        </form>
      </div>

      <div className="card">
        <div className="cardHeader"><h2>Latest Posts</h2></div>
        <div className="stack">
          {posts.map(p => {
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
          {!posts.length && <div className="muted">No posts yet.</div>}
        </div>
      </div>
    </main>
  );
}
