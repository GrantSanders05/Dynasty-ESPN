/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type UploadRef = { path: string; name: string };

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" }, ...init });
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "Missing Authorization" }, { status: 401 });

    const supabase = createClient(supabaseUrl, serviceRole, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const body = await req.json();
    const season_id = Number(body.season_id);
    const week = Number(body.week);
    const uploads = (body.uploads ?? []) as UploadRef[];
    const preview = body.preview?.preview ?? body.preview ?? null;

    if (!season_id || !week) return json({ error: "Missing inputs" }, { status: 400 });

    // Save rankings snapshot (if present)
    const rankings = preview?.rankings ?? null;
    if (rankings) {
      await supabase.from("rankings_snapshots").upsert({
        season_id,
        week,
        rankings_json: rankings,
        published_at: new Date().toISOString(),
      }, { onConflict: "season_id,week" });
    }

    // Save placeholder article post to League Wire
    await supabase.from("articles").insert({
      title: `Week ${week} Update`,
      html: `<p>Weekly update published.</p>`,
      season_id,
      week,
      kind: "weekly_update",
    });

    // Delete temp uploads (Option B)
    if (uploads.length) {
      const paths = uploads.map(u => u.path);
      await supabase.storage.from("temp-uploads").remove(paths);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}
