import { ArticleForm, Feed } from "../../components/Posts";

export default function ArticlesPage() {
  return (
    <main className="wrap">
      <div className="grid">
        <ArticleForm />
        <section className="card">
          <h2>Latest Articles</h2>
          <Feed
            table="articles"
            titleField="title"
            bodyField="body"
            withImages={false}
            extraMeta={(it) => (it.week ? `Week ${it.week}` : "")}
          />
        </section>
      </div>
    </main>
  );
}
