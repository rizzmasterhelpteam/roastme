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
  return <AppProvider><Shell websiteLinks={<WebsitePageLinks />}><AppScreen segments={segments} />{segments.length === 0 && <SiteSchema />}</Shell></AppProvider>;
}
