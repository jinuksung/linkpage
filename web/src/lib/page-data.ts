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
