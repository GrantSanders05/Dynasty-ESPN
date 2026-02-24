import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

/**
 * Team Page
 *
 * Changes (UI-safe + requested):
 * - Fixes Save doing nothing by ensuring controlled inputs + explicit handlers.
 * - Adds Home/Away field for schedule.
 * - Adds Edit/Save for schedule items and key players (update in-place).
 * - Removes slug display under team name.
 *
 * NOTE: This file expects these columns in Supabase:
 * - team_schedule: team_id, week, opponent, home_away, result
 * - team_key_players: team_id, position, name, overall
 * If you see "schema cache" errors, add the missing columns (SQL provided in chat).
 */
export default function Team({ supabase, isCommish }) {
  const { slug } = useParams();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

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
      .update({
        week: weekNum,
        opponent: opp,
        home_away: ha,
        result: editResult.trim() || null,
      })
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
      <div className="page">
        <div className="container">Loading…</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page">
        <div className="container">
          <h1>Team not found</h1>
          <p className="muted">
            No team exists with slug: <b>{slug}</b>
          </p>
          <Link className="btn" to="/">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const teamName = team?.name || "Team";
  const heroLogo = team?.logo_url || "";

  // Optional team color support (if your teams table has these columns)
  const teamPrimary =
    team?.primary_color || team?.primaryColor || team?.primary || team?.color_primary || null;
  const teamSecondary =
    team?.secondary_color || team?.secondaryColor || team?.secondary || team?.color_secondary || null;

  return (
    <div
      className="page"
      style={{
        "--teamPrimary": teamPrimary || undefined,
        "--teamSecondary": teamSecondary || undefined,
      }}
    >
      {/* HERO */}
      <div className="teamHero">
        <div className="teamHeroInner container">
          <div className="teamHeroLeft">
            {heroLogo ? (
              <img className="teamHeroLogo big" src={heroLogo} alt={`${teamName} logo`} />
            ) : (
              <div className="teamHeroLogo big placeholder">No logo set yet</div>
            )}
            <div className="teamHeroText">
              <div className="teamHeroTitle">{teamName}</div>
              <div className="teamHeroMeta">{canEdit ? <span className="pill">COMMISH</span> : null}</div>
            </div>
          </div>

          {canEdit ? (
            <button className="btn" type="button" onClick={() => setEditMode((v) => !v)}>
              {editMode ? "Done" : "Edit Team"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="container" style={{ marginTop: 14 }}>
        {(notice || error) ? (
          <div className="stack" style={{ marginBottom: 12 }}>
            {notice ? <div className="notice">{notice}</div> : null}
            {error ? <div className="error">{error}</div> : null}
          </div>
        ) : null}

        <div className="grid2">
          {/* KEY PLAYERS */}
          <div className="card">
            <div className="cardHeader">
              <h2 style={{ margin: 0 }}>Key Players</h2>
              {canEdit ? (
                <button className="btn" type="button" onClick={() => setEditMode((v) => !v)}>
                  {editMode ? "Done" : "Edit"}
                </button>
              ) : null}
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Spotlight players for the team page.
            </p>

            {players.length ? (
              <div className="list" style={{ marginTop: 10 }}>
                {players.map((p) => {
                  const isEditing = editingPlayerId === p.id;
                  return (
                    <div key={p.id} className="row">
                      <div className="rowMain">
                        {!isEditing ? (
                          <>
                            <b>{p.position}</b> — {p.name}{" "}
                            <span className="muted">• OVR {p.overall}</span>
                          </>
                        ) : (
                          <form onSubmit={saveEditPlayer} className="formRow" style={{ gap: 8 }}>
                            <input value={editPos} onChange={(e) => setEditPos(e.target.value)} placeholder="Pos (QB)" />
                            <input value={editPlayerName} onChange={(e) => setEditPlayerName(e.target.value)} placeholder="Name" />
                            <input
                              value={editOvr}
                              onChange={(e) => setEditOvr(e.target.value)}
                              placeholder="OVR"
                              inputMode="numeric"
                              style={{ maxWidth: 140 }}
                            />
                            <button className="btn primary" type="submit" onClick={saveEditPlayer}>
                              Save
                            </button>
                            <button className="btn" type="button" onClick={cancelEditPlayer}>
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>

                      {canEdit && editMode && !isEditing ? (
                        <div className="rowActions">
                          <button className="btn" type="button" onClick={() => startEditPlayer(p)}>
                            Edit
                          </button>
                          <button className="btn danger" type="button" onClick={() => deletePlayer(p.id)}>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 10 }}>
                No key players yet.
              </div>
            )}

            {canEdit && editMode ? (
              <form className="form" onSubmit={addPlayer} style={{ marginTop: 12 }}>
                <div className="formTitle">Add Player</div>
                <div className="formRow" style={{ gap: 8 }}>
                  <input
                    ref={posRef}
                    value={pos}
                    onChange={(e) => setPos(e.target.value)}
                    placeholder="Pos (QB)"
                  />
                  <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Name" />
                  <input
                    value={ovr}
                    onChange={(e) => setOvr(e.target.value)}
                    placeholder="OVR"
                    inputMode="numeric"
                    style={{ maxWidth: 140 }}
                  />
                  <button className="btn primary" type="submit" onClick={addPlayer}>
                    Save
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          {/* SCHEDULE */}
          <div className="card">
            <div className="cardHeader">
              <h2 style={{ margin: 0 }}>Schedule</h2>
              {canEdit ? (
                <button className="btn" type="button" onClick={() => setEditMode((v) => !v)}>
                  {editMode ? "Done" : "Edit"}
                </button>
              ) : null}
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Your weekly slate.
            </p>

            {games.length ? (
              <div className="list" style={{ marginTop: 10 }}>
                {games.map((g) => {
                  const isEditing = editingGameId === g.id;
                  const ha = String(g.home_away || "HOME").toUpperCase();
                  const haLabel = ha === "AWAY" ? "@" : "vs";
                  return (
                    <div key={g.id} className="row">
                      <div className="rowMain">
                        {!isEditing ? (
                          <>
                            <b>Week {g.week}:</b> <span className="pill subtle">{haLabel}</span> {g.opponent}
                            <div className="muted">{g.result || "TBD"}</div>
                          </>
                        ) : (
                          <form onSubmit={saveEditGame} className="formRow" style={{ gap: 8 }}>
                            <input
                              value={editWeek}
                              onChange={(e) => setEditWeek(e.target.value)}
                              placeholder="Week"
                              inputMode="numeric"
                              style={{ maxWidth: 120 }}
                            />
                            <select value={editHomeAway} onChange={(e) => setEditHomeAway(e.target.value)} style={{ maxWidth: 140 }}>
                              <option value="HOME">Home</option>
                              <option value="AWAY">Away</option>
                            </select>
                            <input value={editOpponent} onChange={(e) => setEditOpponent(e.target.value)} placeholder="Opponent" />
                            <input value={editResult} onChange={(e) => setEditResult(e.target.value)} placeholder="Result (optional)" />
                            <button className="btn primary" type="submit" onClick={saveEditGame}>
                              Save
                            </button>
                            <button className="btn" type="button" onClick={cancelEditGame}>
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>

                      {canEdit && editMode && !isEditing ? (
                        <div className="rowActions">
                          <button className="btn" type="button" onClick={() => startEditGame(g)}>
                            Edit
                          </button>
                          <button className="btn danger" type="button" onClick={() => deleteGame(g.id)}>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 10 }}>
                No games yet.
              </div>
            )}

            {canEdit && editMode ? (
              <form className="form" onSubmit={addGame} style={{ marginTop: 12 }}>
                <div className="formTitle">Add Game</div>
                <div className="formRow" style={{ gap: 8 }}>
                  <input
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                    placeholder="Week"
                    inputMode="numeric"
                    style={{ maxWidth: 120 }}
                  />
                  <select value={homeAway} onChange={(e) => setHomeAway(e.target.value)} style={{ maxWidth: 140 }}>
                    <option value="HOME">Home</option>
                    <option value="AWAY">Away</option>
                  </select>
                  <input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Opponent" />
                  <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="Result (optional)" />
                  <button className="btn primary" type="submit" onClick={addGame}>
                    Save
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
