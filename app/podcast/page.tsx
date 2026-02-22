import { supabaseServer } from "@/lib/supabase/server";

export default async function PodcastPage() {
  const supabase = supabaseServer();
  const { data } = await supabase.from("podcast_sources").select("id,week,created_at").order("created_at", { ascending: false }).limit(20);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Podcast Studio</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Generate weekly NotebookLM-ready markdown sources. (Generator UI comes next.)
      </p>

      <div className="space-y-2">
        {(data ?? []).map((p) => (
          <a key={p.id} href={`/podcast/${p.id}`} className="block rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
            <div className="text-sm text-neutral-500">Week {p.week} • {new Date(p.created_at).toLocaleString()}</div>
            <div className="font-medium">Podcast Source</div>
          </a>
        ))}
      </div>
    </div>
  );
}
