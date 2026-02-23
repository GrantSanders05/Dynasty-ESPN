import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ArticleCard from "../components/ArticleCard.jsx";

const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K","X-FACTOR"];

export default function Team({ supabase, isCommish }) {
  const { slug } = useParams();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [articles, setArticles] = useState([]);

  const [edit, setEdit] = useState({ name: "", record: "", rank: "", coach: "" });
  const [playerEdits, setPlayerEdits] = useState({});

  async function load() {
    const tRes = await supabase.from("teams").select("*").eq("slug", slug).maybeSingle();
    if (tRes.error || !tRes.data) {
      setTeam(null); setPlayers([]); setArticles([]); return;
    }
    setTeam(tRes.data);
    setEdit({ name: tRes.data.name || "", record: tRes.data.record || "", rank: tRes.data.rank ?? "", coach: tRes.data.coach || "" });

    const pRes = await supabase.from("team_key_players").select("*").eq("team_id", tRes.data.id);
    if (!pRes.error) {
      setPlayers(pRes.data || []);
      const map = {};
      for (const p of (pRes.data || [])) map[p.position] = p.player_name;
      setPlayerEdits(map);
    }

    const mapRes = await supabase.from("article_team_map").select("article_id, articles(*)").eq("team_id", tRes.data.id);
    if (!mapRes.error) {
      const rows = mapRes.data || [];
      const arts = rows
        .map(r => r.articles)
        .filter(Boolean)
        .filter(a => a.published !== false)
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      setArticles(arts);
    }
  }

  useEffect(() => { load(); }, [slug]);

  const playersByPos = useMemo(() => {
    const m = new Map();
    for (const p of players) m.set(p.position, p.player_name);
    return m;
  }, [players]);

  async function saveTeam(e) {
    e.preventDefault();
    if (!isCommish || !team) return;

    await supabase.from("teams").update({
      name: edit.name.trim() || team.name,
      record: edit.record.trim() || null,
      rank: edit.rank === "" ? null : Number(edit.rank),
      coach: edit.coach.trim() || null,
    }).eq("id", team.id);

    await load();
  }

  async function savePlayers(e) {
    e.preventDefault();
    if (!isCommish || !team) return;

    const rows = POSITIONS
      .map(pos => ({
        team_id: team.id,
        position: pos,
        player_name: (playerEdits[pos] || "").trim() || null,
      }))
      .filter(r => r.player_name);

    await supabase.from("team_key_players").delete().eq("team_id", team.id);
    if (rows.length) await supabase.from("team_key_players").insert(rows);

    await load();
  }

  if (!team) {
    return (
      <main className="page">
        <div className="pageHeader">
          <h1>Team Not Found</h1>
          <div className="muted">This team slug doesn't exist.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="teamHero">
        <div className="teamName">{team.name}</div>
        <div className="teamMeta">
          {team.rank != null ? <span className="pill">Rank #{team.rank}</span> : null}
          {team.record ? <span className="pill">{team.record}</span> : null}
          {team.coach ? <span className="pill">Coach: {team.coach}</span> : null}
        </div>
      </div>

      {isCommish && (
        <div className="card">
          <div className="cardHeader"><h2>Commissioner: Edit Team</h2></div>
          <form className="form" onSubmit={saveTeam}>
            <div className="row">
              <input className="input" placeholder="Team name" value={edit.name} onChange={(e) => setEdit(s => ({...s, name:e.target.value}))} />
              <input className="input" placeholder="Record (ex: 6-1)" value={edit.record} onChange={(e) => setEdit(s => ({...s, record:e.target.value}))} />
            </div>
            <div className="row">
              <input className="input" placeholder="Rank (number)" value={edit.rank} onChange={(e) => setEdit(s => ({...s, rank:e.target.value}))} />
              <input className="input" placeholder="Coach (optional)" value={edit.coach} onChange={(e) => setEdit(s => ({...s, coach:e.target.value}))} />
              <button className="btn primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="cardHeader"><h2>Key Players</h2></div>

        {isCommish ? (
          <form className="form" onSubmit={savePlayers}>
            <div className="grid2">
              {POSITIONS.map(pos => (
                <div key={pos} className="kv">
                  <div className="kvKey">{pos}</div>
                  <input className="input" placeholder="Player name" value={playerEdits[pos] || ""}
                    onChange={(e) => setPlayerEdits(s => ({ ...s, [pos]: e.target.value }))} />
                </div>
              ))}
            </div>
            <button className="btn primary" type="submit">Save Key Players</button>
          </form>
        ) : (
          <div className="grid2">
            {POSITIONS.map(pos => (
              <div key={pos} className="kv">
                <div className="kvKey">{pos}</div>
                <div className="kvVal">{playersByPos.get(pos) || <span className="muted">—</span>}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="cardHeader"><h2>Team Articles</h2></div>
        <div className="grid">
          {articles.map(a => <ArticleCard key={a.id} a={a} isCommish={false} />)}
          {!articles.length && <div className="muted">No articles tagged to this team yet.</div>}
        </div>
      </div>
    </main>
  );
}
