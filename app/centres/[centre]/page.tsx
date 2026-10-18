import { redirect } from "next/navigation";
import { resoudreCentre } from "@/lib/donnees";

export default async function PageCentre({ params }: { params: Promise<{ centre: string }> }) {
  const centre = await resoudreCentre(params);
  redirect(`/centres/${centre.slug}/menus`);
}
