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

  useEffect{renderGameLine(g)}
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
