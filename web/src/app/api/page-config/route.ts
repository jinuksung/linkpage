import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cloneBlocks, initialBlocks, normalizeBlocks } from "@/lib/page-data";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

const fallback = () => cloneBlocks(initialBlocks);
const profileOnlyFallback = () => fallback().filter((b) => b.type === "profile");
const withProfile = (
  title: string,
  intro: string,
  notice: string,
  imageUrl: string,
) =>
  profileOnlyFallback().map((block) => ({
    ...block,
    title,
    intro,
    notice,
    imageUrl,
  }));

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug")?.trim() || "/hotdeals";
    const supabase = getClient();
    const { data, error } = await supabase
      .from("link_pages")
      .select("profile_title,profile_intro,profile_notice,profile_image_url")
      .eq("slug", slug)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const blocks = data
      ? withProfile(
          data.profile_title ?? "",
          data.profile_intro ?? "",
          data.profile_notice ?? "",
          data.profile_image_url ?? "/images/profile-main.jpg",
        )
      : profileOnlyFallback();
    return NextResponse.json({ slug, blocks });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = String(body?.slug ?? "").trim();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const blocks = normalizeBlocks(body?.blocks);
    if (!blocks) {
      return NextResponse.json({ error: "blocks must be a valid block array" }, { status: 400 });
    }
    const profile = blocks.find((b) => b.type === "profile");
    if (!profile) {
      return NextResponse.json({ error: "profile block is required" }, { status: 400 });
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from("link_pages")
      .upsert(
        {
          slug,
          profile_title: profile.title ?? "",
          profile_intro: profile.intro ?? "",
          profile_notice: profile.notice ?? "",
          profile_image_url: profile.imageUrl ?? "/images/profile-main.jpg",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("profile_title,profile_intro,profile_notice,profile_image_url")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      slug,
      blocks: withProfile(
        data?.profile_title ?? "",
        data?.profile_intro ?? "",
        data?.profile_notice ?? "",
        data?.profile_image_url ?? "/images/profile-main.jpg",
      ),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
