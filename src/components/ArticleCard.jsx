import React, { useState } from "react";

function timeAgo(iso) {
  try {
    if (!iso) return "";
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

export default function ArticleCard({
  a,
  isCommish,
  onFeature,
  onDelete,
  onPublishToggle,
}) {
  const [expanded, setExpanded] = useState(false);

  // Prevent hard crash if an undefined/null item slips into the list
  if (!a) return null;

  return (
    <div className="card">
      {/* Clickable header row — toggles body */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div className="cardTitle" style={{ flex: 1 }}>{a.title || "Untitled"}</div>
          <span style={{ fontSize: 18, opacity: 0.6, flexShrink: 0 }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        <div className="muted" style={{ marginTop: 6 }}>
          {a.week ? `Week ${a.week}` : ""}
          {a.author ? ` ${a.week ? "• " : ""}By ${a.author}` : ""}
          {(a.created_at || a.author || a.week) ? ` • ${timeAgo(a.created_at)}` : ""}
          {a.is_featured ? " • ⭐ Featured" : ""}
          {a.is_published === false ? " • Unpublished" : ""}
        </div>
      </div>

      {/* Collapsible body */}
      {expanded && (
        <>
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,.08)",
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}>
            {a.body || ""}
          </div>

          {isCommish ? (
            <div className="row" style={{ marginTop: 12 }}>
              {onFeature ? (
                <button
                  className="btn"
                  onClick={(e) => { e.stopPropagation(); onFeature(a.id, a.is_featured); }}
                  type="button"
                >
                  {a.is_featured ? "Unfeature" : "Feature"}
                </button>
              ) : null}

              {onPublishToggle ? (
                <button
                  className="btn"
                  onClick={(e) => { e.stopPropagation(); onPublishToggle(a.id, a.is_published); }}
                  type="button"
                >
                  {a.is_published ? "Unpublish" : "Publish"}
                </button>
              ) : null}

              {onDelete ? (
                <button
                  className="btn danger"
                  onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
                  type="button"
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
