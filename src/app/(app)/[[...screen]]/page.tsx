import { AppScreen } from "@/components/screens";
import { notFound } from "next/navigation";
import { screenPath, screenMetadata } from "@/lib/site";
import { AppProvider } from "@/components/app-provider";
import { Shell } from "@/components/shell";
import { SiteSchema } from "@/components/website/schema";
import { WebsitePageLinks } from "@/components/website/page-links";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ screen?: string[] }> };
export async function generateMetadata({ params }: Props) {
  return screenMetadata((await params).screen || []);
}
export default async function Page({
  params,
}: {
  params: Promise<{ screen?: string[] }>;
}) {
  const segments = (await params).screen || [];
  if (!screenPath(segments)) notFound();
  return <>
    {segments.length === 0 && <>
      <SiteSchema />
      <noscript><style>{".app-startup{display:none!important}"}</style><main className="empty-state"><h1>Roast Me AI</h1><p>Choose from six comedy personas for playful text roasts, photo roasts and roast battles. Adjust chaos and reply length to your taste.</p><p>The interactive roast room needs JavaScript. Read more <a href="/about">about Roast Me AI</a>, find <a href="/help">help</a>, or visit the <a href="/blog">blog</a>.</p></main></noscript>
    </>}
    <AppProvider><Shell websiteLinks={<WebsitePageLinks />}><AppScreen segments={segments} /></Shell></AppProvider>
  </>;
}
