import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  name: string;
  product_key: string;
  brand: string | null;
  model_no: string | null;
  status: "active" | "inactive";
  origin_product_url: string | null;
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
  name: r.name ?? "",
  seedKeyword: r.product_key ?? "",
  priceAnchor: r.origin_product_url ?? "",
  thumbAnchor: r.default_image_url ?? "",
  brand: r.brand ?? "",
  modelNo: r.model_no ?? "",
  status: r.status,
  updatedAt: r.updated_at,
});

export async function GET() {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("products_master")
      .select("id,name,product_key,brand,model_no,status,origin_product_url,default_image_url,updated_at")
      .order("updated_at", { ascending: false });

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

    const { data, error } = await supabase
      .from("products_master")
      .insert({
        name: body.name?.trim() || "(이름 없음)",
        product_key: body.seedKeyword?.trim() || `manual_${Date.now()}`,
        brand: body.brand?.trim() || null,
        model_no: body.modelNo?.trim() || null,
        default_image_url: body.thumbAnchor?.trim() || null,
        origin_product_url: body.priceAnchor?.trim() || null,
        status: body.status === "inactive" ? "inactive" : "active",
      })
      .select("id,name,product_key,brand,model_no,status,origin_product_url,default_image_url,updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: toItem(data as Row) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
