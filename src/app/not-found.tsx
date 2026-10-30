import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>This page got roasted.</h1>
      <p>Let’s get you back to the roast room.</p>
      <Link href="/" className="btn btn-primary">
        Back to home
      </Link>
    </div>
  );
}
