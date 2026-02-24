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
    <div className="listItem">
      <div className="headlineRow">
        <div style={{ fontWeight: 900 }}>{a.title}</div>
        <div className="muted">{a.week ? `Week ${a.week}` : ""}</div>
      </div>

      <div className="muted" style={{ marginTop: 6 }}>
        {a.author ? `By ${a.author} • ` : ""}{timeAgo(a.created_at)}
        {a.is_featured ? " • Featured" : ""}{a.is_published === false ? " • Unpublished" : ""}
      </div>

      <div className="muted" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
        {a.body}
      </div>

      {isCommish ? (
        <div className="actions">
          {onFeature ? (
            <button className="btn" type="button" onClick={() => onFeature(a.id, a.is_featured)}>
              {a.is_featured ? "Unfeature" : "Feature"}
            </button>
          ) : null}

          {onPublishToggle ? (
            <button className="btn" type="button" onClick={() => onPublishToggle(a.id, a.is_published)}>
              {a.is_published ? "Unpublish" : "Publish"}
            </button>
          ) : null}

          {onDelete ? (
            <button className="btn danger" type="button" onClick={() => onDelete(a.id)}>
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
