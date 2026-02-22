"use client";

import { useState } from "react";
import { supabase, supabaseUrl } from "@/lib/supabaseClient";

type UploadRef = { path: string; name: string };

export default function WeeklyUpdate() {
  const supabase = supabaseBrowser();

  const [week, setWeek] = useState<number>(1);
  const [seasonId, setSeasonId] = useState<number>(2026);
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadRef[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [provider, setProvider] = useState<"openai">("openai");
  const [preview, setPreview] = useState<any>(null);
  const [status, setStatus] = useState<string>("");

  async function uploadAll() {
    setStatus("Uploading…");
    const refs: UploadRef[] = [];
    for (const f of files) {
      const path = `week-${seasonId}-${week}/${crypto.randomUUID()}-${f.name}`;
      const { error } = await supabase.storage.from("temp-uploads").upload(path, f, { upsert: false });
      if (error) { setStatus(error.message); return; }
      refs.push({ path, name: f.name });
    }
    setUploads(refs);
    setStatus(`Uploaded ${refs.length} file(s).`);
  }

  async function process() {
    setStatus("Processing…");
    const { data: session } = await supabase.auth.getSession();
    const jwt = session.session?.access_token;
    if (!jwt) { setStatus("Not signed in."); return; }

    const res = await fetch(`${supabaseUrl}/functions/v1/process_weekly`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        season_id: seasonId,
        week,
        provider,
        api_key: apiKey,
        uploads,
      })
    });

    const json = await res.json();
    if (!res.ok) { setStatus(json?.error ?? "Failed"); return; }
    setPreview(json);
    setStatus("Preview ready. Review then publish.");
  }

  async function publish() {
    setStatus("Publishing…");
    const { data: session } = await supabase.auth.getSession();
    const jwt = session.session?.access_token;
    if (!jwt) { setStatus("Not signed in."); return; }

    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/publish_weekly`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        season_id: seasonId,
        week,
        uploads,
        preview, // includes extracted JSON + any client-side edits you add later
      })
    });
    const json = await res.json();
    if (!res.ok) { setStatus(json?.error ?? "Failed"); return; }
    setStatus("Published! Screenshots deleted.");
    setFiles([]);
    setUploads([]);
    setPreview(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 space-y-2">
          <label className="text-sm font-medium">Season</label>
          <input value={seasonId} onChange={(e)=>setSeasonId(Number(e.target.value))} type="number" className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 space-y-2">
          <label className="text-sm font-medium">Week</label>
          <input value={week} onChange={(e)=>setWeek(Number(e.target.value))} type="number" min={1} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 space-y-2">
          <label className="text-sm font-medium">Vision Provider</label>
          <select value={provider} onChange={(e)=>setProvider(e.target.value as any)} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option value="openai">OpenAI (vision)</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Upload screenshots</label>
            <input multiple type="file" accept="image/*" onChange={(e)=>setFiles(Array.from(e.target.files ?? []))} />
            <div className="text-xs opacity-70">{files.length} selected</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Your API Key (not stored)</label>
            <input value={apiKey} onChange={(e)=>setApiKey(e.target.value)} type="password" className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" placeholder="Paste key for processing" />
            <div className="text-xs opacity-70">We only use this to call the model during processing.</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={uploadAll} disabled={files.length===0} className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900">1) Upload</button>
          <button onClick={process} disabled={uploads.length===0 || !apiKey} className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900">2) Extract Preview</button>
          <button onClick={publish} disabled={!preview} className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900">3) Save & Publish</button>
        </div>

        {status ? <div className="text-sm opacity-80">{status}</div> : null}
      </div>

      {preview ? (
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-semibold">Preview JSON</h2>
          <pre className="mt-3 overflow-auto rounded-lg bg-neutral-100 p-3 text-xs dark:bg-neutral-900">{JSON.stringify(preview, null, 2)}</pre>
          <p className="text-xs opacity-70 mt-2">Next: we’ll add editable forms (rankings, schedules, games) instead of raw JSON.</p>
        </div>
      ) : null}
    </div>
  );
}
