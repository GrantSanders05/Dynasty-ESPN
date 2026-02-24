import React, { useState } from "react";

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

export default function PostCard({
  post,
  isCommish,
  onDelete,
  onVote,
  onReply,
  replies = [],
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const canSubmit = replyText.trim().length > 0 && !sending;

  async function submitReply(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setSending(true);
    try {
      // Await so the user sees a real submit behavior, and so Social.jsx can refresh after insert.
      await onReply(post.id, replyName, replyText);
      setReplyText("");
      // Optional: keep the name for convenience (matches Create Post behavior).
      // Optional: keep the reply box open for ongoing thread.
      // If you want it to auto-close after successful reply, uncomment:
      // setShowReply(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="post">
      <div className="postTop">
        <div className="postName">{post.display_name || "Anonymous"}</div>
        <div className="muted">{timeAgo(post.created_at)}</div>
      </div>

      <div className="postBody">{post.content}</div>

      <div className="postBar">
        <button
          className="btn tiny"
          type="button"
          onClick={() => onVote(post.id, 1)}
          disabled={sending}
        >
          👍 <span className="count">{post.likes || 0}</span>
        </button>
        <button
          className="btn tiny"
          type="button"
          onClick={() => onVote(post.id, -1)}
          disabled={sending}
        >
          👎 <span className="count">{post.dislikes || 0}</span>
        </button>
        <button
          className="btn tiny"
          type="button"
          onClick={() => setShowReply((v) => !v)}
          disabled={sending}
        >
          💬 Reply <span className="count">{replies.length}</span>
        </button>

        {isCommish && (
          <button
            className="btn tiny danger"
            type="button"
            onClick={() => onDelete(post.id)}
            disabled={sending}
          >
            Delete
          </button>
        )}
      </div>

      {showReply && (
        <div className="replyBox">
          <div className="replyList">
            {replies.map((r) => (
              <div key={r.id} className="reply">
                <div className="replyTop">
                  <div className="replyName">{r.display_name || "Anonymous"}</div>
                  <div className="muted">{timeAgo(r.created_at)}</div>
                </div>
                <div className="replyBody">{r.content}</div>
              </div>
            ))}
            {!replies.length && <div className="muted">No replies yet.</div>}
          </div>

          <form className="form" onSubmit={submitReply}>
            <div className="row">
              <input
                className="input"
                placeholder="Display name (optional)"
                value={replyName}
                onChange={(e) => setReplyName(e.target.value)}
                disabled={sending}
              />
              <button className="btn primary" type="submit" disabled={!canSubmit}>
                {sending ? "Replying..." : "Reply"}
              </button>
            </div>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Write a reply…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={sending}
            />
          </form>
        </div>
      )}
    </div>
  );
}
