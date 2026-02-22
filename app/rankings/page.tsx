import { supabaseServer } from "@/lib/supabase/server";

export default async function RankingsPage() {
  const supabase = supabaseServer();
  const { data: latest } = await supabase
    .from("rankings_snapshots")
    .select("*")
    .order("season_id", { ascending: false })
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();

  const list = (latest?.rankings_json?.top25 ?? []) as Array<{ rank: number; team: string }>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h1 className="text-2xl font-semibold">Top 25</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          This page shows exactly what you upload each week. No extra rankings are generated.
        </p>
        {latest ? (
          <p className="text-sm text-neutral-500 mt-1">Season {latest.season_id} • Week {latest.week} • Published {new Date(latest.published_at).toLocaleString()}</p>
        ) : (
          <p className="text-sm text-neutral-500 mt-1">No rankings uploaded yet.</p>
        )}
      </div>

      <ol className="space-y-2">
        {list.map((row) => (
          <li key={row.rank} className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="font-semibold">#{row.rank}</div>
            <div className="flex-1 px-4">{row.team}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
