import { PublicPage } from "@/components/website/public-page";
import { pageMetadata, publicContent } from "@/lib/site";
export const metadata = pageMetadata("/help", publicContent.help.title, publicContent.help.description);
export default function Page() { return <PublicPage kind="help" />; }
