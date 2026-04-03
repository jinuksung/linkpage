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

export async function GET() {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("content_blocks")
      .select("id,sequence_no,title,subtitle,sort_order,is_active,link_url,image_url,price_text,discount_text")
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: (data as Row[]).map(toItem) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const linkUrl = String(body?.linkUrl ?? "").trim();
    if (!/^https?:\/\//.test(linkUrl)) {
      return NextResponse.json({ error: "valid linkUrl is required" }, { status: 400 });
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from("content_blocks")
      .insert({
        title: String(body?.title ?? "").trim() || "(이름 없음)",
        subtitle: String(body?.subtitle ?? "").trim() || null,
        sort_order: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
        is_active: body?.isActive !== false,
        link_url: linkUrl,
        image_url: String(body?.imageUrl ?? "").trim() || null,
        price_text: String(body?.priceText ?? "").trim() || null,
        discount_text: String(body?.discountText ?? "").trim() || null,
      })
      .select("id,sequence_no,title,subtitle,sort_order,is_active,link_url,image_url,price_text,discount_text")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: toItem(data as Row) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    const mapped: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      sort_order: number;
      is_active: boolean;
      link_url: string;
      image_url: string | null;
      price_text: string | null;
      discount_text: string | null;
    } | null> = items.map((item: unknown, index: number) => {
        const rec = item as Record<string, unknown>;
        const linkUrl = String(rec.linkUrl ?? "").trim();
        if (!/^https?:\/\//.test(linkUrl)) return null;
        return {
          id: String(rec.id ?? "").trim(),
          title: String(rec.title ?? "").trim() || "(이름 없음)",
          subtitle: String(rec.subtitle ?? "").trim() || null,
          sort_order: index,
          is_active: rec.isActive !== false,
          link_url: linkUrl,
          image_url: String(rec.imageUrl ?? "").trim() || null,
          price_text: String(rec.priceText ?? "").trim() || null,
          discount_text: String(rec.discountText ?? "").trim() || null,
        };
      });

    const normalized = mapped.filter(
      (
        row,
      ): row is {
        id: string;
        title: string;
        subtitle: string | null;
        sort_order: number;
        is_active: boolean;
        link_url: string;
        image_url: string | null;
        price_text: string | null;
        discount_text: string | null;
      } => !!row,
    );

    const supabase = getClient();
    const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const row of normalized) {
      if (idPattern.test(row.id)) {
        const { error } = await supabase
          .from("content_blocks")
          .update({
            title: row.title,
            subtitle: row.subtitle,
            sort_order: row.sort_order,
            is_active: row.is_active,
            link_url: row.link_url,
            image_url: row.image_url,
            price_text: row.price_text,
            discount_text: row.discount_text,
            product_id: null,
          })
          .eq("id", row.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        continue;
      }

      const { error } = await supabase.from("content_blocks").insert({
        title: row.title,
        subtitle: row.subtitle,
        sort_order: row.sort_order,
        is_active: row.is_active,
        link_url: row.link_url,
        image_url: row.image_url,
        price_text: row.price_text,
        discount_text: row.discount_text,
        product_id: null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("content_blocks")
      .select("id,sequence_no,title,subtitle,sort_order,is_active,link_url,image_url,price_text,discount_text")
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: (data as Row[]).map(toItem) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
