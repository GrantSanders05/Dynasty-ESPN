import React, { useEffect, useState } from "react";

const RANKINGS_KEY = "rankings_image";
const RANKINGS_BUCKET = "rankings";

export default function Rankings({ supabase, isCommish }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pasteUrl, setPasteUrl] = useState("");
  const [file, setFile] = useState(null);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function flashNotice(msg) {
    setNotice(msg); setError("");
    window.clearTimeout(flashNotice._t);
    flashNotice._t = window.setTimeout(() => setNotice(""), 3500);
  }
  function flashError(msg) {
    setError(msg); setNotice("");
    window.clearTimeout(flashError._t);
    flashError._t = window.setTimeout(() => setError(""), 9000);
  }

  async function loadRankings() {
    setLoading(true);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", RANKINGS_KEY)
      .maybeSingle();
    setImageUrl(data?.value || null);
    setLoading(false);
  }

  async function persistUrl(url) {
    const { error: err } = await supabase
      .from("site_settings")
      .upsert(
        { key: RANKINGS_KEY, value: url, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (err) throw new Error(err.message);
    setImageUrl(url);
  }

  async function saveUrl(e) {
    e.preventDefault();
    if (!isCommish) return flashError("Commissioner only.");
    if (!pasteUrl.trim()) return flashError("Please paste an image URL.");
    setSaving(true);
    try {
      await persistUrl(pasteUrl.trim());
      setPasteUrl("");
      flashNotice("Rankings updated.");
    } catch (err) {
      flashError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function saveFile(e) {
    e.preventDefault();
    if (!isCommish) return flashError("Commissioner only.");
    if (!file) return flashError("Please choose an image file.");
    setSaving(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `rankings/current.${ext}`;

      // Upload with upsert so it overwrites the old one
      const { error: upErr } = await supabase.storage
        .from(RANKINGS_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "60" });
      if (upErr) throw new Error(upErr.message);

      const { data: pub } = supabase.storage.from(RANKINGS_BUCKET).getPublicUrl(path);
      // Bust cache by appending timestamp so browser always shows the new image
      const url = `${pub.publicUrl}?t=${Date.now()}`;

      await persistUrl(url);
      setFile(null);
      flashNotice("Rankings updated.");
    } catch (err) {
      flashError(err.message || "Upload failed.");
    } finally {
      setSaving(false);
    }
  }

  async function clearRankings() {
    if (!isCommish) return;
    if (!confirm("Remove the current rankings image?")) return;
    try {
      await persistUrl("");
      setImageUrl(null);
      flashNotice("Rankings cleared.");
    } catch (err) {
      flashError(err.message || "Failed to clear.");
    }
  }

  useEffect(() => {
    loadRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      {/* Page header */}
      <div className="rankingsHeader">
        <div>
          <h1 style={{ margin: 0 }}>Rankings</h1>
          <div className="muted" style={{ marginTop: 4, fontWeight: 700 }}>
            Current dynasty power rankings
          </div>
        </div>
      </div>

      {/* Toasts */}
      {(notice || error) ? (
        <div className="toastWrap">
          {notice ? <div className="toast ok">{notice}</div> : null}
          {error  ? <div className="toast err">{error}</div>  : null}
        </div>
      ) : null}

      {/* Commissioner upload panel */}
      {isCommish && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardHeader">
            <h2>Update Rankings Image</h2>
          </div>

          {/* Option 1: Upload a file */}
          <div style={{ marginBottom: 14 }}>
            <div className="rankingsOptionLabel">Upload an image file</div>
            <form className="form" onSubmit={saveFile}>
              <div className="row">
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={saving}
                />
                <button className="btn primary" type="submit" disabled={saving || !file}>
                  {saving ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>

          {/* Divider */}
          <div className="rankingsDivider">
            <span>or paste a URL</span>
          </div>

          {/* Option 2: Paste a URL */}
          <div style={{ marginTop: 14 }}>
            <div className="rankingsOptionLabel">Paste a public image URL</div>
            <form className="form" onSubmit={saveUrl}>
              <div className="row">
                <input
                  className="input"
                  value={pasteUrl}
                  onChange={(e) => setPasteUrl(e.target.value)}
                  placeholder="https://i.imgur.com/example.png"
                  disabled={saving}
                />
                <button className="btn primary" type="submit" disabled={saving || !pasteUrl.trim()}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>

          {/* Clear button */}
          {imageUrl && (
            <button
              className="btn danger small"
              style={{ marginTop: 14 }}
              onClick={clearRankings}
              type="button"
              disabled={saving}
            >
              Remove current image
            </button>
          )}

          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Uploading requires a <strong>{RANKINGS_BUCKET}</strong> storage bucket in Supabase set to public.
            Alternatively, upload your screenshot anywhere (Imgur, Discord, etc.) and paste the direct image link.
          </div>
        </div>
      )}

      {/* Rankings image display */}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : imageUrl ? (
        <div className="rankingsImageWrap">
          <img
            src={imageUrl}
            alt="Current power rankings"
            className="rankingsImage"
          />
        </div>
      ) : (
        <div className="rankingsEmpty">
          <div className="rankingsEmptyIcon">🏆</div>
          <div className="rankingsEmptyText">No rankings posted yet.</div>
          {isCommish && (
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Upload a screenshot or paste an image URL above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
