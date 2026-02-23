import React from "react";

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

export default function ArticleCard({ a, isCommish, onFeature, onDelete, onPublishToggle }) {
  return (
    <div className="storyCard">
      <div className="storyMeta">
        <span className="badge">{a.week_label ? a.week_label : "Dynasty"}</span>
        <span className="muted">
          {a.author ? `By ${a.author} • ` : ""}
          {timeAgo(a.created_at)}
        </span>
        {a.published === false && <span className="pill warn">Unpublished</span>}
      </div>

      <div className="storyTitle">{a.title}</div>
      <div className="storyExcerpt">{a.body}</div>

      {isCommish && (
        <div className="actions">
          {onFeature && (
            <button className="btn" type="button" onClick={() => onFeature(a.id)}>
              Feature
            </button>
          )}
          {onPublishToggle && (
            <button className="btn" type="button" onClick={() => onPublishToggle(a.id, !a.published)}>
              {a.published ? "Unpublish" : "Publish"}
            </button>
          )}
          {onDelete && (
            <button className="btn danger" type="button" onClick={() => onDelete(a.id)}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
