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
  const [showThread, setShowThread] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const canSubmit = replyText.trim().length > 0 && !sending;

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
      setShowThread(true);
      setShowComposer(false);
    } finally {
      setSending(false);
    }
  }

  const likeActive = myVote === 1;
  const dislikeActive = myVote === -1;

  return (
    <div className="postCard">
      <div className="postHeader">
        <div className="postAuthor">{post.display_name || "Anonymous"}</div>
        <div className="postTime">{timeAgo(post.created_at)}</div>
      </div>

      <div className="postBody">{post.content}</div>

      <div className="postActions">
        <button
          className={`reactionPill ${likeActive ? "active" : ""}`}
          onClick={() => onVote(post.id, 1)}
          disabled={sending}
          aria-pressed={likeActive}
          title={likeActive ? "Click again to remove like" : "Like"}
          type="button"
        >
          👍 {post.likes || 0}
        </button>

        <button
          className={`reactionPill negative ${dislikeActive ? "active" : ""}`}
          onClick={() => onVote(post.id, -1)}
          disabled={sending}
          aria-pressed={dislikeActive}
          title={dislikeActive ? "Click again to remove dislike" : "Dislike"}
          type="button"
        >
          👎 {post.dislikes || 0}
        </button>

        <button
          className={`reactionPill ${showThread ? "active" : ""}`}
          onClick={() => setShowThread((v) => !v)}
          disabled={sending}
          type="button"
          title={showThread ? "Hide replies" : "View replies"}
        >
          💬 Replies {sortedReplies.length}
        </button>

        <button
          className={`reactionPill ${showComposer ? "active" : ""}`}
          onClick={() => {
            setShowThread(true);
            setShowComposer((v) => !v);
          }}
          disabled={sending}
          type="button"
          title={showComposer ? "Close reply box" : "Write a reply"}
        >
          ✍️ Reply
        </button>

        {isCommish ? (
          <button className="reactionPill negative" onClick={() => onDelete(post.id)} disabled={sending} type="button">
            🗑️ Delete
          </button>
        ) : null}
      </div>

      {(showThread || showComposer) ? (
        <div className="thread">
          {showThread ? (
            sortedReplies.length ? (
              <div className="stack" style={{ gap: 10 }}>
                {sortedReplies.map((r) => (
                  <div className="threadRow" key={r.id}>
                    <div className="threadLine" aria-hidden="true" />
                    <div className="replyCard">
                      <div className="replyHeader">
                        <div className="replyAuthor">{r.display_name || "Anonymous"}</div>
                        <div className="replyTime">{timeAgo(r.created_at)}</div>
                      </div>
                      <div className="replyBody">{r.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted">No replies yet.</div>
            )
          ) : null}

          {showComposer ? (
            <div className="replyComposer">
              <form onSubmit={submitReply} className="form" style={{ marginBottom: 0 }}>
                <div className="row">
                  <input className="input" value={replyName} onChange={(e) => setReplyName(e.target.value)} placeholder="Name (optional)" disabled={sending} />
                  <button className="btn primary" type="submit" disabled={!canSubmit}>
                    {sending ? "Replying..." : "Post Reply"}
                  </button>
                </div>
                <textarea className="textarea" rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." disabled={sending} />
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
