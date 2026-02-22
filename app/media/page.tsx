import { supabaseServer } from "@/lib/supabase/server";

export default async function MediaPage() {
  const supabase = supabaseServer();
  const { data: posts } = await supabase.from("media_posts").select("id,caption,created_at").order("created_at", { ascending: false }).limit(30);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Media Wall</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">Members can post and interact. (Posting UI comes next.)</p>

      <div className="space-y-2">
        {(posts ?? []).map((p) => (
          <div key={p.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="text-sm text-neutral-500">{new Date(p.created_at).toLocaleString()}</div>
            <div className="mt-1">{p.caption}</div>
          </div>
        ))}
        {(posts ?? []).length === 0 ? <p className="text-sm opacity-70">No posts yet.</p> : null}
      </div>
    </div>
  );
}
