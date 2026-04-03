export type ProfileBlock = {
  id: string;
  type: "profile";
  visible: boolean;
  title: string;
  intro: string;
  notice?: string;
  imageUrl: string;
};

export type LinkItem = {
  id: string;
  title: string;
  url: string;
};

export type SingleLinkBlock = {
  id: string;
  type: "single";
  visible: boolean;
  title: string;
  url: string;
  thumbnailUrl: string;
  badge?: string;
  subtext?: string;
  price?: string;
  discount?: string;
  buttonText: string;
  size: "small" | "medium" | "large";
};

export type GroupLinkBlock = {
  id: string;
  type: "group";
  visible: boolean;
  title: string;
  description?: string;
  expandedByDefault: boolean;
  links: LinkItem[];
};

export type Block = ProfileBlock | SingleLinkBlock | GroupLinkBlock;

export const initialBlocks: Block[] = [
  {
    id: "b_profile",
    type: "profile",
    visible: true,
    title: "핫비버와 핫도리의 핫딜 모음집",
    intro: "오늘의 추천 상품만 빠르게 모아둔 링크페이지",
    notice: "쿠팡 파트너스 활동의 일환으로 수수료를 제공받습니다.",
    imageUrl: "/images/profile-main.jpg",
  },
  {
    id: "b_single_1",
    type: "single",
    visible: true,
    title: "출근길 든든템! 믹서형 텀블러",
    url: "https://example.com/product-1",
    thumbnailUrl: "https://picsum.photos/seed/tumbler/240/240",
    badge: "든든템",
    subtext: "아침 스무디 30초 완성",
    price: "29,900원",
    discount: "18%",
    buttonText: "보러가기",
    size: "medium",
  },
  {
    id: "b_single_2",
    type: "single",
    visible: true,
    title: "벽 부착 센서형 휴지통",
    url: "https://example.com/product-2",
    thumbnailUrl: "https://picsum.photos/seed/bin/240/240",
    badge: "청소꿀템",
    subtext: "좁은 화장실에도 깔끔하게",
    price: "26,400원",
    discount: "42%",
    buttonText: "할인 링크",
    size: "medium",
  },
  {
    id: "b_group_1",
    type: "group",
    visible: true,
    title: "오늘의 추천 묶음",
    description: "자주 찾는 링크 모음",
    expandedByDefault: true,
    links: [
      { id: "g1", title: "오늘의 메인딜", url: "https://example.com/deal" },
      { id: "g2", title: "재입고 알림", url: "https://example.com/restock" },
    ],
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

export const cloneBlocks = (blocks: Block[]) =>
  blocks.map((block) =>
    block.type === "profile"
      ? { ...block }
      : block.type === "single"
        ? { ...block }
        : { ...block, links: block.links.map((link) => ({ ...link })) },
  );

export const normalizeBlocks = (value: unknown): Block[] | null => {
  if (!Array.isArray(value)) return null;

  const parsed = value.map((raw): Block | null => {
    if (!isRecord(raw) || typeof raw.id !== "string") return null;
    const visible = typeof raw.visible === "boolean" ? raw.visible : true;

    if (raw.type === "profile") {
      return {
        id: raw.id,
        type: "profile",
        visible,
        title: asString(raw.title),
        intro: asString(raw.intro),
        notice: asString(raw.notice),
        imageUrl: asString(raw.imageUrl),
      };
    }

    if (raw.type === "single") {
      const size =
        raw.size === "small" || raw.size === "medium" || raw.size === "large"
          ? raw.size
          : "medium";
      return {
        id: raw.id,
        type: "single",
        visible,
        title: asString(raw.title),
        url: asString(raw.url),
        thumbnailUrl: asString(raw.thumbnailUrl),
        badge: asString(raw.badge),
        subtext: asString(raw.subtext),
        price: asString(raw.price),
        discount: asString(raw.discount),
        buttonText: asString(raw.buttonText, "보러가기"),
        size,
      };
    }

    if (raw.type === "group") {
      if (!Array.isArray(raw.links)) return null;
      const links = raw.links
        .map((link): LinkItem | null => {
          if (!isRecord(link) || typeof link.id !== "string") return null;
          return {
            id: link.id,
            title: asString(link.title),
            url: asString(link.url),
          };
        })
        .filter((link): link is LinkItem => !!link);

      return {
        id: raw.id,
        type: "group",
        visible,
        title: asString(raw.title),
        description: asString(raw.description),
        expandedByDefault:
          typeof raw.expandedByDefault === "boolean"
            ? raw.expandedByDefault
            : true,
        links,
      };
    }

    return null;
  });

  if (parsed.some((block) => !block)) return null;
  return parsed as Block[];
};
