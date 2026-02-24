import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

/**
 * Team Page (UI restored to the "dcf" look)
 * - Keeps the current working main-branch functionality (CRUD for key players + schedule)
 * - ONLY changes markup/classes so it matches the dcf visual layout (hero + cards)
 */
export default function Team({ supabase, isCommish }) {
  const { slug } = useParams();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

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
    e.preventDefault();
    if (!team?.id) return;
    if (!pos.trim() || !name.trim() || !String(ovr).trim()) return;

    const { error } = await supabase.from("team_key_players").insert({
      team_id: team.id,
      position: pos.trim(),
      name: name.trim(),
      overall: Number(ovr),
    });

    if (!error) {
      setPos("");
      setName("");
      setOvr("");
      await load();
      posRef.current?.focus?.();
    }
  }

  async function deletePlayer(id) {
    if (!confirm("Delete this player?")) return;
    await supabase.from("team_key_players").delete().eq("id", id);
    await load();
  }

  async function addGame(e) {
    e.preventDefault();
    if (!team?.id) return;
    if (!String(week).trim() || !opponent.trim()) return;

    const { error } = await supabase.from("team_schedule").insert({
      team_id: team.id,
      week: Number(week),
      opponent: opponent.trim(),
      result: result.trim() || null,
    });

    if (!error) {
      setWeek("");
      setOpponent("");
      setResult("");
      await load();
    }
  }

  async function deleteGame(id) {
    if (!confirm("Delete this game?")) return;
    await supabase.from("team_schedule").delete().eq("id", id);
    await load();
  }

  if (loading) {
    return (
      <div className="page">
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page">
        <div className="pageHeader">
          <h1>Team not found</h1>
          <Link className="btn" to="/">
            Back to Home
          </Link>
        </div>
        <div className="muted">No team exists with slug: {slug}</div>
      </div>
    );
  }

  const teamName = team?.name || "Team";
  const heroLogo = team?.logo_url || "";

  return (
    <div className="page">
      {/* HERO (dcf look) */}
      <div className="teamHero">
        <div className="teamHeroHeader">
          <div className="teamLogoHero" aria-label={`${teamName} logo`}>
            {heroLogo ? (
              <img className="teamLogoImg" src={heroLogo} alt={`${teamName} logo`} />
            ) : (
              <div className="muted" style={{ fontWeight: 900 }}>
                No logo set yet
              </div>
            )}
          </div>

          <div className="teamHeroText">
            <div className="teamNameBig">{teamName}</div>

            <div className="teamMeta">
              <span className="pill">Slug: {slug}</span>
              {canEdit ? <span className="pill warn">COMMISH</span> : null}
            </div>

            {canEdit ? (
              <div className="teamHeroEdit">
                <button className="btn" type="button" onClick={() => setEditMode((v) => !v)}>
                  {editMode ? "Done" : "Edit Team"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="teamHeroActions">
            {/* reserved for future hero actions without changing layout */}
          </div>
        </div>
      </div>

      {/* CONTENT GRID (dcf look) */}
      <div className="grid2" style={{ marginTop: 14 }}>
        {/* KEY PLAYERS */}
        <div className="card">
          <div className="cardHeader" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2>Key Players</h2>
              <div className="muted">Spotlight players for the team page.</div>
            </div>
            {canEdit ? (
              <button className="btn" type="button" onClick={() => setEditMode((v) => !v)}>
                {editMode ? "Done" : "Edit"}
              </button>
            ) : null}
          </div>

          {players.length ? (
            <div className="stack">
              {players.map((p) => (
                <div key={p.id} className="kv" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ minWidth: 70 }}>
                    <div className="kvKey">{p.position}</div>
                  </div>
                  <div className="kvVal">
                    {p.name} <span className="muted">• OVR {p.overall}</span>
                  </div>

                  {canEdit && editMode ? (
                    <div style={{ marginLeft: "auto" }}>
                      <button className="btn tiny danger" type="button" onClick={() => deletePlayer(p.id)}>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No key players yet.</div>
          )}

          {canEdit && editMode ? (
            <div style={{ marginTop: 14 }}>
              <div className="muted" style={{ marginBottom: 8, fontWeight: 900 }}>
                Add Player
              </div>
              <form className="form" onSubmit={addPlayer}>
                <div className="row">
                  <input
                    ref={posRef}
                    className="input"
                    placeholder="Position (QB, HB, WR...)"
                    value={pos}
                    onChange={(e) => setPos(e.target.value)}
                  />
                  <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <input
                    className="input"
                    placeholder="OVR (number)"
                    type="number"
                    value={ovr}
                    onChange={(e) => setOvr(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                </div>
                <div className="row">
                  <button className="btn primary" type="submit">
                    Add Player
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>

        {/* SCHEDULE */}
        <div className="card">
          <div className="cardHeader" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2>Schedule</h2>
              <div className="muted">Your weekly slate.</div>
            </div>
            {canEdit ? (
              <button className="btn" type="button" onClick={() => setEditMode((v) => !v)}>
                {editMode ? "Done" : "Edit"}
              </button>
            ) : null}
          </div>

          {games.length ? (
            <ul className="list">
              {games.map((g) => (
                <li key={g.id} className="listItem">
                  <div className="headlineRow">
                    <div style={{ fontWeight: 900 }}>
                      Week {g.week}: {g.opponent}
                    </div>
                    <div className="muted">{g.result || "TBD"}</div>
                  </div>

                  {canEdit && editMode ? (
                    <div style={{ marginTop: 10 }}>
                      <button className="btn tiny danger" type="button" onClick={() => deleteGame(g.id)}>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="muted">No games yet.</div>
          )}

          {canEdit && editMode ? (
            <div style={{ marginTop: 14 }}>
              <div className="muted" style={{ marginBottom: 8, fontWeight: 900 }}>
                Add Game
              </div>
              <form className="form" onSubmit={addGame}>
                <div className="row">
                  <input
                    className="input"
                    placeholder="Week #"
                    type="number"
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                    style={{ maxWidth: 140 }}
                  />
                  <input
                    className="input"
                    placeholder="Opponent"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Result (optional)"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                  />
                </div>
                <div className="row">
                  <button className="btn primary" type="submit">
                    Add Game
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
