import React from "react";

export default function Podcast() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 style={{ margin: 0 }}>Podcast</h1>
          <div className="muted">Podcast content goes here.</div>
        </div>
      </div>

      <div className="card">
        <div className="muted">
          If you already have a Supabase table for podcast episodes, tell me the table name and columns and I’ll wire it back up.
        </div>
      </div>
    </div>
  );
}
