import React, { useMemo, useState } from "react";

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
  myVote, // 1 (liked), -1 (disliked), or undefined
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

  // Keep thread order stable even if parent passes unsorted
  const sortedReplies = useMemo(() => {
    const arr = [...replies];
    arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return arr;
  }, [replies]);

  async function submitReply(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setSending(true);
    try {
      await onReply(post.id, replyName, replyText);
      setReplyText("");
      // ESPN-ish: keep thread open so it feels like a live comment section
      if (!showReply) setShowReply(true);
    } finally {
      setSending(false);
    }
  }

  const likeActive = myVote === 1;
  const dislikeActive = myVote === -1;

  const pillStyle = (active) => ({
    border: active ? "1px solid rgba(255,255,255,0.22)" : undefined,
    boxShadow: active ? "0 0 0 2px rgba(255,255,255,0.06) inset" : undefined,
    transform: active ? "translateY(-1px)" : undefined,
  });

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
          title={likeActive ? "Click again to remove like" : "Like"}
          aria-pressed={likeActive}
          style={pillStyle(likeActive)}
        >
          👍 <span className="count">{post.likes || 0}</span>
        </button>

        <button
          className="btn tiny"
          type="button"
          onClick={() => onVote(post.id, -1)}
          disabled={sending}
          title={dislikeActive ? "Click again to remove dislike" : "Dislike"}
          aria-pressed={dislikeActive}
          style={pillStyle(dislikeActive)}
        >
          👎 <span className="count">{post.dislikes || 0}</span>
        </button>

        <button
          className="btn tiny"
          type="button"
          onClick={() => setShowReply((v) => !v)}
          disabled={sending}
          title={showReply ? "Hide replies" : "Show replies"}
          style={pillStyle(showReply)}
        >
          💬 Reply <span className="count">{sortedReplies.length}</span>
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
            {sortedReplies.map((r) => (
              <div key={r.id} className="reply">
                <div className="replyTop">
                  <div className="replyName">{r.display_name || "Anonymous"}</div>
                  <div className="muted">{timeAgo(r.created_at)}</div>
                </div>
                <div className="replyBody">{r.content}</div>
              </div>
            ))}
            {!sortedReplies.length && <div className="muted">No replies yet.</div>}
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

          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Tip: click 👍/👎 again to remove your reaction.
          </div>
        </div>
      )}
    </div>
  );
}
