import { PublicPage } from "@/components/website/public-page";
import { pageMetadata, publicContent } from "@/lib/site";
export const metadata = pageMetadata("/guidelines", publicContent.guidelines.title, publicContent.guidelines.description);
export default function Page() { return <PublicPage kind="guidelines" />; }
