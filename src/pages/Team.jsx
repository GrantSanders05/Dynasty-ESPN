import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

/**
 * Team Page
 *
 * Fixes: "Save/Add" doing nothing / "fill out the fields" errors
 * - Ensures inputs are controlled (value + onChange)
 * - Ensures buttons actually call the submit handlers
 * - Adds simple on-page error messaging (no functionality changes to data)
 */
export default function Team({ supabase, isCommish }) {
  const { slug } = useParams();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Messages
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Key players
  const [players, setPlayers] = useState([]);
  const [pos, setPos] = useState("");
  const [name, setName] = useState("");
  const [ovr, setOvr] = useState("");
  const posRef = useRef(null);

  // Schedule
  const [games, setGames] = useState([]);
  const [week, setWeek] = useState("");
  const [opponent, setOpponent] = useState("");
  const [result, setResult] = useState("");

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
    flashError._t = window.setTimeout(() => setError(""), 7000);
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

  async function addPlayer(e) {
    e?.preventDefault?.();
    if (!canEdit) return flashError("Commissioner only.");
    if (!team?.id) return flashError("Team not loaded.");

    const p = pos.trim();
    const n = name.trim();
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
    setName("");
    setOvr("");
    flashNotice("Player saved.");
    await load();
    posRef.current?.focus?.();
  }

  async function deletePlayer(id) {
    if (!canEdit) return;
    if (!confirm("Delete this player?")) return;

    const { error: delErr } = await supabase.from("team_key_players").delete().eq("id", id);
    if (delErr) flashError(delErr.message || "Failed to delete player.");
    await load();
  }

  async function addGame(e) {
    e?.preventDefault?.();
    if (!canEdit) return flashError("Commissioner only.");
    if (!team?.id) return flashError("Team not loaded.");

    const w = String(week).trim();
    const opp = opponent.trim();

    if (!w || !opp) return flashError("Please fill Week and Opponent.");

    const weekNum = Number(w);
    if (!Number.isFinite(weekNum)) return flashError("Week must be a number.");

    const { error: insertErr } = await supabase.from("team_schedule").insert({
      team_id: team.id,
      week: weekNum,
      opponent: opp,
      result: result.trim() || null,
    });

    if (insertErr) return flashError(insertErr.message || "Failed to add game.");

    setWeek("");
    setOpponent("");
    setResult("");
    flashNotice("Game saved.");
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
    return <div className="page"><div className="container">Loading…</div></div>;
  }

  if (!team) {
    return (
      <div className="page">
        <div className="container">
          <h1>Team not found</h1>
          <p className="muted">No team exists with slug: <b>{slug}</b></p>
          <Link className="btn" to="/">Back to Home</Link>
        </div>
      </div>
    );
  }

  const teamName = team?.name || "Team";
  const heroLogo = team?.logo_url || "";

  return (
    <div className="page">
      {/* HERO */}
      <div className="teamHero">
        <div className="teamHeroInner container">
          <div className="teamHeroLeft">
            {heroLogo ? (
              <img className="teamHeroLogo" src={heroLogo} alt={`${teamName} logo`} />
            ) : (
              <div className="teamHeroLogo placeholder">No logo set yet</div>
            )}
            <div className="teamHeroText">
              <div className="teamHeroTitle">{teamName}</div>
              <div className="teamHeroMeta">
                <span className="muted">Slug: {slug}</span>
                {canEdit ? <span className="pill">COMMISH</span> : null}
              </div>
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
            <p className="muted" style={{ marginTop: 6 }}>Spotlight players for the team page.</p>

            {players.length ? (
              <div className="list" style={{ marginTop: 10 }}>
                {players.map((p) => (
                  <div key={p.id} className="row">
                    <div className="rowMain">
                      <b>{p.position}</b> — {p.name} <span className="muted">• OVR {p.overall}</span>
                    </div>
                    {canEdit && editMode ? (
                      <button className="btn danger" type="button" onClick={() => deletePlayer(p.id)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 10 }}>No key players yet.</div>
            )}

            {canEdit && editMode ? (
              <form className="form" onSubmit={addPlayer} style={{ marginTop: 12 }}>
                <div className="formTitle">Add Player</div>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    ref={posRef}
                    value={pos}
                    onChange={(e) => setPos(e.target.value)}
                    placeholder="Pos (QB)"
                  />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                  />
                  <input
                    value={ovr}
                    onChange={(e) => setOvr(e.target.value)}
                    placeholder="OVR"
                    inputMode="numeric"
                    style={{ maxWidth: 140 }}
                  />
                  <button className="btn primary" type="submit">Save</button>
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
            <p className="muted" style={{ marginTop: 6 }}>Your weekly slate.</p>

            {games.length ? (
              <div className="list" style={{ marginTop: 10 }}>
                {games.map((g) => (
                  <div key={g.id} className="row">
                    <div className="rowMain">
                      <b>Week {g.week}:</b> {g.opponent}
                      <div className="muted">{g.result || "TBD"}</div>
                    </div>
                    {canEdit && editMode ? (
                      <button className="btn danger" type="button" onClick={() => deleteGame(g.id)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 10 }}>No games yet.</div>
            )}

            {canEdit && editMode ? (
              <form className="form" onSubmit={addGame} style={{ marginTop: 12 }}>
                <div className="formTitle">Add Game</div>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                    placeholder="Week"
                    inputMode="numeric"
                    style={{ maxWidth: 120 }}
                  />
                  <input
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    placeholder="Opponent"
                  />
                  <input
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="Result (optional)"
                  />
                  <button className="btn primary" type="submit">Save</button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
