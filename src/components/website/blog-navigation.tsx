import Link from "next/link";
import { BookOpen } from "lucide-react";

export function BlogNavigationLink({ active = false }: { active?: boolean }) {
  return (
    <Link href="/blog" className={`nav-link ${active ? "active" : ""}`}>
      <BookOpen size={19} />
      <span>Blog</span>
    </Link>
  );
}
