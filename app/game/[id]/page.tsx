import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function GamePage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: g } = await supabase
    .from("games")
    .select("*,home:teams!games_home_team_id_fkey(name,slug),away:teams!games_away_team_id_fkey(name,slug)")
    .eq("id", params.id)
    .maybeSingle();
  if (!g) return notFound();

  const { data: extraction } = await supabase.from("game_extractions").select("*").eq("game_id", g.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="text-sm text-neutral-500">Week {g.week}{g.date ? ` • ${new Date(g.date).toLocaleDateString()}` : ""}</div>
        <h1 className="text-2xl font-semibold">{(g.away as any)?.name} @ {(g.home as any)?.name}</h1>
        <div className="text-lg mt-2">
          {g.status === "completed" ? (
            <span className="font-semibold">{g.final_score_away ?? "-"}–{g.final_score_home ?? "-"}</span>
          ) : (
            <span className="opacity-70">Pending</span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-semibold">Extracted Data</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          This is the structured data saved from your screenshot ingest (screenshots themselves are deleted after publish).
        </p>
        <pre className="mt-3 overflow-auto rounded-lg bg-neutral-100 p-3 text-xs dark:bg-neutral-900">
          {JSON.stringify(extraction?.extraction_json ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
