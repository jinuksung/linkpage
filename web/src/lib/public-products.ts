import { createClient } from "@supabase/supabase-js";

type ContentBlockRow = {
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

export type PublicProduct = {
  id: string;
  blockId: string;
  sequenceNo: number | null;
  title: string;
  subtitle: string;
  thumbnailUrl: string;
  price: string;
  discount: string;
  url: string | null;
};

export type PublicProfile = {
  title: string;
  intro: string;
  notice: string;
  imageUrl: string;
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getClient = () => {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

const toSequenceNumber = (value: number | string | null | undefined): number | null => {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
};

export const getPublicProducts = async (): Promise<PublicProduct[]> => {
  const supabase = getClient();
  if (!supabase) return [];

  const { data: blocksData, error: blocksError } = await supabase
    .from("content_blocks")
    .select("id,sequence_no,title,subtitle,sort_order,is_active,link_url,image_url,price_text,discount_text")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (blocksError || !blocksData) return [];
  const contentBlocks = blocksData as ContentBlockRow[];
  if (contentBlocks.length === 0) return [];

  const mapped = contentBlocks.map((block, index) => {
      const item = {
        id: block.id,
        blockId: block.id,
        sequenceNo: toSequenceNumber(block.sequence_no),
        title: block.title?.trim() || "(이름 없음)",
        subtitle: block.subtitle?.trim() || "",
        thumbnailUrl: block.image_url || "https://picsum.photos/seed/new-product/240/240",
        price: block.price_text?.trim() || "",
        discount: block.discount_text?.trim() || "",
        url: block.link_url?.trim() || null,
      } satisfies PublicProduct;

      return {
        item,
        sortOrder: block.sort_order,
        index,
      };
    });

  mapped.sort((a, b) => {
    const aSeq = a.item.sequenceNo;
    const bSeq = b.item.sequenceNo;
    const aHasSeq = aSeq != null;
    const bHasSeq = bSeq != null;

    if (aHasSeq && bHasSeq && aSeq !== bSeq) {
      return bSeq - aSeq;
    }

    if (aHasSeq !== bHasSeq) {
      return aHasSeq ? -1 : 1;
    }

    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.index - b.index;
  });

  return mapped.map((entry) => entry.item);
};

export const getPublicProfile = async (slug: string): Promise<PublicProfile> => {
  const supabase = getClient();
  if (!supabase) {
    return {
      title: "핫비버와 핫도리의 핫딜 모음집",
      intro: "오늘의 추천 상품만 빠르게 모아둔 링크페이지",
      notice: "쿠팡 파트너스 활동의 일환으로 수수료를 제공받습니다.",
      imageUrl: "/images/profile-main.jpg",
    };
  }

  const { data, error } = await supabase
    .from("link_pages")
    .select("profile_title,profile_intro,profile_notice,profile_image_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return {
      title: "핫비버와 핫도리의 핫딜 모음집",
      intro: "오늘의 추천 상품만 빠르게 모아둔 링크페이지",
      notice: "쿠팡 파트너스 활동의 일환으로 수수료를 제공받습니다.",
      imageUrl: "/images/profile-main.jpg",
    };
  }

  return {
    title: data.profile_title ?? "",
    intro: data.profile_intro ?? "",
    notice: data.profile_notice ?? "",
    imageUrl: data.profile_image_url ?? "/images/profile-main.jpg",
  };
};
