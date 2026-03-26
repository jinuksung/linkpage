import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type IgAccount = "hotbeaverdeals" | "hotorideals";

type MediaRow = {
  id?: string | number;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getClient = () => {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing SUPABASE env");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const accountConfig = async (account: IgAccount) => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("ig_tokens")
    .select("ig_user_id,access_token")
    .eq("ig_account", account)
    .single();

  if (!error && data) {
    return {
      userId: String(data.ig_user_id ?? "").trim(),
      accessToken: String(data.access_token ?? "").trim(),
    };
  }

  // Temporary fallback for environments that have not applied the migration yet.
  if (account === "hotbeaverdeals") {
    return {
      userId: String(process.env.IG_HOTBEAVER_USER_ID ?? "").trim(),
      accessToken: String(process.env.IG_HOTBEAVER_ACCESS_TOKEN ?? "").trim(),
    };
  }

  return {
    userId: String(process.env.IG_HOTORI_USER_ID ?? "").trim(),
    accessToken: String(process.env.IG_HOTORI_ACCESS_TOKEN ?? "").trim(),
  };
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const igAccount = (searchParams.get("igAccount") || "hotbeaverdeals") as IgAccount;
    const limit = Number(searchParams.get("limit") || "20");

    if (igAccount !== "hotbeaverdeals" && igAccount !== "hotorideals") {
      return NextResponse.json({ error: "invalid igAccount" }, { status: 400 });
    }

    const { userId, accessToken } = await accountConfig(igAccount);

    if (!userId) {
      return NextResponse.json({ error: `Missing IG user id in ig_tokens for ${igAccount}` }, { status: 500 });
    }

    if (!accessToken) {
      return NextResponse.json({ error: `Missing access token in ig_tokens for ${igAccount}` }, { status: 500 });
    }

    const fields = ["id", "caption", "media_type", "media_url", "thumbnail_url", "permalink", "timestamp"].join(",");
    const url = new URL(`https://graph.facebook.com/v22.0/${userId}/media`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message ?? "Graph API failed", details: json }, { status: 500 });
    }

    const items = Array.isArray(json?.data)
      ? (json.data as MediaRow[]).map((m) => ({
          id: String(m.id ?? ""),
          caption: String(m.caption ?? ""),
          mediaType: String(m.media_type ?? ""),
          mediaUrl: String(m.media_url ?? ""),
          thumbnailUrl: String(m.thumbnail_url ?? ""),
          permalink: String(m.permalink ?? ""),
          timestamp: String(m.timestamp ?? ""),
        }))
      : [];

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
