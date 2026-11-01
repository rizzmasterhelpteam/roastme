import { PublicPage } from "@/components/website/public-page";
import { pageMetadata, publicContent } from "@/lib/site";
export const metadata = pageMetadata("/blog", publicContent.blog.title, publicContent.blog.description);
export default function Page() { return <PublicPage kind="blog" />; }
