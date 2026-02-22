import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function SchedulePage() {
  const supabase = supabaseServer();

  const { data: games } = await supabase
    .from("games")
    .select("id,week,date,home_team_id,away_team_id,final_score_home,final_score_away,status,home:teams!games_home_team_id_fkey(name,slug),away:teams!games_away_team_id_fkey(name,slug)")
    .order("week", { ascending: true })
    .order("date", { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Schedule</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Current rank shown is based on the latest uploaded Top 25 snapshot.
      </p>

      <div className="space-y-2">
        {(games ?? []).map((g) => (
          <Link key={g.id} href={`/game/${g.id}`} className="block rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
            <div className="text-sm text-neutral-500">Week {g.week}{g.date ? ` • ${new Date(g.date).toLocaleDateString()}` : ""}</div>
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{(g.away as any)?.name} @ {(g.home as any)?.name}</div>
              <div className="text-sm">
                {g.status === "completed" ? `${g.final_score_away ?? "-"}–${g.final_score_home ?? "-"}` : "—"}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
