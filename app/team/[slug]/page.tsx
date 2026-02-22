import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function TeamPage({ params }: { params: { slug: string } }) {
  const supabase = supabaseServer();
  const { data: team } = await supabase.from("teams").select("*").eq("slug", params.slug).maybeSingle();
  if (!team) return notFound();

  // record derived from games
  const { data: games } = await supabase
    .from("games")
    .select("id,week,home_team_id,away_team_id,final_score_home,final_score_away,status,home:teams!games_home_team_id_fkey(name,slug),away:teams!games_away_team_id_fkey(name,slug)")
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
    .order("week", { ascending: true });

  let wCount=0,lCount=0;
  for (const g of (games ?? [])) {
    if (g.status !== "completed") continue;
    const isHome = g.home_team_id === team.id;
    const my = isHome ? (g.final_score_home ?? 0) : (g.final_score_away ?? 0);
    const opp = isHome ? (g.final_score_away ?? 0) : (g.final_score_home ?? 0);
    if (my > opp) wCount++;
    else if (my < opp) lCount++;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="text-sm text-neutral-500">{team.is_user_team ? "User Team" : "CPU Team"}</div>
        <h1 className="text-2xl font-semibold">{team.name}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Record: {wCount}-{lCount}</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Schedule</h2>
        {(games ?? []).map((g) => (
          <Link key={g.id} href={`/game/${g.id}`} className="block rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
            <div className="text-sm text-neutral-500">Week {g.week}</div>
            <div className="flex items-center justify-between">
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
