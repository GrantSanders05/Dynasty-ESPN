import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

/**
 * Team Page
 * - Sleeker hero with team vibe (bigger logo, primary/secondary glow)
 * - Responsive layout for mobile/tablet
 * - No DB/logic changes (save/edit still works)
 */

function formatResult(result) {
  const raw = (result || "").trim();
  if (!raw) return { wl: null, score: null, text: "" };

  // Accept formats like:
  // "W 31-24", "L 17-21", "31-24 W", "W, 31-24"
  const m1 = raw.match(/^([WwLl])\s*[:\-]?\s*([0-9]{1,3}\s*-\s*[0-9]{1,3})$/);
  if (m1) return { wl: m1[1].toUpperCase(), score: m1[2].replace(/\s+/g, ""), text: raw };

  const m2 = raw.match(/^([0-9]{1,3}\s*-\s*[0-9]{1,3})\s*([WwLl])$/);
  if (m2) return { wl: m2[2].toUpperCase(), score: m2[1].replace(/\s+/g, ""), text: raw };

  // If user only typed the score, just show it (no WL)
  const m3 = raw.match(/^([0-9]{1,3}\s*-\s*[0-9]{1,3})$/);
  if (m3) return { wl: null, score: m3[1].replace(/\s+/g, ""), text: raw };

  // Otherwise show whatever they typed.
  return { wl: null, score: null, text: raw };
}

export default function Team({ supabase, isCommish }) {
  const { slug } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  // Messages
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Key players (create)
  const [players, setPlayers] = useState([]);
  const [pos, setPos] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [ovr, setOvr] = useState("");
  const posRef = useRef(null);

  // Key players (edit)
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editPos, setEditPos] = useState("");
  const [editPlayerName, setEditPlayerName] = useState("");
  const [editOvr, setEditOvr] = useState("");

  // Schedule (create)
  const [games, setGames] = useState([]);
  const [week, setWeek] = useState("");
  const [opponent, setOpponent] = useState("");
  const [homeAway, setHomeAway] = useState("HOME");
  const [result, setResult] = useState("");

  // Schedule (edit)
  const [editingGameId, setEditingGameId] = useState(null);
  const [editWeek, setEditWeek] = useState("");
  const [editOpponent, setEditOpponent] = useState("");
  const [editHomeAway, setEditHomeAway] = useState("HOME");
  const [editResult, setEditResult] = useState("");

  const canEdit = !!isCommish;

  function flashNotice(msg) {
    setNotice(msg);
    setError("");
    window.clearTimeout(flashNotice._t);
    flashNotice._t = window.setTimeout(() => setNotice(""), 3000);
  }
  function flashError(msg) {
    setError(msg);
    setNotice("");
    window.clearTimeout(flashError._t);
    flashError._t = window.setTimeout(() => setError(""), 9000);
  }

  async function load() {
    setLoading(true);
    const t = await supabase.from("teams").select("*").eq("slug", slug).single();
    const teamRow = t.data || null;
    setTeam(teamRow);

    if (teamRow?.id) {
      const kp = await supabase
        .from("team_key_players")
        .select("*")
        .eq("team_id", teamRow.id)
        .order("created_at", { ascending: false });
      setPlayers(kp.data || []);

      const sch = await supabase
        .from("team_schedule")
        .select("*")
        .eq("team_id", teamRow.id)
        .order("week", { ascending: true });
      setGames(sch.data || []);
    } else {
      setPlayers([]);
      setGames([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ---------- Key Players ----------
  async function addPlayer(e) {
    e?.preventDefault?.();
    if (!canEdit) return flashError("Commissioner only.");
    if (!team?.id) return flashError("Team not loaded.");

    const p = pos.trim();
    const n = playerName.trim();
    const o = String(ovr).trim();

    if (!p || !n || !o) return flashError("Please fill Position, Name, and OVR.");
    const overallNum = Number(o);
    if (!Number.isFinite(overallNum)) return flashError("OVR must be a number.");

    const { error: insertErr } = await supabase.from("team_key_players").insert({
      team_id: team.id,
      position: p,
      name: n,
      overall: overallNum,
    });

    if (insertErr) return flashError(insertErr.message || "Failed to add player.");

    setPos("");
    setPlayerName("");
    setOvr("");
    flashNotice("Player saved.");
    await load();
    posRef.current?.focus?.();
  }

  function startEditPlayer(p) {
    setEditingPlayerId(p.id);
    setEditPos(p.position || "");
    setEditPlayerName(p.name || "");
    setEditOvr(String(p.overall ?? ""));
  }
  function cancelEditPlayer() {
    setEditingPlayerId(null);
    setEditPos("");
    setEditPlayerName("");
    setEditOvr("");
  }
  async function saveEditPlayer(e) {
    e?.preventDefault?.();
    if (!canEdit) return;
    if (!editingPlayerId) return;

    const p = editPos.trim();
    const n = editPlayerName.trim();
    const o = String(editOvr).trim();

    if (!p || !n || !o) return flashError("Please fill Position, Name, and OVR.");
    const overallNum = Number(o);
    if (!Number.isFinite(overallNum)) return flashError("OVR must be a number.");

    const { error: updErr } = await supabase
      .from("team_key_players")
      .update({ position: p, name: n, overall: overallNum })
      .eq("id", editingPlayerId);

    if (updErr) return flashError(updErr.message || "Failed to update player.");

    flashNotice("Player updated.");
    cancelEditPlayer();
    await load();
  }

  async function deletePlayer(id) {
    if (!canEdit) return;
    if (!confirm("Delete this player?")) return;
    const { error: delErr } = await supabase.from("team_key_players").delete().eq("id", id);
    if (delErr) flashError(delErr.message || "Failed to delete player.");
    await load();
  }

  // ---------- Schedule ----------
  async function addGame(e) {
    e?.preventDefault?.();
    if (!canEdit) return flashError("Commissioner only.");
    if (!team?.id) return flashError("Team not loaded.");

    const w = String(week).trim();
    const opp = opponent.trim();
    const ha = String(homeAway || "HOME").toUpperCase();

    if (!w || !opp) return flashError("Please fill Week and Opponent.");
    const weekNum = Number(w);
    if (!Number.isFinite(weekNum)) return flashError("Week must be a number.");

    const { error: insertErr } = await supabase.from("team_schedule").insert({
      team_id: team.id,
      week: weekNum,
      opponent: opp,
      home_away: ha,
      result: result.trim() || null,
    });

    if (insertErr) return flashError(insertErr.message || "Failed to add game.");

    setWeek("");
    setOpponent("");
    setHomeAway("HOME");
    setResult("");
    flashNotice("Game saved.");
    await load();
  }

  function startEditGame(g) {
    setEditingGameId(g.id);
    setEditWeek(String(g.week ?? ""));
    setEditOpponent(g.opponent || "");
    setEditHomeAway(String(g.home_away || "HOME").toUpperCase());
    setEditResult(g.result || "");
  }
  function cancelEditGame() {
    setEditingGameId(null);
    setEditWeek("");
    setEditOpponent("");
    setEditHomeAway("HOME");
    setEditResult("");
  }

  async function saveEditGame(e) {
    e?.preventDefault?.();
    if (!canEdit) return;
    if (!editingGameId) return;

    const w = String(editWeek).trim();
    const opp = editOpponent.trim();
    const ha = String(editHomeAway || "HOME").toUpperCase();

    if (!w || !opp) return flashError("Please fill Week and Opponent.");
    const weekNum = Number(w);
    if (!Number.isFinite(weekNum)) return flashError("Week must be a number.");

    const { error: updErr } = await supabase
      .from("team_schedule")
      .update({ week: weekNum, opponent: opp, home_away: ha, result: editResult.trim() || null })
      .eq("id", editingGameId);

    if (updErr) return flashError(updErr.message || "Failed to update game.");

    flashNotice("Game updated.");
    cancelEditGame();
    await load();
  }

  async function deleteGame(id) {
    if (!canEdit) return;
    if (!confirm("Delete this game?")) return;
    const { error: delErr } = await supabase.from("team_schedule").delete().eq("id", id);
    if (delErr) flashError(delErr.message || "Failed to delete game.");
    await load();
  }

  if (loading) {
    return (
      <div className="teamPage">
        <div className="card">Loading…</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="teamPage">
        <div className="card">
          Team not found. <Link className="link" to="/">Back home</Link>
        </div>
      </div>
    );
  }

  // Pull team colors if you have them; safe fallback
  const primary = team.primary_color || team.primary || team.color_primary || null;
  const secondary = team.secondary_color || team.secondary || team.color_secondary || null;

  const heroStyle = {
    "--teamPrimary": primary || undefined,
    "--teamSecondary": secondary || undefined,
  };

  return (
    <div className="teamPage teamPage">
      {notice ? <div className="card" style={{ borderColor: "rgba(43,212,106,.30)", background: "rgba(43,212,106,.08)", marginBottom: 12 }}>{notice}</div> : null}
      {error ? <div className="card" style={{ borderColor: "rgba(255,90,95,.35)", background: "rgba(255,90,95,.08)", marginBottom: 12 }}>{error}</div> : null}

      <div className="teamHero" style={heroStyle}>
        <div className="teamHeroHeader">
          <div className="teamLogoHero">
            {team.logo_url ? (
              <img className="teamLogoImg" src={team.logo_url} alt={`${team.name} logo`} />
            ) : (
              <div className="muted" style={{ fontWeight: 900 }}>No logo</div>
            )}
          </div>

          <div className="teamHeroText">
            <h1 className="teamNameBig">{team.name}</h1>
            <div className="teamMeta">
              {isCommish ? <span className="pill">COMMISH</span> : null}
              {primary ? <span className="pill">Primary {primary}</span> : null}
              {secondary ? <span className="pill">Secondary {secondary}</span> : null}
            </div>
          </div>

          <div className="teamHeroActions">
            <Link className="btn" to="/">Done</Link>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="cardHeader">
            <h2>Key Players</h2>
            {canEdit ? null : <span className="muted">Read only</span>}
          </div>

          <div className="muted" style={{ marginBottom: 10 }}>Spotlight players for the team page.</div>

          {players.length ? (
            <div className="list">
              {players.map((p) => (
                <div key={p.id} className="listItem">
                  {editingPlayerId === p.id ? (
                    <form className="form" onSubmit={saveEditPlayer}>
                      <div className="row">
                        <input className="input" value={editPos} onChange={(e) => setEditPos(e.target.value)} placeholder="Pos (QB)" />
                        <input className="input" value={editPlayerName} onChange={(e) => setEditPlayerName(e.target.value)} placeholder="Name" />
                        <input className="input" value={editOvr} onChange={(e) => setEditOvr(e.target.value)} placeholder="OVR" />
                        <button className="btn primary" type="submit">Save</button>
                        <button className="btn" type="button" onClick={cancelEditPlayer}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 950 }}>
                        {p.position} — {p.name} <span className="muted">({p.overall})</span>
                      </div>
                      {canEdit ? (
                        <div className="row" style={{ flex: "0 0 auto", gap: 8 }}>
                          <button className="btn small" onClick={() => startEditPlayer(p)}>Edit</button>
                          <button className="btn danger small" onClick={() => deletePlayer(p.id)}>Delete</button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="listItem muted">No key players yet.</div>
          )}

          {canEdit ? (
            <div className="listItem" style={{ marginTop: 10 }}>
              <div style={{ fontFamily: "Oswald, Inter, system-ui, sans-serif", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
                Add Player
              </div>
              <form className="form" onSubmit={addPlayer} style={{ marginTop: 10 }}>
                <div className="row">
                  <input ref={posRef} className="input" value={pos} onChange={(e) => setPos(e.target.value)} placeholder="Pos (QB)" />
                  <input className="input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Name" />
                  <input className="input" value={ovr} onChange={(e) => setOvr(e.target.value)} placeholder="OVR" />
                  <button className="btn primary" type="submit">Save</button>
                </div>
              </form>
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="cardHeader">
            <h2>Schedule</h2>
            {canEdit ? null : <span className="muted">Read only</span>}
          </div>
          <div className="muted" style={{ marginBottom: 10 }}>Your weekly slate.</div>

          {games.length ? (
            <div className="list">
              {games.map((g) => (
                <div key={g.id} className="listItem">
                  {editingGameId === g.id ? (
                    <form className="form" onSubmit={saveEditGame}>
                      <div className="row">
                        <input className="input" value={editWeek} onChange={(e) => setEditWeek(e.target.value)} placeholder="Week" />
                        <input className="input" value={editOpponent} onChange={(e) => setEditOpponent(e.target.value)} placeholder="Opponent" />
                        <select value={editHomeAway} onChange={(e) => setEditHomeAway(e.target.value)}>
                          <option value="HOME">HOME</option>
                          <option value="AWAY">AWAY</option>
                        </select>
                        <input className="input" value={editResult} onChange={(e) => setEditResult(e.target.value)} placeholder="Result (optional) e.g. W 31-24" />
                        <button className="btn primary" type="submit">Save</button>
                        <button className="btn" type="button" onClick={cancelEditGame}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 950 }}>
                        (() => {
                        const prefix = g.home_away === "AWAY" ? "@ " : "vs. ";
                        const fr = formatResult(g.result);
                        return (
                          <div className="gameLine">
                            <div className="gameLeft">
                              Week {g.week}: <span style={{ fontWeight: 900 }}>{prefix}{g.opponent}</span>
                            </div>
                            <div className="gameMeta">
                              {fr.wl ? (
                                <span className={`wlPill ${fr.wl === "W" ? "w" : "l"}`}>{fr.wl}</span>
                              ) : null}
                              {fr.score ? <span className="scoreText">{fr.score}</span> : fr.text ? <span className="muted">{fr.text}</span> : null}
                            </div>
                          </div>
                        );
                      })()
                      </div>
                      {canEdit ? (
                        <div className="row" style={{ flex: "0 0 auto", gap: 8 }}>
                          <button className="btn small" onClick={() => startEditGame(g)}>Edit</button>
                          <button className="btn danger small" onClick={() => deleteGame(g.id)}>Delete</button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="listItem muted">No games yet.</div>
          )}

          {canEdit ? (
            <div className="listItem" style={{ marginTop: 10 }}>
              <div style={{ fontFamily: "Oswald, Inter, system-ui, sans-serif", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
                Add Game
              </div>
              <form className="form" onSubmit={addGame} style={{ marginTop: 10 }}>
                <div className="row">
                  <input className="input" value={week} onChange={(e) => setWeek(e.target.value)} placeholder="Week" />
                  <input className="input" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Opponent" />
                  <select value={homeAway} onChange={(e) => setHomeAway(e.target.value)}>
                    <option value="HOME">HOME</option>
                    <option value="AWAY">AWAY</option>
                  </select>
                  <input className="input" value={result} onChange={(e) => setResult(e.target.value)} placeholder="Result (optional) e.g. W 31-24" />
                  <button className="btn primary" type="submit">Save</button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
