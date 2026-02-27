import React, { useEffect, useState } from "react";

const RANKINGS_KEY = "rankings_text";

// ─── ESPN CDN logo lookup ────────────────────────────────────────────────────
// URL pattern: https://a.espncdn.com/i/teamlogos/ncaa/500/{id}.png
// Keys are lowercase for case-insensitive matching.
// Includes common aliases / abbreviations.
const ESPN_ID = {
  // Power conferences — SEC
  "alabama": 333,
  "bama": 333,
  "georgia": 61,
  "uga": 61,
  "lsu": 99,
  "ole miss": 145,
  "mississippi": 145,
  "texas a&m": 245,
  "texas a&m aggies": 245,
  "aggies": 245,
  "tennessee": 2633,
  "vols": 2633,
  "florida": 57,
  "gators": 57,
  "auburn": 2,
  "tigers": 2,        // will also match others; first hit wins
  "south carolina": 2579,
  "gamecocks": 2579,
  "arkansas": 8,
  "razorbacks": 8,
  "missouri": 142,
  "kentucky": 96,
  "wildcats": 96,
  "vanderbilt": 238,
  "commodores": 238,
  "mississippi state": 344,
  "miss state": 344,
  "oklahoma": 201,
  "sooners": 201,
  "texas": 251,
  "longhorns": 251,

  // Big Ten
  "ohio state": 194,
  "buckeyes": 194,
  "michigan": 130,
  "wolverines": 130,
  "penn state": 213,
  "nittany lions": 213,
  "oregon": 2483,
  "ducks": 2483,
  "iowa": 2294,
  "hawkeyes": 2294,
  "wisconsin": 275,
  "badgers": 275,
  "indiana": 84,
  "hoosiers": 84,
  "michigan state": 127,
  "spartans": 127,
  "minnesota": 135,
  "gophers": 135,
  "nebraska": 158,
  "cornhuskers": 158,
  "illinois": 356,
  "rutgers": 164,
  "maryland": 120,
  "terrapins": 120,
  "northwestern": 77,
  "purdue": 2509,
  "ucla": 26,
  "bruins": 26,
  "usc": 30,
  "southern california": 30,
  "trojans": 30,
  "washington": 264,
  "huskies": 264,

  // ACC
  "clemson": 228,
  "miami": 2390,
  "miami (fl)": 2390,
  "florida state": 52,
  "seminoles": 52,
  "north carolina": 153,
  "tar heels": 153,
  "nc state": 152,
  "virginia tech": 259,
  "hokies": 259,
  "virginia": 258,
  "cavaliers": 258,
  "pittsburgh": 221,
  "pitt": 221,
  "duke": 150,
  "blue devils": 150,
  "wake forest": 154,
  "georgia tech": 59,
  "yellow jackets": 59,
  "boston college": 103,
  "syracuse": 183,
  "orange": 183,
  "louisville": 97,
  "cardinals": 97,
  "stanford": 24,
  "cardinal": 24,
  "notre dame": 87,
  "fighting irish": 87,
  "cal": 25,
  "california": 25,
  "smu": 2567,
  "mustangs": 2567,

  // Big 12
  "kansas state": 2306,
  "baylor": 239,
  "bears": 239,
  "tcu": 2628,
  "horned frogs": 2628,
  "west virginia": 277,
  "mountaineers": 277,
  "iowa state": 66,
  "cyclones": 66,
  "kansas": 2305,
  "jayhawks": 2305,
  "oklahoma state": 197,
  "cowboys": 197,
  "texas tech": 2641,
  "red raiders": 2641,
  "utah": 254,
  "utes": 254,
  "arizona": 12,
  "wildcats az": 12,
  "arizona state": 9,
  "sun devils": 9,
  "colorado": 38,
  "buffaloes": 38,
  "cincinnati": 2132,
  "bearcats": 2132,
  "byu": 252,
  "cougars": 252,
  "ucf": 2116,
  "knights": 2116,
  "houston": 248,

  "bowling green": 189,
  "falcons": 189,
  "bgsu": 189,
  "akron": 2006,
  "zips": 2006,
  "army": 349,
  "navy": 2426,
  "air force": 2005,
  "liberty": 2335,
  "james madison": 294,
  "coastal carolina": 324,
  "appalachian state": 2026,
  "app state": 2026,
  "georgia southern": 290,
  "boise state": 68,
  "broncos": 68,
  "fresno state": 278,
  "san diego state": 21,
  "sdsu": 21,
  "tulane": 2655,
  "green wave": 2655,
  "memphis": 235,
  "marshall": 276,
  "miami (oh)": 193,
  "western kentucky": 98,
  "old dominion": 295,
  "georgia state": 2247,
  "louisiana": 309,
  "ragin cajuns": 309,
  "troy": 2653,
};

// Build logo URL from team name — returns null if not found
function getLogoUrl(name) {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  const id = ESPN_ID[key];
  if (id) return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;

  // Partial match — check if any key is contained in the name
  for (const [k, v] of Object.entries(ESPN_ID)) {
    if (key.includes(k) || k.includes(key)) {
      return `https://a.espncdn.com/i/teamlogos/ncaa/500/${v}.png`;
    }
  }
  return null;
}

// ─── Rankings text parser ────────────────────────────────────────────────────
function parseRankings(raw) {
  const lines = (raw || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const numMatch = line.match(/^(\d{1,2})[.):\s]\s*/);
    const rank = numMatch ? parseInt(numMatch[1], 10) : i + 1;
    const rest = numMatch ? line.slice(numMatch[0].length).trim() : line;

    const recordParens = rest.match(/\((\d{1,3}-\d{1,3})\)/);
    const recordBare   = rest.match(/\b(\d{1,3}-\d{1,3})\b/);
    const record = recordParens ? recordParens[1] : recordBare ? recordBare[1] : null;

    let name = rest;
    if (recordParens) {
      name = rest.slice(0, rest.indexOf(recordParens[0])).trim();
    } else if (recordBare) {
      name = rest.slice(0, rest.indexOf(recordBare[0])).trim();
    }
    name = name.replace(/[().,]+$/, "").trim();

    if (!name) continue;
    results.push({ rank, name, record, logo: getLogoUrl(name) });
  }

  results.sort((a, b) => a.rank - b.rank);
  return results;
}

// ─── Rank number color (gold / silver / bronze / default) ───────────────────
function getRankColor(rank) {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#cd7f32";
  return null;
}

// ─── Rankings list component ─────────────────────────────────────────────────
function RankingsList({ rankings }) {
  return (
    <div className="rankingsList">
      {rankings.map((team, idx) => {
        const color = getRankColor(team.rank);
        const isTop3 = team.rank <= 3;
        return (
          <div key={idx} className={`rankingsRow${isTop3 ? " rankingsRowTop" : ""}`}>

            {/* Rank number */}
            <div className="rankingsRank" style={color ? { color } : undefined}>
              {team.rank}
            </div>

            {/* Logo */}
            <div className="rankingsLogoWrap">
              {team.logo ? (
                <img
                  src={team.logo}
                  alt={team.name}
                  className="rankingsLogo"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div className="rankingsLogoPlaceholder" />
              )}
            </div>

            {/* Team name */}
            <div className="rankingsName">{team.name}</div>

            {/* Record */}
            <div className={`rankingsRecord${!team.record ? " rankingsRecordEmpty" : ""}`}>
              {team.record || "—"}
            </div>

          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Rankings({ supabase, isCommish }) {
  const [rawText,   setRawText]   = useState("");
  const [draftText, setDraftText] = useState("");
  const [rankings,  setRankings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [editing,   setEditing]   = useState(false);

  const [notice, setNotice] = useState("");
  const [error,  setError]  = useState("");

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

  const preview = editing ? parseRankings(draftText) : [];

  return (
    <div className="page">

      {/* Page header */}
      <div className="rankingsHeader">
        <div>
          <h1 style={{ margin: 0 }}>Top 25</h1>
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
            {" "}— logos load automatically for recognized school names.
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

          {/* Live preview while typing */}
          {preview.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="rankingsPreviewLabel">Live preview</div>
              <RankingsList rankings={preview} />
            </div>
          )}
        </div>
      )}

      {/* Main display */}
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
