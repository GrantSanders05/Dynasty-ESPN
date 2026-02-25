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

/**
 * Recursive reply node — renders a single reply and all its children.
 * depth controls the left-indent so nesting is visually clear.
 */
function ReplyNode({ reply, allReplies, isCommish, onReplyToReply, onDeleteReply, onVoteReply, myReplyVotes, depth = 0 }) {
  const [showComposer, setShowComposer] = useState(false);
  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const children = useMemo(
    () => allReplies
      .filter((r) => r.parent_reply_id === reply.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [allReplies, reply.id]
  );

  const myVote = myReplyVotes[reply.id];
  const likeActive = myVote === 1;
  const dislikeActive = myVote === -1;

  async function submitNestedReply(e) {
    e.preventDefault();
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      await onReplyToReply(reply.post_id, reply.id, replyName, replyText);
      setReplyText("");
      setReplyName("");
      setShowComposer(false);
    } finally {
      setSending(false);
    }
  }

  // Indent each level by 18px, cap at 72px so mobile doesn't get crushed
  const indent = Math.min(depth * 18, 72);

  return (
    <div style={{ marginLeft: indent }}>
      <div className="threadRow">
        <div className="threadLine" aria-hidden="true" />
        <div className="replyCard" style={{ flex: 1 }}>
          <div className="replyHeader">
            <div className="replyAuthor">{reply.display_name || "Anonymous"}</div>
            <div className="replyTime">{timeAgo(reply.created_at)}</div>
          </div>
          <div className="replyBody">{reply.content}</div>

          {/* Reply-level actions */}
          <div className="postActions" style={{ marginTop: 8, gap: 6 }}>
            <button
              className={`reactionPill ${likeActive ? "active" : ""}`}
              style={{ padding: "4px 8px", fontSize: 12 }}
              onClick={() => onVoteReply(reply.id, 1)}
              type="button"
              title={likeActive ? "Remove like" : "Like"}
            >
              👍 {reply.likes || 0}
            </button>

            <button
              className={`reactionPill negative ${dislikeActive ? "active" : ""}`}
              style={{ padding: "4px 8px", fontSize: 12 }}
              onClick={() => onVoteReply(reply.id, -1)}
              type="button"
              title={dislikeActive ? "Remove dislike" : "Dislike"}
            >
              👎 {reply.dislikes || 0}
            </button>

            <button
              className={`reactionPill ${showComposer ? "active" : ""}`}
              style={{ padding: "4px 8px", fontSize: 12 }}
              onClick={() => setShowComposer((v) => !v)}
              type="button"
            >
              ✍️ Reply
            </button>

            {isCommish ? (
              <button
                className="reactionPill negative"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => onDeleteReply(reply.id)}
                type="button"
              >
                🗑️
              </button>
            ) : null}
          </div>

          {/* Nested reply composer */}
          {showComposer ? (
            <div className="replyComposer" style={{ marginTop: 8 }}>
              <form onSubmit={submitNestedReply} className="form" style={{ marginBottom: 0 }}>
                <div className="row">
                  <input
                    className="input"
                    value={replyName}
                    onChange={(e) => setReplyName(e.target.value)}
                    placeholder="Name (optional)"
                    disabled={sending}
                  />
                  <button className="btn primary" type="submit" disabled={!replyText.trim() || sending}>
                    {sending ? "Replying…" : "Post Reply"}
                  </button>
                </div>
                <textarea
                  className="textarea"
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply…"
                  disabled={sending}
                />
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {/* Recursively render children */}
      {children.map((child) => (
        <ReplyNode
          key={child.id}
          reply={child}
          allReplies={allReplies}
          isCommish={isCommish}
          onReplyToReply={onReplyToReply}
          onDeleteReply={onDeleteReply}
          onVoteReply={onVoteReply}
          myReplyVotes={myReplyVotes}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function PostCard({
  post,
  myVote,
  isCommish,
  onDelete,
  onVote,
  onReply,
  onReplyToReply,
  onDeleteReply,
  onVoteReply,
  replies = [],
  myReplyVotes = {},
}) {
  const [showThread, setShowThread] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const canSubmit = replyText.trim().length > 0 && !sending;

  // Only top-level replies (no parent) at the root
  const topLevelReplies = useMemo(
    () => replies
      .filter((r) => !r.parent_reply_id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [replies]
  );

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
          💬 Replies {replies.length}
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
            topLevelReplies.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topLevelReplies.map((r) => (
                  <ReplyNode
                    key={r.id}
                    reply={r}
                    allReplies={replies}
                    isCommish={isCommish}
                    onReplyToReply={onReplyToReply}
                    onDeleteReply={onDeleteReply}
                    onVoteReply={onVoteReply}
                    myReplyVotes={myReplyVotes}
                    depth={0}
                  />
                ))}
              </div>
            ) : (
              <div className="muted">No replies yet.</div>
            )
          ) : null}

          {showComposer ? (
            <div className="replyComposer" style={{ marginTop: showThread ? 12 : 0 }}>
              <form onSubmit={submitReply} className="form" style={{ marginBottom: 0 }}>
                <div className="row">
                  <input
                    className="input"
                    value={replyName}
                    onChange={(e) => setReplyName(e.target.value)}
                    placeholder="Name (optional)"
                    disabled={sending}
                  />
                  <button className="btn primary" type="submit" disabled={!canSubmit}>
                    {sending ? "Replying..." : "Post Reply"}
                  </button>
                </div>
                <textarea
                  className="textarea"
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  disabled={sending}
                />
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
