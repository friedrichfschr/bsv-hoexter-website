import type { Metadata } from "next";
import { cookies } from "next/headers";
import { EditorialDashboard } from "@/features/news/EditorialDashboard";
import { EditorialLogin } from "@/features/news/EditorialLogin";
import { EDITORIAL_SESSION_COOKIE, isEditorialSessionAuthorized } from "@/lib/editorial-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Redaktion | BSV Höxter", robots: { index: false, follow: false } };

export default async function EditorialPage() {
  const cookieStore = await cookies();
  const authenticated = isEditorialSessionAuthorized(cookieStore.get(EDITORIAL_SESSION_COOKIE)?.value);
  return authenticated ? <EditorialDashboard /> : <EditorialLogin />;
}
