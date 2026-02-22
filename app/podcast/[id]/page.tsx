import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function PodcastSourcePage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data } = await supabase.from("podcast_sources").select("*").eq("id", params.id).maybeSingle();
  if (!data) return notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Podcast Source • Week {data.week}</h1>
      <pre className="overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs dark:border-neutral-800 dark:bg-neutral-900">{data.compiled_markdown ?? ""}</pre>
    </div>
  );
}
