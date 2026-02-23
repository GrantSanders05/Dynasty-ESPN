import Link from "next/link";

export default function HomePage() {
  return (
    <main className="wrap">
      <div className="grid">
        <section className="card">
          <h2>League Wire</h2>
          <p className="muted">
            Public landing page — lightweight and ESPN-ish.
            Use <b>Articles</b> for weekly recaps and <b>Social Wall</b> for anything your friends want to post.
          </p>
          <div className="spacer" />
          <div className="row">
            <Link className="btn primary" href="/articles">Go to Articles</Link>
            <Link className="btn" href="/social">Go to Social Wall</Link>
          </div>
          <div className="footer">
            Built simple on purpose. We can add teams/schedule/AI later without rebuilding the foundation.
          </div>
        </section>

        <aside className="card">
          <h2>How this works</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Everything is public. Anyone can post.
          </p>
          <ul className="muted" style={{ lineHeight: 1.6, paddingLeft: 18 }}>
            <li>No accounts required</li>
            <li>Posts stored in Supabase</li>
            <li>Optional image upload via Supabase Storage</li>
          </ul>
          <div className="footer">
            Want commissioner-only posting later? We can add Google login + roles when you’re ready.
          </div>
        </aside>
      </div>
    </main>
  );
}
