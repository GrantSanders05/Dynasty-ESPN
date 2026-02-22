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
    const provider = String(body.provider ?? "openai");
    const api_key = String(body.api_key ?? "");
    const uploads = (body.uploads ?? []) as UploadRef[];

    if (!season_id || !week || uploads.length === 0) return json({ error: "Missing inputs" }, { status: 400 });
    if (!api_key) return json({ error: "Missing api_key" }, { status: 400 });
    if (provider !== "openai") return json({ error: "Only openai supported in MVP" }, { status: 400 });

    // Download images from Storage (temp-uploads) and encode as base64
    const images: { name: string; mime: string; b64: string }[] = [];
    for (const u of uploads) {
      const { data, error } = await supabase.storage.from("temp-uploads").download(u.path);
      if (error || !data) return json({ error: `Download failed: ${u.name}` }, { status: 400 });
      const buf = new Uint8Array(await data.arrayBuffer());
      const b64 = btoa(String.fromCharCode(...buf));
      const mime = data.type || "image/png";
      images.push({ name: u.name, mime, b64 });
    }

    // Call OpenAI Vision (user-supplied key)
    const prompt = `
You are extracting weekly dynasty data from a college football video game.
Return STRICT JSON only (no markdown).
You may see: Top 25 rankings, schedules, game results, team stats, player stats, awards/news.
Produce an object with keys:
- season_id (number), week (number)
- rankings: { top25: [{rank:number, team:string}] } | null
- schedules: { games: [{week:number, home:string, away:string, neutral?:boolean}] } | null
- results: { games: [{home:string, away:string, home_score:number, away_score:number, week:number}] } | null
- notes: string[]
If something is not present in the images, set that key to null.
Be conservative: if you cannot read a value, omit that field or set to null.
`;

    const inputContent: any[] = [{ type: "text", text: prompt }];
    for (const img of images) {
      inputContent.push({
        type: "image_url",
        image_url: { url: `data:${img.mime};base64,${img.b64}` }
      });
    }

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${api_key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [{ role: "user", content: inputContent }],
        temperature: 0.2
      })
    });

    const raw = await r.json();
    if (!r.ok) return json({ error: "Model call failed", details: raw }, { status: 500 });

    // Extract text output
    const outText = raw?.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text
      ?? raw?.output_text
      ?? "";

    // Try parse JSON
    let parsed: any = null;
    try {
      parsed = JSON.parse(outText);
    } catch {
      // attempt to salvage by finding first {...}
      const m = outText.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    if (!parsed) return json({ error: "Could not parse JSON", raw: outText }, { status: 500 });

    return json({ season_id, week, preview: parsed });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}
