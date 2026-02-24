import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase as defaultSupabase } from "../supabaseClient";

/**
 * Team Page
 * - Shows: hero, key players, schedule, team news (tagged articles)
 * - Editing (Commissioner):
 *    - Team basics (name/logo + optional about/bio)
 *    - Key Players (CRUD)
 *    - Schedule (CRUD)
 *
 * Notes:
 * - Commish detection:
 *    1) isCommish prop (preferred)
 *    2) user + commishEmail props (fallback)
 * - Key Players table expected columns:
 *    id, team_id, position, name, overall
 * - Schedule table expected columns:
 *    id, team_id, week, opponent, opponent_rank, home_away, note
 */
export default function Team({
  supabase = defaultSupabase,
  isCommish = false,
  user = null,
  commishEmail = "",
}) {
  const { slug } = useParams();

  const canEdit = useMemo(() => {
    if (isCommish) return true;
    const e = (user?.email || "").toLowerCase();
    const c = (commishEmail || "").toLowerCase();
    return !!e && !!c && e === c;
  }, [isCommish, user, commishEmail]);

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

  const [players, setPlayers] = useState([]);
  const [schedule, setSchedule] = useState([]);

  // --- Team Editing ---
  const [editingTeam, setEditingTeam] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamSaveError, setTeamSaveError] = useState("");
  const [draftTeam, setDraftTeam] = useState({
    name: "",
    logo_url: "",
    about: "",
  });

  // --- Key Players Editing ---
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [playerSaveError, setPlayerSaveError] = useState("");
  const [playerBusyId, setPlayerBusyId] = useState(null);
  const [newPlayer, setNewPlayer] = useState({
    position: "",
    name: "",
    overall: "",
  });
  const [editPlayerId, setEditPlayerId] = useState(null);
  const [editPlayerDraft, setEditPlayerDraft] = useState({
    position: "",
    name: "",
    overall: "",
  });

  // --- Schedule Editing ---
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

  // Prefer an "about" column if it exists (so we don't guess wrong column names)
  const aboutFieldName = useMemo(() => {
    if (!team) return "";
    const candidates = ["about", "bio", "description", "blurb", "summary"];
    return candidates.find((c) => Object.prototype.hasOwnProperty.call(team, c)) || "";
  }, [team]);

  const teamName = team?.name || "Team";
  const heroLogo = team?.logo_url || "";

  const excerpt = useMemo(() => {
    return (text, max = 160) => {
      if (!text) return "";
      const t = String(text).replace(/\s+/g, " ").trim();
      return t.length > max ? t.slice(0, max).trim() + "…" : t;
    };
  }, []);

  // Load team by slug
  useEffect(() => {
    let alive = true;

    async function loadTeam() {
      setLoading(true);

      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

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

  // When team loads, seed editor draft (but don't overwrite while actively editing)
  useEffect(() => {
    if (!team) return;
    if (editingTeam) return;

    setDraftTeam({
      name: team.name || "",
      logo_url: team.logo_url || "",
      about: aboutFieldName ? (team[aboutFieldName] || "") : "",
    });
  }, [team, aboutFieldName, editingTeam]);

  // Key players
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

  // Schedule
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

  // Tagged articles
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

  // -------- TEAM BASIC SAVE ----------
  async function saveTeamEdits() {
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

    try {
      const res = await supabase
        .from("teams")
        .update(patch)
        .eq("id", team.id)
        .select("*")
        .single();

      if (res.error) {
        console.error("Team update error:", res.error);
        setTeamSaveError(res.error.message || "Update failed.");
        return;
      }

      setTeam(res.data || team);
      setEditingTeam(false);
    } catch (err) {
      console.error("Team update crash:", err);
      setTeamSaveError("Update crashed. Check console.");
    } finally {
      setSavingTeam(false);
    }
  }

  // -------- KEY PLAYERS CRUD ----------
  async function addKeyPlayer() {
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

    try {
      const res = await supabase
        .from("team_key_players")
        .insert([{ team_id: team.id, position, name, overall: overallNum }])
        .select("*")
        .single();

      if (res.error) {
        console.error("Add key player error:", res.error);
        setPlayerSaveError(res.error.message || "Add failed.");
        return;
      }

      setPlayers((prev) => {
        const next = [...prev, res.data];
        next.sort((a, b) => String(a.position).localeCompare(String(b.position)));
        return next;
      });

      setNewPlayer({ position: "", name: "", overall: "" });
    } finally {
      setPlayerBusyId(null);
    }
  }

  function startEditPlayer(p) {
    setEditPlayerId(p.id);
    setEditPlayerDraft({
      position: p.position || "",
      name: p.name || "",
      overall: p.overall ?? "",
    });
    setPlayerSaveError("");
  }

  async function saveEditPlayer() {
    if (!canEdit || !team?.id) return;
    if (!editPlayerId) return;

    const position = (editPlayerDraft.position || "").trim();
    const name = (editPlayerDraft.name || "").trim();
    const overallNum = Number(String(editPlayerDraft.overall).trim());

    if (!position || !name || !Number.isFinite(overallNum)) {
      setPlayerSaveError("Fill out Position, Name, and Overall (number).");
      return;
    }

    setPlayerSaveError("");
    setPlayerBusyId(editPlayerId);

    const prev = players;
    setPlayers((cur) =>
      cur.map((p) =>
        p.id === editPlayerId ? { ...p, position, name, overall: overallNum } : p
      )
    );

    try {
      const res = await supabase
        .from("team_key_players")
        .update({ position, name, overall: overallNum })
        .eq("id", editPlayerId)
        .select("*")
        .single();

      if (res.error) {
        console.error("Update key player error:", res.error);
        setPlayerSaveError(res.error.message || "Update failed.");
        setPlayers(prev);
        return;
      }

      setPlayers((cur) => {
        const next = cur.map((p) => (p.id === editPlayerId ? res.data : p));
        next.sort((a, b) => String(a.position).localeCompare(String(b.position)));
        return next;
      });

      setEditPlayerId(null);
    } finally {
      setPlayerBusyId(null);
    }
  }

  async function deletePlayer(id) {
    if (!canEdit) return;
    if (!confirm("Delete this key player?")) return;

    setPlayerSaveError("");
    setPlayerBusyId(id);

    const prev = players;
    setPlayers((cur) => cur.filter((p) => p.id !== id));

    try {
      const res = await supabase.from("team_key_players").delete().eq("id", id);
      if (res.error) {
        console.error("Delete key player error:", res.error);
        setPlayerSaveError(res.error.message || "Delete failed.");
        setPlayers(prev);
      }
    } finally {
      setPlayerBusyId(null);
    }
  }

  // -------- SCHEDULE CRUD ----------
  async function addGame() {
    if (!canEdit || !team?.id) return;

    const weekNum = Number(String(newGame.week).trim());
    const opponent = (newGame.opponent || "").trim();
    const home_away = (newGame.home_away || "").trim();
    const note = (newGame.note || "").trim();
    const oppRank = String(newGame.opponent_rank || "").trim();
    const opponent_rank = oppRank ? Number(oppRank) : null;

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

    try {
      const res = await supabase
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

      if (res.error) {
        console.error("Add game error:", res.error);
        setScheduleSaveError(res.error.message || "Add failed.");
        return;
      }

      setSchedule((prev) => {
        const next = [...prev, res.data];
        next.sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
        return next;
      });

      setNewGame({ week: "", opponent: "", opponent_rank: "", home_away: "", note: "" });
    } finally {
      setScheduleBusyId(null);
    }
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
  }

  async function saveEditGame() {
    if (!canEdit || !editGameId) return;

    const weekNum = Number(String(editGameDraft.week).trim());
    const opponent = (editGameDraft.opponent || "").trim();
    const home_away = (editGameDraft.home_away || "").trim();
    const note = (editGameDraft.note || "").trim();
    const oppRank = String(editGameDraft.opponent_rank || "").trim();
    const opponent_rank = oppRank ? Number(oppRank) : null;

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

    const prev = schedule;
    setSchedule((cur) =>
      cur.map((g) =>
        g.id === editGameId
          ? {
              ...g,
              week: weekNum,
              opponent,
              opponent_rank,
              home_away: home_away || null,
              note: note || null,
            }
          : g
      )
    );

    try {
      const res = await supabase
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

      if (res.error) {
        console.error("Update game error:", res.error);
        setScheduleSaveError(res.error.message || "Update failed.");
        setSchedule(prev);
        return;
      }

      setSchedule((cur) => {
        const next = cur.map((g) => (g.id === editGameId ? res.data : g));
        next.sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
        return next;
      });

      setEditGameId(null);
    } finally {
      setScheduleBusyId(null);
    }
  }

  async function deleteGame(id) {
    if (!canEdit) return;
    if (!confirm("Delete this game from the schedule?")) return;

    setScheduleSaveError("");
    setScheduleBusyId(id);

    const prev = schedule;
    setSchedule((cur) => cur.filter((g) => g.id !== id));

    try {
      const res = await supabase.from("team_schedule").delete().eq("id", id);
      if (res.error) {
        console.error("Delete game error:", res.error);
        setScheduleSaveError(res.error.message || "Delete failed.");
        setSchedule(prev);
      }
    } finally {
      setScheduleBusyId(null);
    }
  }

  // ---------------- RENDER ----------------
  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <div className="muted">Loading team…</div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page">
        <div className="card">
          <h2>Team not found</h2>
          <div className="muted">No team exists with slug: {slug}</div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn" to="/">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* HERO */}
      <div className="team-hero">
        {heroLogo ? (
          <img className="team-hero-logo" src={heroLogo} alt={teamName} />
        ) : (
          <div className="muted">No logo set yet</div>
        )}

        <div className="team-hero-title">{teamName}</div>

        {canEdit ? (
          <div style={{ marginLeft: "auto" }}>
            {!editingTeam ? (
              <button className="btn" type="button" onClick={() => setEditingTeam(true)}>
                Edit Team
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn primary"
                  type="button"
                  onClick={saveTeamEdits}
                  disabled={savingTeam}
                >
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
                      about: aboutFieldName ? (team[aboutFieldName] || "") : "",
                    });
                  }}
                  disabled={savingTeam}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* TEAM EDIT PANEL */}
      {canEdit && editingTeam ? (
        <div className="card" style={{ marginTop: 14, position: "relative", zIndex: 1 }}>
          <div className="cardHeader">
            <h2>Edit Team Page</h2>
            <div className="muted">Update the basics. Changes save to Supabase.</div>
          </div>

          {teamSaveError ? (
            <div className="muted" style={{ color: "crimson", marginBottom: 10 }}>
              {teamSaveError}
            </div>
          ) : null}

          <div className="form" style={{ position: "relative", zIndex: 1 }}>
            <div className="row">
              <input
                className="input"
                placeholder="Team name"
                value={draftTeam.name}
                onChange={(e) => setDraftTeam((d) => ({ ...d, name: e.target.value }))}
                disabled={savingTeam}
              />
            </div>

            <div className="row">
              <input
                className="input"
                placeholder="Logo URL (optional)"
                value={draftTeam.logo_url}
                onChange={(e) => setDraftTeam((d) => ({ ...d, logo_url: e.target.value }))}
                disabled={savingTeam}
              />
            </div>

            {aboutFieldName ? (
              <textarea
                className="textarea"
                rows={5}
                placeholder="About / Team Notes (optional)"
                value={draftTeam.about}
                onChange={(e) => setDraftTeam((d) => ({ ...d, about: e.target.value }))}
                disabled={savingTeam}
              />
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>
                No “about/bio/description” column found on your <code>teams</code> table. If you want
                one, add a column like <code>about</code> and it will show up here automatically.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* KEY PLAYERS + SCHEDULE */}
      <div className="grid2" style={{ marginTop: 14 }}>
        {/* KEY PLAYERS */}
        <div className="card" style={{ position: "relative", zIndex: 1 }}>
          <div
            className="cardHeader"
            style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}
          >
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

          {playerSaveError ? (
            <div className="muted" style={{ color: "crimson", marginBottom: 10 }}>
              {playerSaveError}
            </div>
          ) : null}

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
                      <button
                        className="btn tiny"
                        type="button"
                        onClick={() => startEditPlayer(p)}
                        disabled={playerBusyId === p.id}
                      >
                        Edit
                      </button>
                      <button
                        className="btn tiny danger"
                        type="button"
                        onClick={() => deletePlayer(p.id)}
                        disabled={playerBusyId === p.id}
                      >
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

          {/* Add / Edit Forms */}
          {canEdit && editingPlayers ? (
            <div style={{ marginTop: 14, position: "relative", zIndex: 5 }}>
              <div className="muted" style={{ marginBottom: 8, fontWeight: 900 }}>
                {editPlayerId ? "Edit Player" : "Add Player"}
              </div>

              <div className="form" style={{ position: "relative", zIndex: 5 }}>
                <div className="row">
                  <input
                    className="input"
                    placeholder="Position (QB, HB, WR...)"
                    value={editPlayerId ? editPlayerDraft.position : newPlayer.position}
                    onChange={(e) =>
                      editPlayerId
                        ? setEditPlayerDraft((d) => ({ ...d, position: e.target.value }))
                        : setNewPlayer((d) => ({ ...d, position: e.target.value }))
                    }
                    disabled={playerBusyId === "new" || playerBusyId === editPlayerId}
                  />
                  <input
                    className="input"
                    placeholder="Name"
                    value={editPlayerId ? editPlayerDraft.name : newPlayer.name}
                    onChange={(e) =>
                      editPlayerId
                        ? setEditPlayerDraft((d) => ({ ...d, name: e.target.value }))
                        : setNewPlayer((d) => ({ ...d, name: e.target.value }))
                    }
                    disabled={playerBusyId === "new" || playerBusyId === editPlayerId}
                  />
                  <input
                    className="input"
                    placeholder="OVR (number)"
                    value={editPlayerId ? editPlayerDraft.overall : newPlayer.overall}
                    onChange={(e) =>
                      editPlayerId
                        ? setEditPlayerDraft((d) => ({ ...d, overall: e.target.value }))
                        : setNewPlayer((d) => ({ ...d, overall: e.target.value }))
                    }
                    disabled={playerBusyId === "new" || playerBusyId === editPlayerId}
                    style={{ maxWidth: 140 }}
                  />
                </div>

                <div className="row">
                  {!editPlayerId ? (
                    <button
                      className="btn primary"
                      type="button"
                      onClick={addKeyPlayer}
                      disabled={playerBusyId === "new"}
                    >
                      {playerBusyId === "new" ? "Adding..." : "Add Player"}
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn primary"
                        type="button"
                        onClick={saveEditPlayer}
                        disabled={playerBusyId === editPlayerId}
                      >
                        {playerBusyId === editPlayerId ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => setEditPlayerId(null)}
                        disabled={playerBusyId === editPlayerId}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* SCHEDULE */}
        <div className="card" style={{ position: "relative", zIndex: 1 }}>
          <div
            className="cardHeader"
            style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}
          >
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

          {scheduleSaveError ? (
            <div className="muted" style={{ color: "crimson", marginBottom: 10 }}>
              {scheduleSaveError}
            </div>
          ) : null}

          {schedule.length ? (
            <ul className="list">
              {schedule.map((g) => (
                <li key={g.id} className="listItem">
                  <div className="headlineRow">
                    <div style={{ fontWeight: 900 }}>
                      Week {g.week}: {g.opponent || "TBD"}
                      {g.opponent_rank ? <span className="muted"> (#{g.opponent_rank})</span> : null}
                    </div>
                    <div className="muted">{g.home_away || ""}</div>
                  </div>

                  {g.note ? <div className="muted">{g.note}</div> : null}

                  {canEdit && editingSchedule ? (
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="btn tiny"
                        type="button"
                        onClick={() => startEditGame(g)}
                        disabled={scheduleBusyId === g.id}
                      >
                        Edit
                      </button>
                      <button
                        className="btn tiny danger"
                        type="button"
                        onClick={() => deleteGame(g.id)}
                        disabled={scheduleBusyId === g.id}
                      >
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
            <div style={{ marginTop: 14, position: "relative", zIndex: 5 }}>
              <div className="muted" style={{ marginBottom: 8, fontWeight: 900 }}>
                {editGameId ? "Edit Game" : "Add Game"}
              </div>

              <div className="form" style={{ position: "relative", zIndex: 5 }}>
                <div className="row">
                  <input
                    className="input"
                    placeholder="Week #"
                    value={editGameId ? editGameDraft.week : newGame.week}
                    onChange={(e) =>
                      editGameId
                        ? setEditGameDraft((d) => ({ ...d, week: e.target.value }))
                        : setNewGame((d) => ({ ...d, week: e.target.value }))
                    }
                    disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                    style={{ maxWidth: 120 }}
                  />
                  <input
                    className="input"
                    placeholder="Opponent"
                    value={editGameId ? editGameDraft.opponent : newGame.opponent}
                    onChange={(e) =>
                      editGameId
                        ? setEditGameDraft((d) => ({ ...d, opponent: e.target.value }))
                        : setNewGame((d) => ({ ...d, opponent: e.target.value }))
                    }
                    disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                  />
                  <input
                    className="input"
                    placeholder="Opponent Rank (optional)"
                    value={editGameId ? editGameDraft.opponent_rank : newGame.opponent_rank}
                    onChange={(e) =>
                      editGameId
                        ? setEditGameDraft((d) => ({ ...d, opponent_rank: e.target.value }))
                        : setNewGame((d) => ({ ...d, opponent_rank: e.target.value }))
                    }
                    disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                    style={{ maxWidth: 200 }}
                  />
                </div>

                <div className="row">
                  <input
                    className="input"
                    placeholder="Home/Away (optional) e.g. Home, Away, Neutral"
                    value={editGameId ? editGameDraft.home_away : newGame.home_away}
                    onChange={(e) =>
                      editGameId
                        ? setEditGameDraft((d) => ({ ...d, home_away: e.target.value }))
                        : setNewGame((d) => ({ ...d, home_away: e.target.value }))
                    }
                    disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                  />
                </div>

                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Note (optional) — rivalry, primetime, injury watch…"
                  value={editGameId ? editGameDraft.note : newGame.note}
                  onChange={(e) =>
                    editGameId
                      ? setEditGameDraft((d) => ({ ...d, note: e.target.value }))
                      : setNewGame((d) => ({ ...d, note: e.target.value }))
                  }
                  disabled={scheduleBusyId === "new" || scheduleBusyId === editGameId}
                />

                <div className="row">
                  {!editGameId ? (
                    <button
                      className="btn primary"
                      type="button"
                      onClick={addGame}
                      disabled={scheduleBusyId === "new"}
                    >
                      {scheduleBusyId === "new" ? "Adding..." : "Add Game"}
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn primary"
                        type="button"
                        onClick={saveEditGame}
                        disabled={scheduleBusyId === editGameId}
                      >
                        {scheduleBusyId === editGameId ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => setEditGameId(null)}
                        disabled={scheduleBusyId === editGameId}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* TEAM NEWS */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <h2>Team News</h2>
          {articlesLoading ? <div className="muted">Loading…</div> : null}
        </div>

        {!articlesLoading && !articles.length ? <div className="muted">No tagged articles yet.</div> : null}

        {articles.length ? (
          <div className="grid" style={{ marginTop: 10 }}>
            {articles.map((a) => (
              <div key={a.id} className="storyCard">
                <div className="storyMeta">
                  <div className="badge">TEAM NEWS</div>
                  {a.created_at ? (
                    <div className="muted">{new Date(a.created_at).toLocaleDateString()}</div>
                  ) : null}
                </div>
                <div className="storyTitle">{a.title || "Untitled"}</div>
                <div className="storyExcerpt">{excerpt(a.body || a.content || a.excerpt)}</div>
                <div className="actions">
                  {a.url ? (
                    <a className="btn small" href={a.url} target="_blank" rel="noreferrer">
                      Read
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
