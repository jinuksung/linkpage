import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  sequence_no: number;
  name: string;
  product_key: string;
  brand: string | null;
  model_no: string | null;
  status: "active" | "inactive";
  price_anchor: number | null;
  default_image_url: string | null;
  updated_at: string;
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const toItem = (r: Row) => ({
  id: r.id,
  sequenceNo: r.sequence_no,
  name: r.name ?? "",
  seedKeyword: r.product_key ?? "",
  priceAnchor: r.price_anchor == null ? "" : String(r.price_anchor),
  thumbAnchor: r.default_image_url ?? "",
  brand: r.brand ?? "",
  modelNo: r.model_no ?? "",
  status: r.status,
  updatedAt: r.updated_at,
});

const parsePrice = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return undefined;
  return num;
};

export async function GET() {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("products_master")
      .select("id,sequence_no,name,product_key,brand,model_no,status,price_anchor,default_image_url,updated_at")
      .order("sequence_no", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: (data as Row[]).map(toItem) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = getClient();
    const parsed = parsePrice(body.priceAnchor);
    if (parsed === undefined) {
      return NextResponse.json({ error: "price_anchor must be numeric" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("products_master")
      .insert({
        name: body.name?.trim() || "(이름 없음)",
        product_key: body.seedKeyword?.trim() || `manual_${Date.now()}`,
        brand: body.brand?.trim() || null,
        model_no: body.modelNo?.trim() || null,
        default_image_url: body.thumbAnchor?.trim() || null,
        price_anchor: parsed,
        status: body.status === "inactive" ? "inactive" : "active",
      })
      .select("id,sequence_no,name,product_key,brand,model_no,status,price_anchor,default_image_url,updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: toItem(data as Row) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
