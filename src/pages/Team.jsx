import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

/**
 * Team page
 * - Key Players CRUD
 * - Schedule CRUD
 *
 * IMPORTANT FIXES:
 * - Inputs are real <input> elements with labels + proper types (text/number)
 * - Forms use <form onSubmit> so Enter works and fields are tabbable
 * - No fake "field-looking divs"
 */
export default function Team({ supabase, isCommish, user, commishEmail }) {
  const { slug } = useParams();

  // Commissioner (or commishEmail match) can edit
  const canEdit = useMemo(() => {
    if (isCommish) return true;
    const e = (user?.email || "").toLowerCase();
    const c = (commishEmail || "").toLowerCase();
    return !!e && !!c && e === c;
  }, [isCommish, user, commishEmail]);

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const [players, setPlayers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

  // --- Team basics edit
  const [editingTeam, setEditingTeam] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamSaveError, setTeamSaveError] = useState("");
  const [draftTeam, setDraftTeam] = useState({ name: "", logo_url: "", about: "" });

  // --- Key players edit
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [playerSaveError, setPlayerSaveError] = useState("");
  const [playerBusyId, setPlayerBusyId] = useState(null);

  const [newPlayer, setNewPlayer] = useState({ position: "", name: "", overall: "" });
  const [editPlayerId, setEditPlayerId] = useState(null);
  const [editPlayerDraft, setEditPlayerDraft] = useState({ position: "", name: "", overall: "" });

  // --- Schedule edit
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleSaveError, setScheduleSaveError] = useState("");
  const [scheduleBusyId, setScheduleBusyId] = useState(null);

  const [newGame, setNewGame] = useState({
    week: "",
    opponent: "",
    opponent_rank: "",
    home_away: "",
    note: "",
  });
  const [editGameId, setEditGameId] = useState(null);
  const [editGameDraft, setEditGameDraft] = useState({
    week: "",
    opponent: "",
    opponent_rank: "",
    home_away: "",
    note: "",
  });

  // Prefer an about column if it exists
  const aboutFieldName = useMemo(() => {
    if (!team) return "";
    const candidates = ["about", "bio", "description", "blurb", "summary"];
    return candidates.find((c) => Object.prototype.hasOwnProperty.call(team, c)) || "";
  }, [team]);

  // ------------ LOADERS ------------
  useEffect(() => {
    let alive = true;
    async function loadTeam() {
      setLoading(true);
      const { data, error } = await supabase.from("teams").select("*").eq("slug", slug).maybeSingle();
      if (!alive) return;
      if (error) {
        console.error("Team load error:", error);
        setTeam(null);
        setLoading(false);
        return;
      }
      setTeam(data || null);
      setLoading(false);
    }
    loadTeam();
    return () => {
      alive = false;
    };
  }, [slug, supabase]);

  useEffect(() => {
    if (!team?.id) return;
    let alive = true;
    async function loadPlayers() {
      const { data, error } = await supabase
        .from("team_key_players")
        .select("*")
        .eq("team_id", team.id)
        .order("position", { ascending: true });

      if (!alive) return;
      if (error) {
        console.warn("Key players load skipped:", error.message || error);
        setPlayers([]);
        return;
      }
      setPlayers(data || []);
    }
    loadPlayers();
    return () => {
      alive = false;
    };
  }, [team?.id, supabase]);

  useEffect(() => {
    if (!team?.id) return;
    let alive = true;
    async function loadSchedule() {
      const { data, error } = await supabase
        .from("team_schedule")
        .select("*")
        .eq("team_id", team.id)
        .order("week", { ascending: true });

      if (!alive) return;
      if (error) {
        console.warn("Schedule load skipped:", error.message || error);
        setSchedule([]);
        return;
      }
      setSchedule(data || []);
    }
    loadSchedule();
    return () => {
      alive = false;
    };
  }, [team?.id, supabase]);

  useEffect(() => {
    if (!team?.id) return;
    let alive = true;
    async function loadTeamArticles() {
      setArticlesLoading(true);

      const { data: tags, error: tagErr } = await supabase
        .from("article_teams")
        .select("article_id")
        .eq("team_id", team.id);

      if (!alive) return;
      if (tagErr) {
        console.error("article_teams read error:", tagErr);
        setArticles([]);
        setArticlesLoading(false);
        return;
      }

      const ids = (tags || []).map((t) => t.article_id).filter(Boolean);
      if (!ids.length) {
        setArticles([]);
        setArticlesLoading(false);
        return;
      }

      const { data: arts, error: artErr } = await supabase
        .from("articles")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });

      if (!alive) return;
      if (artErr) {
        console.error("articles read error:", artErr);
        setArticles([]);
        setArticlesLoading(false);
        return;
      }

      setArticles(arts || []);
      setArticlesLoading(false);
    }

    loadTeamArticles();
    return () => {
      alive = false;
    };
  }, [team?.id, supabase]);

  // Seed team draft (when not actively editing)
  useEffect(() => {
    if (!team) return;
    if (editingTeam) return;
    setDraftTeam({
      name: team.name || "",
      logo_url: team.logo_url || "",
      about: aboutFieldName ? team[aboutFieldName] || "" : "",
    });
  }, [team, aboutFieldName, editingTeam]);

  // ------------ TEAM SAVE ------------
  async function saveTeamEdits(e) {
    e?.preventDefault?.();
    if (!canEdit || !team?.id) return;
    if (savingTeam) return;

    const name = (draftTeam.name || "").trim();
    const logo_url = (draftTeam.logo_url || "").trim();
    const about = (draftTeam.about || "").trim();

    if (!name) {
      setTeamSaveError("Team name cannot be empty.");
      return;
    }

    setSavingTeam(true);
    setTeamSaveError("");

    const patch = {};
    if (Object.prototype.hasOwnProperty.call(team, "name")) patch.name = name;
    if (Object.prototype.hasOwnProperty.call(team, "logo_url")) patch.logo_url = logo_url;
    if (aboutFieldName) patch[aboutFieldName] = about;

    const { data, error } = await supabase.from("teams").update(patch).eq("id", team.id).select("*").single();

    if (error) {
      console.error("Team update error:", error);
      setTeamSaveError(error.message || "Update failed.");
      setSavingTeam(false);
      return;
    }

    setTeam(data || team);
    setEditingTeam(false);
    setSavingTeam(false);
  }

  // ------------ KEY PLAYERS CRUD ------------
  async function addKeyPlayer(e) {
    e?.preventDefault?.();
    if (!canEdit || !team?.id) return;

    const position = (newPlayer.position || "").trim();
    const name = (newPlayer.name || "").trim();
    const overallNum = Number(String(newPlayer.overall).trim());

    if (!position || !name || !Number.isFinite(overallNum)) {
      setPlayerSaveError("Fill out Position, Name, and Overall (number).");
      return;
    }

    setPlayerSaveError("");
    setPlayerBusyId("new");

    const { data, error } = await supabase
      .from("team_key_players")
      .insert([{ team_id: team.id, position, name, overall: overallNum }])
      .select("*")
      .single();

    setPlayerBusyId(null);

    if (error) {
      console.error("Add key player error:", error);
      setPlayerSaveError(error.message || "Add failed.");
      return;
    }

    setPlayers((prev) => {
      const next = [...prev, data];
      next.sort((a, b) => String(a.position).localeCompare(String(b.position)));
      return next;
    });

    setNewPlayer({ position: "", name: "", overall: "" });

    // Focus the first field again for fast entry
    requestAnimationFrame(() => {
      document.getElementById("kp-position")?.focus?.();
    });
  }

  function startEditPlayer(p) {
    setEditPlayerId(p.id);
    setEditPlayerDraft({
      position: p.position || "",
      name: p.name || "",
      overall: p.overall ?? "",
    });
    setPlayerSaveError("");
    requestAnimationFrame(() => {
      document.getElementById("kp-position")?.focus?.();
    });
  }

  async function saveEditPlayer(e) {
    e?.preventDefault?.();
    if (!canEdit || !editPlayerId) return;

    const position = (editPlayerDraft.position || "").trim();
    const name = (editPlayerDraft.name || "").trim();
    const overallNum = Number(String(editPlayerDraft.overall).trim());

    if (!position || !name || !Number.isFinite(overallNum)) {
      setPlayerSaveError("Fill out Position, Name, and Overall (number).");
      return;
    }

    setPlayerSaveError("");
    setPlayerBusyId(editPlayerId);

    const { data, error } = await supabase
      .from("team_key_players")
      .update({ position, name, overall: overallNum })
      .eq("id", editPlayerId)
      .select("*")
      .single();

    setPlayerBusyId(null);

    if (error) {
      console.error("Update key player error:", error);
      setPlayerSaveError(error.message || "Update failed.");
      return;
    }

    setPlayers((cur) => {
      const next = cur.map((p) => (p.id === editPlayerId ? data : p));
      next.sort((a, b) => String(a.position).localeCompare(String(b.position)));
      return next;
    });

    setEditPlayerId(null);
  }

  async function deletePlayer(id) {
    if (!canEdit) return;
    if (!confirm("Delete this key player?")) return;

    setPlayerSaveError("");
    setPlayerBusyId(id);

    const prev = players;
    setPlayers((cur) => cur.filter((p) => p.id !== id));

    const { error } = await supabase.from("team_key_players").delete().eq("id", id);

    setPlayerBusyId(null);

    if (error) {
      console.error("Delete key player error:", error);
      setPlayerSaveError(error.message || "Delete failed.");
      setPlayers(prev);
    }
  }

  // ------------ SCHEDULE CRUD ------------
  async function addGame(e) {
    e?.preventDefault?.();
    if (!canEdit || !team?.id) return;

    const weekNum = Number(String(newGame.week).trim());
    const opponent = (newGame.opponent || "").trim();
    const oppRank = String(newGame.opponent_rank || "").trim();
    const opponent_rank = oppRank ? Number(oppRank) : null;
    const home_away = (newGame.home_away || "").trim();
    const note = (newGame.note || "").trim();

    if (!Number.isFinite(weekNum) || !opponent) {
      setScheduleSaveError("Week must be a number and Opponent is required.");
      return;
    }
    if (opponent_rank !== null && !Number.isFinite(opponent_rank)) {
      setScheduleSaveError("Opponent rank must be a number (or blank).");
      return;
    }

    setScheduleSaveError("");
    setScheduleBusyId("new");

    const { data, error } = await supabase
      .from("team_schedule")
      .insert([
        {
          team_id: team.id,
          week: weekNum,
          opponent,
          opponent_rank,
          home_away: home_away || null,
          note: note || null,
        },
      ])
      .select("*")
      .single();

    setScheduleBusyId(null);

    if (error) {
      console.error("Add game error:", error);
      setScheduleSaveError(error.message || "Add failed.");
      return;
    }

    setSchedule((prev) => {
      const next = [...prev, data];
      next.sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
      return next;
    });

    setNewGame({ week: "", opponent: "", opponent_rank: "", home_away: "", note: "" });

    requestAnimationFrame(() => {
      document.getElementById("sch-week")?.focus?.();
    });
  }

  function startEditGame(g) {
    setEditGameId(g.id);
    setEditGameDraft({
      week: g.week ?? "",
      opponent: g.opponent || "",
      opponent_rank: g.opponent_rank ?? "",
      home_away: g.home_away || "",
      note: g.note || "",
    });
    setScheduleSaveError("");
    requestAnimationFrame(() => {
      document.getElementById("sch-week")?.focus?.();
    });
  }

  async function saveEditGame(e) {
    e?.preventDefault?.();
    if (!canEdit || !editGameId) return;

    const weekNum = Number(String(editGameDraft.week).trim());
    const opponent = (editGameDraft.opponent || "").trim();
    const oppRank = String(editGameDraft.opponent_rank || "").trim();
    const opponent_rank = oppRank ? Number(oppRank) : null;
    const home_away = (editGameDraft.home_away || "").trim();
    const note = (editGameDraft.note || "").trim();

    if (!Number.isFinite(weekNum) || !opponent) {
      setScheduleSaveError("Week must be a number and Opponent is required.");
      return;
    }
    if (opponent_rank !== null && !Number.isFinite(opponent_rank)) {
      setScheduleSaveError("Opponent rank must be a number (or blank).");
      return;
    }

    setScheduleSaveError("");
    setScheduleBusyId(editGameId);

    const { data, error } = await supabase
      .from("team_schedule")
      .update({
        week: weekNum,
        opponent,
        opponent_rank,
        home_away: home_away || null,
        note: note || null,
      })
      .eq("id", editGameId)
      .select("*")
      .single();

    setScheduleBusyId(null);

    if (error) {
      console.error("Update game error:", error);
      setScheduleSaveError(error.message || "Update failed.");
      return;
    }

    setSchedule((cur) => {
      const next = cur.map((g) => (g.id === editGameId ? data : g));
      next.sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
      return next;
    });

    setEditGameId(null);
  }

  async function deleteGame(id) {
    if (!canEdit) return;
    if (!confirm("Delete this game from the schedule?")) return;

    setScheduleSaveError("");
    setScheduleBusyId(id);

    const prev = schedule;
    setSchedule((cur) => cur.filter((g) => g.id !== id));

    const { error } = await supabase.from("team_schedule").delete().eq("id", id);

    setScheduleBusyId(null);

    if (error) {
      console.error("Delete game error:", error);
      setScheduleSaveError(error.message || "Delete failed.");
      setSchedule(prev);
    }
  }

  // ------------ RENDER ------------
  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 16 }}>
          <div className="muted">Loading team…</div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Team not found</h2>
          <div className="muted" style={{ marginBottom: 12 }}>
            No team exists with slug: <code>{slug}</code>
          </div>
          <Link className="btn" to="/">
            Back to Home
          </Link>
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
        <div className="teamHeroLogo">
          {heroLogo ? <img src={heroLogo} alt={`${teamName} logo`} /> : <div className="muted">No logo set yet</div>}
        </div>

        <div className="teamHeroMeta">
          <h1 style={{ margin: 0 }}>{teamName}</h1>

          {canEdit ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
              <span className="pill">COMMISH</span>

              {!editingTeam ? (
                <button className="btn" type="button" onClick={() => setEditingTeam(true)}>
                  Edit Team
                </button>
              ) : (
                <>
                  <button className="btn primary" type="button" onClick={saveTeamEdits} disabled={savingTeam}>
                    {savingTeam ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setEditingTeam(false);
                      setTeamSaveError("");
                      setDraftTeam({
                        name: team.name || "",
                        logo_url: team.logo_url || "",
                        about: aboutFieldName ? team[aboutFieldName] || "" : "",
                      });
                    }}
                    disabled={savingTeam}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* TEAM EDIT PANEL */}
      {canEdit && editingTeam ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="cardHeader">
            <h2>Edit Team Page</h2>
            <div className="muted">Update the basics. Changes save to Supabase.</div>
          </div>

          <div className="cardBody">
            {teamSaveError ? <div className="muted" style={{ color: "crimson", marginBottom: 10 }}>{teamSaveError}</div> : null}

            <form className="form" onSubmit={saveTeamEdits}>
              <div className="row">
                <div className="field">
                  <label className="label" htmlFor="team-name">Team Name</label>
                  <input
                    id="team-name"
                    className="input"
                    value={draftTeam.name}
                    onChange={(e) => setDraftTeam((d) => ({ ...d, name: e.target.value }))}
                    disabled={savingTeam}
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="team-logo">Logo URL</label>
                  <input
                    id="team-logo"
                    className="input"
                    value={draftTeam.logo_url}
                    onChange={(e) => setDraftTeam((d) => ({ ...d, logo_url: e.target.value }))}
                    disabled={savingTeam}
                  />
                </div>
              </div>

              {aboutFieldName ? (
                <div className="field">
                  <label className="label" htmlFor="team-about">About</label>
                  <textarea
                    id="team-about"
                    className="textarea"
                    rows={4}
                    value={draftTeam.about}
                    onChange={(e) => setDraftTeam((d) => ({ ...d, about: e.target.value }))}
                    disabled={savingTeam}
                  />
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 8 }}>
                  No “about/bio/description” column found on your <code>teams</code> table. If you want one, add a column like{" "}
                  <code>about</code> and it will show up here automatically.
                </div>
              )}

              <div className="row">
                <button className="btn primary" type="submit" disabled={savingTeam}>
                  {savingTeam ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="grid2" style={{ marginTop: 14 }}>
        {/* KEY PLAYERS */}
        <div className="card">
          <div className="cardHeader" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2>Key Players</h2>
              <div className="muted">Spotlight players for the team page.</div>
            </div>

            {canEdit ? (
              <button className="btn" type="button" onClick={() => setEditingPlayers((v) => !v)}>
                {editingPlayers ? "Done" : "Edit"}
              </button>
            ) : null}
          </div>

          <div className="cardBody">
            {playerSaveError ? <div className="muted" style={{ color: "crimson", marginBottom: 10 }}>{playerSaveError}</div> : null}

            {players.length ? (
              <div className="stack">
                {players.map((p) => (
                  <div key={p.id} className="kv" style={{ alignItems: "center" }}>
                    <div className="kvKey">{p.position}</div>
                    <div className="kvVal">
                      {p.name} <span className="muted">• OVR {p.overall}</span>
                    </div>

                    {canEdit && editingPlayers ? (
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button className="btn tiny" type="button" onClick={() => startEditPlayer(p)} disabled={playerBusyId === p.id}>
                          Edit
                        </button>
                        <button className="btn tiny danger" type="button" onClick={() => deletePlayer(p.id)} disabled={playerBusyId === p.id}>
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

            {canEdit && editingPlayers ? (
              <div style={{ marginTop: 14 }}>
                <div className="muted" style={{ marginBottom: 8, fontWeight: 900 }}>
                  {editPlayerId ? "Edit Player" : "Add Player"}
                </div>

                <form className="form" onSubmit={editPlayerId ? saveEditPlayer : addKeyPlayer}>
                  <div className="row">
                    <div className="field">
                      <label className="label" htmlFor="kp-position">Position</label>
                      <input
                        id="kp-position"
                        className="input"
                        placeholder="QB, HB, WR..."
                        value={editPlayerId ? editPlayerDraft.position : newPlayer.position}
                        onChange={(e) =>
                          editPlayerId
                            ? setEditPlayerDraft((d) => ({ ...d, position: e.target.value }))
                            : setNewPlayer((d) => ({ ...d, position: e.target.value }))
                        }
                        disabled={playerBusyId === "new" || playerBusyId === editPlayerId}
                      />
                    </div>

                    <div className="field">
                      <label className="label" htmlFor="kp-name">Name</label>
                      <input
                        id="kp-name"
                        className="input"
                        placeholder="Player name"
                        value={editPlayerId ? editPlayerDraft.name : newPlayer.name}
                        onChange={(e) =>
                          editPlayerId
                            ? setEditPlayerDraft((d) => ({ ...d, name: e.target.value }))
                            : setNewPlayer((d) => ({ ...d, name: e.target.value }))
                        }
                        disabled={playerBusyId === "new" || playerBusyId === editPlayerId}
                      />
                    </div>

                    <div className="field" style={{ maxWidth: 160 }}>
                      <label className="label" htmlFor="kp-ovr">OVR</label>
                      <input
                        id="kp-ovr"
                        className="input"
                        placeholder="0-99"
                        inputMode="numeric"
                        type="number"
                        min="0"
                        max="99"
                        value={editPlayerId ? editPlayerDraft.overall : newPlayer.overall}
                        onChange={(e) =>
                          editPlayerId
                            ? setEditPlayerDraft((d) => ({ ...d, overall: e.target.value }))
                            : setNewPlayer((d) => ({ ...d, overall: e.target.value }))
                        }
                        disabled={playerBusyId === "new" || playerBusyId === editPlayerId}
                      />
                    </div>
                  </div>

                  <div className="row" style={{ gap: 10 }}>
                    {!editPlayerId ? (
                      <button className="btn primary" type="submit" disabled={playerBusyId === "new"}>
                        {playerBusyId === "new" ? "Adding..." : "Add Player"}
                      </button>
                    ) : (
                      <>
                        <button className="btn primary" type="submit" disabled={playerBusyId === editPlayerId}>
                          {playerBusyId === editPlayerId ? "Saving..." : "Save Changes"}
                        </button>
                        <button className="btn" type="button" onClick={() => setEditPlayerId(null)} disabled={playerBusyId === editPlayerId}>
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>

        {/* SCHEDULE */}
        <div className="card">
          <div className="cardHeader" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2>Schedule</h2>
              <div className="muted">Your weekly slate.</div>
            </div>

            {canEdit ? (
              <button className="btn" type="button" onClick={() => setEditingSchedule((v) => !v)}>
                {editingSchedule ? "Done" : "Edit"}
              </button>
            ) : null}
          </div>

          <div className="cardBody">
            {scheduleSaveError ? <div className="muted" style={{ color: "crimson", marginBottom: 10 }}>{scheduleSaveError}</div> : null}

            {schedule.length ? (
              <ul className="list">
                {schedule.map((g) => (
                  <li key={g.id} className="listItem">
                    <div className="headlineRow">
                      <div style={{ fontWeight: 900 }}>
                        Week {g.week}: {g.opponent || "TBD"}{" "}
                        {g.opponent_rank ? <span className="muted">(#{g.opponent_rank})</span> : null}
                      </div>
                      <div className="muted">{g.home_away || ""}</div>
                    </div>

                    {g.note ? <div className="muted">{g.note}</div> : null}

                    {canEdit && editingSchedule ? (
                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn tiny" type="button" onClick={() => startEditGame(g)} disabled={scheduleBusyId === g.id}>
                          Edit
                        </button>
                        <button className="btn tiny danger" type="button" onClick={() => deleteGame(g.id)} disabled={scheduleBusyId === g.id}>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted">No schedule yet.</div>
            )}

            {canEdit && editingSchedule ? (
              <div style={{ marginTop: 14 }}>
                <div className="muted" style={{ marginBottom: 8, fontWeight: 900 }}>
                  {editGameId ? "Edit Game" : "Add Game"}
                </div>

                <form className="form" onSubmit={editGameId ? saveEditGame : addGame}>
                  <div className="row">
                    <div className="field" style={{ maxWidth: 140 }}>
                      <label className="label" htmlFor="sch-week">Week #</label>
                      <input
                        id="sch-week"
                        className="input"
                        inputMode="numeric"
                        type="number"
                        min="1"
                        value={editGameId ? editGameDraft.week : newGame.week}
                        onChange={(e) =>
                          editGameId
                            ? setEditGameDraft((d) => ({ ...d, week: e.target.value }))
                            : setNewGame((d) => ({ ...d, week: e.target.value }))
                        }
                        disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                      />
                    </div>

                    <div className="field">
                      <label className="label" htmlFor="sch-opponent">Opponent</label>
                      <input
                        id="sch-opponent"
                        className="input"
                        placeholder="Michigan, Ohio State..."
                        value={editGameId ? editGameDraft.opponent : newGame.opponent}
                        onChange={(e) =>
                          editGameId
                            ? setEditGameDraft((d) => ({ ...d, opponent: e.target.value }))
                            : setNewGame((d) => ({ ...d, opponent: e.target.value }))
                        }
                        disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                      />
                    </div>

                    <div className="field" style={{ maxWidth: 220 }}>
                      <label className="label" htmlFor="sch-rank">Opponent Rank</label>
                      <input
                        id="sch-rank"
                        className="input"
                        placeholder="optional"
                        inputMode="numeric"
                        type="number"
                        min="1"
                        value={editGameId ? editGameDraft.opponent_rank : newGame.opponent_rank}
                        onChange={(e) =>
                          editGameId
                            ? setEditGameDraft((d) => ({ ...d, opponent_rank: e.target.value }))
                            : setNewGame((d) => ({ ...d, opponent_rank: e.target.value }))
                        }
                        disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="field">
                      <label className="label" htmlFor="sch-ha">Home/Away</label>
                      <input
                        id="sch-ha"
                        className="input"
                        placeholder="Home / Away / Neutral (optional)"
                        value={editGameId ? editGameDraft.home_away : newGame.home_away}
                        onChange={(e) =>
                          editGameId
                            ? setEditGameDraft((d) => ({ ...d, home_away: e.target.value }))
                            : setNewGame((d) => ({ ...d, home_away: e.target.value }))
                        }
                        disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                      />
                    </div>

                    <div className="field">
                      <label className="label" htmlFor="sch-note">Note</label>
                      <input
                        id="sch-note"
                        className="input"
                        placeholder="optional"
                        value={editGameId ? editGameDraft.note : newGame.note}
                        onChange={(e) =>
                          editGameId
                            ? setEditGameDraft((d) => ({ ...d, note: e.target.value }))
                            : setNewGame((d) => ({ ...d, note: e.target.value }))
                        }
                        disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                      />
                    </div>
                  </div>

                  <div className="row" style={{ gap: 10 }}>
                    {!editGameId ? (
                      <button className="btn primary" type="submit" disabled={scheduleBusyId === "new"}>
                        {scheduleBusyId === "new" ? "Adding..." : "Add Game"}
                      </button>
                    ) : (
                      <>
                        <button className="btn primary" type="submit" disabled={scheduleBusyId === editGameId}>
                          {scheduleBusyId === editGameId ? "Saving..." : "Save Changes"}
                        </button>
                        <button className="btn" type="button" onClick={() => setEditGameId(null)} disabled={scheduleBusyId === editGameId}>
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* TEAM NEWS */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <h2>Team News</h2>
          <div className="muted">Articles tagged to this team.</div>
        </div>
        <div className="cardBody">
          {articlesLoading ? (
            <div className="muted">Loading articles…</div>
          ) : articles.length ? (
            <ul className="list">
              {articles.map((a) => (
                <li key={a.id} className="listItem">
                  <div style={{ fontWeight: 900 }}>{a.title || "Untitled"}</div>
                  {a.summary ? <div className="muted">{a.summary}</div> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="muted">No team news yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
