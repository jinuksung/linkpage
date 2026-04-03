import type { Metadata } from "next";
import { getPublicProducts, getPublicProfile } from "../lib/public-products";
import LinkPageClient from "./link-page-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getPublicProfile("/hotdeals");
  return {
    title: profile.title || "핫비버의 핫딜 모음집",
  };
}

export default async function LinkPage() {
  const profile = await getPublicProfile("/hotdeals");
  const products = await getPublicProducts();

  return <LinkPageClient profile={profile} products={products} />;
}
