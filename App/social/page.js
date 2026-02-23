import { Feed, SocialForm } from "../../components/Posts";

export default function SocialPage() {
  return (
    <main className="wrap">
      <div className="grid">
        <SocialForm />
        <section className="card">
          <h2>Social Wall</h2>
          <Feed table="social_posts" titleField="" bodyField="content" withImages={true} />
        </section>
      </div>
    </main>
  );
}
