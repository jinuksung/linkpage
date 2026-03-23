import { NextResponse } from "next/server";

type IgAccount = "hotbeaverdeals" | "hotorideals";

const accountToUserId = (account: IgAccount) => {
  if (account === "hotbeaverdeals") return process.env.IG_HOTBEAVER_USER_ID;
  return process.env.IG_HOTORI_USER_ID;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const igAccount = (searchParams.get("igAccount") || "hotbeaverdeals") as IgAccount;
    const limit = Number(searchParams.get("limit") || "20");

    if (igAccount !== "hotbeaverdeals" && igAccount !== "hotorideals") {
      return NextResponse.json({ error: "invalid igAccount" }, { status: 400 });
    }

    const userId = accountToUserId(igAccount);
    const accessToken = process.env.IG_GRAPH_ACCESS_TOKEN;

    if (!userId) {
      return NextResponse.json({ error: `Missing IG user id env for ${igAccount}` }, { status: 500 });
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Missing IG_GRAPH_ACCESS_TOKEN" }, { status: 500 });
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
      ? json.data.map((m: any) => ({
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
