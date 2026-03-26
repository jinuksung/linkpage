import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getClient = () => {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing SUPABASE env");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

type Row = {
  id: string;
  ig_account: "hotbeaverdeals" | "hotorideals";
  media_id: string;
  trigger_mode: "keyword" | "any";
  keyword_regex: string | null;
  dm_template: string;
  dm_button_text: string | null;
  affiliate_link_id: string;
  reply_variants: string[] | null;
  status: "active" | "inactive";
  updated_at: string;
};

const toItem = (r: Row) => ({
  id: r.id,
  igAccount: r.ig_account,
  mediaId: r.media_id,
  triggerMode: r.trigger_mode,
  keywordRegex: r.keyword_regex ?? "",
  dmTemplate: r.dm_template ?? "",
  dmButtonText: r.dm_button_text ?? "",
  affiliateLinkId: r.affiliate_link_id,
  replyVariants: Array.isArray(r.reply_variants) ? r.reply_variants : [],
  status: r.status,
  updatedAt: r.updated_at,
});

const sanitizeVariants = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const filtered = value.map((v) => String(v ?? "").trim()).filter(Boolean);
  return filtered.slice(0, 3);
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getClient();

    const { data, error } = await supabase
      .from("ig_automation_rules")
      .update({
        ig_account: body.igAccount === "hotorideals" ? "hotorideals" : "hotbeaverdeals",
        media_id: body.mediaId?.trim() || "",
        trigger_mode: body.triggerMode === "any" ? "any" : "keyword",
        keyword_regex: body.triggerMode === "any" ? null : (body.keywordRegex?.trim() || null),
        dm_template: body.dmTemplate?.trim() || "",
        dm_button_text: body.dmButtonText?.trim() || null,
        affiliate_link_id: body.affiliateLinkId,
        reply_variants: sanitizeVariants(body.replyVariants),
        status: body.status === "inactive" ? "inactive" : "active",
      })
      .eq("id", id)
      .select("id,ig_account,media_id,trigger_mode,keyword_regex,dm_template,dm_button_text,affiliate_link_id,reply_variants,status,updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: toItem(data as Row) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getClient();
    const { error } = await supabase.from("ig_automation_rules").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
