import React from "react";

export default function Social() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 style={{ margin: 0 }}>Social</h1>
          <div className="muted">Posting is temporarily disabled while we restore the core UI.</div>
        </div>
      </div>

      <div className="card">
        <div className="muted">
          Once the site is stable again, we’ll re-enable posts, reactions, and replies (without breaking styling).
        </div>
      </div>
    </div>
  );
}
