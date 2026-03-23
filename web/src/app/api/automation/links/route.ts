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
  partner: string;
  affiliate_url: string;
  status: "active" | "inactive";
  is_current: boolean;
  generated_at: string;
  products_master: { name: string | null }[] | null;
};

const toItem = (r: Row) => ({
  id: r.id,
  igAccount: "hotbeaverdeals" as const,
  label: `${r.products_master?.[0]?.name ?? "(상품명 없음)"} · ${r.partner}`,
  url: r.affiliate_url,
  status: r.status,
  updatedAt: r.generated_at,
});

export async function GET() {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("affiliate_links")
      .select("id,partner,affiliate_url,status,is_current,generated_at,products_master(name)")
      .eq("is_current", true)
      .eq("status", "active")
      .order("generated_at", { ascending: false })
      .limit(300);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: (data as Row[]).map(toItem) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Use existing affiliate_links table (read-only here)." }, { status: 405 });
}
