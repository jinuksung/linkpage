export type ProductMaster = {
  id: string;
  sequenceNo: number | null;
  name: string;
  seedKeyword: string;
  priceAnchor: string;
  thumbAnchor: string;
  brand: string;
  modelNo: string;
  status: "active" | "inactive";
  updatedAt: string;
};

export const emptyProduct = (id: string): ProductMaster => ({
  id,
  sequenceNo: null,
  name: "",
  seedKeyword: "",
  priceAnchor: "",
  thumbAnchor: "",
  brand: "",
  modelNo: "",
  status: "active",
  updatedAt: new Date().toISOString(),
});
