import Link from "next/link";

export default function Navbar() {
  return (
    <div className="topbar">
      <div className="wrap">
        <div className="brand">
          <span>Dynasty Hub</span>
          <span className="pill">ESPN-style</span>
          <span className="pill">Public</span>
        </div>
        <div className="nav">
          <Link href="/">Home</Link>
          <Link href="/articles">Articles</Link>
          <Link href="/social">Social Wall</Link>
        </div>
      </div>
    </div>
  );
}
