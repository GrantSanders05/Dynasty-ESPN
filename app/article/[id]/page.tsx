import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data } = await supabase.from("articles").select("*").eq("id", params.id).maybeSingle();
  if (!data) return notFound();

  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1>{data.title}</h1>
      <p className="text-sm opacity-70">{new Date(data.created_at).toLocaleString()}</p>
      <div dangerouslySetInnerHTML={{ __html: data.html ?? "" }} />
    </article>
  );
}
