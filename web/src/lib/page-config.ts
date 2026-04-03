import { createClient } from "@supabase/supabase-js";
import { cloneBlocks, initialBlocks, type Block } from "./page-data";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getClient = () => {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

export const getPageBlocks = async (slug: string): Promise<Block[]> => {
  const profileBase = cloneBlocks(initialBlocks).filter((b): b is Extract<Block, { type: "profile" }> => b.type === "profile");

  const supabase = getClient();
  if (!supabase) return profileBase;

  const { data, error } = await supabase
    .from("link_pages")
    .select("profile_title,profile_intro,profile_notice,profile_image_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return profileBase;
  if (!data) return profileBase;

  return profileBase.map((block) => ({
    ...block,
    title: data.profile_title ?? "",
    intro: data.profile_intro ?? "",
    notice: data.profile_notice ?? "",
    imageUrl: data.profile_image_url ?? "/images/profile-main.jpg",
  }));
};
