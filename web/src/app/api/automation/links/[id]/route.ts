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
  label: string;
  url: string;
  status: "active" | "inactive";
  updated_at: string;
};

const toItem = (r: Row) => ({
  id: r.id,
  igAccount: r.ig_account,
  label: r.label,
  url: r.url,
  status: r.status,
  updatedAt: r.updated_at,
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getClient();

    const { data, error } = await supabase
      .from("ig_affiliate_links")
      .update({
        ig_account: body.igAccount === "hotorideals" ? "hotorideals" : "hotbeaverdeals",
        label: body.label?.trim() || "(이름 없음)",
        url: body.url?.trim() || "",
        status: body.status === "inactive" ? "inactive" : "active",
      })
      .eq("id", id)
      .select("id,ig_account,label,url,status,updated_at")
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
    const { error } = await supabase.from("ig_affiliate_links").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
