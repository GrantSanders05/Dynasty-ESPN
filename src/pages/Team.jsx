import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ArticleCard from "../components/ArticleCard.jsx";

const KEY_POSITIONS = ["QB", "RB", "WR", "CB", "DL"];

function emptyPlayers() {
  return KEY_POSITIONS.reduce((acc, pos) => {
    acc[pos] = { position: pos, player_name: "", overall: "" };
    return acc;
  }, {});
}

export default function Team({ supabase, isCommish }) {
  const { slug } = useParams();

  const [team, setTeam] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [schedule, setSchedule] = useState([]); // 15 rows
  const [playersByPos, setPlayersByPos] = useState(emptyPlayers());
  const [articles, setArticles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const weeks = useMemo(() => {
    const map = new Map((schedule || []).map((r) => [r.week, r]));
    return Array.from({ length: 15 }, (_, i) => {
      const w = i + 1;
      return (
        map.get(w) || {
          week: w,
          opponent: "",
          opponent_rank: "",
          location: "",
          notes: "",
        }
      );
    });
  }, [schedule]);

  async function load() {
    setLoading(true);
    setMsg(null);

    const tRes = await supabase
      .from("teams")
      .select("id,name,slug,logo_url")
      .eq("slug", slug)
      .maybeSingle();

    if (tRes.error || !tRes.data) {
      setTeam(null);
      setLoading(false);
      return;
    }

    const t = tRes.data;
    setTeam(t);
    setLogoUrl(t.logo_url || "");

    const [sRes, pRes, aRes] = await Promise.all([
      supabase
        .from("team_schedule")
        .select("id,team_id,week,opponent,opponent_rank,location,notes")
        .eq("team_id", t.id)
        .order("week", { ascending: true }),
      supabase
        .from("team_key_players")
        .select("id,team_id,position,player_name,overall")
        .eq("team_id", t.id),
      supabase
        .from("article_teams")
        .select("created_at, articles(*)")
        .eq("team_id", t.id)
        .order("created_at", { ascending: false }),
    ]);

    if (!sRes.error) setSchedule(sRes.data || []);
    if (!pRes.error) {
      const next = emptyPlayers();
      (pRes.data || []).forEach((r) => {
        if (next[r.position]) next[r.position] = r;
      });
      setPlayersByPos(next);
    }
    if (!aRes.error) {
      const list = (aRes.data || [])
        .map((r) => r.articles)
        .filter(Boolean)
        .filter((a, idx, arr) => arr.findIndex((x) => x.id === a.id) === idx);
      setArticles(list);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function updateWeek(week, patch) {
    setSchedule((prev) => {
      const existing = (prev || []).find((r) => r.week === week);
      const updated = { ...(existing || { week }), ...patch };
      const others = (prev || []).filter((r) => r.week !== week);
      return [...others, updated].sort((a, b) => a.week - b.week);
    });
  }

  function updatePlayer(pos, patch) {
    setPlayersByPos((prev) => ({ ...prev, [pos]: { ...(prev[pos] || { position: pos }), ...patch } }));
  }

  async function saveAll() {
    if (!team) return;
    setSaving(true);
    setMsg(null);

    try {
      // 1) Save logo
      const uTeam = await supabase.from("teams").update({ logo_url: logoUrl || null }).eq("id", team.id);
      if (uTeam.error) throw uTeam.error;

      // 2) Save schedule (upsert by team_id + week)
      const schedRows = weeks.map((w) => ({
        team_id: team.id,
        week: w.week,
        opponent: (w.opponent || "").trim() || null,
        opponent_rank: w.opponent_rank === "" || w.opponent_rank == null ? null : Number(w.opponent_rank),
        location: (w.location || "").trim() || null,
        notes: (w.notes || "").trim() || null,
      }));
      const uSched = await supabase
        .from("team_schedule")
        .upsert(schedRows, { onConflict: "team_id,week" });
      if (uSched.error) throw uSched.error;

      // 3) Save key players (upsert by team_id + position)
      const playerRows = KEY_POSITIONS.map((pos) => {
        const r = playersByPos[pos] || { position: pos };
        return {
          team_id: team.id,
          position: pos,
          player_name: (r.player_name || "").trim() || null,
          overall: r.overall === "" || r.overall == null ? null : Number(r.overall),
        };
      });
      const uPlayers = await supabase
        .from("team_key_players")
        .upsert(playerRows, { onConflict: "team_id,position" });
      if (uPlayers.error) throw uPlayers.error;

      setMsg({ type: "ok", text: "Saved team page updates." });
      await load();
    } catch (e) {
      setMsg({ type: "err", text: e?.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page"><div className="card">Loading team…</div></div>;
  if (!team) return <div className="page"><div className="card">Team not found.</div></div>;

  return (
    <div className="page">
      {msg?.type === "ok" && <div className="banner notice">{msg.text}</div>}
      {msg?.type === "err" && <div className="banner error">{msg.text}</div>}      <div className="teamHero">
        <div className="teamHeroHeader">
          <div className="teamLogoHero" aria-label="Team logo">
            {logoUrl ? (
              <img className="teamLogoImg" src={logoUrl} alt={`${team.name} logo`} />
            ) : (
              <div className="muted" style={{ fontWeight: 900 }}>LOGO</div>
            )}
          </div>

          <div className="teamHeroText">
            <div className="teamName teamNameBig">{team.name}</div>
            <div className="muted" style={{ marginTop: 6 }}>/teams/{team.slug}</div>
          </div>

          {isCommish ? (
            <div className="teamHeroActions">
              <button className="btn primary" onClick={saveAll} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          ) : null}
        </div>

        {isCommish ? (
          <div className="teamHeroEdit">
            <div className="kvKey">Logo URL</div>
            <input className="input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…(direct image URL)" />
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Tip: use a direct image link ending in .png/.jpg/.svg (Wikipedia: click the logo → “Original file”).
            </div>
          </div>
        ) : null}
      </div>


      <div className="grid2">
        <div className="card">
          <div className="cardHeader">
            <h2>Key Players</h2>
          </div>

          <div className="stack">
            {KEY_POSITIONS.map((pos) => {
              const r = playersByPos[pos] || { position: pos };
              return (
                <div key={pos} className="kv">
                  <div className="kvKey">{pos}</div>

                  {isCommish ? (
                    <div className="row">
                      <input
                        className="input"
                        value={r.player_name || ""}
                        onChange={(e) => updatePlayer(pos, { player_name: e.target.value })}
                        placeholder="Player name"
                      />
                      <input
                        className="input"
                        value={r.overall ?? ""}
                        onChange={(e) => updatePlayer(pos, { overall: e.target.value })}
                        placeholder="OVR"
                        inputMode="numeric"
                      />
                    </div>
                  ) : (
                    <div className="row">
                      <div className="kvVal">{r.player_name || <span className="muted">—</span>}</div>
                      <div className="kvVal">{r.overall ?? <span className="muted">—</span>}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <h2>Schedule</h2>
            <span className="muted" style={{ fontSize: 12 }}>15 weeks</span>
          </div>

          <div className="stack">
            {weeks.map((w) => (
              <div key={w.week} className="episode">
                <div className="episodeTitle">Week {w.week}</div>

                {isCommish ? (
                  <>
                    <div className="row">
                      <input
                        className="input"
                        value={w.opponent || ""}
                        onChange={(e) => updateWeek(w.week, { opponent: e.target.value })}
                        placeholder="Opponent"
                      />
                      <input
                        className="input"
                        value={w.opponent_rank ?? ""}
                        onChange={(e) => updateWeek(w.week, { opponent_rank: e.target.value })}
                        placeholder="Opp Rank (1–25)"
                        inputMode="numeric"
                      />
                    </div>

                    <div className="row">
                      <input
                        className="input"
                        value={w.location || ""}
                        onChange={(e) => updateWeek(w.week, { location: e.target.value })}
                        placeholder="H / A (or custom)"
                      />
                      <input
                        className="input"
                        value={w.notes || ""}
                        onChange={(e) => updateWeek(w.week, { notes: e.target.value })}
                        placeholder="Notes"
                      />
                    </div>
                  </>
                ) : (
                  <div className="row">
                    <div className="kvVal">
                      {w.location ? `${w.location} ` : ""}
                      {w.opponent || <span className="muted">TBD</span>}
                      {w.opponent_rank ? <span className="badge" style={{ marginLeft: 8 }}>#{w.opponent_rank}</span> : null}
                    </div>
                    <div className="muted">{w.notes || ""}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="cardHeader">
          <h2>Team News</h2>
        </div>

        {articles?.length ? (
          <ul className="list">
            {articles.map((a) => (
              <li key={a.id} className="listItem">
                <ArticleCard article={a} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="muted">No team-tagged articles yet.</div>
        )}
      </div>
    </div>
  );
}
