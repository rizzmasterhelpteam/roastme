import { PublicPage } from "@/components/website/public-page";
import { pageMetadata, publicContent } from "@/lib/site";
export const metadata = pageMetadata("/about", publicContent.about.title, publicContent.about.description);
export default function Page() { return <PublicPage kind="about" />; }
