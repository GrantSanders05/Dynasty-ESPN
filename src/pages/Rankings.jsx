import React, { useEffect, useState } from "react";

const RANKINGS_KEY = "rankings_text";

/**
 * Parses lines like:
 *   "1. Alabama (8-0)"
 *   "2. Georgia (7-1)"
 *
 * Also tolerant of:
 *   "1 Alabama (8-0)"
 *   "1. Alabama 8-0"
 *   "Alabama (8-0)"  <- no number, uses line order
 */
function parseRankings(raw) {
  const lines = (raw || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Strip leading rank number: "1." "1)" "1 "
    const numMatch = line.match(/^(\d{1,2})[.):\s]\s*/);
    const rank = numMatch ? parseInt(numMatch[1], 10) : i + 1;
    const rest = numMatch ? line.slice(numMatch[0].length).trim() : line;

    // Pull record in parens "(8-0)" or bare "8-0"
    const recordParens = rest.match(/\((\d{1,3}-\d{1,3})\)/);
    const recordBare   = rest.match(/\b(\d{1,3}-\d{1,3})\b/);
    const record = recordParens ? recordParens[1] : recordBare ? recordBare[1] : null;

    // Team name = everything before the record
    let name = rest;
    if (recordParens) {
      name = rest.slice(0, rest.indexOf(recordParens[0])).trim();
    } else if (recordBare) {
      name = rest.slice(0, rest.indexOf(recordBare[0])).trim();
    }
    name = name.replace(/[().,]+$/, "").trim();

    if (!name) continue;
    results.push({ rank, name, record });
  }

  results.sort((a, b) => a.rank - b.rank);
  return results;
}

function getRankStyle(rank) {
  if (rank === 1) return { color: "#FFD700" };
  if (rank === 2) return { color: "#C0C0C0" };
  if (rank === 3) return { color: "#cd7f32" };
  return { color: null };
}

function RankingsList({ rankings }) {
  return (
    <div className="rankingsList">
      {rankings.map((team, idx) => {
        const { color } = getRankStyle(team.rank);
        const isTop3 = team.rank <= 3;
        return (
          <div key={idx} className={`rankingsRow${isTop3 ? " rankingsRowTop" : ""}`}>
            <div className="rankingsRank" style={color ? { color } : undefined}>
              {team.rank}
            </div>
            <div className="rankingsName">{team.name}</div>
            <div className={`rankingsRecord${!team.record ? " rankingsRecordEmpty" : ""}`}>
              {team.record || "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Rankings({ supabase, isCommish }) {
  const [rawText, setRawText]   = useState("");
  const [draftText, setDraftText] = useState("");
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(false);

  const [notice, setNotice] = useState("");
  const [error, setError]   = useState("");

  function flashNotice(msg) {
    setNotice(msg); setError("");
    window.clearTimeout(flashNotice._t);
    flashNotice._t = window.setTimeout(() => setNotice(""), 3500);
  }
  function flashError(msg) {
    setError(msg); setNotice("");
    window.clearTimeout(flashError._t);
    flashError._t = window.setTimeout(() => setError(""), 9000);
  }

  async function loadRankings() {
    setLoading(true);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", RANKINGS_KEY)
      .maybeSingle();
    const text = data?.value || "";
    setRawText(text);
    setRankings(parseRankings(text));
    setLoading(false);
  }

  useEffect(() => {
    loadRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveRankings(e) {
    e.preventDefault();
    if (!isCommish) return flashError("Commissioner only.");
    if (!draftText.trim()) return flashError("Paste your rankings first.");
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from("site_settings")
        .upsert(
          { key: RANKINGS_KEY, value: draftText.trim(), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (err) throw new Error(err.message);
      const parsed = parseRankings(draftText.trim());
      setRawText(draftText.trim());
      setRankings(parsed);
      setDraftText("");
      setEditing(false);
      flashNotice(`Rankings updated — ${parsed.length} teams.`);
    } catch (err) {
      flashError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function clearRankings() {
    if (!isCommish) return;
    if (!confirm("Clear the current rankings?")) return;
    await supabase
      .from("site_settings")
      .upsert(
        { key: RANKINGS_KEY, value: "", updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    setRawText(""); setRankings([]); setDraftText(""); setEditing(false);
    flashNotice("Rankings cleared.");
  }

  function startEdit() {
    setDraftText(rawText);
    setEditing(true);
  }

  // Live preview while editing
  const preview = editing ? parseRankings(draftText) : [];

  return (
    <div className="page">
      {/* Page header */}
      <div className="rankingsHeader">
        <div>
          <h1 style={{ margin: 0 }}>Power Rankings</h1>
          <div className="muted" style={{ marginTop: 4, fontWeight: 700 }}>
            {rankings.length > 0
              ? `Top ${rankings.length} · updated by commissioner`
              : "No rankings posted yet"}
          </div>
        </div>
        {isCommish && !editing && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={startEdit} type="button">
              {rankings.length ? "Update Rankings" : "Post Rankings"}
            </button>
            {rankings.length > 0 && (
              <button className="btn danger" onClick={clearRankings} type="button">
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toasts */}
      {(notice || error) ? (
        <div className="toastWrap">
          {notice ? <div className="toast ok">{notice}</div> : null}
          {error  ? <div className="toast err">{error}</div>  : null}
        </div>
      ) : null}

      {/* Commissioner editor */}
      {isCommish && editing && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardHeader">
            <h2>{rankings.length ? "Update Rankings" : "Post Rankings"}</h2>
            <span className="muted" style={{ fontSize: 12 }}>One team per line</span>
          </div>

          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Expected format:{" "}
            <code style={{ background: "rgba(255,255,255,.08)", padding: "2px 6px", borderRadius: 6 }}>
              1. Alabama (8-0)
            </code>
            {" "}— numbers and records are optional, it figures it out.
          </div>

          <form onSubmit={saveRankings} className="form">
            <textarea
              className="textarea"
              rows={16}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={"1. Alabama (8-0)\n2. Georgia (7-1)\n3. Ohio State (7-1)\n..."}
              disabled={saving}
              style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}
            />
            <div className="row">
              <button
                className="btn primary"
                type="submit"
                disabled={saving || !draftText.trim()}
              >
                {saving
                  ? "Saving…"
                  : `Save Rankings${preview.length ? ` (${preview.length} teams)` : ""}`}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => { setEditing(false); setDraftText(""); }}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Live preview */}
          {preview.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="rankingsPreviewLabel">Live preview</div>
              <RankingsList rankings={preview} />
            </div>
          )}
        </div>
      )}

      {/* Main rankings display */}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : rankings.length > 0 && !editing ? (
        <RankingsList rankings={rankings} />
      ) : !editing ? (
        <div className="rankingsEmpty">
          <div className="rankingsEmptyIcon">🏆</div>
          <div className="rankingsEmptyText">No rankings posted yet</div>
          {isCommish && (
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Click "Post Rankings" above to get started.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
