import React, { useEffect, useState } from "react";

// ─── ESPN CDN logo lookup ────────────────────────────────────────────────────
const ESPN_ID = {
  "alabama": 333, "bama": 333,
  "georgia": 61, "uga": 61,
  "lsu": 99,
  "ole miss": 145, "mississippi": 145,
  "texas a&m": 245, "texas a&m aggies": 245, "aggies": 245,
  "tennessee": 2633, "vols": 2633,
  "florida": 57, "gators": 57,
  "auburn": 2,
  "south carolina": 2579, "gamecocks": 2579,
  "arkansas": 8, "razorbacks": 8,
  "missouri": 142,
  "kentucky": 96,
  "vanderbilt": 238, "commodores": 238,
  "mississippi state": 344, "miss state": 344,
  "oklahoma": 201, "sooners": 201,
  "texas": 251, "longhorns": 251,
  "ohio state": 194, "buckeyes": 194,
  "michigan": 130, "wolverines": 130,
  "penn state": 213, "nittany lions": 213,
  "oregon": 2483, "ducks": 2483,
  "iowa": 2294, "hawkeyes": 2294,
  "wisconsin": 275, "badgers": 275,
  "indiana": 84, "hoosiers": 84,
  "michigan state": 127, "spartans": 127,
  "minnesota": 135, "gophers": 135,
  "nebraska": 158, "cornhuskers": 158,
  "illinois": 356,
  "rutgers": 164,
  "maryland": 120, "terrapins": 120,
  "northwestern": 77,
  "purdue": 2509,
  "ucla": 26, "bruins": 26,
  "usc": 30, "southern california": 30, "trojans": 30,
  "washington": 264, "huskies": 264,
  "clemson": 228,
  "miami": 2390, "miami (fl)": 2390,
  "florida state": 52, "seminoles": 52,
  "north carolina": 153, "tar heels": 153,
  "nc state": 152,
  "virginia tech": 259, "hokies": 259,
  "virginia": 258, "cavaliers": 258,
  "pittsburgh": 221, "pitt": 221,
  "duke": 150, "blue devils": 150,
  "wake forest": 154,
  "georgia tech": 59, "yellow jackets": 59,
  "boston college": 103,
  "syracuse": 183,
  "louisville": 97,
  "stanford": 24, "cardinal": 24,
  "notre dame": 87, "fighting irish": 87,
  "cal": 25, "california": 25,
  "smu": 2567, "mustangs": 2567,
  "kansas state": 2306,
  "baylor": 239, "bears": 239,
  "tcu": 2628, "horned frogs": 2628,
  "west virginia": 277, "mountaineers": 277,
  "iowa state": 66, "cyclones": 66,
  "kansas": 2305, "jayhawks": 2305,
  "oklahoma state": 197, "cowboys": 197,
  "texas tech": 2641, "red raiders": 2641,
  "utah": 254, "utes": 254,
  "arizona": 12,
  "arizona state": 9, "sun devils": 9,
  "colorado": 38, "buffaloes": 38,
  "cincinnati": 2132, "bearcats": 2132,
  "byu": 252, "cougars": 252,
  "ucf": 2116, "knights": 2116,
  "houston": 248,
  "bowling green": 189, "falcons": 189, "bgsu": 189,
  "akron": 2006, "zips": 2006,
  "eastern michigan": 2199, "eagles": 2199, "emu": 2199,
  "army": 349,
  "navy": 2426,
  "air force": 2005,
  "liberty": 2335,
  "james madison": 294,
  "coastal carolina": 324,
  "appalachian state": 2026, "app state": 2026,
  "georgia southern": 290,
  "boise state": 68, "broncos": 68,
  "fresno state": 278,
  "san diego state": 21, "sdsu": 21,
  "tulane": 2655, "green wave": 2655,
  "memphis": 235,
  "marshall": 276,
  "miami (oh)": 193,
  "western kentucky": 98,
  "old dominion": 295,
  "georgia state": 2247,
  "louisiana": 309, "ragin cajuns": 309,
  "troy": 2653,
};

function getLogoUrl(name) {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (ESPN_ID[key]) return `https://a.espncdn.com/i/teamlogos/ncaa/500/${ESPN_ID[key]}.png`;
  for (const [k, v] of Object.entries(ESPN_ID)) {
    if (key.includes(k) || k.includes(key))
      return `https://a.espncdn.com/i/teamlogos/ncaa/500/${v}.png`;
  }
  return null;
}

// Pull all W-L records from a string — returns [overall, conference] or [overall] or []
function extractRecords(str) {
  const matches = [...str.matchAll(/\d{1,3}-\d{1,3}/g)];
  return matches.map((m) => m[0]);
}

// Parse rankings text — handles one or two records per line
// "1. Ohio State (8-0, 5-0)"  → rank, name, overall=8-0, conf=5-0
// "1. Alabama (8-0)"          → rank, name, overall=8-0, conf=null
export function parseRankings(raw, showConference = false) {
  const lines = (raw || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Strip leading rank number
    const numMatch = line.match(/^(\d{1,2})[.):\s]\s*/);
    const rank = numMatch ? parseInt(numMatch[1], 10) : i + 1;
    const rest = numMatch ? line.slice(numMatch[0].length).trim() : line;

    // Find the first paren group — could contain one or two records
    // e.g. "(8-0, 5-0)" or "(8-0)"
    const parenMatch = rest.match(/\(([^)]+)\)/);
    let overall = null;
    let conf = null;

    if (parenMatch) {
      const records = extractRecords(parenMatch[1]);
      overall = records[0] || null;
      conf    = records[1] || null;
    } else {
      // No parens — try bare record
      const bareMatch = rest.match(/\b(\d{1,3}-\d{1,3})\b/);
      if (bareMatch) overall = bareMatch[1];
    }

    // Team name = everything before the paren group (or bare record)
    let name = rest;
    if (parenMatch) {
      name = rest.slice(0, rest.indexOf(parenMatch[0])).trim();
    } else if (overall) {
      name = rest.slice(0, rest.indexOf(overall)).trim();
    }
    name = name.replace(/[().,]+$/, "").trim();
    if (!name) continue;

    results.push({ rank, name, overall, conf, logo: getLogoUrl(name) });
  }

  results.sort((a, b) => a.rank - b.rank);
  return results;
}

function getRankColor(rank) {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#cd7f32";
  return null;
}

// ─── Shared list renderer ─────────────────────────────────────────────────────
export function RankingsList({ rankings, showConference }) {
  return (
    <div className="rankingsList">
      {rankings.map((team, idx) => {
        const color = getRankColor(team.rank);
        return (
          <div key={idx} className={`rankingsRow${team.rank <= 3 ? " rankingsRowTop" : ""}${showConference ? " rankingsRowConf" : ""}`}>

            {/* Rank */}
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

            {/* Name */}
            <div className="rankingsName">{team.name}</div>

            {/* Records */}
            <div className="rankingsRecords">
              {team.overall ? (
                <span className="rankingsRecord">{team.overall}</span>
              ) : (
                <span className="rankingsRecord rankingsRecordEmpty">—</span>
              )}
              {showConference && (
                <span className="rankingsConfRecord">
                  {team.conf ? team.conf : "—"}
                </span>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}

// ─── Reusable page shell ──────────────────────────────────────────────────────
export default function RankingsPage({
  supabase,
  isCommish,
  settingKey,       // unique site_settings key e.g. "rankings_top25"
  pageTitle,        // h1 text
  pageSubtitle,     // muted line under h1
  showConference,   // boolean — show conf record column
  placeholder,      // textarea placeholder hint
}) {
  const [rawText,   setRawText]   = useState("");
  const [draftText, setDraftText] = useState("");
  const [rankings,  setRankings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [notice,    setNotice]    = useState("");
  const [error,     setError]     = useState("");

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

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();
    const text = data?.value || "";
    setRawText(text);
    setRankings(parseRankings(text, showConference));
    setLoading(false);
  }

  useEffect(() => { load(); }, [settingKey]);

  async function save(e) {
    e.preventDefault();
    if (!isCommish) return flashError("Commissioner only.");
    if (!draftText.trim()) return flashError("Paste your rankings first.");
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from("site_settings")
        .upsert(
          { key: settingKey, value: draftText.trim(), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (err) throw new Error(err.message);
      const parsed = parseRankings(draftText.trim(), showConference);
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

  async function clear() {
    if (!isCommish) return;
    if (!confirm("Clear the current rankings?")) return;
    await supabase
      .from("site_settings")
      .upsert(
        { key: settingKey, value: "", updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    setRawText(""); setRankings([]); setDraftText(""); setEditing(false);
    flashNotice("Rankings cleared.");
  }

  const preview = editing ? parseRankings(draftText, showConference) : [];

  return (
    <div className="page">
      <div className="rankingsHeader">
        <div>
          <h1 style={{ margin: 0 }}>{pageTitle}</h1>
          <div className="muted" style={{ marginTop: 4, fontWeight: 700 }}>
            {rankings.length > 0
              ? `${rankings.length} teams · updated by commissioner`
              : pageSubtitle}
          </div>
        </div>
        {isCommish && !editing && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={() => { setDraftText(rawText); setEditing(true); }} type="button">
              {rankings.length ? "Update Rankings" : "Post Rankings"}
            </button>
            {rankings.length > 0 && (
              <button className="btn danger" onClick={clear} type="button">Clear</button>
            )}
          </div>
        )}
      </div>

      {(notice || error) ? (
        <div className="toastWrap">
          {notice ? <div className="toast ok">{notice}</div> : null}
          {error  ? <div className="toast err">{error}</div>  : null}
        </div>
      ) : null}

      {isCommish && editing && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardHeader">
            <h2>{rankings.length ? "Update Rankings" : "Post Rankings"}</h2>
            <span className="muted" style={{ fontSize: 12 }}>One team per line</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            {showConference ? (
              <>Format: <code style={{ background: "rgba(255,255,255,.08)", padding: "2px 6px", borderRadius: 6 }}>1. Ohio State (8-0, 5-0)</code> — overall record first, conference record second.</>
            ) : (
              <>Format: <code style={{ background: "rgba(255,255,255,.08)", padding: "2px 6px", borderRadius: 6 }}>1. Alabama (8-0)</code> — logos load automatically.</>
            )}
          </div>
          <form onSubmit={save} className="form">
            <textarea
              className="textarea"
              rows={16}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={placeholder}
              disabled={saving}
              style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}
            />
            <div className="row">
              <button className="btn primary" type="submit" disabled={saving || !draftText.trim()}>
                {saving ? "Saving…" : `Save Rankings${preview.length ? ` (${preview.length} teams)` : ""}`}
              </button>
              <button className="btn" type="button" onClick={() => { setEditing(false); setDraftText(""); }} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
          {preview.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="rankingsPreviewLabel">Live preview</div>
              <RankingsList rankings={preview} showConference={showConference} />
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : rankings.length > 0 && !editing ? (
        <RankingsList rankings={rankings} showConference={showConference} />
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
