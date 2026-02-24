import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

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

  const canEdit = isCommish;

  async function load() {
    setLoading(true);

    const t = await supabase.from("teams").select("*").eq("slug", slug).single();
    setTeam(t.data || null);

    if (t.data?.id) {
      const kp = await supabase.from("team_key_players").select("*").eq("team_id", t.data.id).order("created_at", { ascending: false });
      setPlayers(kp.data || []);

      const sch = await supabase.from("team_schedule").select("*").eq("team_id", t.data.id).order("week", { ascending: true });
      setGames(sch.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const teamName = team?.name || "Team";

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

  if (loading) return <div className="muted">Loading…</div>;
  if (!team) return <div className="muted">Team not found.</div>;

  return (
    <div>
      <div className="teamHero">
        <div className="teamHeroHeader">
          <div className="teamHeroText">
            <div className="teamNameBig">{teamName}</div>
            <div className="teamMeta">
              {canEdit ? <span className="badge">COMMISH</span> : null}
            </div>
          </div>
          {canEdit ? (
            <div className="teamHeroActions">
              <button className="btn" type="button" onClick={() => setEditMode((v) => !v)}>
                {editMode ? "Done" : "Edit Team"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="cardHeader">
            <h2>Key Players</h2>
            {editMode ? <span className="muted">Spotlight players for the team page.</span> : null}
          </div>

          {players.length === 0 ? <div className="muted">No key players yet.</div> : (
            <div className="list" style={{ marginTop: 10 }}>
              {players.map((p) => (
                <div className="listItem" key={p.id}>
                  <div className="headlineRow">
                    <div style={{ fontWeight: 900 }}>{p.position} — {p.name}</div>
                    <div className="badge">OVR {p.overall}</div>
                  </div>
                  {editMode ? (
                    <div className="actions">
                      <button className="btn danger small" type="button" onClick={() => deletePlayer(p.id)}>Delete</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {editMode ? (
            <form className="form" onSubmit={addPlayer} style={{ marginTop: 12 }}>
              <div className="muted" style={{ color: "var(--danger)", fontWeight: 700 }}>
                Fill out Position, Name, and Overall (number).
              </div>
              <div className="row">
                <input ref={posRef} className="input" value={pos} onChange={(e) => setPos(e.target.value)} placeholder="Position (QB, HB, WR…)" />
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
                <input className="input" value={ovr} onChange={(e) => setOvr(e.target.value)} placeholder="OVR (number)" type="number" />
              </div>
              <button className="btn primary" type="submit">Add Player</button>
            </form>
          ) : null}
        </div>

        <div className="card">
          <div className="cardHeader">
            <h2>Schedule</h2>
            {editMode ? <span className="muted">Add or update weekly results.</span> : null}
          </div>

          {games.length === 0 ? <div className="muted">No games yet.</div> : (
            <div className="list" style={{ marginTop: 10 }}>
              {games.map((g) => (
                <div className="listItem" key={g.id}>
                  <div className="headlineRow">
                    <div style={{ fontWeight: 900 }}>Week {g.week}: {g.opponent}</div>
                    <div className="muted">{g.result || "TBD"}</div>
                  </div>
                  {editMode ? (
                    <div className="actions">
                      <button className="btn danger small" type="button" onClick={() => deleteGame(g.id)}>Delete</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {editMode ? (
            <form className="form" onSubmit={addGame} style={{ marginTop: 12 }}>
              <div className="row">
                <input className="input" value={week} onChange={(e) => setWeek(e.target.value)} placeholder="Week #" type="number" />
                <input className="input" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Opponent" />
                <input className="input" value={result} onChange={(e) => setResult(e.target.value)} placeholder="Result (optional)" />
              </div>
              <button className="btn primary" type="submit">Add Game</button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
