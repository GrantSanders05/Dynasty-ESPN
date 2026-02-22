import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = supabaseServer();

  const { data: posts } = await supabase
    .from("articles")
    .select("id,title,created_at,team_id,week,season_id")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h1 className="text-2xl font-semibold">League Wire</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Weekly updates, game recaps, and commissioner posts.
        </p>
      </div>

      <div className="space-y-3">
        {(posts ?? []).length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">No posts yet.</p>
        ) : (
          (posts ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/article/${p.id}`}
              className="block rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <div className="text-sm text-neutral-500">
                {new Date(p.created_at).toLocaleString()}
                {p.week ? ` • Week ${p.week}` : "" }
              </div>
              <div className="font-medium">{p.title}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
