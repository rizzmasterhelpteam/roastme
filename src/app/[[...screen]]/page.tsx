import { AppScreen } from "@/components/screens";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ screen?: string[] }>;
}) {
  return <AppScreen segments={(await params).screen || []} />;
}
