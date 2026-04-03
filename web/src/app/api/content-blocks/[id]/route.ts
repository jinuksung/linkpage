import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  sequence_no: number | string | null;
  title: string;
  subtitle: string | null;
  sort_order: number;
  is_active: boolean;
  link_url: string | null;
  image_url: string | null;
  price_text: string | null;
  discount_text: string | null;
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const toSequenceNumber = (value: number | string | null | undefined): number | null => {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
};

const toItem = (r: Row) => ({
  id: r.id,
  sequenceNo: toSequenceNumber(r.sequence_no),
  title: r.title ?? "",
  subtitle: r.subtitle ?? "",
  sortOrder: r.sort_order,
  isActive: r.is_active,
  linkUrl: r.link_url ?? "",
  imageUrl: r.image_url ?? "",
  priceText: r.price_text ?? "",
  discountText: r.discount_text ?? "",
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const linkUrl = String(body?.linkUrl ?? "").trim();
    if (!/^https?:\/\//.test(linkUrl)) {
      return NextResponse.json({ error: "valid linkUrl is required" }, { status: 400 });
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from("content_blocks")
      .update({
        title: String(body?.title ?? "").trim() || "(이름 없음)",
        subtitle: String(body?.subtitle ?? "").trim() || null,
        product_id: null,
        sort_order: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
        is_active: body?.isActive !== false,
        link_url: linkUrl,
        image_url: String(body?.imageUrl ?? "").trim() || null,
        price_text: String(body?.priceText ?? "").trim() || null,
        discount_text: String(body?.discountText ?? "").trim() || null,
      })
      .eq("id", id)
      .select("id,sequence_no,title,subtitle,sort_order,is_active,link_url,image_url,price_text,discount_text")
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
    const { error } = await supabase.from("content_blocks").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
