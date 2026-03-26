export type IgAccount = "hotbeaverdeals" | "hotorideals";

export type AffiliateLink = {
  id: string;
  igAccount: IgAccount;
  label: string;
  url: string;
  status: "active" | "inactive";
  updatedAt: string;
};

export type TriggerMode = "keyword" | "any";

export type AutomationRule = {
  id: string;
  igAccount: IgAccount;
  mediaId: string;
  triggerMode: TriggerMode;
  keywordRegex: string;
  dmTemplate: string;
  dmButtonText: string;
  dmButtonUrl: string;
  affiliateLinkId: string;
  replyVariants: string[];
  status: "active" | "inactive";
  updatedAt: string;
};

export const emptyAffiliateLink = (id: string): AffiliateLink => ({
  id,
  igAccount: "hotbeaverdeals",
  label: "",
  url: "https://",
  status: "active",
  updatedAt: new Date().toISOString(),
});

export const emptyAutomationRule = (id: string): AutomationRule => ({
  id,
  igAccount: "hotbeaverdeals",
  mediaId: "",
  triggerMode: "keyword",
  keywordRegex: "",
  dmTemplate: "문의 주셔서 감사합니다! {{link}}",
  dmButtonText: "지금 보러가기",
  dmButtonUrl: "",
  affiliateLinkId: "",
  replyVariants: ["확인했어요! DM 보냈습니다 🙌"],
  status: "active",
  updatedAt: new Date().toISOString(),
});
